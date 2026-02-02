import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import NetworkWarning from './components/common/NetworkWarning';
import SplashScreen from './components/common/SplashScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import RootRedirect from './components/common/RootRedirect';
import GlobalAiChatWidget from './components/GlobalAiChatWidget';  // ✨ NEW: AI Chat Widget
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Plans from './pages/Plans';
import AuthSuccess from './pages/AuthSuccess';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import ItemsPage from './pages/ItemsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TeamPage from './pages/TeamPage';
import CampaignsPage from './pages/CampaignsPage';
import SettingsPage from './pages/SettingsPage';
import LiveChatPage from './pages/LiveChatPage';
import PublicViewer from './pages/PublicViewer';
import PublicCampaignViewer from './pages/PublicCampaignViewer';
import EnterprisePage from './pages/EnterprisePage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminItems from './pages/admin/AdminItems';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';
import AdminLiveChatPage from './pages/admin/AdminLiveChatPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import TeamManagementPage from './pages/admin/TeamManagementPage';
import ApiAccessPage from './pages/enterprise/ApiAccessPage';
import WhiteLabelPage from './pages/enterprise/WhiteLabelPage';
import IntegrationsPage from './pages/enterprise/IntegrationsPage';
import AdvancedAnalyticsPage from './pages/enterprise/AdvancedAnalyticsPage';
import SecurityPage from './pages/enterprise/SecurityPage';
import UserGuidePage from './pages/UserGuidePage';
import AcceptInvitation from './pages/AcceptInvitation';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    return !hasShownSplash;
  });

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
      <Routes>
        <Route path="/" element={<RootRedirect />} />
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
        <Route path="/admin-panel/users/:userId" element={<ProtectedRoute><UserDetailPage /></ProtectedRoute>} />
        <Route path="/admin-panel/items" element={<ProtectedRoute><AdminItems /></ProtectedRoute>} />
        <Route path="/admin-panel/feedback" element={<ProtectedRoute><AdminFeedbackPage /></ProtectedRoute>} />
        <Route path="/admin-panel/live-chat" element={<ProtectedRoute><AdminLiveChatPage /></ProtectedRoute>} />
        <Route path="/admin-panel/team" element={<ProtectedRoute><TeamManagementPage /></ProtectedRoute>} />
      </Routes>
      
      {/* ✨ NEW: Global AI Chat Widget (appears on all pages except dashboard which has its own) */}
      <GlobalAiChatWidget showBlinkingPrompt={false} />
    </BrowserRouter>
  );
}

export default App;