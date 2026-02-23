import { Home, Upload, BarChart3, Settings, Users, FolderOpen, UserCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Use org owner's role for team members
  const effectiveRole = user?.isTeamMember ? user?.organization?.role : user?.role;
  const isSmallOrAbove = effectiveRole === 'ORG_SMALL' || effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE';
  const isMediumOrAbove = effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE';
  const isTeamViewer = user?.isTeamMember && user?.teamRole === 'VIEWER';

  // ✅ NEW: VIEWER + EDITOR cannot access billing or manage team
  const canAccessBilling = !user?.isTeamMember || user?.teamRole === 'ADMIN';
  const canAccessContributors = !user?.isTeamMember || user?.teamRole === 'ADMIN';

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
  ];

  // Upload — hidden for VIEWER team members
  if (!isTeamViewer) {
    navItems.push({ path: '/dashboard/upload', icon: Upload, label: 'Upload' });
  }

  navItems.push({ path: '/dashboard/items', icon: FolderOpen, label: 'Content' });

  // Analytics — Medium+ gets advanced, Individual gets basic
  if (isMediumOrAbove) {
    navItems.push({ path: '/dashboard/advanced-analytics', icon: BarChart3, label: 'Analytics' });
  } else {
    navItems.push({ path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' });
  }

  // ✅ Contributor — hidden for VIEWER + EDITOR (only ADMIN/owner)
  if (isSmallOrAbove && canAccessContributors) {
    navItems.push({ path: '/dashboard/team', icon: Users, label: 'Contributor' });
  }

  // ✅ NEW: VIEWER/EDITOR see Profile instead of Settings (billing)
  if (canAccessBilling) {
    navItems.push({ path: '/dashboard/settings', icon: Settings, label: 'Settings' });
  } else {
    navItems.push({ path: '/dashboard/profile', icon: UserCircle, label: 'Profile' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0 px-1 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-primary bg-purple-50'
                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
