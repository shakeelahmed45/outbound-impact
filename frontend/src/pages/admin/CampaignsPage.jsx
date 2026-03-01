import { useState, useEffect } from 'react';
import { Send, Target, Loader2, CheckCircle, AlertCircle, Users, Mail, Bell as BellIcon, Calendar, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminCampaignsPage = () => {
  const [campaign, setCampaign] = useState({ name: '', message: '', type: 'Both' });
  const [targeting, setTargeting] = useState({ plans: { Individual: true, 'Small Organization': true, 'Medium Organization': true, Enterprise: true } });
  const [customerCount, setCustomerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try { const res = await api.get('/admin/stats'); if (res.data.status === 'success') setCustomerCount(res.data.stats.totalUsers || 0); } catch (e) {}
    };
    fetchCount();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/campaigns/history');
      if (res.data.status === 'success') setHistory(res.data.campaigns || []);
    } catch (e) { console.error('Campaign history fetch error:', e); }
    setHistoryLoading(false);
  };

  const selectedPlans = Object.entries(targeting.plans).filter(([, v]) => v);
  const estimatedReach = selectedPlans.length > 0 ? Math.round(customerCount * (selectedPlans.length / Object.keys(targeting.plans).length)) : 0;

  const handleSend = async () => {
    if (!campaign.name || !campaign.message) { alert('Please fill in campaign name and message.'); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/admin/campaigns/send', {
        name: campaign.name,
        message: campaign.message,
        type: campaign.type,
        targetPlans: selectedPlans.map(([plan]) => plan)
      });
      if (res.data.status === 'success') {
        setResult(res.data);
        setCampaign({ name: '', message: '', type: 'Both' });
        // Refresh history after sending
        fetchHistory();
      }
    } catch (err) {
      console.error('Campaign send error:', err);
      setResult({ error: err.response?.data?.message || 'Failed to send campaign' });
    } finally { setSending(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Result Banner */}
        {result && !result.error && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="text-green-600 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-green-900">Campaign "{result.campaign}" sent!</p>
              <p className="text-sm text-green-700">
                Targeted {result.totalTargeted} users • {result.notificationsSent} dashboard notifications • {result.emailsSent} emails sent
              </p>
              {result.errors && <p className="text-xs text-green-600 mt-1">Some errors: {result.errors.join(', ')}</p>}
            </div>
          </div>
        )}
        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <p className="text-red-900">{result.error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════
            CREATE CAMPAIGN FORM
           ═══════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Send Campaign</h3>
              <p className="text-sm text-slate-600 mt-1">Users will receive a notification in their dashboard and/or an email</p>
            </div>
            <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? 'Sending...' : 'Send Campaign'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Campaign Name / Subject</label>
                <input type="text" placeholder="e.g., New Feature Announcement" value={campaign.name} onChange={(e) => setCampaign(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                <textarea rows={6} placeholder="Write your message..." value={campaign.message} onChange={(e) => setCampaign(p => ({ ...p, message: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Method</label>
                <select value={campaign.type} onChange={(e) => setCampaign(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="Both">Both (Dashboard Notification + Email)</option>
                  <option value="In-App Notification">Dashboard Notification Only</option>
                  <option value="Email Alert">Email Only</option>
                </select>
              </div>
            </div>

            {/* Targeting Options */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Target size={18} className="text-purple-600" /> Target Audience
              </h4>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Plans to include</label>
                <div className="space-y-2">
                  {Object.keys(targeting.plans).map(plan => (
                    <label key={plan} className="flex items-center gap-2">
                      <input type="checkbox" checked={targeting.plans[plan]} onChange={(e) => setTargeting(p => ({ ...p, plans: { ...p.plans, [plan]: e.target.checked } }))} className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-slate-700">{plan}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900">Estimated Reach</p>
                <p className="text-3xl font-bold text-purple-600">~{estimatedReach} users</p>
                <p className="text-xs text-purple-500 mt-1">{customerCount} total users • {selectedPlans.length} plans selected</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>What happens:</strong> Each targeted user gets a notification in their dashboard notification bell
                  {campaign.type !== 'In-App Notification' && ' AND a styled email to their inbox'}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            RECENT CAMPAIGNS HISTORY
           ═══════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Campaigns</h3>
            <button onClick={fetchHistory} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
              <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-purple-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Send className="mx-auto text-slate-300 mb-3" size={36} />
              <p className="text-slate-500 text-sm">No campaigns sent yet</p>
              <p className="text-xs text-slate-400 mt-1">Campaigns you send will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900">{c.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {c.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {c.type === 'Both' ? 'Notification + Email' : c.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-sm text-slate-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {c.totalTargeted} targeted
                      </span>
                      <span className="flex items-center gap-1">
                        <BellIcon size={14} />
                        {c.notificationsSent} notifs
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {c.emailsSent} emails
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(c.sentAt)}
                      </span>
                    </div>
                  </div>
                  {c.errors > 0 && (
                    <span className="text-xs text-orange-600 font-medium">{c.errors} error{c.errors > 1 ? 's' : ''}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCampaignsPage;
