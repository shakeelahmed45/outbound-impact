import { useEffect, useState } from 'react';
import { Users, DollarSign, QrCode, Wifi, MousePointer, Eye, ArrowUp, Award, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import usePlatformSettings from '../../hooks/usePlatformSettings';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [geo, setGeo] = useState(null);
  const [dateRange, setDateRange] = useState('30days');
  const { formatCurrency } = usePlatformSettings();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [statsRes, analyticsRes, overviewRes, geoRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/analytics?range=30'),
        api.get('/admin/overview'),
        api.get('/admin/geography')
      ]);
      if (statsRes.data.status === 'success') setStats(statsRes.data.stats);
      if (analyticsRes.data.status === 'success') setAnalytics(analyticsRes.data.analytics);
      if (overviewRes.data.status === 'success') setOverview(overviewRes.data);
      if (geoRes.data.status === 'success') setGeo(geoRes.data);
    } catch (err) { console.error('Dashboard fetch error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></AdminLayout>;

  const totalCustomers = stats?.totalUsers || 0;
  const prevUsers = stats?.previousPeriod?.totalUsers || 0;
  const newThisMonth = totalCustomers > prevUsers ? totalCustomers - prevUsers : 0;
  const mrr = analytics?.revenue?.mrr || 0;
  const totalViews = geo?.totalScans || stats?.totalViews || 0;
  const qrViews = geo?.totalQrScans || 0;
  const nfcViews = geo?.totalNfcScans || 0;
  const directViews = geo?.totalDirectScans || 0;
  const planBreakdown = overview?.planBreakdown || [];
  const recentCustomers = overview?.recentCustomers || [];
  const topPerformers = overview?.topPerformers || [];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end mb-6 gap-3">
          <div className="flex items-center gap-3">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="90days">Last 90 Days</option><option value="all">All Time</option>
            </select>
            <button onClick={() => fetchData(true)} disabled={refreshing} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Top Stats — 6 cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-slate-600">Customers</p><Users className="text-blue-500" size={18} /></div>
            <p className="text-2xl font-bold text-slate-900">{totalCustomers}</p>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUp size={12} />+{newThisMonth} new</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-slate-600">Monthly Revenue</p><DollarSign className="text-green-500" size={18} /></div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(mrr)}</p>
            <p className="text-xs text-slate-500 mt-1">From Stripe</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-slate-600">Total Views</p><Eye className="text-slate-500" size={18} /></div>
            <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">All sources</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-purple-600 font-medium">QR Scans</p><QrCode className="text-purple-500" size={18} /></div>
            <p className="text-2xl font-bold text-purple-700">{qrViews.toLocaleString()}</p>
            <p className="text-xs text-purple-500 mt-1">{totalViews > 0 ? ((qrViews / totalViews) * 100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-blue-600 font-medium">NFC Taps</p><Wifi className="text-blue-500" size={18} /></div>
            <p className="text-2xl font-bold text-blue-700">{nfcViews.toLocaleString()}</p>
            <p className="text-xs text-blue-500 mt-1">{totalViews > 0 ? ((nfcViews / totalViews) * 100).toFixed(1) : 0}% of total</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-green-600 font-medium">Direct Links</p><MousePointer className="text-green-500" size={18} /></div>
            <p className="text-2xl font-bold text-green-700">{directViews.toLocaleString()}</p>
            <p className="text-xs text-green-500 mt-1">{totalViews > 0 ? ((directViews / totalViews) * 100).toFixed(1) : 0}% of total</p>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Plan Distribution</h3>
          {planBreakdown.length === 0 ? <p className="text-slate-500">No customer data yet.</p> : (
            <div className="space-y-4">
              {planBreakdown.map((plan, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${plan.color}`}></div><span className="font-medium text-slate-900">{plan.plan}</span></div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-slate-600">{plan.customers} customers</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(plan.customers * plan.price)} MRR</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2"><div className={`${plan.color} h-2 rounded-full`} style={{ width: `${totalCustomers > 0 ? (plan.customers / totalCustomers) * 100 : 0}%` }}></div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Customers & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Customers</h3>
            {recentCustomers.length === 0 ? <p className="text-slate-500">No customers yet.</p> : (
              <div className="space-y-3">
                {recentCustomers.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{c.name}</p><p className="text-xs text-slate-500">{c.plan}</p></div>
                    <div className="text-right"><p className="text-sm font-semibold text-slate-900">{c.items} items</p><p className="text-xs text-slate-500">{c.campaigns} streams</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Top Performers</h3>
            {topPerformers.length === 0 ? <p className="text-slate-500">No data yet.</p> : (
              <div className="space-y-3">
                {topPerformers.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">#{idx + 1}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{c.name}</p><p className="text-xs text-slate-500">{c.totalViews.toLocaleString()} views • {c.items} items</p></div>
                    <Award className="text-yellow-500" size={20} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
