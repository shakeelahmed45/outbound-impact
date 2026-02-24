import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, Zap, Globe } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken, isAuthenticated, token } = useAuthStore();

  // ✅ Redirect away if already authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, token, navigate]);

  const getInitialView = () => {
    if (location.pathname === '/signin') return 'signin';
    if (location.pathname === '/signup') return 'signup';
    return 'landing';
  };

  const [view, setView] = useState(getInitialView);
  const [animating, setAnimating] = useState(false);
  const [formVisible, setFormVisible] = useState(getInitialView() !== 'landing');

  // Sign In State
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Sign Up State
  const [signUpData, setSignUpData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [signUpError, setSignUpError] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isOver18, setIsOver18] = useState(false);

  useEffect(() => {
    document.title = view === 'signup' ? 'Sign Up | Outbound Impact'
      : view === 'signin' ? 'Sign In | Outbound Impact'
      : 'Welcome | Outbound Impact';
  }, [view]);

  useEffect(() => {
    const target = getInitialView();
    if (target !== view && !animating) {
      if (target === 'landing') { setView('landing'); setFormVisible(false); }
      else switchView(target);
    }
  }, [location.pathname]);

  const switchView = (newView) => {
    if (animating) return;
    setAnimating(true);
    setFormVisible(false);
    setTimeout(() => {
      setView(newView);
      setSignInError(''); setSignUpError('');
      setRequires2FA(false); setTwoFactorCode('');
      setTimeout(() => { setFormVisible(true); setAnimating(false); }, 60);
    }, 280);
  };

  const goToLanding = () => {
    if (animating) return;
    setAnimating(true); setFormVisible(false);
    setTimeout(() => {
      setView('landing');
      navigate('/', { replace: true });
      setTimeout(() => setAnimating(false), 60);
    }, 280);
  };

  // ─── Sign In Handler ───
  const handleSignIn = async (e) => {
    e.preventDefault();
    setSignInError(''); setSignInLoading(true);
    try {
      const payload = { email: signInData.email, password: signInData.password };
      if (requires2FA && twoFactorCode) payload.twoFactorCode = twoFactorCode;

      const response = await api.post('/auth/signin', payload);

      if (response.data.status === 'success') {
        // ✅ Handle 2FA prompt
        if (response.data.requires2FA) {
          setRequires2FA(true);
          setSignInLoading(false);
          return;
        }

        // ✅ FIX: Backend returns "accessToken" not "token"
        setToken(response.data.accessToken);
        setUser(response.data.user);

        // ✅ Redirect based on role (matches original SignIn.jsx)
        if (response.data.user?.role === 'ADMIN') {
          navigate('/admin-panel', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      setSignInError(err.response?.data?.message || 'Sign in failed');
      if (err.response?.data?.message?.includes('2FA')) setTwoFactorCode('');
    } finally { setSignInLoading(false); }
  };

  // ─── Sign Up Handler (matches original: localStorage → /plans) ───
  const handleSignUp = (e) => {
    e.preventDefault(); setSignUpError('');
    if (!signUpData.name || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) { setSignUpError('All fields are required'); return; }
    if (signUpData.password !== signUpData.confirmPassword) { setSignUpError('Passwords do not match'); return; }
    if (signUpData.password.length < 6) { setSignUpError('Password must be at least 6 characters'); return; }
    if (!isOver18) { setSignUpError('You must be 18 years or older to create an account'); return; }
    if (!agreeTerms) { setSignUpError('You must agree to the Terms & Conditions'); return; }

    // ✅ Save to localStorage and navigate to plans (matches original SignUp.jsx exactly)
    localStorage.setItem('signupData', JSON.stringify({
      name: signUpData.name,
      email: signUpData.email,
      password: signUpData.password,
    }));
    navigate('/plans');
  };

  // Don't flash auth page if already logged in
  if (isAuthenticated && token) return null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        .auth-root { font-family: 'Manrope', system-ui, sans-serif; }
        .auth-display { font-family: 'Playfair Display', Georgia, serif; }

        /* ── Animations ── */
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes auth-sink {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
        @keyframes auth-appear {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.97); }
        }
        @keyframes drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(0.96); }
          66% { transform: translate(20px, -10px) scale(1.04); }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes soft-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        .rise { animation: auth-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .sink { animation: auth-sink 0.28s ease-in forwards; }
        .appear { animation: auth-appear 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

        /* ── Card ── */
        .form-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(128, 0, 128, 0.05);
          box-shadow:
            0 0 0 0.5px rgba(128,0,128,0.03),
            0 1px 3px rgba(0,0,0,0.02),
            0 8px 24px rgba(128,0,128,0.04),
            0 32px 72px -12px rgba(128,0,128,0.07);
          transition: border-color 0.4s, box-shadow 0.4s;
        }
        .form-card:hover {
          border-color: rgba(128, 0, 128, 0.09);
          box-shadow:
            0 0 0 0.5px rgba(128,0,128,0.05),
            0 1px 3px rgba(0,0,0,0.02),
            0 12px 32px rgba(128,0,128,0.06),
            0 40px 80px -12px rgba(128,0,128,0.09);
        }

        /* ── Inputs ── */
        .field {
          background: #fefefe;
          border: 1.5px solid #eae5ef;
          color: #1a1225;
          font-size: 0.9rem;
          transition: all 0.25s;
        }
        .field::placeholder { color: #c0b6cc; }
        .field:focus {
          outline: none;
          border-color: #9b30a0;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(128,0,128,0.06);
        }

        /* ── Buttons ── */
        .cta-fill {
          background: linear-gradient(135deg, #7b1080, #9b30a0, #b74ec0);
          background-size: 200% 200%;
          animation: gradient-flow 5s ease infinite;
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 4px 20px rgba(128,0,128,0.22);
        }
        .cta-fill:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 36px rgba(128,0,128,0.32);
        }
        .cta-fill:active { transform: translateY(0); }

        .cta-ghost {
          background: #fff;
          border: 1.5px solid rgba(128,0,128,0.15);
          color: #7b1080;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 2px 8px rgba(128,0,128,0.04);
        }
        .cta-ghost:hover {
          border-color: rgba(128,0,128,0.4);
          background: rgba(128,0,128,0.02);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(128,0,128,0.1);
        }

        /* ── Misc ── */
        .lbl { color: #574568; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .lnk { color: #7b1080; font-weight: 700; transition: color 0.2s; }
        .lnk:hover { color: #b74ec0; }
        .chk { accent-color: #800080; }
        .sep { height: 1px; background: linear-gradient(90deg, transparent, #e8dfed, transparent); }

        .blob { position: absolute; border-radius: 50%; pointer-events: none; }
        .badge {
          background: #fff;
          border: 1px solid rgba(128,0,128,0.06);
          box-shadow: 0 1px 8px rgba(128,0,128,0.05);
          transition: all 0.35s;
        }
        .badge:hover {
          border-color: rgba(128,0,128,0.14);
          box-shadow: 0 4px 20px rgba(128,0,128,0.09);
          transform: translateY(-3px);
        }
      `}</style>

      <div className="auth-root min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #fcfafd 0%, #f7f2fb 20%, #f2ecf8 45%, #f8f4fc 70%, #fefcff 100%)' }}>

        {/* Soft animated blobs */}
        <div className="blob" style={{ width: 600, height: 600, top: '-15%', right: '-12%', background: 'radial-gradient(circle, rgba(183,78,192,0.07) 0%, transparent 65%)', animation: 'drift-a 20s ease-in-out infinite' }} />
        <div className="blob" style={{ width: 500, height: 500, bottom: '-10%', left: '-10%', background: 'radial-gradient(circle, rgba(128,0,128,0.05) 0%, transparent 65%)', animation: 'drift-b 25s ease-in-out infinite' }} />
        <div className="blob" style={{ width: 300, height: 300, top: '50%', left: '5%', background: 'radial-gradient(circle, rgba(155,48,160,0.04) 0%, transparent 65%)', animation: 'drift-a 18s ease-in-out infinite 3s' }} />
        <div className="blob" style={{ width: 200, height: 200, top: '15%', right: '15%', background: 'radial-gradient(circle, rgba(200,100,220,0.03) 0%, transparent 65%)', animation: 'drift-b 15s ease-in-out infinite 1s' }} />

        {/* Fine dot pattern */}
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100,0,100,0.6) 0.8px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(128,0,128,0.2) 30%, rgba(183,78,192,0.35) 50%, rgba(128,0,128,0.2) 70%, transparent 95%)' }} />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-8 sm:py-12">

          {/* ═══════ LANDING ═══════ */}
          {view === 'landing' && (
            <div className="text-center max-w-lg w-full appear">

              {/* Logo */}
              <div className="mb-10 sm:mb-12">
                <div className="relative inline-block">
                  <div className="absolute -inset-6 rounded-full" style={{ background: 'radial-gradient(circle, rgba(128,0,128,0.06) 0%, transparent 70%)', animation: 'soft-pulse 4s ease-in-out infinite' }} />
                  <img src="/logo.webp" alt="Outbound Impact"
                    className="relative w-30 h-28 sm:w-36 sm:h-36 mx-auto object-contain"
                    style={{ filter: 'drop-shadow(0 10px 30px rgba(128,0,128,0.1))' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                  <div className="hidden w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-[1.75rem] items-center justify-center"
                    style={{ background: 'linear-gradient(140deg, #7b1080, #b74ec0)' }}>
                    <span className="text-white text-4xl sm:text-5xl font-bold auth-display">OI</span>
                  </div>
                </div>
              </div>

              {/* Heading */}
              <h1 className="auth-display text-[2.5rem] sm:text-5xl md:text-[3.5rem] leading-tight mb-4" style={{ color: '#1a0e24' }}>
                Outbound Impact
              </h1>

              <p className="text-xs sm:text-sm font-bold tracking-[0.25em] uppercase mb-3" style={{ color: '#9b30a0' }}>
                Share &middot; Track &middot; Impact
              </p>

              <p className="text-sm sm:text-[0.95rem] max-w-xs sm:max-w-sm mx-auto mb-10 sm:mb-12 leading-relaxed" style={{ color: '#8f7e9c' }}>
                The premium media sharing platform for organizations that demand excellence.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-[22rem] mx-auto mb-14 sm:mb-16">
                <button onClick={() => { switchView('signin'); navigate('/signin', { replace: true }); }}
                  className="cta-fill flex-1 py-[0.9rem] px-8 rounded-2xl flex items-center justify-center gap-2.5">
                  Sign In <ArrowRight size={17} strokeWidth={2.5} />
                </button>
                <button onClick={() => { switchView('signup'); navigate('/signup', { replace: true }); }}
                  className="cta-ghost flex-1 py-[0.9rem] px-8 rounded-2xl">
                  Create Account
                </button>
              </div>

              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {[
                  { Icon: Shield, label: 'Secure Sharing' },
                  { Icon: Zap, label: 'QR & NFC' },
                  { Icon: Globe, label: 'Real-time Analytics' },
                ].map(({ Icon, label }) => (
                  <div key={label} className="badge flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(128,0,128,0.08), rgba(183,78,192,0.12))' }}>
                      <Icon size={13} strokeWidth={2.5} style={{ color: '#7b1080' }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#574568' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ SIGN IN ═══════ */}
          {view === 'signin' && (
            <div className={`w-full max-w-[26rem] ${formVisible ? 'rise' : 'sink'}`}>
              <button onClick={goToLanding} className="flex items-center gap-2 mb-6 group" style={{ color: '#8f7e9c' }}>
                <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                <span className="text-sm font-semibold group-hover:text-purple-800 transition-colors">Back</span>
              </button>

              <div className="text-center mb-8">
                <img src="/logo.webp" alt="" className="w-29 h-25 mx-auto mb-5 object-contain"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(128,0,128,0.08))' }}
                  onError={(e) => e.target.style.display = 'none'} />
                <h1 className="auth-display text-[1.85rem] sm:text-[2.1rem] mb-2" style={{ color: '#1a0e24' }}>
                  {requires2FA ? 'Verification' : 'Welcome back'}
                </h1>
                <p className="text-[0.85rem]" style={{ color: '#8f7e9c' }}>
                  {requires2FA ? 'Enter the code sent to your email' : 'Sign in to continue to your dashboard'}
                </p>
              </div>

              <div className="form-card rounded-[1.4rem] p-6 sm:p-8">
                {signInError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-50/80 border border-red-100">
                    <p className="text-red-600 text-sm font-semibold">{signInError}</p>
                  </div>
                )}
                <form onSubmit={handleSignIn} className="space-y-5">
                  {!requires2FA && (
                    <>
                      <div>
                        <label className="lbl block mb-2">Email</label>
                        <input type="email" value={signInData.email}
                          onChange={(e) => { setSignInData({ ...signInData, email: e.target.value }); setSignInError(''); }}
                          className="field w-full px-4 py-3.5 rounded-xl" placeholder="you@example.com" required />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="lbl">Password</label>
                          <Link to="/forgot-password" className="lnk text-xs">Forgot?</Link>
                        </div>
                        <div className="relative">
                          <input type={showSignInPassword ? 'text' : 'password'} value={signInData.password}
                            onChange={(e) => { setSignInData({ ...signInData, password: e.target.value }); setSignInError(''); }}
                            className="field w-full px-4 py-3.5 pr-12 rounded-xl" placeholder="••••••••" required />
                          <button type="button" onClick={() => setShowSignInPassword(!showSignInPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showSignInPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {requires2FA && (
                    <div>
                      <label className="lbl block mb-2">6-digit code</label>
                      <input type="text" value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="field w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.3em] font-mono"
                        placeholder="000000" maxLength={6} autoFocus required />
                      <p className="mt-2.5 text-xs" style={{ color: '#8f7e9c' }}>Check your inbox and spam folder</p>
                    </div>
                  )}
                  <button type="submit" disabled={signInLoading || (requires2FA && twoFactorCode.length !== 6)}
                    className="cta-fill w-full py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {signInLoading ? <><Loader2 className="animate-spin" size={17} />{requires2FA ? 'Verifying...' : 'Signing in...'}</> : requires2FA ? 'Verify & Sign In' : 'Sign In'}
                  </button>
                  {requires2FA && (
                    <button type="button" onClick={() => { setRequires2FA(false); setTwoFactorCode(''); setSignInError(''); }}
                      className="w-full text-sm font-semibold py-2" style={{ color: '#8f7e9c' }}>← Back to credentials</button>
                  )}
                </form>
                {!requires2FA && (
                  <>
                    <div className="sep my-6" />
                    <p className="text-center text-sm" style={{ color: '#8f7e9c' }}>
                      Don&apos;t have an account?{' '}
                      <button onClick={() => { switchView('signup'); navigate('/signup', { replace: true }); }} className="lnk">Create one</button>
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══════ SIGN UP ═══════ */}
          {view === 'signup' && (
            <div className={`w-full max-w-[26rem] ${formVisible ? 'rise' : 'sink'}`}>
              <button onClick={goToLanding} className="flex items-center gap-2 mb-6 group" style={{ color: '#8f7e9c' }}>
                <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                <span className="text-sm font-semibold group-hover:text-purple-800 transition-colors">Back</span>
              </button>

              <div className="text-center mb-8">
                <img src="/logo.webp" alt="" className="w-29 h-25 mx-auto mb-5 object-contain"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(128,0,128,0.08))' }}
                  onError={(e) => e.target.style.display = 'none'} />
                <h1 className="auth-display text-[1.85rem] sm:text-[2.1rem] mb-2" style={{ color: '#1a0e24' }}>Create account</h1>
                <p className="text-[0.85rem]" style={{ color: '#8f7e9c' }}>Get started with Outbound Impact today</p>
              </div>

              <div className="form-card rounded-[1.4rem] p-6 sm:p-8">
                {signUpError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-50/80 border border-red-100">
                    <p className="text-red-600 text-sm font-semibold">{signUpError}</p>
                  </div>
                )}
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="lbl block mb-2">Full name</label>
                    <input type="text" value={signUpData.name}
                      onChange={(e) => { setSignUpData({ ...signUpData, name: e.target.value }); setSignUpError(''); }}
                      className="field w-full px-4 py-3.5 rounded-xl" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="lbl block mb-2">Email</label>
                    <input type="email" value={signUpData.email}
                      onChange={(e) => { setSignUpData({ ...signUpData, email: e.target.value }); setSignUpError(''); }}
                      className="field w-full px-4 py-3.5 rounded-xl" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="lbl block mb-2">Password</label>
                    <div className="relative">
                      <input type={showSignUpPassword ? 'text' : 'password'} value={signUpData.password}
                        onChange={(e) => { setSignUpData({ ...signUpData, password: e.target.value }); setSignUpError(''); }}
                        className="field w-full px-4 py-3.5 pr-12 rounded-xl" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showSignUpPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="lbl block mb-2">Confirm password</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={signUpData.confirmPassword}
                        onChange={(e) => { setSignUpData({ ...signUpData, confirmPassword: e.target.value }); setSignUpError(''); }}
                        className="field w-full px-4 py-3.5 pr-12 rounded-xl" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border border-gray-100 bg-white/60 hover:border-purple-200 transition-colors">
                      <input type="checkbox" checked={isOver18} onChange={(e) => setIsOver18(e.target.checked)}
                        className="chk mt-0.5 w-4 h-4 rounded cursor-pointer" />
                      <span className="text-[0.82rem]" style={{ color: '#574568' }}>I confirm that I am <strong>18 years or older</strong></span>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer border border-gray-100 bg-white/60 hover:border-purple-200 transition-colors">
                      <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="chk mt-0.5 w-4 h-4 rounded cursor-pointer" />
                      <span className="text-[0.82rem]" style={{ color: '#574568' }}>
                        I agree to the{' '}
                        <a href="https://outboundimpact.org/" target="_blank" rel="noopener noreferrer" className="lnk underline">Terms & Conditions</a>
                      </span>
                    </label>
                  </div>

                  <button type="submit"
                    className="cta-fill w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 mt-1">
                    Continue to Plans <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                </form>

                <div className="sep my-6" />
                <p className="text-center text-sm" style={{ color: '#8f7e9c' }}>
                  Already have an account?{' '}
                  <button onClick={() => { switchView('signin'); navigate('/signin', { replace: true }); }} className="lnk">Sign In</button>
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 sm:mt-14 text-center">
            <p className="text-[0.68rem] font-semibold tracking-[0.12em]" style={{ color: '#c0b6cc' }}>
              &copy; {new Date().getFullYear()} OUTBOUND IMPACT &middot; ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
