import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LogOut, BarChart3, Users, Globe, DollarSign,
  Target, Send, Tag, Download, Settings, Building2, Menu, X,
  MessagesSquare, UserPlus
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import AdminNotificationsPanel from './AdminNotificationsPanel';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { platformName } = usePlatformSettings();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = '/admin-login';
      logout();
    }
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'CUSTOMER_SUPPORT') {
    navigate('/dashboard');
    return null;
  }

  const navItems = [
    { path: '/admin-panel', icon: BarChart3, label: 'Overview', roles: ['ADMIN'] },
    { path: '/admin-panel/users', icon: Users, label: 'Customers', roles: ['ADMIN'] },
    { path: '/admin-panel/geography', icon: Globe, label: 'Geography', roles: ['ADMIN'] },
    { path: '/admin-panel/revenue', icon: DollarSign, label: 'Revenue', roles: ['ADMIN'] },
    { path: '/admin-panel/opportunities', icon: Target, label: 'Opportunities', roles: ['ADMIN'] },
    { path: '/admin-panel/campaigns', icon: Send, label: 'Campaigns', roles: ['ADMIN'] },
    { path: '/admin-panel/discounts', icon: Tag, label: 'Discount Codes', roles: ['ADMIN'] },
    { path: '/admin-panel/exports', icon: Download, label: 'Data Exports', roles: ['ADMIN'] },
    { path: '/admin-panel/live-chat', icon: MessagesSquare, label: 'Live Chat', roles: ['ADMIN', 'CUSTOMER_SUPPORT'] },
    { path: '/admin-panel/team', icon: UserPlus, label: 'Team', roles: ['ADMIN'] },
  ];

  const bottomItems = [
    { path: '/admin-panel/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
  ];

  const menuItems = navItems.filter(item => item.roles.includes(user?.role));
  const bottomMenuItems = bottomItems.filter(item => item.roles.includes(user?.role));

  const isActive = (path) => {
    if (path === '/admin-panel') return location.pathname === '/admin-panel' || location.pathname === '/admin-panel/dashboard';
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    const allItems = [...navItems, ...bottomItems];
    const match = allItems.find(item => isActive(item.path));
    return match?.label || 'Admin Panel';
  };

  const NavLink = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link to={item.path} onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
        <Icon size={20} /><span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center"><Building2 size={24} /></div>
            <div><h1 className="text-lg font-bold">{platformName || 'OI Admin'}</h1><p className="text-xs text-slate-400">Internal Dashboard</p></div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>
        <div className="p-4 border-t border-slate-700">
          {bottomMenuItems.map(item => <NavLink key={item.path} item={item} />)}
          <div className="mt-3 px-4 py-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded ${user?.role === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
              {user?.role === 'ADMIN' ? 'Admin' : 'Support'}
            </span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-lg mt-1">
            <LogOut size={20} /><span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-slate-900 w-72 h-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center"><Building2 size={24} className="text-white" /></div>
                <div><h1 className="text-lg font-bold text-white">{platformName || 'OI Admin'}</h1><p className="text-xs text-slate-400">Internal Dashboard</p></div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white"><X size={24} /></button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              {menuItems.map(item => <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />)}
              <div className="my-2 border-t border-slate-700" />
              {bottomMenuItems.map(item => <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />)}
              {/* Mobile: User Info + Logout */}
              <div className="my-2 border-t border-slate-700" />
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded ${user?.role === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {user?.role === 'ADMIN' ? 'Admin' : 'Support'}
                </span>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-700/50 rounded-lg">
                <LogOut size={20} /><span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden"><Menu size={24} className="text-slate-700" /></button>
              <div><h2 className="text-xl lg:text-2xl font-bold text-slate-900">{getPageTitle()}</h2><p className="text-sm text-slate-500">{platformName} Company Dashboard</p></div>
            </div>
            <div className="flex items-center gap-3">
              {/* Admin Notifications Bell */}
              <AdminNotificationsPanel />
              {/* Admin Avatar */}
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 cursor-pointer hover:border-purple-400 transition-colors"
                  onClick={() => navigate('/admin-panel/settings')}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/admin-panel/settings')}
                >
                  {user?.name ? (user.name.split(' ').length >= 2 ? (user.name.split(' ')[0][0] + user.name.split(' ')[1][0]).toUpperCase() : user.name.substring(0, 2).toUpperCase()) : 'A'}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;
