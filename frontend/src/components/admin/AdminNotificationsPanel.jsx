import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle,
  Trash2, Check, Settings as SettingsIcon, UserPlus,
  DollarSign, TrendingDown, Shield, ArrowLeft
} from 'lucide-react';
import api from '../../services/api';

const POLL_INTERVAL = 30000;

const ADMIN_CATEGORIES = [
  { key: 'new_customer', label: 'New Customer Alerts', desc: 'When new customers sign up', icon: UserPlus, color: 'text-green-600' },
  { key: 'revenue', label: 'Revenue Events', desc: 'Plan upgrades, downgrades, milestones', icon: DollarSign, color: 'text-blue-600' },
  { key: 'churn', label: 'Churn Alerts', desc: 'Cancellations and churn risks', icon: TrendingDown, color: 'text-orange-600' },
  { key: 'system', label: 'System Alerts', desc: 'Critical system notifications', icon: Shield, color: 'text-red-600' },
  { key: 'platform', label: 'Platform Activity', desc: 'Content published, campaigns, team events', icon: Info, color: 'text-purple-600' },
];

const AdminNotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);
  const pollRef = useRef(null);

  const [categorySettings, setCategorySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_notif_settings');
      return saved ? JSON.parse(saved) : { new_customer: true, revenue: true, churn: true, system: true, platform: true };
    } catch { return { new_customer: true, revenue: true, churn: true, system: true, platform: true }; }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=30', { skipCache: true });
      if (res.data.status === 'success') {
        // Filter out campaign_log entries (those are for campaign history page, not bell)
        const filtered = (res.data.notifications || []).filter(n => n.category !== 'campaign_log');
        setNotifications(filtered);
        setUnreadCount(filtered.filter(n => !n.read).length);
      }
    } catch (err) { console.error('Admin notifications fetch failed:', err.message); }
  }, []);

  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count', { skipCache: true });
      if (res.data.status === 'success') setUnreadCount(res.data.unreadCount || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(pollUnreadCount, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications, pollUnreadCount]);

  useEffect(() => { if (isOpen) fetchNotifications(); }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) { setIsOpen(false); setShowSettings(false); }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error('Mark as read failed:', err.message); }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) { console.error('Mark all read failed:', err.message); }
  };

  const removeNotification = async (id) => {
    try {
      const removed = notifications.find(n => n.id === id);
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error('Delete failed:', err.message); }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) { console.error('Clear all failed:', err.message); }
  };

  const toggleCategory = (key) => {
    const updated = { ...categorySettings, [key]: !categorySettings[key] };
    setCategorySettings(updated);
    try { localStorage.setItem('admin_notif_settings', JSON.stringify(updated)); } catch {}
  };

  const filteredNotifications = notifications.filter(n => {
    const cat = n.category || 'platform';
    return categorySettings[cat] !== false;
  });

  const getIcon = (type, category) => {
    switch (category) {
      case 'new_customer': return <UserPlus className="text-green-500" size={18} />;
      case 'revenue': return <DollarSign className="text-blue-500" size={18} />;
      case 'churn': return <TrendingDown className="text-orange-500" size={18} />;
      case 'system': return <Shield className="text-red-500" size={18} />;
      default: break;
    }
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={18} />;
      case 'alert': return <AlertCircle className="text-red-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={18} />;
      default: return <Info className="text-purple-500" size={18} />;
    }
  };

  const getCategoryLabel = (category) => {
    const cat = ADMIN_CATEGORIES.find(c => c.key === category);
    return cat?.label || 'Platform';
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowSettings(false); }}
        className="relative p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition-all shadow-sm"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[550px] overflow-hidden flex flex-col">

          {showSettings ? (
            /* ─── Settings View ─── */
            <>
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <button onClick={() => setShowSettings(false)} className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100">
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-bold text-slate-900 text-sm">Notification Settings</h3>
              </div>
              <div className="p-4 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-4">Choose which admin notifications you want to see</p>
                <div className="space-y-3">
                  {ADMIN_CATEGORIES.map(({ key, label, desc, icon: Icon, color }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon size={18} className={color} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{label}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCategory(key)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${categorySettings[key] ? 'bg-purple-600' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${categorySettings[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ─── Notifications List ─── */
            <>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Admin Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      <Check size={12} /> Read all
                    </button>
                  )}
                  {filteredNotifications.length > 0 && (
                    <button onClick={clearAll} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear all">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={() => setShowSettings(true)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Settings">
                    <SettingsIcon size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto text-slate-300 mb-3" size={36} />
                    <p className="text-slate-600 text-sm font-medium">No notifications</p>
                    <p className="text-xs text-slate-400 mt-1">Platform events will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredNotifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notification.read ? 'bg-purple-50/40' : ''}`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type, notification.category)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={`font-semibold text-sm leading-tight ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {notification.title}
                                </p>
                                <span className="text-[10px] font-medium text-purple-500 uppercase tracking-wider">
                                  {getCategoryLabel(notification.category)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {!notification.read && <span className="w-2 h-2 bg-purple-600 rounded-full"></span>}
                                <button onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }} className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors">
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5">{timeAgo(notification.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationsPanel;
