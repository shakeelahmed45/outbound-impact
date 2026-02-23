import { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Eye, QrCode,
  Smartphone, Monitor, ChevronDown, ChevronUp, Download, RefreshCw,
  Loader2, Filter, BarChart3, Wifi, ExternalLink, Search, X, Info
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../services/api';

// ═══════════════════════════════════════════════════════════
// Issue type labels and icons
// ═══════════════════════════════════════════════════════════
const ISSUE_CONFIG = {
  EMPTY_CAMPAIGN:      { label: 'Empty Stream',         icon: '📭', color: 'red' },
  MISSING_QR:          { label: 'No QR Code',           icon: '🔲', color: 'orange' },
  MISSING_MEDIA:       { label: 'Missing Media',        icon: '🖼️', color: 'red' },
  MISSING_DESCRIPTION: { label: 'Missing Descriptions', icon: '📝', color: 'yellow' },
  ZERO_DELIVERY:       { label: 'Zero Views',           icon: '👁️', color: 'orange' },
  STALE_CAMPAIGN:      { label: 'Stale (30+ days)',     icon: '⏰', color: 'yellow' },
  PASSWORD_NO_VIEWS:   { label: 'Password Issue',       icon: '🔒', color: 'yellow' },
};

const CompliancePage = () => {
  // ═══════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('issues');
  const [searchQuery, setSearchQuery] = useState('');

  // UI
  const [expandedId, setExpandedId] = useState(null);

  // ═══════════════════════════════════════════
  // Fetch
  // ═══════════════════════════════════════════
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sortBy) params.append('sort', sortBy);

      const [campaignRes, summaryRes] = await Promise.all([
        api.get(`/compliance/campaigns?${params.toString()}`),
        api.get('/compliance/summary'),
      ]);

      if (campaignRes.data.status === 'success') {
        setCampaigns(campaignRes.data.campaigns || []);
      }
      if (summaryRes.data.status === 'success') {
        setSummary(summaryRes.data.summary);
      }
    } catch (err) {
      console.error('❌ Compliance fetch failed:', err.response?.data?.detail || err.message);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ═══════════════════════════════════════════
  // Filtering (client-side search on top of server filter)
  // ═══════════════════════════════════════════
  const filteredCampaigns = campaigns.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.organizationName?.toLowerCase().includes(q) ||
      c.issues?.some(i => i.message?.toLowerCase().includes(q))
    );
  });

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════
  const getScoreStyle = (score) => {
    if (score === 100) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 90) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 70) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score === 100) return <CheckCircle size={16} className="text-green-600" />;
    if (score >= 90) return <Info size={16} className="text-blue-600" />;
    if (score >= 70) return <AlertTriangle size={16} className="text-orange-600" />;
    return <XCircle size={16} className="text-red-600" />;
  };

  const getSeverityStyle = (severity) => {
    if (severity === 'high') return 'bg-red-50 border-red-200 text-red-700';
    if (severity === 'medium') return 'bg-orange-50 border-orange-200 text-orange-700';
    return 'bg-yellow-50 border-yellow-200 text-yellow-700';
  };

  const handleExport = () => {
    const csv = [
      'Stream,Organization,Items,Views,QR Views,NFC Views,Direct Views,Compliance Score,Issues,Issue Details',
      ...filteredCampaigns.map(c =>
        `"${c.name}","${c.organizationName || '—'}",${c.itemCount},${c.totalViews},${c.qrViews},${c.nfcViews},${c.directViews},${c.complianceScore}%,${c.issueCount},"${c.issues.map(i => i.message).join('; ')}"`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = statusFilter !== 'all' || searchQuery;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Compliance & Delivery</h1>
            <p className="text-gray-500 text-sm">Monitor content health, delivery rates, and compliance across all streams</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={handleExport} disabled={filteredCampaigns.length === 0} className="px-4 py-2 gradient-btn text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.avgCompliance}%</p>
                  <p className="text-xs text-gray-500">Avg Score</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BarChart3 size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalDelivered?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Views</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.fullyCompliant}<span className="text-sm text-gray-400">/{summary.totalCampaigns}</span></p>
                  <p className="text-xs text-gray-500">Fully Compliant</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary.totalIssues > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                  <AlertTriangle size={20} className={summary.totalIssues > 0 ? 'text-orange-600' : 'text-green-600'} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${summary.totalIssues > 0 ? 'text-orange-600' : 'text-green-600'}`}>{summary.totalIssues}</p>
                  <p className="text-xs text-gray-500">Total Issues</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <QrCode size={20} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalItems}</p>
                  <p className="text-xs text-gray-500">Total Items</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Sources (if data exists) */}
        {summary && summary.totalDelivered > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Delivery Sources</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {[
                { label: 'QR Code Scans', value: summary.deliverySources?.qr || 0, icon: <QrCode size={16} className="text-purple-600" />, color: 'purple' },
                { label: 'NFC Taps', value: summary.deliverySources?.nfc || 0, icon: <Wifi size={16} className="text-blue-600" />, color: 'blue' },
                { label: 'Direct Links', value: summary.deliverySources?.direct || 0, icon: <ExternalLink size={16} className="text-gray-600" />, color: 'gray' },
              ].map((source) => {
                const pct = summary.totalDelivered > 0 ? Math.round((source.value / summary.totalDelivered) * 100) : 0;
                return (
                  <div key={source.label} className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {source.icon}
                        <span className="text-sm text-gray-600">{source.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{source.value.toLocaleString()} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${source.color === 'purple' ? 'bg-purple-500' : source.color === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search streams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none min-w-[160px]"
            >
              <option value="all">All Streams</option>
              <option value="compliant">✅ Fully Compliant</option>
              <option value="issues">⚠️ Has Issues</option>
              <option value="critical">🔴 Critical Issues</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none min-w-[140px]"
            >
              <option value="issues">Sort: Most Issues</option>
              <option value="score">Sort: Lowest Score</option>
              <option value="views">Sort: Most Views</option>
              <option value="newest">Sort: Newest</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setStatusFilter('all'); setSearchQuery(''); }} className="px-3 py-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                <X size={16} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-purple-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle size={32} className="mx-auto text-red-400 mb-3" />
            <h3 className="font-semibold text-red-700 mb-1">Failed to load compliance data</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">
              Retry
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Shield size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {hasFilters ? 'No matching streams' : 'No streams found'}
            </h3>
            <p className="text-gray-500 text-sm">
              {hasFilters
                ? 'Try adjusting your filters.'
                : 'Create some streams to start tracking compliance.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Campaign Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{campaign.name}</h3>
                        {campaign.passwordProtected && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">🔒</span>
                        )}
                      </div>
                      {campaign.organizationName && (
                        <p className="text-sm text-gray-400">{campaign.organizationName}</p>
                      )}
                      {campaign.issues.length > 0 && (
                        <p className="text-sm text-orange-600 mt-1">
                          ⚠️ {campaign.issues.length} issue{campaign.issues.length > 1 ? 's' : ''} detected
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getScoreStyle(campaign.complianceScore)}`}>
                        {getScoreIcon(campaign.complianceScore)}
                        {campaign.complianceScore}%
                      </span>
                      {expandedId === campaign.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">Views</p>
                      <p className="text-xl font-bold text-gray-900">{campaign.totalViews.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">QR Scans</p>
                      <p className="text-xl font-bold text-gray-900">{campaign.qrViews.toLocaleString()}</p>
                      {campaign.totalViews > 0 && (
                        <p className="text-xs text-gray-400">{Math.round((campaign.qrViews / campaign.totalViews) * 100)}%</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">Items</p>
                      <p className="text-xl font-bold text-gray-900">{campaign.itemCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">Issues</p>
                      <p className={`text-xl font-bold ${campaign.issueCount === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {campaign.issueCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Issue Detail */}
                {expandedId === campaign.id && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                    {campaign.issues.length === 0 ? (
                      <div className="flex items-center gap-3 text-green-600">
                        <CheckCircle size={20} />
                        <p className="text-sm font-medium">All compliance checks passed — this stream is fully healthy.</p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Issue Details</h4>
                        <div className="space-y-2">
                          {campaign.issues.map((issue, idx) => {
                            const config = ISSUE_CONFIG[issue.type] || { label: issue.type, icon: '⚠️', color: 'gray' };
                            return (
                              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityStyle(issue.severity)}`}>
                                <span className="text-lg leading-none mt-0.5">{config.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-medium">{config.label}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                      issue.severity === 'high' ? 'bg-red-200 text-red-800' :
                                      issue.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                                      'bg-yellow-200 text-yellow-800'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                  </div>
                                  <p className="text-xs opacity-80">{issue.message}</p>
                                  {issue.affected && issue.affected.length > 0 && (
                                    <p className="text-xs mt-1 opacity-60">Affected: {issue.affected.join(', ')}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delivery Breakdown */}
                    {campaign.totalViews > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Delivery Breakdown</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                            <QrCode size={18} className="mx-auto text-purple-500 mb-1" />
                            <p className="text-lg font-bold text-gray-900">{campaign.qrViews.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">QR Scans</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                            <Wifi size={18} className="mx-auto text-blue-500 mb-1" />
                            <p className="text-lg font-bold text-gray-900">{campaign.nfcViews.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">NFC Taps</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                            <ExternalLink size={18} className="mx-auto text-gray-500 mb-1" />
                            <p className="text-lg font-bold text-gray-900">{campaign.directViews.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">Direct Links</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompliancePage;
