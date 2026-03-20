import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, Mail } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setToken } = useAuthStore();
  const [status,  setStatus]  = useState('processing');
  const [message, setMessage] = useState('Completing your registration...');
  const [isEnterprise, setIsEnterprise] = useState(false);

  useEffect(() => {
    const completeSignup = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setMessage('Invalid session. Please try signing in directly.');
        return;
      }

      try {
        const response = await api.post('/auth/complete-signup', { sessionId });

        if (response.data.status === 'success') {
          setToken(response.data.accessToken);
          setUser(response.data.user);

          const isEnterpriseLead = response.data.user?.role === 'ORG_ENTERPRISE' &&
            response.data.message?.includes('password');
          setIsEnterprise(isEnterpriseLead);

          setStatus('success');
          setMessage(isEnterpriseLead
            ? 'Enterprise account activated!'
            : 'Account created successfully!');

          localStorage.removeItem('signupData');
          setTimeout(() => navigate('/dashboard'), 2500);
        }
      } catch (error) {
        const msg = error.response?.data?.message || '';

        // ── Race condition: webhook already created the user before
        //    completeSignup ran. The account exists — just redirect. ──
        const isDuplicateEmail = msg.toLowerCase().includes('email') ||
          msg.toLowerCase().includes('unique') ||
          msg.toLowerCase().includes('already');

        if (isDuplicateEmail) {
          // Try to retrieve the session email and log in silently
          try {
            const sessionRes = await api.get(`/auth/session-email?session_id=${sessionId}`);
            if (sessionRes.data.email) {
              // Account was created by webhook — send them to sign in with a helpful message
              setStatus('success');
              setMessage('Account activated!');
              setIsEnterprise(false);
              localStorage.removeItem('signupData');
              // Redirect to dashboard if already authenticated, else sign in
              setTimeout(() => navigate('/dashboard'), 2000);
              return;
            }
          } catch (_) { /* fall through */ }

          // Fallback — account exists, just go to dashboard or sign in
          setStatus('success');
          setMessage('Payment successful! Your account is ready.');
          localStorage.removeItem('signupData');
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        const isSignupDataError = msg.toLowerCase().includes('signup data') ||
          msg.toLowerCase().includes('not found');

        setStatus('error');
        setMessage(isSignupDataError
          ? 'Your payment was successful! Please sign in to access your account.'
          : msg || 'Something went wrong. Please try signing in.');
      }
    };

    completeSignup();
  }, [searchParams, navigate, setUser, setToken]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        {/* Processing */}
        {status === 'processing' && (
          <>
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-primary mb-2">Setting up your account…</h2>
            <p className="text-secondary">Please wait, this only takes a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-primary mb-2">{message}</h2>

            {isEnterprise ? (
              <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-5 text-left">
                <div className="flex items-start gap-3">
                  <Mail size={22} className="text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-teal-800 mb-1">Check your inbox</p>
                    <p className="text-teal-700 text-sm leading-relaxed">
                      We've sent you an email to set your password. You'll need it to sign in next time.
                      Redirecting to your dashboard now…
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-secondary mt-2">Redirecting to your dashboard…</p>
            )}
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="text-amber-500 mx-auto mb-4 text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Almost there</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/signin')}
                className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-purple-50"
              >
                Create Account
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default AuthSuccess;