import axios from 'axios';
import safariFriendlyStorage from '../utils/safariFriendlyStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// ✅ Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Cache helper functions
const getCacheKey = (config) => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params)}`;
};

const isCacheable = (config) => {
  return config.method === 'get' && !config.skipCache;
};

const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedResponse = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// Clear cache function
api.clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// ✅ CRITICAL: Clear ALL auth data from BOTH localStorage AND cookies
// safariFriendlyStorage saves to cookies as backup — must clear both!
const clearAllAuth = () => {
  safariFriendlyStorage.removeItem('token');
  safariFriendlyStorage.removeItem('user');
  safariFriendlyStorage.removeItem('auth-storage');
  api.clearCache();
};

// ✅ Request interceptor with token handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          if (parsed?.state?.token) {
            config.headers.Authorization = `Bearer ${parsed.state.token}`;
            return config;
          }
        }
      } catch (e) {
        console.error('Error reading auth-storage:', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check cache for GET requests
    if (isCacheable(config)) {
      const cacheKey = getCacheKey(config);
      const cachedResponse = getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        config.adapter = () => {
          return Promise.resolve({
            data: cachedResponse,
            status: 200,
            statusText: 'OK (Cached)',
            headers: config.headers,
            config,
          });
        };
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Response interceptor — handles all enforcement codes
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (isCacheable(response.config)) {
      const cacheKey = getCacheKey(response.config);
      setCachedResponse(cacheKey, response.data);
    }
    
    // Clear cache on mutations
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method)) {
      const url = response.config.url;
      if (url.includes('/campaigns')) api.clearCache('campaigns');
      else if (url.includes('/items')) api.clearCache('items');
      else if (url.includes('/analytics')) api.clearCache('analytics');
      else if (url.includes('/organizations')) { api.clearCache('organizations'); api.clearCache('team'); }
      else if (url.includes('/team')) api.clearCache('team');
    }
    
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    // ═══════════════════════════════════════════
    // 401: REMOVED_FROM_TEAM — contributor was kicked
    // ═══════════════════════════════════════════
    if (status === 401 && code === 'REMOVED_FROM_TEAM') {
      console.log('🚫 Removed from team — logging out');
      clearAllAuth();
      sessionStorage.setItem('logout_reason', message || 'You have been removed from this account. Please contact the account owner.');
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/signin') && !currentPath.includes('/signup')) {
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 403: REMOVED_FROM_TEAM — blocked on sign in
    // ═══════════════════════════════════════════
    if (status === 403 && code === 'REMOVED_FROM_TEAM') {
      console.log('🚫 Removed contributor tried to sign in');
      clearAllAuth();
      sessionStorage.setItem('suspended_message', message || 'You have been removed from this account. Please contact the account owner.');
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/signin') && !currentPath.includes('/signup')) {
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 403: ACCOUNT_SUSPENDED
    // ═══════════════════════════════════════════
    if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
      console.log('🚫 Account suspended');
      clearAllAuth();

      // Store message for SignIn page to show professional SuspendedModal
      sessionStorage.setItem('suspended_message', message || 'Your account has been suspended. Please contact support@outboundimpact.org for assistance.');

      const currentPath = window.location.pathname;
      if (!currentPath.includes('/signin') && !currentPath.includes('/signup')) {
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 403: EMAIL_NOT_VERIFIED
    // ═══════════════════════════════════════════
    if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
      console.log('📧 Email not verified');
      // Don't alert — AuthPage handles this with verification UI
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 429: ACCOUNT_LOCKED (too many login attempts)
    // ═══════════════════════════════════════════
    if (status === 429 && code === 'ACCOUNT_LOCKED') {
      console.log('🔒 Account locked');
      alert(message || 'Account temporarily locked due to too many failed attempts. Please try again later.');
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 503: MAINTENANCE_MODE
    // ═══════════════════════════════════════════
    if (status === 503 && code === 'MAINTENANCE_MODE') {
      console.log('🔧 Maintenance mode');
      if (!window.__maintenanceAlertShown) {
        window.__maintenanceAlertShown = true;
        alert(message || 'Outbound Impact is currently undergoing maintenance. Please try again shortly.');
        setTimeout(() => { window.__maintenanceAlertShown = false; }, 10000);
      }
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 401: SESSION_EXPIRED or general unauthorized
    // ═══════════════════════════════════════════
    if (status === 401) {
      const isSessionExpired = code === 'SESSION_EXPIRED';
      console.log(isSessionExpired ? '⏰ Session expired' : '🚨 401 Unauthorized');
      
      // Check user role BEFORE clearing auth data
      let wasAdminUser = false;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const userRole = parsed?.state?.user?.role;
          wasAdminUser = userRole === 'ADMIN' || userRole === 'CUSTOMER_SUPPORT';
        }
      } catch (e) { /* ignore */ }
      
      // Clear all auth data (localStorage + cookies)
      clearAllAuth();
      
      // Store reason for SignIn page to show (replaces ugly browser alert)
      if (isSessionExpired) {
        sessionStorage.setItem('logout_reason', message || 'Your session has expired. Please sign in again.');
      }
      
      // Smart redirect
      const currentPath = window.location.pathname;
      const isOnPublicPage = currentPath.includes('/signin') || currentPath.includes('/signup') 
        || currentPath.includes('/admin-login') || currentPath === '/';
      
      if (!isOnPublicPage) {
        if (wasAdminUser || currentPath.includes('/admin')) {
          window.location.href = '/admin-login';
        } else {
          window.location.href = '/signin';
        }
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
    }
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error');
    }
    
    return Promise.reject(error);
  }
);

export default api;