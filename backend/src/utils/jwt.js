const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

/**
 * ✅ FIXED: Generate access token with 30-day expiration
 * This ensures users stay logged in even after closing browser
 */
const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    { 
      userId, 
      email, 
      role 
    },
    JWT_SECRET,
    { 
      expiresIn: '30d' // ✅ FIXED: 30 days (was likely too short before)
    }
  );
};

/**
 * ✅ Generate refresh token with 90-day expiration
 * Used for renewing access tokens
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: '90d' // ✅ 90 days for refresh token
    }
  );
};

/**
 * ✅ Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * ✅ Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
};

/**
 * ✅ NEW: Decode token without verifying (useful for checking expiration)
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * ✅ NEW: Check if token is expired
 */
const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // Check if token expires in less than 24 hours
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  
  return timeUntilExpiration < 0;
};

/**
 * ✅ NEW: Check if token will expire soon (within 7 days)
 */
const willTokenExpireSoon = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  
  return timeUntilExpiration < sevenDaysInMs;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  willTokenExpireSoon,
};