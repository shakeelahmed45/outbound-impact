import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import NetworkWarning from './components/common/NetworkWarning';
import SplashScreen from './components/common/SplashScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import useBrandColors from './hooks/useBrandColors';

// ✅ OPTIMIZATION: Lazy load all pages for faster initial load
const SignUp = lazy(() => import('./pages/SignUp'));
const SignIn = lazy(() => import('./pages/SignIn'));
const Plans = lazy(() => import('./pages/Plans'));
const AuthSuccess = lazy(() => import('./pages/AuthSuccess'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ItemsPage = lazy(() => import('./pages/ItemsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LiveChatPage = lazy(() => import('./pages/LiveChatPage'));
const PublicViewer = lazy(() => import('./pages/PublicViewer'));
const PublicCampaignViewer = lazy(() => import('./pages/PublicCampaignViewer'));
const EnterprisePage = lazy(() => import('./pages/EnterprisePage'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminItems = lazy(() => import('./pages/admin/AdminItems'));
const AdminFeedbackPage = lazy(() => import('./pages/admin/AdminFeedbackPage'));
const AdminLiveChatPage = lazy(() => import('./pages/admin/AdminLiveChatPage'));
const ApiAccessPage = lazy(() => import('./pages/enterprise/ApiAccessPage'));
const WhiteLabelPage = lazy(() => import('./pages/enterprise/WhiteLabelPage'));
const IntegrationsPage = lazy(() => import('./pages/enterprise/IntegrationsPage'));
const AdvancedAnalyticsPage = lazy(() => import('./pages/enterprise/AdvancedAnalyticsPage'));
const SecurityPage = lazy(() => import('./pages/enterprise/SecurityPage'));
const UserGuidePage = lazy(() => import('./pages/UserGuidePage'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// ✅ OPTIMIZATION: Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    return !hasShownSplash;
  });

  useBrandColors();

  const handleSplashEnd = () => {
    setShowSplash(false);
    sessionStorage.setItem('hasShownSplash', 'true');
  };

  if (showSplash) {
    return <SplashScreen onAnimationEnd={handleSplashEnd} />;
  }

  return (
    <BrowserRouter>
      <NetworkWarning />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          
          {/* Public Routes */}
          <Route path="/l/:slug" element={<PublicViewer />} />
          <Route path="/c/:slug" element={<PublicCampaignViewer />} />
          
          {/* Team Invitation Route */}
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
          
          {/* User Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/dashboard/items" element={<ProtectedRoute><ItemsPage /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/dashboard/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/dashboard/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/dashboard/guide" element={<ProtectedRoute><UserGuidePage /></ProtectedRoute>} />
          
          {/* Live Chat Route */}
          <Route path="/live-chat" element={<ProtectedRoute><LiveChatPage /></ProtectedRoute>} />
          
          {/* Enterprise Routes */}
          <Route path="/dashboard/api-access" element={<ProtectedRoute><ApiAccessPage /></ProtectedRoute>} />
          <Route path="/dashboard/white-label" element={<ProtectedRoute><WhiteLabelPage /></ProtectedRoute>} />
          <Route path="/dashboard/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
          <Route path="/dashboard/advanced-analytics" element={<ProtectedRoute><AdvancedAnalyticsPage /></ProtectedRoute>} />
          <Route path="/dashboard/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-panel" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-panel/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin-panel/items" element={<ProtectedRoute><AdminItems /></ProtectedRoute>} />
          <Route path="/admin-panel/feedback" element={<ProtectedRoute><AdminFeedbackPage /></ProtectedRoute>} />
          <Route path="/admin-panel/live-chat" element={<ProtectedRoute><AdminLiveChatPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
