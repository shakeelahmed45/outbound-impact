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

// ✅ ENHANCED: Request interceptor with better token handling
api.interceptors.request.use(
  (config) => {
    // ✅ Get token from localStorage (works with Zustand persist)
    const token = localStorage.getItem('token');
    
    // ✅ IMPORTANT: Also check Zustand persist storage
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

// ✅ FIXED: Response interceptor with SMART redirect based on user role
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
      if (url.includes('/campaigns')) {
        api.clearCache('campaigns');
      } else if (url.includes('/items')) {
        api.clearCache('items');
      } else if (url.includes('/analytics')) {
        api.clearCache('analytics');
      }
    }
    
    return response;
  },
  (error) => {
    // ✅ FIXED: Better 401 handling with SMART redirect
    if (error.response?.status === 401) {
      console.log('🚨 401 Unauthorized - Clearing auth');
      
      // ✅ Check if user was an admin BEFORE clearing auth
      let wasAdminUser = false;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const userRole = parsed?.state?.user?.role;
          wasAdminUser = userRole === 'ADMIN' || userRole === 'CUSTOMER_SUPPORT';
          console.log('User role before logout:', userRole, 'Was admin:', wasAdminUser);
        }
      } catch (e) {
        console.error('Error checking user role:', e);
      }
      
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      
      // Clear cache
      api.clearCache();
      
      // ✅ FIXED: Smart redirect based on user role AND current path
      const currentPath = window.location.pathname;
      const isOnAdminPage = currentPath.includes('/admin');
      const isOnLoginPage = currentPath.includes('/signin') || currentPath.includes('/admin-login');
      
      // Don't redirect if already on a login page
      if (!isOnLoginPage) {
        // Redirect admin users to admin login
        if (wasAdminUser || isOnAdminPage) {
          console.log('🔐 Redirecting to admin-login');
          window.location.href = '/admin-login';
        } else {
          console.log('🔐 Redirecting to signin');
          window.location.href = '/signin';
        }
      }
    }
    
    // Better error handling
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - check your connection');
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error - check your internet connection');
    }
    
    return Promise.reject(error);
  }
);

export default api;