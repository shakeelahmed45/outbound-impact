import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2, Check } from 'lucide-react';
import api from '../services/api';

const POLL_INTERVAL = 30000; // Poll every 30 seconds for new notifications

const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.data.status === 'success') {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail - notifications are non-critical
      console.error('Failed to fetch notifications:', err.message);
    }
  }, []);

  // Quick unread count poll (lightweight)
  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data.status === 'success') {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();

    // Poll for unread count
    pollRef.current = setInterval(pollUnreadCount, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications, pollUnreadCount]);

  // Full refresh when panel opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mark single as read
  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err.message);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
    }
  };

  // Delete single notification
  const removeNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (removed && !removed.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err.message);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err.message);
    }
  };

  // Get icon by notification type
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'alert':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-orange-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  // Format time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition-all shadow-sm"
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check size={12} /> Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto text-gray-300 mb-3" size={36} />
                <p className="text-gray-600 text-sm font-medium">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-purple-50/40' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`font-semibold text-sm leading-tight ${
                              !notification.read ? 'text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!notification.read && (
                              <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
