import { useState, useEffect } from 'react';
import {
  Activity, Download, Search, ChevronLeft, ChevronRight,
  Eye, QrCode, Wifi, Globe, FileText, TrendingUp, BarChart3, Folder
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const ActivityPage = () => {
  const [analyticsRecords, setAnalyticsRecords] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('items');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    document.title = 'All Activity | Outbound Impact';
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [itemsRes, campaignsRes] = await Promise.all([
        api.get('/items').catch(() => ({ data: { items: [] } })),
        api.get('/campaigns').catch(() => ({ data: { campaigns: [] } })),
      ]);

      const itemsList = itemsRes.data?.items || [];
      const campaignsList = campaignsRes.data?.campaigns || [];
      setCampaigns(campaignsList);

      setAnalyticsRecords(itemsList.map(item => ({
        id: item.id,
        name: item.title || 'Untitled',
        type: item.type || 'Unknown',
        slug: item.slug,
        fileSize: item.fileSize ? formatSize(Number(item.fileSize)) : '—',
        campaign: campaignsList.find(c => c.id === item.campaignId)?.name || '—',
        campaignId: item.campaignId,
        totalViews: item.views || 0,
        directViews: item.viewsDirect || 0,
        uploaded: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—',
      })));
    } catch (err) {
      console.error('Failed to fetch activity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const filtered = analyticsRecords.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.campaign.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const sorted = [...filtered].sort((a, b) => b.totalViews - a.totalViews);
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  // ✅ Content views from items
  const totalContentViews = analyticsRecords.reduce((s, r) => s + r.totalViews, 0);
  const totalDirectViews = analyticsRecords.reduce((s, r) => s + r.directViews, 0);
  const avgViews = analyticsRecords.length > 0 ? Math.round(totalContentViews / analyticsRecords.length) : 0;

  // ✅ QR/NFC from CAMPAIGNS (not items — QR codes are on streams, not individual content)
  const totalQrScans = campaigns.reduce((s, c) => s + (c.viewsQr || 0), 0);
  const totalNfcTaps = campaigns.reduce((s, c) => s + (c.viewsNfc || 0), 0);
  const totalStreamViews = campaigns.reduce((s, c) => s + (c.views || 0), 0);

  const topItems = [...analyticsRecords].sort((a, b) => b.totalViews - a.totalViews).slice(0, 5);

  // ✅ Stream stats use campaign-level QR/NFC data
  const streamStats = campaigns.map(c => {
    const si = analyticsRecords.filter(r => r.campaignId === c.id);
    return {
      name: c.name,
      items: si.length,
      streamViews: c.views || 0,
      contentViews: si.reduce((s, r) => s + r.totalViews, 0),
      qrScans: c.viewsQr || 0,
      nfcTaps: c.viewsNfc || 0,
    };
  }).sort((a, b) => b.contentViews - a.contentViews);

  const handleExportCSV = () => {
    const headers = ['Name', 'Type', 'Stream', 'Views', 'Direct Views', 'Uploaded'];
    const rows = sorted.map(r => [r.name, r.type, r.campaign, r.totalViews, r.directViews, r.uploaded]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activity_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const getTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('image')) return 'bg-blue-100 text-blue-700';
    if (t.includes('video')) return 'bg-purple-100 text-purple-700';
    if (t.includes('audio')) return 'bg-orange-100 text-orange-700';
    if (t.includes('text')) return 'bg-green-100 text-green-700';
    if (t.includes('embed')) return 'bg-pink-100 text-pink-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">All Activity</h1>
            <p className="text-gray-600">Complete tracking data for all content and streams</p>
          </div>
          <button onClick={handleExportCSV} disabled={analyticsRecords.length === 0}
            className="px-4 py-2.5 gradient-btn text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
            <Download size={18} /> Export CSV
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { icon: FileText, color: 'text-blue-600', label: 'Assets', value: analyticsRecords.length },
            { icon: Folder, color: 'text-indigo-600', label: 'Streams', value: campaigns.length },
            { icon: Eye, color: 'text-green-600', label: 'Content Views', value: totalContentViews },
            { icon: BarChart3, color: 'text-indigo-600', label: 'Stream Views', value: totalStreamViews },
            { icon: QrCode, color: 'text-purple-600', label: 'QR Scans', value: totalQrScans },
            { icon: Wifi, color: 'text-orange-600', label: 'NFC Taps', value: totalNfcTaps },
            { icon: TrendingUp, color: 'text-pink-600', label: 'Avg/Asset', value: avgViews },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={16} className={stat.color} />
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { key: 'items', label: 'All Items Activity', icon: FileText },
            { key: 'streams', label: 'Stream Performance', icon: BarChart3 },
            { key: 'top', label: 'Top Performing', icon: TrendingUp },
          ].map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.key ? 'gradient-btn text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filter - Items tab only */}
        {activeTab === 'items' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, type, or stream..."
                value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none text-sm" />
            </div>
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none text-sm bg-white">
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="text">Text</option>
              <option value="embed">Embeds</option>
            </select>
          </div>
        )}

        {/* ═══════════════ ALL ITEMS TABLE ═══════════════ */}
        {activeTab === 'items' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Loading activity...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-12 text-center">
                <Activity size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">{searchQuery || filterType !== 'all' ? 'No items match your search' : 'No activity yet'}</p>
                <p className="text-gray-400 text-sm mt-1">Upload content and share QR codes to start tracking</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Asset</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Stream</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                          <span className="flex items-center justify-center gap-1"><Eye size={12} /> Views</span>
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">
                          <span className="flex items-center justify-center gap-1"><Globe size={12} /> Direct</span>
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                            <p className="text-xs text-gray-400 md:hidden">{item.campaign !== '—' ? item.campaign : ''}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(item.type)}`}>{item.type}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">{item.campaign}</td>
                          <td className="py-3 px-4 text-center"><span className="text-sm font-bold text-gray-900">{item.totalViews.toLocaleString()}</span></td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell"><span className="text-sm font-semibold text-teal-600">{item.directViews.toLocaleString()}</span></td>
                          <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">{item.uploaded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100"><ChevronLeft size={16} /></button>
                      <span className="px-3 py-1.5 gradient-btn text-white rounded-lg text-sm font-medium">{page}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══════════════ STREAM PERFORMANCE ═══════════════ */}
        {activeTab === 'streams' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            {streamStats.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No streams yet</p>
                <p className="text-gray-400 text-sm mt-1">Create streams to see performance data here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stream</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Items</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase"><span className="flex items-center justify-center gap-1"><Eye size={12} /> Stream Views</span></th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase"><span className="flex items-center justify-center gap-1"><FileText size={12} /> Content Views</span></th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase"><span className="flex items-center justify-center gap-1"><QrCode size={12} /> QR Scans</span></th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase hidden md:table-cell"><span className="flex items-center justify-center gap-1"><Wifi size={12} /> NFC</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamStats.map((stream, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4"><p className="text-sm font-bold text-gray-900">{stream.name}</p></td>
                        <td className="py-4 px-4 text-center"><span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">{stream.items}</span></td>
                        <td className="py-4 px-4 text-center"><span className="text-sm font-bold text-indigo-700">{stream.streamViews.toLocaleString()}</span></td>
                        <td className="py-4 px-4 text-center"><span className="text-sm font-bold text-green-700">{stream.contentViews.toLocaleString()}</span></td>
                        <td className="py-4 px-4 text-center"><span className="text-sm font-bold text-purple-700">{stream.qrScans.toLocaleString()}</span></td>
                        <td className="py-4 px-4 text-center hidden md:table-cell"><span className="text-sm font-bold text-orange-600">{stream.nfcTaps.toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ TOP PERFORMING ═══════════════ */}
        {activeTab === 'top' && (
          <div className="space-y-4 mb-6">
            {topItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <TrendingUp size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No content yet</p>
              </div>
            ) : topItems.map((item, index) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                    'bg-gray-200 text-gray-600'
                  }`}>#{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(item.type)}`}>{item.type}</span>
                    </div>
                    {item.campaign !== '—' && <p className="text-xs text-gray-500 mb-2">Stream: {item.campaign}</p>}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1 font-semibold text-green-700"><Eye size={14} /> {item.totalViews.toLocaleString()} views</span>
                      <span className="flex items-center gap-1 font-semibold text-teal-600"><Globe size={14} /> {item.directViews.toLocaleString()} direct</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-2xl font-bold text-gray-900">{item.totalViews.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">total views</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Source Breakdown - uses STREAM-level QR/NFC data */}
        {(totalContentViews > 0 || totalQrScans > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Stream Source Breakdown</h3>
            <p className="text-xs text-gray-500 mb-4">How people find your streams (QR scans and NFC taps are tracked at the stream level)</p>
            <div className="space-y-3">
              {[
                { label: 'QR Code Scans', value: totalQrScans, color: 'bg-purple-500', icon: QrCode },
                { label: 'NFC Taps', value: totalNfcTaps, color: 'bg-orange-500', icon: Wifi },
              ].map((source) => {
                const total = totalQrScans + totalNfcTaps + totalStreamViews;
                const percent = total > 0 ? Math.round((source.value / total) * 100) : 0;
                return (
                  <div key={source.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <source.icon size={14} className="text-gray-500" /> {source.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{source.value.toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${source.color} transition-all duration-500`} style={{ width: `${Math.max(percent, source.value > 0 ? 2 : 0)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActivityPage;
