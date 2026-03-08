import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = { 
        email: email.toLowerCase().trim(), 
        password 
      };

      // Include 2FA code if in verification step
      if (requires2FA && twoFactorCode) {
        payload.twoFactorCode = twoFactorCode;
      }

      const res = await api.post('/auth/signin', payload);
      
      // Handle 2FA prompt from backend
      if (res.data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      // ✅ Allow both ADMIN and CUSTOMER_SUPPORT roles
      const userRole = res.data.user?.role;
      if (userRole !== 'ADMIN' && userRole !== 'CUSTOMER_SUPPORT') {
        setError('Access Denied: This login is for admin team members only');
        setLoading(false);
        return;
      }
      
      setToken(res.data.accessToken);
      setUser(res.data.user);
      
      console.log('✅ Admin login successful:', res.data.user.email, 'Role:', userRole);
      
      navigate('/admin-panel');
    } catch (err) {
      console.error('❌ Admin login error:', err.response?.data || err.message);
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message;

      // Handle specific error codes
      if (code === 'ACCOUNT_SUSPENDED') {
        // api.js interceptor handles this — redirects to /signin with modal
        return;
      }

      if (err.response?.status === 401) {
        // If 2FA code was wrong, clear it but stay in 2FA mode
        if (requires2FA) {
          setError(msg || 'Invalid verification code');
          setTwoFactorCode('');
        } else {
          setError(msg || 'Invalid email or password');
        }
      } else if (msg) {
        setError(msg);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetToCredentials = () => {
    setRequires2FA(false);
    setTwoFactorCode('');
    setError('');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px' 
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '16px', 
        width: '100%', 
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: requires2FA 
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: requires2FA 
              ? '0 10px 15px -3px rgba(245, 158, 11, 0.3)'
              : '0 10px 15px -3px rgba(124, 58, 237, 0.3)'
          }}>
            {requires2FA ? <KeyRound size={32} color="white" /> : <Shield size={32} color="white" />}
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            color: '#1a1a2e'
          }}>
            {requires2FA ? 'Verification Required' : 'Admin Portal'}
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {requires2FA 
              ? 'Enter the 6-digit code sent to your email'
              : 'Outbound Impact Administration'
            }
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} color="#dc2626" />
            <span style={{ color: '#dc2626', fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Show email/password fields only when NOT in 2FA mode */}
          {!requires2FA && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@outboundimpact.com"
                  required
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c3aed';
                    e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c3aed';
                    e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </>
          )}

          {/* 2FA Code Input */}
          {requires2FA && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                fontSize: '14px',
                color: '#374151'
              }}>
                Verification Code
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  border: '2px solid #e5e7eb', 
                  borderRadius: '12px', 
                  fontSize: '28px',
                  fontFamily: 'monospace',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f59e0b';
                  e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                Check your email inbox and spam folder
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (requires2FA && twoFactorCode.length !== 6)}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: loading ? '#9ca3af' : requires2FA
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: (loading || (requires2FA && twoFactorCode.length !== 6)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (requires2FA && twoFactorCode.length !== 6) ? '0.5' : '1',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: loading ? 'none' : requires2FA
                ? '0 4px 14px 0 rgba(245, 158, 11, 0.4)'
                : '0 4px 14px 0 rgba(124, 58, 237, 0.4)'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                {requires2FA ? 'Verifying...' : 'Signing In...'}
              </>
            ) : requires2FA ? (
              <>
                <KeyRound size={20} />
                Verify & Sign In
              </>
            ) : (
              <>
                <Shield size={20} />
                Sign In to Admin Panel
              </>
            )}
          </button>

          {/* Back to credentials button when in 2FA mode */}
          {requires2FA && (
            <button
              type="button"
              onClick={resetToCredentials}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={16} />
              Back to credentials
            </button>
          )}
        </form>

        {/* Footer */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            This portal is for authorized administrators only.
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            For regular user access, please use the{' '}
            <a 
              href="/signin" 
              style={{ color: '#7c3aed', textDecoration: 'none' }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              main sign in page
            </a>
          </p>
        </div>
      </div>
      
      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminLogin;
