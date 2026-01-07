/**
 * Safari-friendly storage wrapper
 * Falls back to cookies if localStorage is unavailable or gets cleared
 */

// Detect if we're in Safari
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

// Cookie helper functions
const setCookie = (name, value, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

const getCookie = (name) => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// Test if localStorage is available and persistent
const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safari-friendly storage implementation
 * Uses localStorage when available, falls back to cookies in Safari
 */
const safariFriendlyStorage = {
  getItem: (key) => {
    // Try localStorage first
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        console.log(`ðŸ“¦ Retrieved from localStorage: ${key}`);
        return value;
      }
    } catch (e) {
      console.warn('âš ï¸ localStorage.getItem failed:', e);
    }

    // Fallback to cookie (especially for Safari)
    const cookieValue = getCookie(key);
    if (cookieValue) {
      console.log(`ðŸª Retrieved from cookie (Safari fallback): ${key}`);
      return cookieValue;
    }

    return null;
  },

  setItem: (key, value) => {
    console.log(`ðŸ’¾ Saving ${key}...`);
    
    // Try localStorage first
    try {
      localStorage.setItem(key, value);
      console.log(`âœ… Saved to localStorage: ${key}`);
    } catch (e) {
      console.warn('âš ï¸ localStorage.setItem failed:', e);
    }

    // ALWAYS also save to cookie as backup (especially for Safari)
    try {
      setCookie(key, value, 30); // 30 days
      console.log(`âœ… Saved to cookie (Safari backup): ${key}`);
    } catch (e) {
      console.warn('âš ï¸ Cookie save failed:', e);
    }
  },

  removeItem: (key) => {
    console.log(`ðŸ—‘ï¸ Removing ${key}...`);
    
    // Remove from localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('âš ï¸ localStorage.removeItem failed:', e);
    }

    // Remove from cookie
    try {
      deleteCookie(key);
    } catch (e) {
      console.warn('âš ï¸ Cookie delete failed:', e);
    }
  },
};

// On page load, sync cookie to localStorage if needed (Safari recovery)
if (isSafari() && isLocalStorageAvailable()) {
  const authStorageCookie = getCookie('auth-storage');
  const authStorageLocal = localStorage.getItem('auth-storage');
  
  // If cookie exists but localStorage is empty, restore from cookie
  if (authStorageCookie && !authStorageLocal) {
    console.log('ðŸŽ Safari detected: Restoring auth-storage from cookie backup');
    try {
      localStorage.setItem('auth-storage', authStorageCookie);
      console.log('âœ… Restored auth-storage to localStorage from cookie');
    } catch (e) {
      console.error('âŒ Failed to restore from cookie:', e);
    }
  }
}

export default safariFriendlyStorage;