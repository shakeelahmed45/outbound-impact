import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, FileText, Shield, MessageSquare, MessagesSquare } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  if (user?.role !== 'ADMIN') {
    navigate('/dashboard');
    return null;
  }

  const menuItems = [
    { path: '/admin-panel', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin-panel/users', icon: Users, label: 'Manage Users' },
    { path: '/admin-panel/items', icon: FileText, label: 'Manage Items' },
    { path: '/admin-panel/feedback', icon: MessageSquare, label: 'User Feedback' },
    { path: '/admin-panel/live-chat', icon: MessagesSquare, label: 'Live Chat' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Shield size={32} className="text-purple-400" />
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs text-gray-400">Outbound Impact</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;