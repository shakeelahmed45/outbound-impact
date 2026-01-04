import { useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import BottomNav from './BottomNav';
import SubscriptionBlockedModal from '../SubscriptionBlockedModal';
import useAuthStore from '../../store/authStore';

const DashboardLayout = ({ children }) => {
  const { user, setUser } = useAuthStore();

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

  const handleReactivateSuccess = (updatedUser) => {
    // Update user in store
    setUser(updatedUser);
  };

  // If subscription is blocked, show the blocking modal
  if (isSubscriptionBlocked()) {
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
    </div>
  );
};

export default DashboardLayout;
