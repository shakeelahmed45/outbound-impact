import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Check } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import usePlatformSettings from '../../hooks/usePlatformSettings';

const RevenuePage = () => {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(null);
  const [stripeRevenue, setStripeRevenue] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const { currencySymbol, currency, formatCurrency, convertAmount } = usePlatformSettings();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [revRes, analyticsRes] = await Promise.all([
        api.get('/admin/revenue'),
        api.get('/admin/analytics?range=30')
      ]);
      if (revRes.data.status === 'success') setRevenue(revRes.data);
      if (analyticsRes.data.status === 'success') setStripeRevenue(analyticsRes.data.analytics.revenue);
    } catch (err) { console.error('Revenue fetch error:', err); }

    try {
      const historyRes = await api.get('/admin/revenue/history');
      if (historyRes.data.status === 'success') setHistory(historyRes.data);
    } catch (err) {
      console.error('Revenue history fetch error:', err);
      setHistoryError(err.response?.data?.message || 'Failed to load revenue history');
    }

    setLoading(false);
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></AdminLayout>;

  // All values from Stripe are in USD — we convert when displaying
  const totalMRR = stripeRevenue?.mrr || revenue?.totalMRR || 0;
  const totalActive = revenue?.totalActiveCustomers || 0;
  const avgRev = totalActive > 0 ? (totalMRR / totalActive) : 0;
  const annualRate = totalMRR * 12;
  const revenueByPlan = revenue?.revenueByPlan || [];
  const thisMonth = stripeRevenue?.thisMonth || 0;
  const lastMonth = stripeRevenue?.lastMonth || 0;
  const monthChange = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : '0.0';

  const historyData = history?.history || [];
  const forecastData = history?.forecast || [];
  const userGrowth = history?.userGrowth || [];
  const growthRate = history?.avgMonthlyGrowthRate || 0;

  // Build chart data — convert USD values to selected currency for chart display
  const chartData = historyData.map((m, i) => ({
    label: m.label,
    actual: Math.round(convertAmount(m.revenue)),
    forecast: null,
    payments: m.payments,
    newUsers: userGrowth[i]?.newUsers || 0
  }));

  if (chartData.length > 0 && forecastData.length > 0) {
    chartData[chartData.length - 1].forecast = chartData[chartData.length - 1].actual;
  }

  forecastData.forEach(m => {
    chartData.push({
      label: m.label,
      actual: null,
      forecast: Math.round(convertAmount(m.revenue)),
      payments: 0,
      newUsers: 0
    });
  });

  const hasChartData = chartData.length > 0;
  const sym = currencySymbol;

  // Chart tooltip — values are already converted
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[160px]">
        <p className="font-semibold text-slate-900 mb-1">{label}</p>
        {payload.map((entry, i) => {
          if (entry.value === null || entry.value === undefined) return null;
          return (
            <p key={i} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {sym}{Math.round(entry.value).toLocaleString()}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Currency indicator */}
        {currency !== 'USD' && (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            💱 Values converted from USD to {currency} using live exchange rates
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Total MRR</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalMRR)}</p>
            <p className={`text-sm mt-2 ${parseFloat(monthChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(monthChange) >= 0 ? '+' : ''}{monthChange}% from last month
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Avg Revenue per Customer</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(avgRev, { decimals: 2 })}</p>
            <p className="text-sm text-slate-500 mt-2">Based on {totalActive} active customers</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-2">Annual Run Rate</p>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(annualRate)}</p>
            <p className="text-sm text-purple-600 mt-2">Projected annual revenue</p>
          </div>
        </div>

        {/* This Month vs Last Month */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <p className="text-green-100 mb-1">This Month (Stripe)</p>
            <p className="text-3xl font-bold">{formatCurrency(thisMonth)}</p>
            <p className="text-green-200 text-sm mt-2">{stripeRevenue?.thisMonthPayments || 0} payments</p>
          </div>
          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-6 text-white">
            <p className="text-slate-200 mb-1">Last Month (Stripe)</p>
            <p className="text-3xl font-bold">{formatCurrency(lastMonth)}</p>
            <p className="text-slate-300 text-sm mt-2">{stripeRevenue?.lastMonthPayments || 0} payments</p>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue by Plan</h3>
          {revenueByPlan.length === 0 ? <p className="text-slate-500">No plan data available.</p> : (
            revenueByPlan.map((plan, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${plan.color}`}></div>
                    <span className="font-medium text-slate-900">{plan.plan}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(plan.mrr)}/mo</p>
                    <p className="text-sm text-slate-500">{plan.activeCustomers} active × {formatCurrency(plan.pricePerMonth)}/mo</p>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className={`${plan.color} h-3 rounded-full`} style={{ width: `${totalMRR > 0 ? (plan.mrr / totalMRR) * 100 : 0}%`, minWidth: plan.mrr > 0 ? '40px' : '0' }}></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Revenue Forecast Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Trend & Forecast</h3>
              <p className="text-sm text-slate-500">Last 12 months actual (Stripe) + 3-month projection</p>
            </div>
            {growthRate !== 0 && (
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${growthRate >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {growthRate >= 0 ? '↑' : '↓'} {Math.abs(growthRate)}% avg monthly growth
              </span>
            )}
          </div>

          {historyError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700 font-medium mb-1">Could not load revenue history</p>
              <p className="text-sm text-red-500">{historyError}</p>
              <p className="text-xs text-red-400 mt-2">Check that your Stripe secret key is configured in backend environment variables</p>
            </div>
          ) : !hasChartData ? (
            <div className="bg-slate-50 rounded-lg h-72 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No revenue data yet</p>
                <p className="text-sm text-slate-400">Revenue will appear once you have paid invoices in Stripe</p>
              </div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `${sym}${Math.round(v).toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="actual" name="Actual Revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradActual)" dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} connectNulls={false} />
                  <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="8 4" fill="url(#gradForecast)" dot={{ r: 4, fill: '#f59e0b', strokeDasharray: '' }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-6 mt-4 px-2 text-xs text-slate-500">
                <span className="flex items-center gap-2"><span className="w-6 h-0.5 bg-purple-500 rounded"></span> Purple = Actual revenue from Stripe invoices</span>
                <span className="flex items-center gap-2"><span className="w-6 h-0.5 bg-amber-500 rounded" style={{ borderBottom: '2px dashed #f59e0b' }}></span> Amber dashed = Projected based on {Math.abs(growthRate)}% avg growth</span>
              </div>
            </>
          )}
        </div>

        {/* New User Signups per Month */}
        {userGrowth.length > 0 && userGrowth.some(u => u.newUsers > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">New Signups per Month</h3>
              <p className="text-sm text-slate-500">User growth trend alongside revenue</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} users`, 'New Signups']} />
                <Bar dataKey="newUsers" name="New Signups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Data Source */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Revenue Data Sources</h4>
              <p className="text-sm text-slate-700 mb-3">All metrics come from <strong>real data</strong>:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /><span><strong>MRR:</strong> Live from Stripe active subscriptions API</span></li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /><span><strong>Monthly Revenue:</strong> Paid invoices from Stripe (last 12 months)</span></li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /><span><strong>Forecast:</strong> 3-month projection based on avg growth rate of last 6 months</span></li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-600" /><span><strong>User Growth:</strong> New signups per month from database</span></li>
                {currency !== 'USD' && (
                  <li className="flex items-center gap-2"><Check size={14} className="text-blue-600" /><span><strong>Currency:</strong> Live exchange rate conversion from USD to {currency}</span></li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RevenuePage;
