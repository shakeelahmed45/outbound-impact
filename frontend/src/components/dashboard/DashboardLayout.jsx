import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import BottomNav from './BottomNav';
import SubscriptionBlockedModal from '../SubscriptionBlockedModal';
import GlobalAiChatWidget from '../GlobalAiChatWidget';  // ✨ NEW: AI Chat Widget
import useAuthStore from '../../store/authStore';

const DashboardLayout = ({ children }) => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [showBlockingModal, setShowBlockingModal] = useState(false);

  // Check if user's subscription is canceled and they should be blocked
  const isSubscriptionBlocked = () => {
    // Don't block if user is not logged in
    if (!user) return false;

    // Don't block team members (they use organization's subscription)
    if (user.isTeamMember) return false;

    // ✅ Block ANY user with canceled status (regardless of role)
    // Note: 'canceling' means it will cancel at period end, so they still have access
    if (user.subscriptionStatus === 'canceled') return true;

    return false;
  };

  // ✅ NEW: Watch for user changes and check blocking status
  useEffect(() => {
    const shouldBlock = isSubscriptionBlocked();
    
    if (shouldBlock !== showBlockingModal) {
      setShowBlockingModal(shouldBlock);
    }
  }, [user?.subscriptionStatus, user?.isTeamMember]); // Re-run when these change

  const handleReactivateSuccess = (updatedUser) => {
    // Update user in store
    setUser(updatedUser);
    setShowBlockingModal(false);
  };

  // If subscription is blocked, show the blocking modal
  if (showBlockingModal) {
    return <SubscriptionBlockedModal user={user} onReactivateSuccess={handleReactivateSuccess} />;
  }

  // Normal layout for users with active subscriptions
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
      <BottomNav />
      
      {/* ✨ NEW: AI Chat Widget with blinking prompt on dashboard */}
      <GlobalAiChatWidget showBlinkingPrompt={true} />
    </div>
  );
};

export default DashboardLayout;