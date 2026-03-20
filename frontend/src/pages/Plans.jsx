import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Zap, Tag, ArrowRight } from 'lucide-react';
import api from '../services/api';
import CouponModal from '../components/CouponModal';
import EnterpriseContactModal from '../components/EnterpriseContactModal';

const Plans = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [activeTab, setActiveTab] = useState('org');
  const [appliedCoupons, setAppliedCoupons] = useState({});
  const [currentPlanForCoupon, setCurrentPlanForCoupon] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [enterpriseStorage, setEnterpriseStorage] = useState(1500);
  const [enterpriseTeamMembers, setEnterpriseTeamMembers] = useState(50);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);

  useEffect(() => { document.title = 'Choose Your Plan | Outbound Impact'; }, []);

  const storageOptions = [
    { value: 1500, label: '1.5 TB', price: 0 },
    { value: 2000, label: '2 TB', price: 50 },
    { value: 3000, label: '3 TB', price: 150 },
    { value: 5000, label: '5 TB', price: 350 },
    { value: 10000, label: '10 TB', price: 850 },
  ];
  const teamOptions = [
    { value: 50, label: '50 Members', price: 0 },
    { value: 100, label: '100 Members', price: 30 },
    { value: 250, label: '250 Members', price: 120 },
    { value: 500, label: '500 Members', price: 270 },
    { value: 1000, label: '1000 Members', price: 570 },
    { value: -1, label: 'Unlimited', price: 150 },
  ];
  const calculateEnterprisePrice = () => {
    let base = 99;
    const s = storageOptions.find(o => o.value === enterpriseStorage);
    if (s) base += s.price;
    const t = teamOptions.find(o => o.value === enterpriseTeamMembers);
    if (t) base += t.price;
    return base;
  };
  const enterprisePrice = calculateEnterprisePrice();

  const handleApplyCoupon = (code) => {
    if (currentPlanForCoupon) setAppliedCoupons(prev => ({ ...prev, [currentPlanForCoupon]: code }));
    setCouponError('');
  };
  const openCoupon = (planId) => { setCurrentPlanForCoupon(planId); setCouponModalOpen(true); };

  const handleSelect = async (planId, extraData) => {
    const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');
    if (signupData.email && signupData.password) {
      setLoading(true); setSelectedPlan(planId); setCouponError('');
      try {
        const req = { ...signupData, plan: planId, ...extraData };
        const c = appliedCoupons[planId];
        if (c) req.couponCode = c;
        const res = await api.post('/auth/checkout', req);
        if (res.data.status === 'success') window.location.href = res.data.url;
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to create checkout';
        if (msg.toLowerCase().includes('coupon') || msg.toLowerCase().includes('invalid')) {
          setCouponError(msg); setAppliedCoupons(prev => ({ ...prev, [planId]: null }));
        }
        alert(msg);
      } finally { setLoading(false); setSelectedPlan(''); }
    } else {
      localStorage.setItem('selectedPlan', JSON.stringify({ planId, couponCode: appliedCoupons[planId] || null, ...extraData }));
      navigate('/signup');
    }
  };

  const handleEnterprise = () => {
    handleSelect('ORG_ENTERPRISE', { enterpriseConfig: { storageGB: enterpriseStorage, teamMembers: enterpriseTeamMembers, calculatedPrice: enterprisePrice, features: { whiteLabel: true, apiAccess: true, customIntegrations: true, dedicatedSupport: true } } });
  };

  const Ck = ({ color, children }) => (
    <div className="flex items-start gap-2 mb-2">
      <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}12` }}>
        <Check size={10} style={{ color }} strokeWidth={3} />
      </div>
      <span className="text-[13px] text-gray-900 leading-snug">{children}</span>
    </div>
  );

  const CouponBadge = ({ planId }) => {
    const c = appliedCoupons[planId];
    if (!c) return null;
    return (
      <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5"><Tag className="text-green-600" size={13} /><span className="text-xs font-semibold text-green-900">Coupon Applied</span></div>
          <span className="text-xs font-mono font-bold text-green-700">{c}</span>
        </div>
      </div>
    );
  };

  const CtaBtn = ({ planId, gradient, label = 'Get Started', extraData }) => {
    const isLoading = loading && selectedPlan === planId;
    return (
      <>
        <CouponBadge planId={planId} />
        <button onClick={() => extraData ? handleSelect(planId, extraData) : handleSelect(planId)} disabled={isLoading}
          className="block w-full py-3.5 rounded-xl font-bold text-[15px] text-white text-center mb-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${gradient})`, boxShadow: `0 4px 18px ${gradient.split(',')[0].trim()}33` }}>
          {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Processing...</span> : label}
        </button>
        <button onClick={() => openCoupon(planId)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 font-semibold transition-colors mt-1">
          {appliedCoupons[planId] ? '🎫 Change coupon code' : '🎫 Have a coupon code?'}
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffffff] via-white to-[#f3f4f6]">
      <CouponModal isOpen={couponModalOpen} onClose={() => { setCouponModalOpen(false); setCurrentPlanForCoupon(null); }} onApplyCoupon={handleApplyCoupon} appliedCoupon={currentPlanForCoupon ? appliedCoupons[currentPlanForCoupon] : null} />

      {/* HERO */}
      <div className="pt-12 pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/logo.webp" alt="Outbound Impact" className="w-44 h-auto mx-auto mb-6" onError={(e) => e.target.style.display = 'none'} />
          <div className="flex items-center justify-center gap-2 mb-5"><div className="h-px w-8 bg-[#800080]" /><span className="text-[11px] font-extrabold tracking-[.12em] uppercase text-[#800080]">Pricing</span><div className="h-px w-8 bg-[#800080]" /></div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-5 tracking-tight" style={{ letterSpacing: '-2px', lineHeight: 1.05 }}>Plans that <span className="bg-gradient-to-r from-[#800080] via-[#9333ea] to-[#EE82EE] bg-clip-text text-transparent">scale with you.</span></h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">From a single QR code to thousands of members. No hidden fees. No app required.</p>
          <div className="inline-flex bg-white rounded-2xl p-1 border border-gray-200/60 gap-1 shadow-sm mb-6">
            <button onClick={() => setActiveTab('personal')} className={`px-7 py-3 rounded-xl text-[15px] font-bold transition-all ${activeTab === 'personal' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`} style={activeTab === 'personal' ? { background: 'linear-gradient(135deg, #9333ea, #EE82EE)', boxShadow: '0 6px 24px rgba(147,51,234,.31)' } : {}}>❤️ Personal</button>
            <button onClick={() => setActiveTab('org')} className={`px-7 py-3 rounded-xl text-[15px] font-bold transition-all ${activeTab === 'org' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`} style={activeTab === 'org' ? { background: '#800080', boxShadow: '0 6px 24px rgba(128,0,128,.31)' } : {}}>🏢 Organization</button>
          </div>
        </div>
      </div>

      {/* PERSONAL TAB */}
      {activeTab === 'personal' && (
        <div className="pb-16 px-4 animate-fadeIn">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3"><div className="h-px w-8 bg-[#9333ea]" /><span className="text-[11px] font-extrabold tracking-[.12em] uppercase text-[#9333ea]">Personal Plans</span><div className="h-px w-8 bg-[#9333ea]" /></div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight" style={{ letterSpacing: '-1.5px' }}>Your story. <em className="italic text-[#9333ea]">Your way.</em></h2>
              <p className="text-gray-500 text-base mt-3">From a single campaign to a lifetime of memories.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Personal Single Use */}
              <div className="rounded-3xl p-0.5 transition-all hover:-translate-y-2" style={{ background: 'linear-gradient(135deg, rgba(128,0,128,.25), rgba(238,130,238,.13))' }}>
                <div className="bg-white rounded-[22px] overflow-hidden h-full">
                  <div className="p-7 pb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #800080, #EE82EE)' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></div>
                      <div><h3 className="text-[22px] font-bold text-gray-900">Personal Single Use</h3><span className="text-[10px] font-extrabold uppercase tracking-widest text-[#800080] bg-[#800080]/[.07] px-2.5 py-0.5 rounded-lg">One-time</span></div>
                    </div>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-5">One stream. Perfect for a single event, memorial, or personal project.</p>
                    <div className="mb-5 pb-5 border-b border-gray-100">
                      <div className="flex items-baseline gap-1"><span className="text-[52px] font-bold leading-none bg-gradient-to-r from-[#800080] to-[#EE82EE] bg-clip-text text-transparent">$69</span><span className="text-[15px] text-gray-500 font-semibold">one-time</span></div>
                      <p className="text-xs text-gray-400 mt-1">25GB storage included</p>
                      <p className="text-xs text-[#800080] font-bold mt-1">Viewing only after year 1 · $10/year continued viewing</p>
                    </div>
                    <CtaBtn planId="INDIVIDUAL" gradient="#800080, #EE82EE" />
                    <div className="mt-5"><Ck color="#800080">1 stream</Ck><Ck color="#800080">25GB media storage</Ck><Ck color="#800080">Video, image, audio, links</Ck><Ck color="#800080">Basic analytics</Ck><Ck color="#800080">Active for 12 months</Ck><Ck color="#800080">No app required for viewers</Ck></div>
                  </div>
                </div>
              </div>
              {/* Personal Life Events */}
              <div className="rounded-3xl p-[3px] transition-all hover:-translate-y-2" style={{ background: 'linear-gradient(135deg, #9333ea, #EE82EE)' }}>
                <div className="bg-white rounded-[22px] overflow-hidden h-full">
                  <div className="text-center py-2.5 text-[11px] font-extrabold tracking-[.12em] uppercase text-white" style={{ background: 'linear-gradient(90deg, #9333ea, #EE82EE)' }}>Best Value</div>
                  <div className="p-7 pb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #9333ea, #EE82EE)' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
                      <div><h3 className="text-[22px] font-bold text-gray-900">Personal Life Events</h3><span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9333ea] bg-[#9333ea]/[.07] px-2.5 py-0.5 rounded-lg">Best for personal</span></div>
                    </div>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-5">Multiple streams, ongoing. Memorials, portfolios, family milestones — content that lasts.</p>
                    <div className="mb-5 pb-5 border-b border-gray-100">
                      <div className="flex items-baseline gap-1"><span className="text-[52px] font-bold leading-none bg-gradient-to-r from-[#9333ea] to-[#EE82EE] bg-clip-text text-transparent">$15</span><span className="text-[15px] text-gray-500 font-semibold">/month</span></div>
                      <p className="text-xs text-gray-400 mt-1">100GB storage included</p>
                      <p className="text-xs text-[#9333ea] font-bold mt-1">Up to 10 streams</p>
                    </div>
                    <CtaBtn planId="PERSONAL_LIFE" gradient="#9333ea, #EE82EE" />
                    <div className="mt-5"><Ck color="#9333ea">Up to 10 streams</Ck><Ck color="#9333ea">100GB media storage</Ck><Ck color="#9333ea">Video, image, audio, links</Ck><Ck color="#9333ea">Analytics</Ck><Ck color="#9333ea">Team Access (2 users)</Ck><Ck color="#9333ea">Push notifications</Ck><Ck color="#9333ea">Up to 10 QR & NFC codes</Ck></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">Already have an account? <button onClick={() => navigate('/signin')} className="text-[#9333ea] font-semibold hover:underline">Sign in</button></p>
          </div>
        </div>
      )}

      {/* ORGANIZATION TAB */}
      {activeTab === 'org' && (
        <div className="pb-16 px-4 animate-fadeIn">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3"><div className="h-px w-8 bg-[#800080]" /><span className="text-[11px] font-extrabold tracking-[.12em] uppercase text-[#800080]">Organization Plans</span><div className="h-px w-8 bg-[#800080]" /></div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight" style={{ letterSpacing: '-1.5px' }}>Reach your <em className="italic text-[#800080]">entire audience.</em></h2>
              <p className="text-gray-500 text-base mt-3 max-w-md mx-auto">One-off events or ongoing member engagement — pick what fits.</p>
            </div>

            {/* Org Events */}
            <div className="mb-10 rounded-3xl overflow-hidden" style={{ boxShadow: '0 16px 60px rgba(255,176,32,.09)' }}>
              <div className="bg-white border-2 border-[#FFB020]/15 rounded-3xl overflow-hidden">
                <div className="p-7 sm:p-9">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
                    <div className="flex items-center gap-4 min-w-[240px]">
                      <div className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FFB020, #FF8C42)' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                      <div><span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFB020] block mb-0.5">One-time payment</span><h3 className="text-[28px] font-bold text-gray-900 leading-tight">Org Events</h3></div>
                    </div>
                    <div className="flex flex-wrap gap-7 flex-1">
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Price</p><p className="text-[26px] font-bold text-gray-900 leading-none">$199</p><p className="text-[11px] text-[#FFB020] font-bold mt-0.5">one-time</p></div>
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Storage</p><p className="text-[26px] font-bold text-gray-900 leading-none">250GB</p><p className="text-[11px] text-[#FFB020] font-bold mt-0.5">included</p></div>
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Renewal</p><p className="text-[26px] font-bold text-gray-900 leading-none">$65/yr</p><p className="text-[11px] text-[#FFB020] font-bold mt-0.5">from year 2</p></div>
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">QR/NFC</p><p className="text-[26px] font-bold text-gray-900 leading-none">Unlimited</p><p className="text-[11px] text-[#FFB020] font-bold mt-0.5">no per-scan fees</p></div>
                    </div>
                    <div className="min-w-[160px]"><CtaBtn planId="ORG_EVENTS" gradient="#FFB020, #FF8C42" label="Book Event →" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly label */}
            <div className="flex items-center gap-3 mb-6"><div className="h-0.5 w-10 rounded-sm bg-gradient-to-r from-[#800080] to-[#EE82EE]" /><span className="text-xs font-extrabold uppercase tracking-[.12em] text-[#800080]">Monthly Subscriptions</span><div className="h-px flex-1 bg-[#800080]/[.09]" /></div>

            {/* 3 Monthly cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Starter (Featured) */}
              <div className="rounded-3xl p-[3px] transition-all hover:-translate-y-2" style={{ background: 'linear-gradient(135deg, #800080, #EE82EE)' }}>
                <div className="bg-white rounded-[22px] overflow-hidden h-full">
                  <div className="text-center py-2.5 text-[11px] font-extrabold tracking-[.12em] uppercase text-white" style={{ background: 'linear-gradient(90deg, #800080, #EE82EE)' }}>Most Popular</div>
                  <div className="p-6 pb-8">
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #800080, #EE82EE)' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
                      <div><h3 className="text-[22px] font-bold text-gray-900">Starter</h3><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#800080] bg-[#800080]/[.07] px-2.5 py-0.5 rounded-lg">Up to 1,000 members</span></div>
                    </div>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-4">Growing communities, small clubs, or customer groups.</p>
                    <div className="mb-4 pb-4 border-b border-gray-100"><div className="flex items-baseline gap-1"><span className="text-[48px] font-bold leading-none bg-gradient-to-r from-[#800080] to-[#EE82EE] bg-clip-text text-transparent">$49</span><span className="text-[15px] text-gray-500 font-semibold">/month</span></div><p className="text-xs text-gray-400 mt-1">100GB storage</p></div>
                    <CtaBtn planId="ORG_SMALL" gradient="#800080, #EE82EE" />
                    <div className="mt-5"><Ck color="#800080">Up to 1,000 members</Ck><Ck color="#800080">100GB media storage</Ck><Ck color="#800080">Push notifications</Ck><Ck color="#800080">Full analytics dashboard</Ck><Ck color="#800080">Team access (3 users)</Ck><Ck color="#800080">QR & NFC codes included</Ck><Ck color="#800080">CSV exports</Ck></div>
                  </div>
                </div>
              </div>

              {/* Growth */}
              <div className="rounded-3xl p-0.5 transition-all hover:-translate-y-2" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,.25), rgba(238,130,238,.13))' }}>
                <div className="bg-white rounded-[22px] overflow-hidden h-full">
                  <div className="p-6 pb-8">
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #9333ea, #EE82EE)' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg></div>
                      <div><h3 className="text-[22px] font-bold text-gray-900">Growth</h3><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9333ea] bg-[#9333ea]/[.07] px-2.5 py-0.5 rounded-lg">Up to 2,500 members</span></div>
                    </div>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-4">Mid-size organizations, sports clubs, car clubs, and faith organizations.</p>
                    <div className="mb-4 pb-4 border-b border-gray-100"><div className="flex items-baseline gap-1"><span className="text-[48px] font-bold leading-none bg-gradient-to-r from-[#9333ea] to-[#EE82EE] bg-clip-text text-transparent">$69</span><span className="text-[15px] text-gray-500 font-semibold">/month</span></div><p className="text-xs text-gray-400 mt-1">250GB storage</p></div>
                    <CtaBtn planId="ORG_MEDIUM" gradient="#9333ea, #EE82EE" />
                    <div className="mt-5"><Ck color="#9333ea">Up to 2,500 members</Ck><Ck color="#9333ea">250GB media storage</Ck><Ck color="#9333ea">Push notifications</Ck><Ck color="#9333ea">Advanced analytics</Ck><Ck color="#9333ea">Unlimited team users</Ck><Ck color="#9333ea">Segmentation & groups</Ck><Ck color="#9333ea">Messages feature</Ck></div>
                  </div>
                </div>
              </div>

              {/* Pro */}
              <div className="rounded-3xl p-0.5 transition-all hover:-translate-y-2" style={{ background: 'linear-gradient(135deg, rgba(255,78,78,.25), rgba(255,140,66,.13))' }}>
                <div className="bg-white rounded-[22px] overflow-hidden h-full">
                  <div className="p-6 pb-8">
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #FF4E4E, #FF8C42)' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg></div>
                      <div><h3 className="text-[22px] font-bold text-gray-900">Pro</h3><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF4E4E] bg-[#FF4E4E]/[.07] px-2.5 py-0.5 rounded-lg">Up to 5,000 members</span></div>
                    </div>
                    <p className="text-gray-500 text-[13px] leading-relaxed mb-4">Large organizations with growing member, customer, and supporter bases.</p>
                    <div className="mb-4 pb-4 border-b border-gray-100"><div className="flex items-baseline gap-1"><span className="text-[48px] font-bold leading-none bg-gradient-to-r from-[#FF4E4E] to-[#FF8C42] bg-clip-text text-transparent">$99</span><span className="text-[15px] text-gray-500 font-semibold">/month</span></div><p className="text-xs text-gray-400 mt-1">500GB storage</p></div>
                    <CtaBtn planId="ORG_SCALE" gradient="#FF4E4E, #FF8C42" />
                    <div className="mt-5"><Ck color="#FF4E4E">Up to 5,000 members</Ck><Ck color="#FF4E4E">500GB media storage</Ck><Ck color="#FF4E4E">Push notifications</Ck><Ck color="#FF4E4E">Full analytics + workflows</Ck><Ck color="#FF4E4E">Unlimited team users</Ck><Ck color="#FF4E4E">All export formats</Ck><Ck color="#FF4E4E">Audit logs</Ck><Ck color="#FF4E4E">Priority support</Ck></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise banner */}
            <div className="rounded-[20px] p-8 sm:p-10 flex flex-wrap items-center gap-6 justify-between" style={{ background: 'linear-gradient(135deg, rgba(128,0,128,.06), rgba(147,51,234,.05))', border: '2px solid rgba(128,0,128,.15)', boxShadow: '0 8px 40px rgba(0,0,0,.03)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[#800080]/20" style={{ background: 'linear-gradient(135deg, rgba(128,0,128,.13), rgba(128,0,128,.05))' }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#800080" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg></div>
                <div><p className="text-2xl font-bold text-gray-900">5,000+ Members</p><p className="text-sm text-gray-500">Custom pricing, SLA, dedicated support, white-label options.</p></div>
              </div>
              <button onClick={() => setEnterpriseModalOpen(true)} className="px-8 py-3.5 rounded-xl font-bold text-[15px] text-white flex items-center gap-2 shadow-lg hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #800080, #EE82EE)', boxShadow: '0 4px 20px rgba(128,0,128,.25)' }}>Contact Us <ArrowRight size={16} /></button>
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">Already have an account? <button onClick={() => navigate('/signin')} className="text-[#800080] font-semibold hover:underline">Sign in</button></p>
          </div>
        </div>
      )}

      <div className="text-center pb-10 px-4"><p className="text-xs text-gray-400">No credit card required to browse · Secure checkout powered by Stripe · Cancel anytime</p></div>

      {/* Enterprise Lead Capture Modal */}
      <EnterpriseContactModal
        isOpen={enterpriseModalOpen}
        onClose={() => setEnterpriseModalOpen(false)}
      />
    </div>
  );
};

export default Plans;