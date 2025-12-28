require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const teamRoutes = require('./routes/teamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const advancedAnalyticsRoutes = require('./routes/advancedAnalyticsRoutes');

// ✨ Enterprise feature routes
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const securityRoutes = require('./routes/securityRoutes');
const whiteLabelRoutes = require('./routes/whiteLabelRoutes');
const integrationsRoutes = require('./routes/integrationsRoutes');
const platformRoutes = require('./routes/platformIntegrationRoutes');

// 🔍 DEBUG ROUTES - NEW!
const debugRoutes = require('./routes/debugRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow web app AND mobile app
const allowedOrigins = [
  process.env.FRONTEND_URL,      // Web app (https://outboundimpact.net)
  'https://localhost',            // Capacitor Android
  'capacitor://localhost',        // Capacitor alternative format
  'http://localhost:5173',        // Local development
  'http://localhost:5000'         // Local backend testing
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development: log blocked origins to help debug
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser middleware with increased limit for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Set timeout for all routes (especially for file uploads)
app.use((req, res, next) => {
  // Set timeout to 5 minutes for upload routes
  if (req.path.includes('/upload')) {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Outbound Impact API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);

// ✨ Enterprise feature routes
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/platforms', platformRoutes);

// 🔍 DEBUG ROUTES - NEW!
app.use('/api/debug', debugRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Export for Vercel serverless function
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`📱 Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✨ Enterprise features enabled!`);
    console.log(`🛍️ Multi-platform e-commerce integration ready!`);
    console.log(`🔍 Debug routes active at /api/debug`); // NEW!
  });
}