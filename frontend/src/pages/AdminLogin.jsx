import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/signin', { 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      // ✅ FIXED: Allow both ADMIN and CUSTOMER_SUPPORT roles
      const userRole = res.data.user.role;
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
      
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            color: '#1a1a2e'
          }}>
            Admin Portal
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Outbound Impact Administration
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

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(124, 58, 237, 0.4)'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px 0 rgba(124, 58, 237, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = loading ? 'none' : '0 4px 14px 0 rgba(124, 58, 237, 0.4)';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Signing In...
              </>
            ) : (
              <>
                <Shield size={20} />
                Sign In to Admin Panel
              </>
            )}
          </button>
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