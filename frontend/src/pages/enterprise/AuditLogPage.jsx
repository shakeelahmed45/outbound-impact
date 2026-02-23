import { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, Download, Search, Filter, ChevronLeft, ChevronRight,
  Activity, Users, Calendar, TrendingUp, Loader2, RefreshCw, X
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../services/api';

const AuditLogPage = () => {
  // ═══════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [actionTypes, setActionTypes] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // ═══════════════════════════════════════════
  // Fetch
  // ═══════════════════════════════════════════
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit });
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit/logs?${params.toString()}`);
      if (res.data.status === 'success') {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        if (res.data.actionTypes) setActionTypes(res.data.actionTypes);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      // Fall back to sample data if API not deployed yet
      setLogs(getSampleData());
      setTotal(7);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, searchQuery, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/audit/stats');
      if (res.data.status === 'success') {
        setStats(res.data.stats);
      }
    } catch {
      // Stats not critical — fail silently
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, searchQuery, startDate, endDate]);

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════
  const getActionStyle = (action) => {
    if (!action) return 'bg-gray-100 text-gray-700';
    const a = action.toUpperCase();
    if (a.includes('CREATED') || a.includes('UPLOADED')) return 'bg-purple-100 text-purple-700';
    if (a.includes('UPDATED') || a.includes('CHANGED')) return 'bg-blue-100 text-blue-700';
    if (a.includes('DELETED') || a.includes('REMOVED')) return 'bg-red-100 text-red-700';
    if (a.includes('APPROVED') || a.includes('ENABLED')) return 'bg-green-100 text-green-700';
    if (a.includes('SUBMITTED') || a.includes('INVITED')) return 'bg-orange-100 text-orange-700';
    if (a.includes('CANCELED') || a.includes('DISABLED')) return 'bg-yellow-100 text-yellow-700';
    if (a.includes('LOGIN') || a.includes('PASSWORD')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatAction = (action) => {
    if (!action) return '—';
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, ' ');
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const getMetadataDisplay = (log) => {
    const m = log.metadata || {};
    const parts = [];
    if (m.title) parts.push(m.title);
    if (m.name) parts.push(m.name);
    if (m.assetName) parts.push(m.assetName);
    if (m.email) parts.push(m.email);
    if (m.role) parts.push(`Role: ${m.role}`);
    if (m.type) parts.push(`Type: ${m.type}`);
    if (m.resourceId) parts.push(`ID: ${m.resourceId.substring(0, 8)}…`);
    return parts.length > 0 ? parts.join(' • ') : '—';
  };

  // ═══════════════════════════════════════════
  // Export CSV
  // ═══════════════════════════════════════════
  const handleExport = () => {
    const csv = [
      'Timestamp,User,Email,Action,Details,IP Address',
      ...logs.map(l =>
        `"${new Date(l.createdAt).toISOString()}","${l.user?.name || 'System'}","${l.user?.email || ''}","${l.action}","${getMetadataDisplay(l).replace(/"/g, '""')}","${l.ipAddress || ''}"`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = searchQuery || actionFilter !== 'all' || startDate || endDate;

  // ═══════════════════════════════════════════
  // Sample data (fallback when API not deployed)
  // ═══════════════════════════════════════════
  const getSampleData = () => [
    { id: '1', action: 'ITEM_CREATED', user: { name: 'Sarah Admin', email: 'sarah@company.com' }, metadata: { title: 'Holiday_Campaign.pdf', type: 'IMAGE' }, createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), ipAddress: '192.168.1.45' },
    { id: '2', action: 'CAMPAIGN_UPDATED', user: { name: 'Tom Editor', email: 'tom@company.com' }, metadata: { name: 'Summer Collection', resourceId: 'abc-123-def' }, createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), ipAddress: '192.168.1.52' },
    { id: '3', action: 'COHORT_CREATED', user: { name: 'Sarah Admin', email: 'sarah@company.com' }, metadata: { name: 'VIP Customers' }, createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), ipAddress: '192.168.1.45' },
    { id: '4', action: 'WORKFLOW_APPROVED', user: { name: 'Mike Manager', email: 'mike@company.com' }, metadata: { assetName: 'Product_Launch_Banner.jpg' }, createdAt: new Date(Date.now() - 26 * 3600000).toISOString(), ipAddress: '192.168.1.78' },
    { id: '5', action: 'TEAM_ROLE_CHANGED', user: { name: 'Sarah Admin', email: 'sarah@company.com' }, metadata: { email: 'emily@company.com', role: 'EDITOR' }, createdAt: new Date(Date.now() - 48 * 3600000).toISOString(), ipAddress: '192.168.1.45' },
    { id: '6', action: 'FILE_UPLOADED', user: { name: 'Mike Chen', email: 'mike.c@company.com' }, metadata: { title: 'Welcome Email Template', type: 'TEXT' }, createdAt: new Date(Date.now() - 72 * 3600000).toISOString(), ipAddress: '192.168.1.32' },
    { id: '7', action: 'ITEM_DELETED', user: { name: 'Admin', email: 'admin@company.com' }, metadata: { title: 'Old_Promo_Flyer.png' }, createdAt: new Date(Date.now() - 96 * 3600000).toISOString(), ipAddress: '10.0.0.1' },
  ];

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Audit Log</h1>
            <p className="text-gray-500 text-sm">Track all system changes and user actions across your organization</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchLogs} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={handleExport} disabled={logs.length === 0} className="px-4 py-2 gradient-btn text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Activity size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalLogs?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Events</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayCount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.weekCount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  <p className="text-xs text-gray-500">Active Users (7d)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none min-w-[180px]"
            >
              <option value="all">All Actions</option>
              {actionTypes.map(a => (
                <option key={a.action} value={a.action}>
                  {formatAction(a.action)} ({a.count})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none"
              placeholder="Start date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none"
              placeholder="End date"
            />
            {hasFilters && (
              <button onClick={clearFilters} className="px-3 py-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                <X size={16} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-purple-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {hasFilters ? 'No matching entries' : 'No audit logs yet'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {hasFilters
                ? 'Try adjusting your filters to find what you\'re looking for.'
                : 'Actions will be logged here as your team uses the platform.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg text-sm font-medium">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">When</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Details</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                        <span title={new Date(log.createdAt).toLocaleString()}>
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {log.user?.profilePicture ? (
                            <img src={log.user.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                              {(log.user?.name || '?')[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{log.user?.name || 'System'}</p>
                            <p className="text-xs text-gray-400 truncate hidden sm:block">{log.user?.email || ''}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getActionStyle(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate hidden lg:table-cell">
                        {getMetadataDisplay(log)}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap hidden xl:table-cell">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer with pagination */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
