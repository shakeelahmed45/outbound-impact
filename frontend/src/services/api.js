import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ✅ OPTIMIZATION: Add timeout to prevent hanging requests
  timeout: 30000, // 30 seconds
});

// ✅ OPTIMIZATION: Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// ✅ OPTIMIZATION: Cache helper functions
const getCacheKey = (config) => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params)}`;
};

const isCacheable = (config) => {
  // Only cache GET requests
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
  
  // ✅ OPTIMIZATION: Limit cache size to prevent memory issues
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// ✅ OPTIMIZATION: Clear cache function (call when data is updated)
api.clearCache = (pattern) => {
  if (pattern) {
    // Clear specific cache entries
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
};

// ✅ OPTIMIZATION: Request interceptor with caching
api.interceptors.request.use((config) => {
  // Add token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Check cache for GET requests
  if (isCacheable(config)) {
    const cacheKey = getCacheKey(config);
    const cachedResponse = getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      // Return cached response
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
}, (error) => {
  return Promise.reject(error);
});

// ✅ OPTIMIZATION: Response interceptor with caching
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (isCacheable(response.config)) {
      const cacheKey = getCacheKey(response.config);
      setCachedResponse(cacheKey, response.data);
    }
    
    // Clear cache on mutations (POST, PUT, DELETE)
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method)) {
      // Clear related cache entries
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
    // Handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    
    // ✅ OPTIMIZATION: Better error handling
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - check your connection');
    }
    
    return Promise.reject(error);
  }
);

export default api;
