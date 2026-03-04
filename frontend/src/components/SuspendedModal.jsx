import { useState, useEffect } from 'react';
import { ShieldAlert, Mail, X, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';

/**
 * SuspendedModal
 * 
 * Professional full-screen modal shown when a user's account is suspended.
 * Triggered via custom event 'account-suspended' from api.js interceptor
 * OR via prop from SignIn page.
 * 
 * Shows reason (if provided), contact support button, and logout action.
 */
const SuspendedModal = ({ isOpen: propIsOpen, message: propMessage, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const logout = useAuthStore((state) => state.logout);

  // Listen for global 'account-suspended' event (from api.js interceptor)
  useEffect(() => {
    const handleSuspended = (e) => {
      const msg = e.detail?.message || 'Your account has been suspended.';
      setMessage(msg);
      setIsOpen(true);
    };

    window.addEventListener('account-suspended', handleSuspended);
    return () => window.removeEventListener('account-suspended', handleSuspended);
  }, []);

  // Also respond to prop-driven open (from SignIn page)
  useEffect(() => {
    if (propIsOpen) {
      setMessage(propMessage || 'Your account has been suspended.');
      setIsOpen(true);
    }
  }, [propIsOpen, propMessage]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    setIsOpen(false);
    if (onClose) onClose();
    window.location.href = '/signin';
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Red header strip */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <ShieldAlert className="text-white" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Account Suspended</h2>
          <p className="text-red-100 text-sm mt-1">Your access has been temporarily restricted</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <p className="text-sm text-red-800 leading-relaxed">
              {message}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">While your account is suspended:</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>You cannot access your dashboard or upload content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>Your existing QR codes and links remain active</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>Your data is safe and preserved</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-slate-500 text-center mb-5">
            If you believe this is a mistake, please reach out to our support team.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="mailto:support@outboundimpact.org"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Mail size={18} />
              Contact Support
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default SuspendedModal;
