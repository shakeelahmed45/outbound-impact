// admin/EnterpriseLeadsPage.jsx
// Admin page to manage enterprise plan enquiries and send custom checkout links.

import { useState, useEffect } from 'react';
import {
  Building2, Mail, Phone, Users, HardDrive, MessageSquare,
  Send, CheckCircle, Clock, X, ChevronDown, Loader2,
  ExternalLink, Trash2, StickyNote, RefreshCw, BadgeCheck, AlertCircle
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const STATUS_CONFIG = {
  new:        { label: 'New',        color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  contacted:  { label: 'Contacted',  color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  qualified:  { label: 'Qualified',  color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  converted:  { label: 'Converted',  color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  lost:       { label: 'Lost',       color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
};

const STORAGE_OPTIONS = [
  { value: 1500,  label: '1.5 TB',  price: 99 },
  { value: 2000,  label: '2 TB',    price: 129 },
  { value: 3000,  label: '3 TB',    price: 179 },
  { value: 5000,  label: '5 TB',    price: 249 },
  { value: 10000, label: '10 TB',   price: 449 },
];

// "Members" = audience/cohort members the org reaches via QR, NFC & push notifications
// NOT team/staff users (those are unlimited on Enterprise)
const AUDIENCE_OPTIONS = [
  { value: 5000,   label: '5,000 members',    price: 0 },
  { value: 10000,  label: '10,000 members',   price: 30 },
  { value: 25000,  label: '25,000 members',   price: 80 },
  { value: 50000,  label: '50,000 members',   price: 150 },
  { value: 100000, label: '100,000 members',  price: 250 },
  { value: 250000, label: '250,000 members',  price: 450 },
  { value: -1,     label: 'Unlimited members',price: 600 },
];

const calcPrice = (storageGB, audienceSize) => {
  const s = STORAGE_OPTIONS.find(o => o.value === storageGB) || STORAGE_OPTIONS[0];
  const a = AUDIENCE_OPTIONS.find(o => o.value === audienceSize) || AUDIENCE_OPTIONS[0];
  return s.price + a.price;
};

// ── Checkout Panel (shown inline when admin clicks "Send Checkout") ──────────
const CheckoutPanel = ({ lead, onSent, onCancel }) => {
  const [storageGB,    setStorageGB]    = useState(1500);
  const [audienceSize, setAudienceSize] = useState(5000);
  const [customPrice,  setCustomPrice]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState('');

  const suggestedPrice = calcPrice(storageGB, audienceSize);
  const finalPrice     = customPrice !== '' ? Number(customPrice) : suggestedPrice;

  const handleSend = async () => {
    setError('');
    if (!finalPrice || finalPrice <= 0) { setError('Please enter a valid monthly price.'); return; }
    setSending(true);
    try {
      await api.post(`/enterprise-leads/${lead.id}/send-checkout`, {
        storageGB, audienceSize, monthlyPrice: finalPrice, notes,
      });
      onSent();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send checkout link.');
    } finally { setSending(false); }
  };

  return (
    <div className="mt-4 bg-gradient-to-br from-violet-50 to-teal-50 border border-violet-200 rounded-xl p-5">
      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Send size={16} className="text-violet-600" /> Configure Enterprise Plan
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Storage</label>
          <select value={storageGB} onChange={e => setStorageGB(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-400 outline-none">
            {STORAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} (+${o.price}/mo)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Audience Members
            <span className="ml-1 text-slate-400 font-normal">(QR/NFC/push reach)</span>
          </label>
          <select value={audienceSize} onChange={e => setAudienceSize(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-400 outline-none">
            {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} (+${o.price}/mo)</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Monthly Price (USD) — Suggested: ${suggestedPrice}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
            <input
              type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)}
              placeholder={String(suggestedPrice)}
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Leave blank to use suggested price</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notes to prospect (shown in email)</label>
          <input
            type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Includes onboarding call"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none"
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={handleSend} disabled={sending}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-violet-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-60">
          {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send Checkout Link to {lead.email}</>}
        </button>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
        <span className="ml-auto text-sm font-bold text-slate-700">
          Total: <span className="text-violet-600">USD ${finalPrice}/mo</span>
        </span>
      </div>
    </div>
  );
};

// ── Lead Card ─────────────────────────────────────────────────────────────────
const LeadCard = ({ lead, onUpdate, onDelete }) => {
  const [expanded,     setExpanded]     = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [notes,        setNotes]        = useState(lead.adminNotes || '');
  const [savingNotes,  setSavingNotes]  = useState(false);
  const [status,       setStatus]       = useState(lead.status);

  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try { await api.patch(`/enterprise-leads/${lead.id}`, { status: newStatus }); onUpdate(); }
    catch { setStatus(lead.status); }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try { await api.patch(`/enterprise-leads/${lead.id}`, { adminNotes: notes }); onUpdate(); }
    finally { setSavingNotes(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete lead from ${lead.email}? This cannot be undone.`)) return;
    try { await api.delete(`/enterprise-leads/${lead.id}`); onDelete(); }
    catch { alert('Failed to delete lead.'); }
  };

  const handleCheckoutSent = () => {
    setShowCheckout(false);
    setStatus('contacted');
    onUpdate();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">{lead.name}</h3>
              {lead.company && <span className="text-slate-500 text-sm">· {lead.company}</span>}
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {lead.checkoutSentAt && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <CheckCircle size={11} /> Link sent
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Mail size={13} /> {lead.email}</span>
              {lead.phone    && <span className="flex items-center gap-1"><Phone size={13} /> {lead.phone}</span>}
              {lead.teamSize && <span className="flex items-center gap-1"><Users size={13} /> {lead.teamSize}</span>}
              {lead.storageNeeds && <span className="flex items-center gap-1"><HardDrive size={13} /> {lead.storageNeeds}</span>}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Received {new Date(lead.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowCheckout(!showCheckout)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:opacity-90 transition-all">
              <Send size={13} /> Send Checkout
            </button>
            <button onClick={() => setExpanded(!expanded)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Checkout panel */}
        {showCheckout && (
          <CheckoutPanel lead={lead} onSent={handleCheckoutSent} onCancel={() => setShowCheckout(false)} />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-4">
          {lead.message && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MessageSquare size={12} /> Message from prospect
              </p>
              <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed">{lead.message}</p>
            </div>
          )}

          {/* Checkout link if already sent */}
          {lead.checkoutUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ExternalLink size={12} /> Last Checkout Link
              </p>
              <a href={lead.checkoutUrl} target="_blank" rel="noreferrer"
                className="text-xs text-violet-600 hover:underline break-all flex items-center gap-1">
                {lead.checkoutUrl.substring(0, 80)}… <ExternalLink size={11} />
              </a>
              <p className="text-xs text-slate-400 mt-1">Sent {new Date(lead.checkoutSentAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <StickyNote size={12} /> Admin Notes
            </p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Internal notes about this lead…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none bg-white" />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleSaveNotes} disabled={savingNotes}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 disabled:opacity-60">
                {savingNotes ? <Loader2 size={12} className="animate-spin" /> : null} Save Notes
              </button>
            </div>
          </div>

          {/* Status + Delete */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleStatusChange(key)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${status === key ? cfg.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <button onClick={handleDelete} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const EnterpriseLeadsPage = () => {
  const [leads,        setLeads]        = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const [page,         setPage]         = useState(1);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (activeStatus !== 'all') params.set('status', activeStatus);
      const res = await api.get(`/enterprise-leads?${params}`);
      if (res.data.status === 'success') {
        setLeads(res.data.leads);
        setTotal(res.data.total);
        setStatusCounts(res.data.statusCounts || {});
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [activeStatus, page]);

  const totalNew = statusCounts.new || 0;

  const TAB_OPTIONS = [
    { key: 'all',       label: 'All' },
    { key: 'new',       label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'converted', label: 'Converted' },
    { key: 'lost',      label: 'Lost' },
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={24} className="text-violet-600" /> Enterprise Leads
            </h1>
            <p className="text-slate-500 text-sm mt-1">{total} total enquiries</p>
          </div>
          <div className="flex items-center gap-3">
            {totalNew > 0 && (
              <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                {totalNew} new
              </span>
            )}
            <button onClick={fetchLeads} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TAB_OPTIONS.map(tab => {
            const count = tab.key === 'all'
              ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
              : (statusCounts[tab.key] || 0);
            const isActive = activeStatus === tab.key;
            const cfg = STATUS_CONFIG[tab.key];
            return (
              <button key={tab.key} onClick={() => { setActiveStatus(tab.key); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-violet-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-violet-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No leads yet</p>
            <p className="text-sm text-slate-400 mt-1">Enterprise enquiries from the Plans page will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} onUpdate={fetchLeads} onDelete={fetchLeads} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
              ← Previous
            </button>
            <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default EnterpriseLeadsPage;