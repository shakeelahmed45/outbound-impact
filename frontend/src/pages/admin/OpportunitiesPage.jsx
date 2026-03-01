import { useState, useEffect } from 'react';
import { Mail, AlertCircle, Zap, X, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import usePlatformSettings from '../../hooks/usePlatformSettings';

const OpportunitiesPage = () => {
  const [loading, setLoading] = useState(true);
  const [upgradeOpportunities, setUpgradeOpportunities] = useState([]);
  const [churnRisks, setChurnRisks] = useState([]);
  const [showReachOutModal, setShowReachOutModal] = useState(false);
  const [showTakeActionModal, setShowTakeActionModal] = useState(false);
  const [selectedChurnRisk, setSelectedChurnRisk] = useState(null);
  const [reachOutMessage, setReachOutMessage] = useState({ subject: '', message: '', includeDiscount: false, discountCode: '' });
  const [retentionActions, setRetentionActions] = useState({ sendEmail: true, offerDiscount: false, discountAmount: '10', scheduleCall: false });
  const { currencySymbol: sym, formatCurrency } = usePlatformSettings();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/opportunities');
      if (res.data.status === 'success') {
        setUpgradeOpportunities(res.data.upgradeOpportunities || []);
        setChurnRisks(res.data.churnRisks || []);
      }
    } catch (err) { console.error('Opportunities fetch error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">

        {/* ═══════════════════════════════════════════
            UPGRADE OPPORTUNITIES
           ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 lg:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Upgrade Opportunities</h3>
              <p className="text-sm text-slate-600">Customers at 70%+ of their plan limits</p>
            </div>
            {upgradeOpportunities.length > 0 && (
              <button onClick={() => alert(`Preparing email campaign for ${upgradeOpportunities.length} upgrade opportunities...`)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 text-sm">
                <Mail size={16} /> Email All
              </button>
            )}
          </div>

          {upgradeOpportunities.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-lg">No upgrade opportunities found</p>
              <p className="text-sm text-slate-400 mt-1">All customers are well within their plan limits</p>
            </div>
          ) : (
            <>
              {/* ── MOBILE: Card Layout ── */}
              <div className="lg:hidden divide-y divide-slate-100">
                {upgradeOpportunities.map((opp) => (
                  <div key={opp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{opp.name}</p>
                        <p className="text-xs text-slate-500 truncate">{opp.email}</p>
                      </div>
                      <button onClick={() => alert(`Contact ${opp.name} (${opp.email}) about upgrading to ${opp.upgradeTo}`)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex-shrink-0">Contact</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Current Plan</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{opp.currentPlan}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Upgrade To</p>
                        <p className="font-medium text-green-600">{opp.upgradeTo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Items</p>
                        <p className={`font-medium ${opp.items.includes('/') && opp.items.split('/')[0] === opp.items.split('/')[1] ? 'text-orange-600' : 'text-slate-900'}`}>{opp.items}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Team</p>
                        <p className={`font-medium ${opp.team.includes('/') && opp.team.split('/')[0] === opp.team.split('/')[1] ? 'text-orange-600' : 'text-slate-900'}`}>{opp.team}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Usage Score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${opp.score >= 90 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${opp.score}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 w-8 text-right">{opp.score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP: Table Layout ── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Customer</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Current Plan</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Items</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Team</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Upgrade To</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Usage Score</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeOpportunities.map((opp) => (
                      <tr key={opp.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-6">
                          <p className="font-medium text-slate-900">{opp.name}</p>
                          <p className="text-xs text-slate-500">{opp.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{opp.currentPlan}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-sm font-medium ${opp.items.includes('/') && opp.items.split('/')[0] === opp.items.split('/')[1] ? 'text-orange-600' : 'text-slate-900'}`}>{opp.items}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-sm font-medium ${opp.team.includes('/') && opp.team.split('/')[0] === opp.team.split('/')[1] ? 'text-orange-600' : 'text-slate-900'}`}>{opp.team}</span>
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-green-600">{opp.upgradeTo}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                              <div className={`h-2 rounded-full ${opp.score >= 90 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${opp.score}%` }}></div>
                            </div>
                            <span className="text-xs font-medium text-slate-900">{opp.score}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button onClick={() => alert(`Contact ${opp.name} (${opp.email}) about upgrading to ${opp.upgradeTo}`)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Contact</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            CHURN RISKS
           ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-red-200 bg-red-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-lg font-bold text-red-900">Churn Risk Alert</h3>
                <p className="text-sm text-red-700">Paying customers inactive for 14+ days</p>
              </div>
            </div>
            {churnRisks.length > 0 && (
              <button onClick={() => setShowTakeActionModal(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 text-sm">
                <Zap size={16} /> Take Action
              </button>
            )}
          </div>

          {churnRisks.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 text-lg">No churn risks detected</p>
              <p className="text-sm text-slate-400 mt-1">All paying customers are active</p>
            </div>
          ) : (
            <>
              {/* ── MOBILE: Card Layout ── */}
              <div className="lg:hidden divide-y divide-slate-100">
                {churnRisks.map((risk) => (
                  <div key={risk.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{risk.name}</p>
                        <p className="text-xs text-slate-500 truncate">{risk.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedChurnRisk(risk);
                          setReachOutMessage({
                            subject: `We miss you at Outbound Impact, ${risk.name}!`,
                            message: `Hi ${risk.name},\n\nWe noticed it's been a while since you've been active on Outbound Impact. We'd love to help you get the most out of your ${risk.plan} subscription.\n\nIs there anything we can help you with?\n\nBest regards,\nThe Outbound Impact Team`,
                            includeDiscount: false,
                            discountCode: ''
                          });
                          setShowReachOutModal(true);
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 flex-shrink-0"
                      >Reach Out</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Plan</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${risk.plan === 'Enterprise' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{risk.plan}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">MRR at Risk</p>
                        <p className="font-bold text-red-600">{formatCurrency(risk.mrr)}/mo</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Activity</p>
                        <p className="font-medium text-slate-900">{risk.lastActivity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Views</p>
                        <p className="font-medium text-slate-900">{risk.totalViews.toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${risk.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{risk.risk} RISK</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP: Table Layout ── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Customer</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Plan</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">MRR at Risk</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Last Activity</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Total Views</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Risk Level</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnRisks.map((risk) => (
                      <tr key={risk.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-6">
                          <p className="font-medium text-slate-900">{risk.name}</p>
                          <p className="text-xs text-slate-500">{risk.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${risk.plan === 'Enterprise' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{risk.plan}</span>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-red-600">{formatCurrency(risk.mrr)}/mo</td>
                        <td className="py-4 px-6 text-sm text-slate-900">{risk.lastActivity}</td>
                        <td className="py-4 px-6 text-sm text-slate-900">{risk.totalViews.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${risk.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{risk.risk} RISK</span>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => {
                              setSelectedChurnRisk(risk);
                              setReachOutMessage({
                                subject: `We miss you at Outbound Impact, ${risk.name}!`,
                                message: `Hi ${risk.name},\n\nWe noticed it's been a while since you've been active on Outbound Impact. We'd love to help you get the most out of your ${risk.plan} subscription.\n\nIs there anything we can help you with?\n\nBest regards,\nThe Outbound Impact Team`,
                                includeDiscount: false,
                                discountCode: ''
                              });
                              setShowReachOutModal(true);
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                          >Reach Out</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            REACH OUT MODAL (unchanged)
           ═══════════════════════════════════════════ */}
        {showReachOutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Reach Out to {selectedChurnRisk?.name}</h3>
                <button onClick={() => setShowReachOutModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                  <input type="text" value={reachOutMessage.subject} onChange={(e) => setReachOutMessage(p => ({ ...p, subject: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
                  <textarea rows={6} value={reachOutMessage.message} onChange={(e) => setReachOutMessage(p => ({ ...p, message: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={reachOutMessage.includeDiscount} onChange={(e) => setReachOutMessage(p => ({ ...p, includeDiscount: e.target.checked }))} className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-slate-700">Include discount code</span>
                </label>
                {reachOutMessage.includeDiscount && (
                  <input type="text" placeholder="e.g., COMEBACK10" value={reachOutMessage.discountCode} onChange={(e) => setReachOutMessage(p => ({ ...p, discountCode: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { alert(`Email sent to ${selectedChurnRisk?.email}!`); setShowReachOutModal(false); }} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Send Email</button>
                <button onClick={() => setShowReachOutModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TAKE ACTION MODAL (unchanged)
           ═══════════════════════════════════════════ */}
        {showTakeActionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Retention Action Plan</h3>
                <button onClick={() => setShowTakeActionModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800"><strong>{churnRisks.length}</strong> at-risk customers • <strong>{formatCurrency(churnRisks.reduce((s, r) => s + r.mrr, 0))}</strong> MRR at risk</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={retentionActions.sendEmail} onChange={(e) => setRetentionActions(p => ({ ...p, sendEmail: e.target.checked }))} className="w-4 h-4 text-purple-600" />
                  <div><p className="font-medium text-slate-900">Send retention email</p><p className="text-sm text-slate-500">Personalized message to each at-risk customer</p></div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={retentionActions.offerDiscount} onChange={(e) => setRetentionActions(p => ({ ...p, offerDiscount: e.target.checked }))} className="w-4 h-4 text-purple-600" />
                  <div><p className="font-medium text-slate-900">Offer discount</p><p className="text-sm text-slate-500">Include a {retentionActions.discountAmount}% discount code</p></div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input type="checkbox" checked={retentionActions.scheduleCall} onChange={(e) => setRetentionActions(p => ({ ...p, scheduleCall: e.target.checked }))} className="w-4 h-4 text-purple-600" />
                  <div><p className="font-medium text-slate-900">Schedule follow-up call</p><p className="text-sm text-slate-500">Add to call queue for personal outreach</p></div>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { alert(`Retention workflow initiated for ${churnRisks.length} customers!`); setShowTakeActionModal(false); }} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Execute Plan</button>
                <button onClick={() => setShowTakeActionModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OpportunitiesPage;
