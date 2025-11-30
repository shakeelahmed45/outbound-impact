import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setToken } = useAuthStore();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Completing your registration...');

  useEffect(() => {
    const completeSignup = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setMessage('Invalid session');
        return;
      }

      try {
        const response = await api.post('/auth/complete-signup', { sessionId });

        if (response.data.status === 'success') {
          setToken(response.data.accessToken);
          setUser(response.data.user);
          
          setStatus('success');
          setMessage('Account created successfully!');

          // Clear signup data
          localStorage.removeItem('signupData');

          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to complete signup');
      }
    };

    completeSignup();
  }, [searchParams, navigate, setUser, setToken]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-primary mb-2">{message}</h2>
            <p className="text-secondary">Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-primary mb-2">{message}</h2>
            <p className="text-secondary">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 mx-auto mb-4 text-6xl">⚠️</div>
            <h2 className="text-3xl font-bold text-primary mb-2">Error</h2>
            <p className="text-secondary mb-6">{message}</p>
            <button
              onClick={() => navigate('/signup')}
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;
