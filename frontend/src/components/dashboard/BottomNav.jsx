import { Home, Upload, BarChart3, Settings, Users, FolderOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isOrg = user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE';
  const isSmallOrAbove = user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE';

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/dashboard/upload', icon: Upload, label: 'Upload' },
    { path: '/dashboard/items', icon: FolderOpen, label: 'Messages' },
    // Show Advanced Analytics for Small, Medium, and Enterprise
    // Show regular Analytics for Individual users only
    isSmallOrAbove
      ? { path: '/dashboard/advanced-analytics', icon: BarChart3, label: 'Analytics' }
      : { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  if (isOrg) {
    navItems.push({ path: '/dashboard/team', icon: Users, label: 'Contributor' });
  }

  navItems.push({ path: '/dashboard/settings', icon: Settings, label: 'Settings' });

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