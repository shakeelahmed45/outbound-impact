// EnterpriseSignup.jsx
// Shown when a prospect clicks the "Create Account & Subscribe" link in their
// enterprise plan email. Collects their name and password first, then redirects
// them to the Stripe checkout — exactly like the normal signup → plans flow.

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowRight, CheckCircle, Building2, HardDrive, Users, DollarSign } from 'lucide-react';
import api from '../services/api';

const EnterpriseSignup = () => {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const token        = searchParams.get('token');

  // Lead data loaded from backend
  const [lead,        setLead]        = useState(null);
  const [loadError,   setLoadError]   = useState('');
  const [loadLoading, setLoadLoading] = useState(true);

  // Form state
  const [name,             setName]             = useState('');
  const [password,         setPassword]         = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPass,         setShowPass]         = useState(false);
  const [showConfirm,      setShowConfirm]      = useState(false);
  const [agreeTerms,       setAgreeTerms]       = useState(false);
  const [isOver18,         setIsOver18]         = useState(false);
  const [formError,        setFormError]        = useState('');
  const [submitting,       setSubmitting]       = useState(false);

  // ── Fetch lead info by token ───────────────────────────────
  useEffect(() => {
    if (!token) {
      setLoadError('Invalid link. Please use the link from your invitation email.');
      setLoadLoading(false);
      return;
    }

    api.get(`/enterprise-leads/by-token/${token}`)
      .then(res => {
        if (res.data.status === 'success') {
          setLead(res.data.lead);
          // Pre-fill name from lead data
          setName(res.data.lead.name || '');
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'This link is invalid or has expired.';
        setLoadError(msg);
      })
      .finally(() => setLoadLoading(false));
  }, [token]);

  // ── Format helpers ─────────────────────────────────────────
  const formatStorage = (gb) => {
    if (!gb) return '—';
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb} GB`;
  };

  const formatAudience = (size) => {
    if (!size || size === -1) return 'Unlimited';
    return Number(size).toLocaleString();
  };

  // ── Handle form submit → store signupData → Stripe checkout ─
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim())              { setFormError('Please enter your full name.'); return; }
    if (password.length < 6)       { setFormError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
    if (!isOver18)                 { setFormError('You must be 18 or older to create an account.'); return; }
    if (!agreeTerms)               { setFormError('Please agree to the Terms & Conditions.'); return; }

    setSubmitting(true);

    try {
      // ── Step 1: Save signup data to localStorage (same as regular flow) ──
      localStorage.setItem('signupData', JSON.stringify({
        name:     name.trim(),
        email:    lead.email,
        password,
      }));

      // ── Step 2: Call /auth/checkout with enterprise config ──
      const res = await api.post('/auth/checkout', {
        name:     name.trim(),
        email:    lead.email,
        password,
        plan:     'ORG_ENTERPRISE',
        enterpriseConfig: {
          storageGB:       lead.storageGB     || 1500,
          audienceSize:    lead.audienceSize  || 5000,
          calculatedPrice: lead.monthlyPrice  || 99,
          leadToken:       token,
        },
      });

      if (res.data.status === 'success' && res.data.url) {
        // ── Step 3: Redirect to Stripe ──
        window.location.href = res.data.url;
      } else {
        setFormError(res.data.message || 'Failed to create checkout session. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      if (msg.toLowerCase().includes('already')) {
        setFormError('An account with this email already exists. Please sign in instead.');
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────
  if (loadLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-violet-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-violet-600" />
      </div>
    );
  }

  // ── Error state (invalid / expired link) ──────────────────
  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-violet-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Link Invalid or Expired</h2>
          <p className="text-slate-600 mb-6">{loadError}</p>
          <button
            onClick={() => navigate('/signin')}
            className="bg-gradient-to-r from-teal-500 to-violet-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all"
          >
            Go to Sign In
          </button>
          <p className="mt-4 text-sm text-slate-400">
            Need help?{' '}
            <a href="mailto:support@outboundimpact.org" className="text-violet-600 font-semibold hover:underline">
              support@outboundimpact.org
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-10">

      {/* Logo */}
      <div className="mb-8 text-center">
        <img src="/logo.webp" alt="Outbound Impact" className="w-20 h-20 mx-auto object-contain mb-3"
          onError={(e) => e.target.style.display = 'none'} />
        <p className="text-xs font-bold tracking-widest text-violet-500 uppercase">Outbound Impact</p>
      </div>

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Building2 size={14} /> Enterprise Plan
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create your account
          </h1>
          <p className="text-slate-500 text-sm">
            Set your password to complete your Enterprise subscription
          </p>
        </div>

        {/* Plan summary card */}
        {lead && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Your Plan Summary</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-teal-50 rounded-xl">
                <HardDrive size={18} className="text-teal-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-slate-800">{formatStorage(lead.storageGB)}</p>
                <p className="text-xs text-slate-400">Storage</p>
              </div>
              <div className="text-center p-3 bg-violet-50 rounded-xl">
                <Users size={18} className="text-violet-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-slate-800">{formatAudience(lead.audienceSize)}</p>
                <p className="text-xs text-slate-400">Members</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <DollarSign size={18} className="text-slate-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-slate-800">${lead.monthlyPrice?.toFixed(0)}/mo</p>
                <p className="text-xs text-slate-400">USD</p>
              </div>
            </div>
          </div>
        )}

        {/* Signup form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-7">
          {formError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email — read-only, pre-filled */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={lead?.email || ''}
                readOnly
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">This email was used in your enquiry</p>
            </div>

            {/* Full name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setFormError(''); }}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFormError(''); }}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setFormError(''); }}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={isOver18} onChange={e => setIsOver18(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-violet-600 rounded cursor-pointer" />
                <span className="text-sm text-slate-600">I confirm I am <strong>18 years or older</strong></span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-violet-600 rounded cursor-pointer" />
                <span className="text-sm text-slate-600">
                  I agree to the{' '}
                  <a href="https://outboundimpact.org/legal" target="_blank" rel="noreferrer"
                    className="text-violet-600 font-semibold hover:underline">
                    Terms &amp; Conditions
                  </a>
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-60 mt-2"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> Setting up checkout…</>
              ) : (
                <>Continue to Checkout <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          {/* What happens next */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">What happens next</p>
            <div className="space-y-2">
              {[
                { n: 1, text: 'You set your name and password above' },
                { n: 2, text: 'You\'re taken to secure Stripe checkout' },
                { n: 3, text: 'Payment completes and your account is activated' },
                { n: 4, text: 'You\'re redirected directly to your Enterprise dashboard' },
              ].map(step => (
                <div key={step.n} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step.n}
                  </span>
                  <span className="text-sm text-slate-600">{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Already have account */}
        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <button onClick={() => navigate('/signin')} className="text-violet-600 font-bold hover:underline">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default EnterpriseSignup;