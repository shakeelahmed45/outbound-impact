import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Check, AlertTriangle, TrendingUp, ToggleRight, Trash2, BookOpen, UserCheck, Users, QrCode, HardDrive, ShieldAlert } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import UpgradePlanModal from '../components/UpgradePlanModal';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  // ✅ VIEWER + EDITOR cannot access Billing & Account
  const canAccessBilling = !user?.isTeamMember || user?.teamRole === 'ADMIN';
  if (!canAccessBilling) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={40} className="text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Billing Access Restricted
            </h1>
            <p className="text-gray-600 mb-2">
              <strong>Your role: {user?.teamRole}</strong>
            </p>
            <p className="text-gray-600 mb-6">
              Only the account owner or team admins can manage billing and subscriptions.
              {user?.isTeamMember && (
                <> Contact <strong>{user.organization?.name}</strong> for billing changes.</>
              )}
            </p>
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const userIsTeamMember = user?.isTeamMember === true;
  const effectiveRole = effectiveUser?.role;
  const isIndividual = effectiveRole === 'INDIVIDUAL';

  // Individual settings — profile fields
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoRenewal, setAutoRenewal] = useState(true);
  const [togglingRenewal, setTogglingRenewal] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);

  // Simple inline toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    document.title = 'Billing & Account | Outbound Impact';
    if (effectiveUser?.subscriptionStatus === 'canceling') {
      setAutoRenewal(false);
    }
  }, [effectiveUser]);

  // ═══════════════════════════════════
  // PLAN LIMITS PER TIER
  // QR codes = generated per stream/campaign
  // ═══════════════════════════════════
  const getPlanLimits = () => {
    switch (effectiveRole) {
      case 'INDIVIDUAL':
        return { name: 'Individual', price: '$85', period: 'one-time (12 months)', contributors: 2, storage: '250 GB', qrCodes: '2', qrNote: '2 streams allowed', analytics: 'Basic', uploads: 5 };
      case 'ORG_SMALL':
        return { name: 'Small Organization', price: '$35', period: '/month', contributors: 3, storage: '250 GB', qrCodes: '5', qrNote: 'QR codes for streams', analytics: 'Standard' };
      case 'ORG_MEDIUM':
        return { name: 'Medium Organization', price: '$60', period: '/month', contributors: 20, storage: '500 GB', qrCodes: '20', qrNote: 'QR codes for streams', analytics: 'Advanced' };
      case 'ORG_ENTERPRISE':
        return { name: 'Enterprise', price: '$99+', period: '/month', contributors: '50+', storage: '1.5 TB+', qrCodes: 'Unlimited', qrNote: 'Unlimited QR codes', analytics: 'Advanced + Compliance' };
      default:
        return { name: 'Free', price: '$0', period: '', contributors: 0, storage: '0', qrCodes: '0', qrNote: '', analytics: 'None' };
    }
  };

  const planLimits = getPlanLimits();

  const formatStorage = (bytes) => {
    const num = Number(bytes);
    const gb = num / (1024 * 1024 * 1024);
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = num / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(0)} MB`;
    return `${(num / 1024).toFixed(0)} KB`;
  };

  const storageUsed = Number(effectiveUser?.storageUsed || 0);
  const storageLimit = Number(effectiveUser?.storageLimit || 2147483648);
  const storagePercent = storageLimit > 0 ? Math.min(Math.round((storageUsed / storageLimit) * 100), 100) : 0;
  const subscriptionEnding = !autoRenewal || effectiveUser?.subscriptionStatus === 'canceling';

  const handleToggleAutoRenewal = async () => {
    const message = autoRenewal
      ? 'Disable auto-renewal? Your subscription will end at the current billing period.'
      : 'Enable auto-renewal? Your subscription will automatically renew.';
    if (!window.confirm(message)) return;
    setTogglingRenewal(true);
    try {
      const response = await api.post('/subscription/toggle-renewal', { enableRenewal: !autoRenewal });
      if (response.data) {
        setAutoRenewal(!autoRenewal);
        setUser({ ...user, ...response.data });
        showToast(!autoRenewal ? 'Auto-renewal enabled!' : 'Auto-renewal disabled.');
      }
    } catch (error) {
      showToast('Failed to update auto-renewal', 'error');
    } finally {
      setTogglingRenewal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel? You will still have access until the end of your billing period.')) return;
    setCancelingSubscription(true);
    try {
      const response = await api.post('/subscription/cancel');
      if (response.data) {
        setUser({ ...user, subscriptionStatus: 'canceling', ...response.data });
        setAutoRenewal(false);
        showToast('Subscription canceled. Access continues until end of billing period.');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel subscription', 'error');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setOpeningBillingPortal(true);
    try {
      const response = await api.post('/subscription/billing-portal');
      if (response.data?.portalUrl) {
        window.open(response.data.portalUrl, '_blank');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to open billing portal', 'error');
    } finally {
      setOpeningBillingPortal(false);
    }
  };

  // ═══ Individual plan → Pablo-style simple settings ═══
  if (isIndividual) {
    const handleSaveProfile = async () => {
      setSavingProfile(true);
      try {
        const res = await api.put('/user/profile', { name: profileName });
        if (res.data) {
          setUser({ ...user, name: profileName });
          showToast('Changes saved!');
        }
      } catch (err) {
        showToast('Failed to save changes', 'error');
      } finally {
        setSavingProfile(false);
      }
    };

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Toast */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 border-2 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md ${
              toast.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-gray-800 font-medium text-sm">{toast.message}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Settings</h2>

            {/* Profile Section */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Profile</h3>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    getInitial(user?.name)
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user?.name}</p>
                  <p className="text-slate-600">{user?.email}</p>
                  <button
                    onClick={() => navigate('/dashboard/profile')}
                    className="text-purple-600 text-sm font-medium hover:text-purple-700 mt-1"
                  >
                    Change Photo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Current Plan Section */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Current Plan</h3>
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Personal</p>
                    <p className="text-sm text-slate-600">
                      {effectiveUser?.totalUploads || 0}/5 uploads · {formatStorage(storageUsed)}/{formatStorage(storageLimit)} storage
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        <UpgradePlanModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={effectiveRole}
          onUpgradeSuccess={(updatedUser) => {
            setUser(updatedUser);
            showToast('Plan upgraded!');
            setTimeout(() => window.location.reload(), 1500);
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Inline Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 border-2 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md ${
            toast.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              <Check size={20} className={toast.type === 'error' ? 'text-red-500' : 'text-green-500'} />
              <p className="flex-1 text-gray-800 font-medium text-sm">{toast.message}</p>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Billing & Account</h1>
          <p className="text-gray-600">Manage your subscription, plan limits, and billing</p>
        </div>

        {/* Upgrade Banner */}
        {!userIsTeamMember && effectiveRole !== 'ORG_ENTERPRISE' && (
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border-2 border-purple-200 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <TrendingUp className="text-purple-700" size={22} /> Want More Features?
                </h3>
                <p className="text-gray-600 text-sm">Upgrade your plan to unlock more storage, users, and features.</p>
              </div>
              <button onClick={() => setShowUpgradeModal(true)} className="px-6 py-3 gradient-btn text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all whitespace-nowrap text-sm">
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        {/* Subscription Ending Warning */}
        {subscriptionEnding && effectiveUser?.currentPeriodEnd && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={22} />
              <div>
                <h4 className="font-bold text-yellow-900 mb-2">Subscription Ending</h4>
                <p className="text-yellow-800 text-sm mb-3">Your subscription will end on <strong>{new Date(effectiveUser.currentPeriodEnd).toLocaleDateString()}</strong>.</p>
                <button onClick={handleToggleAutoRenewal} disabled={togglingRenewal} className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-all flex items-center gap-2 text-sm">
                  <ToggleRight size={16} /> {togglingRenewal ? 'Processing...' : 'Reactivate Subscription'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            SUBSCRIPTION DETAILS CARD
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
              <CreditCard className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Subscription Details</h3>
          </div>

          {/* Plan + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="text-2xl font-bold text-purple-700">{planLimits.name}</p>
              <p className="text-sm text-gray-500 mt-1">{planLimits.price} {planLimits.period}</p>
            </div>
            <div className="bg-green-50 p-5 rounded-xl border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-flex px-4 py-2 ${subscriptionEnding ? 'bg-yellow-500' : 'bg-green-500'} text-white rounded-full font-semibold items-center gap-2 text-sm shadow`}>
                <Check size={16} /> {subscriptionEnding ? 'Ending Soon' : 'Active'}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════
              PLAN LIMITS: Contributors, QR Codes, Storage
             ═══════════════════════════════════ */}
          <div className="mb-6">
            <h4 className="font-bold text-gray-800 mb-4 text-lg">Plan Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Contributors */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-purple-700" />
                  <p className="text-sm font-semibold text-gray-700">Contributors</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {planLimits.contributors === 0 ? 'N/A' : planLimits.contributors}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {planLimits.contributors === 0 ? 'Upgrade for team members' : `Up to ${planLimits.contributors} team members`}
                </p>
              </div>

              {/* QR Codes (for Streams) */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode size={18} className="text-purple-700" />
                  <p className="text-sm font-semibold text-gray-700">QR Codes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{planLimits.qrCodes}</p>
                <p className="text-xs text-gray-500 mt-1">{planLimits.qrNote}</p>
              </div>

              {/* Storage */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive size={18} className="text-purple-700" />
                  <p className="text-sm font-semibold text-gray-700">Storage</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{planLimits.storage}</p>
                <p className="text-xs text-gray-500 mt-1">Total storage included</p>
              </div>
            </div>
          </div>

          {/* Storage Usage Bar */}
          <div className="mb-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Storage Usage</p>
              <p className="text-sm font-bold text-purple-700">{storagePercent}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${storagePercent}%`,
                  background: storagePercent > 80 ? '#ef4444' : 'linear-gradient(135deg, var(--brand-primary, #800080), var(--brand-secondary, #EE82EE))'
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{formatStorage(storageUsed)} of {formatStorage(storageLimit)} used</p>
          </div>

          {/* Included Features */}
          <div className="mb-6 border-t border-gray-200 pt-6">
            <h4 className="font-bold text-gray-800 mb-4">Included Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> Upload images, videos, audio</div>
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> QR code generation</div>
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> {planLimits.analytics} analytics</div>
              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> {planLimits.storage} storage</div>
              {(effectiveRole === 'ORG_SMALL' || effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE') && (
                <>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> Team collaboration ({planLimits.contributors} members)</div>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> Streams with QR codes</div>
                </>
              )}
              {effectiveRole === 'ORG_ENTERPRISE' && (
                <>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> White label & custom branding</div>
                  <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm"><Check className="text-green-500 flex-shrink-0" size={16} /> Workflows & compliance</div>
                </>
              )}
            </div>
          </div>

          {/* Auto-Renewal Toggle */}
          {!userIsTeamMember && effectiveRole !== 'INDIVIDUAL' && (
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Auto-Renewal</h4>
                  <p className="text-sm text-gray-600">{autoRenewal ? 'Subscription will automatically renew' : 'Subscription will end at period end'}</p>
                </div>
                <button onClick={handleToggleAutoRenewal} disabled={togglingRenewal} className={`relative w-14 h-7 rounded-full transition-all duration-300 ${autoRenewal ? 'bg-green-500' : 'bg-gray-300'} ${togglingRenewal ? 'opacity-50' : 'cursor-pointer'}`}>
                  <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-all duration-300 top-1 ${autoRenewal ? 'right-1' : 'left-1'}`}>
                    {togglingRenewal && <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div></div>}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Edit Billing / Payment Method */}
          {!userIsTeamMember && effectiveRole !== 'INDIVIDUAL' && (
            <div className="mb-6">
              <button
                onClick={handleOpenBillingPortal}
                disabled={openingBillingPortal}
                className="w-full px-6 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-xl font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all flex items-center gap-2 justify-center disabled:opacity-50 text-sm"
              >
                {openingBillingPortal ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div> Opening...</>
                ) : (
                  <><CreditCard size={16} /> Edit Billing &amp; Payment Method</>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">Update your credit card, view invoices, and download receipts</p>
            </div>
          )}

          {/* Cancel + Refund Policy */}
          {!userIsTeamMember && (
            <div className="pt-4 space-y-3 border-t border-gray-200">
              <button onClick={handleCancelSubscription} disabled={cancelingSubscription} className="w-full px-6 py-3 border-2 border-red-500 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all flex items-center gap-2 justify-center disabled:opacity-50 text-sm">
                {cancelingSubscription ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div> Canceling...</> : <><Trash2 size={16} /> Cancel Subscription</>}
              </button>
              <button onClick={() => setShowRefundPolicy(true)} className="w-full px-4 py-2.5 bg-purple-50 border-2 border-purple-200 text-purple-700 rounded-xl font-medium hover:bg-purple-100 transition-all flex items-center gap-2 justify-center text-sm">
                <BookOpen size={16} /> Read Refund Policy
              </button>
            </div>
          )}

          {/* Team Member Info */}
          {userIsTeamMember && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><UserCheck size={18} /> Team Member Account</h4>
              <p className="text-blue-800 text-sm">You are a member of <strong>{user.organization?.name}</strong>. Contact your admin for subscription changes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradePlanModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={effectiveRole} onUpgradeSuccess={(updatedUser) => { setUser(updatedUser); showToast('Plan upgraded!'); setTimeout(() => window.location.reload(), 1500); }} />

      {/* Refund Policy Modal */}
      {showRefundPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="flex-shrink-0 gradient-btn text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={22} />
                <div><h2 className="text-lg font-bold">Refund Policy</h2><p className="text-white/80 text-sm">7-Day Money-Back Guarantee</p></div>
              </div>
              <button onClick={() => setShowRefundPolicy(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-start gap-3"><Check size={22} className="text-green-600 flex-shrink-0 mt-0.5" /><div><h3 className="font-bold text-green-900 mb-1">7-Day Money-Back Guarantee</h3><p className="text-sm text-green-800">If not satisfied within 7 days, cancel for a full refund.</p></div></div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-3">How to Get a Refund</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><span className="bg-purple-100 text-purple-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span> Go to Billing & Account</li>
                  <li className="flex items-start gap-2"><span className="bg-purple-100 text-purple-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span> Click "Cancel Subscription"</li>
                  <li className="flex items-start gap-2"><span className="bg-purple-100 text-purple-700 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span> Refund processes within 5-10 business days</li>
                </ol>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-3"><AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" /><div><h3 className="font-bold text-red-900 mb-1">Do NOT Delete Your Account</h3><p className="text-sm text-red-800">Deleting your account forfeits any refund. Always use "Cancel Subscription" instead.</p></div></div>
              </div>
            </div>
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200">
              <button onClick={() => setShowRefundPolicy(false)} className="w-full px-6 py-3 gradient-btn text-white rounded-xl font-semibold text-sm">I Understand</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SettingsPage;
