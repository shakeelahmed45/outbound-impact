// EnterpriseContactModal.jsx
// Lead capture form shown when prospect clicks "Contact Us" on the Plans page.

import { useState } from 'react';
import { X, Building2, Loader, CheckCircle, ChevronRight } from 'lucide-react';
import api from '../services/api';

const TEAM_SIZES = [
  'Under 50',
  '50 – 100',
  '100 – 500',
  '500 – 1,000',
  '1,000 – 5,000',
  '5,000+',
];

const STORAGE_OPTIONS = [
  'Under 1 TB',
  '1 – 2 TB',
  '2 – 5 TB',
  '5 – 10 TB',
  '10 TB+',
  "Not sure yet",
];

const EnterpriseContactModal = ({ isOpen, onClose }) => {
  const [form, setForm]     = useState({ name: '', email: '', company: '', phone: '', teamSize: '', storageNeeds: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // ── Include signup data if user came through the normal auth flow ──
      // signupData in localStorage means they already filled name/email/password
      // We send it with the lead so the backend can store it for checkout later
      const signupData = (() => {
        try { return JSON.parse(localStorage.getItem('signupData') || 'null'); }
        catch { return null; }
      })();

      const payload = { ...form };
      if (signupData?.password) {
        payload.signupPassword = signupData.password;
      }

      await api.post('/enterprise-leads', payload);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setForm({ name: '', email: '', company: '', phone: '', teamSize: '', storageNeeds: '', message: '' }); setSuccess(false); setError(''); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-500 to-violet-600 p-6 rounded-t-2xl z-10">
          <button onClick={handleClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Enterprise Plan Enquiry</h2>
              <p className="text-white/80 text-sm">We'll set up a custom plan for your organisation</p>
            </div>
          </div>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Enquiry Submitted!</h3>
            <p className="text-slate-600 mb-2">Thank you, <strong>{form.name}</strong>.</p>
            <p className="text-slate-600 mb-6">We've received your enquiry and sent a confirmation to <strong>{form.email}</strong>. Our team will review your requirements and be in touch within <strong>1 business day</strong> with a personalised subscription link.</p>
            <button onClick={handleClose} className="bg-gradient-to-r from-teal-500 to-violet-600 text-white font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-all">
              Got it
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">Tell us about your organisation and we'll prepare a custom Enterprise plan tailored to your needs.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text" value={form.name} onChange={e => handleChange('name', e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Work Email <span className="text-red-500">*</span></label>
                <input
                  type="email" value={form.email} onChange={e => handleChange('email', e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Company + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Company / Organisation</label>
                <input
                  type="text" value={form.company} onChange={e => handleChange('company', e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)}
                  placeholder="+61 4xx xxx xxx"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Team size + Storage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Team Size</label>
                <select
                  value={form.teamSize} onChange={e => handleChange('teamSize', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none bg-white"
                >
                  <option value="">Select team size…</option>
                  {TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Storage Needs</label>
                <select
                  value={form.storageNeeds} onChange={e => handleChange('storageNeeds', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none bg-white"
                >
                  <option value="">Select storage…</option>
                  {STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tell us about your requirements</label>
              <textarea
                value={form.message} onChange={e => handleChange('message', e.target.value)}
                rows={3} placeholder="e.g. We need white-label branding, API access, and custom integrations…"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm outline-none resize-none"
              />
            </div>

            {/* What happens next */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What happens next</p>
              <div className="space-y-2">
                {[
                  'We review your requirements (within 1 business day)',
                  'We configure a custom plan for your organisation',
                  'You receive a personalised checkout link via email',
                  'Subscribe and get immediate access',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-violet-600 hover:from-teal-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-60"
            >
              {loading ? (
                <><Loader size={18} className="animate-spin" /> Submitting…</>
              ) : (
                <>Submit Enquiry <ChevronRight size={18} /></>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              By submitting you agree to our <a href="https://outboundimpact.org/legal#privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseContactModal;