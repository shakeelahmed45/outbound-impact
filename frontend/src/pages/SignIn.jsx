import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const SignIn = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    document.title = 'Sign In | Outbound Impact';
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password
      };

      // Add 2FA code if required
      if (requires2FA && twoFactorCode) {
        payload.twoFactorCode = twoFactorCode;
      }

      const response = await api.post('/auth/signin', payload);
      
      if (response.data.status === 'success') {
        // Check if 2FA is required
        if (response.data.requires2FA) {
          setRequires2FA(true);
          setError('');
          // Show success message
          const successDiv = document.createElement('div');
          successDiv.className = 'mb-4 p-3 bg-green-50 border border-green-200 rounded-lg';
          successDiv.innerHTML = '<p class="text-green-600 text-sm">✅ 2FA code sent to your email! Check your inbox.</p>';
          document.querySelector('form').prepend(successDiv);
          setTimeout(() => successDiv.remove(), 5000);
          setLoading(false);
          return;
        }

        // Normal login (no 2FA or 2FA verified)
        setToken(response.data.accessToken);
        setUser(response.data.user);
        
        // Redirect based on role
        if (response.data.user.role === 'ADMIN') {
          navigate('/admin-panel');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sign in failed');
      // If 2FA code was wrong, clear it
      if (err.response?.data?.message?.includes('2FA')) {
        setTwoFactorCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/logo.webp" 
            alt="Outbound Impact" 
            className="w-45 h-24 mx-auto mb-4 animate-pulse-slow"
            onError={(e) => e.target.style.display = 'none'}
          />
          <h1 className="text-4xl font-bold text-primary mb-2">
            {requires2FA ? '🔒 Enter 2FA Code' : 'Welcome Back'}
          </h1>
          <p className="text-secondary">
            {requires2FA ? 'Check your email for the verification code' : 'Sign in to your account'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field - hide if 2FA is active */}
            {!requires2FA && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>
            )}

            {/* Password field - hide if 2FA is active */}
            {!requires2FA && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary font-semibold hover:text-secondary transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {/* 2FA Code field - show only if 2FA is required */}
            {requires2FA && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTwoFactorCode(value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="mt-2 text-sm text-gray-600">
                  Check your email inbox (and spam folder) for the code
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (requires2FA && twoFactorCode.length !== 6)}
              className="w-full gradient-btn text-white py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {requires2FA ? 'Verifying...' : 'Signing In...'}
                </>
              ) : (
                requires2FA ? 'Verify & Sign In' : 'Sign In'
              )}
            </button>

            {/* Back button for 2FA */}
            {requires2FA && (
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2"
              >
                ← Back to Sign In
              </button>
            )}
          </form>
