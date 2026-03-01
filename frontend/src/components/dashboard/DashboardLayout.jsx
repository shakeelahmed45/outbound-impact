import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import NotificationsPanel from '../NotificationsPanel';
import SubscriptionBlockedModal from '../SubscriptionBlockedModal';
import GlobalAiChatWidget from '../GlobalAiChatWidget';
import PushNotificationPrompt from '../PushNotificationPrompt';
import useAuthStore from '../../store/authStore';
import { Menu, Search } from 'lucide-react';

// ✅ NEW: Map routes to page titles & subtitles
const PAGE_META = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview and management' },
  '/dashboard/upload': { title: 'Upload', subtitle: 'Upload new content' },
  '/dashboard/items': { title: 'My Items', subtitle: 'Manage your uploaded content' },
  '/dashboard/analytics': { title: 'Analytics', subtitle: 'View performance metrics' },
  '/dashboard/advanced-analytics': { title: 'Advanced Analytics', subtitle: 'Detailed performance insights' },
  '/dashboard/team': { title: 'Contributors', subtitle: 'Manage team members and permissions' },
  '/dashboard/campaigns': { title: 'Streams', subtitle: 'Manage your content streams' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Account and app settings' },
  '/dashboard/support': { title: 'Help & Support', subtitle: 'Get help with using Outbound Impact' },
  '/dashboard/activity': { title: 'All Activity', subtitle: 'Complete history of views and engagement' },
  '/dashboard/inbox': { title: 'Inbox', subtitle: 'Messages and notifications' },
  '/dashboard/profile': { title: 'Profile', subtitle: 'Manage your account information' },
  '/dashboard/white-label': { title: 'White Label', subtitle: 'Customize branding for your organization' },
  '/dashboard/integrations': { title: 'Integrations', subtitle: 'Connect third-party services' },
  '/dashboard/security': { title: 'Security & 2FA', subtitle: 'Account security settings' },
  '/dashboard/cohorts': { title: 'Cohorts', subtitle: 'Manage user cohorts' },
  '/dashboard/guide': { title: 'Guide', subtitle: 'Getting started guide' },
};

const DashboardLayout = ({ children }) => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user's subscription is canceled and they should be blocked
  const isSubscriptionBlocked = () => {
    if (!user) return false;
    if (user.isTeamMember) return false;
    if (user.subscriptionStatus === 'canceled') return true;
    return false;
  };

  useEffect(() => {
    const shouldBlock = isSubscriptionBlocked();
    if (shouldBlock !== showBlockingModal) {
      setShowBlockingModal(shouldBlock);
    }
  }, [user?.subscriptionStatus, user?.isTeamMember]);

  const handleReactivateSuccess = (updatedUser) => {
    setUser(updatedUser);
    setShowBlockingModal(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (showBlockingModal) {
    return <SubscriptionBlockedModal user={user} onReactivateSuccess={handleReactivateSuccess} />;
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Individual plan → profile icon goes to Settings, not Profile
  const effectiveUser = user?.isTeamMember ? user?.organization : user;
  const isIndividual = effectiveUser?.role === 'INDIVIDUAL';
  const profileIconTarget = isIndividual ? '/dashboard/settings' : '/dashboard/profile';

  // ✅ NEW: Get page meta from current route
  const currentPath = location.pathname;
  const pageMeta = PAGE_META[currentPath] || { title: 'Dashboard', subtitle: 'Overview and management' };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <SidebarNav mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* ═══════════════════════════════════════
            ✅ NEW: Desktop Header Bar
            Shows: Page Title + Notifications + Avatar
           ═══════════════════════════════════════ */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 px-6 lg:px-8 py-3 items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageMeta.title}</h1>
            <p className="text-xs text-gray-500">{pageMeta.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications Bell */}
            <NotificationsPanel />

            {/* User Avatar */}
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => navigate(profileIconTarget)}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => navigate(profileIconTarget)}
              >
                {getInitials(user?.name)}
              </div>
            )}
          </div>
        </header>

        {/* ═══════════════════════════════════════
            Mobile Top Header (only visible on small screens)
           ═══════════════════════════════════════ */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={22} className="text-gray-700" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">{pageMeta.title}</h1>
              <p className="text-[10px] text-gray-500">{pageMeta.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications Bell (mobile) */}
            <NotificationsPanel />

            {/* User Avatar (mobile) */}
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
                onClick={() => navigate(profileIconTarget)}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs cursor-pointer"
                onClick={() => navigate(profileIconTarget)}
              >
                {getInitials(user?.name)}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* AI Chat Widget */}
      <GlobalAiChatWidget showBlinkingPrompt={true} />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />
    </div>
  );
};

export default DashboardLayout;
