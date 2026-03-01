import axios from 'axios';

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
    // 403: ACCOUNT_SUSPENDED
    // ═══════════════════════════════════════════
    if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
      console.log('🚫 Account suspended');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      api.clearCache();
      alert(message || 'Your account has been suspended. Please contact support for assistance.');
      window.location.href = '/signin';
      return Promise.reject(error);
    }

    // ═══════════════════════════════════════════
    // 403: EMAIL_NOT_VERIFIED
    // ═══════════════════════════════════════════
    if (status === 403 && code === 'EMAIL_NOT_VERIFIED') {
      console.log('📧 Email not verified');
      alert(message || 'Please verify your email address before signing in.');
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
      
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      api.clearCache();
      
      // Show specific message for session expiry
      if (isSessionExpired && !window.__sessionExpiredShown) {
        window.__sessionExpiredShown = true;
        alert(message || 'Your session has expired. Please sign in again.');
        setTimeout(() => { window.__sessionExpiredShown = false; }, 5000);
      }
      
      // Smart redirect
      const currentPath = window.location.pathname;
      const isOnLoginPage = currentPath.includes('/signin') || currentPath.includes('/admin-login');
      
      if (!isOnLoginPage) {
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