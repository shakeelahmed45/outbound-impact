import { LogOut, User, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-2 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Left Side: Profile Picture + User Info */}
      <div className="flex items-center gap-4">
        {/* Profile Picture */}
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="relative group"
        >
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-primary transition-all"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm border-2 border-transparent group-hover:border-primary transition-all">
              {getInitials(user?.name)}
            </div>
          )}
          
          {/* Hover Tooltip */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 bg-gray-900 text-white text-xs py-1 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Edit Profile Picture
          </div>
        </button>

        {/* User Name */}
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Right Side: Help + Logout */}
      <div className="flex items-center gap-3">
        {/* Help Button */}
        <button
          onClick={() => navigate('/dashboard/guide')}
          className="relative group p-2 hover:bg-gray-100 rounded-lg transition-all"
          title="User Guide"
        >
          <HelpCircle size={24} className="text-primary group-hover:text-secondary transition-colors" />
          
          {/* Hover Tooltip */}
          <div className="absolute right-0 top-full mt-2 bg-gray-900 text-white text-xs py-1 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            User Guide & Help
          </div>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 gradient-btn text-white rounded-lg font-semibold transition-all"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;