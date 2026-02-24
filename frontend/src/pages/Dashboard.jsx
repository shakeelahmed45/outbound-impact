import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, QrCode, BarChart3, Users, Folder, Key, Palette, Zap, Shield, Crown, Video, Music, FileText, Image as ImageIcon, Code, ChevronRight, Clock, Smartphone, MousePointer, ArrowUp, ArrowDown, ArrowUpCircle, Send, Loader2, CheckCircle, Pencil, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Tooltip from '../components/common/Tooltip';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import IndividualDashboard from './IndividualDashboard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewsOverTime, setViewsOverTime] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [timeFilter, setTimeFilter] = useState('daily');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const isTeamMemberViewer = user?.isTeamMember && user?.teamRole === 'VIEWER';
  const isTeamMemberEditor = user?.isTeamMember && user?.teamRole === 'EDITOR';
  const isTeamMemberAdmin = user?.isTeamMember && user?.teamRole === 'ADMIN';
  const isTeamMember = user?.isTeamMember;
  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const effectiveRole = effectiveUser?.role;

  // Role change request state (for team members)
  const [roleRequestForm, setRoleRequestForm] = useState({ requestedRole: 'EDITOR', note: '' });
  const [roleRequestLoading, setRoleRequestLoading] = useState(false);
  const [roleRequestSent, setRoleRequestSent] = useState(false);
  const [roleRequestError, setRoleRequestError] = useState('');

  const handleRequestRoleChange = async () => {
    if (!roleRequestForm.requestedRole) return;
    setRoleRequestLoading(true);
    setRoleRequestError('');
    try {
      const res = await api.post('/team/request-role-change', roleRequestForm);
      if (res.data.status === 'success') {
        setRoleRequestSent(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit request';
      if (msg.includes('already have a pending')) {
        setRoleRequestSent(true); // Already sent, show success state
      } else {
        setRoleRequestError(msg);
      }
    } finally {
      setRoleRequestLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard | Outbound Impact';
    fetchData();
  }, []);

  useEffect(() => {
    fetchViewsOverTime();
  }, [timeFilter]);

  const fetchData = async () => {
    try {
      const [statsRes, userRes, viewsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/auth/me'),
        api.get(`/dashboard/views-over-time?days=${timeFilter === 'weekly' ? 30 : 14}&period=${timeFilter}`),
        api.get('/dashboard/recent-activity?limit=5'),
      ]);

      if (statsRes.data.status === 'success') setStats(statsRes.data.stats);
      if (userRes.data.status === 'success') setUser(userRes.data.user);
      if (viewsRes.data.status === 'success') setViewsOverTime(viewsRes.data.viewsOverTime || []);
      if (activityRes.data.status === 'success') setRecentActivity(activityRes.data.recentActivity || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchViewsOverTime = async () => {
    try {
      const res = await api.get(`/dashboard/views-over-time?days=${timeFilter === 'weekly' ? 30 : 14}&period=${timeFilter}`);
      if (res.data.status === 'success') setViewsOverTime(res.data.viewsOverTime || []);
    } catch (err) {
      console.error('Failed to fetch views over time:', err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video')) return Video;
    if (t.includes('audio') || t.includes('music')) return Music;
    if (t.includes('image')) return ImageIcon;
    if (t.includes('embed')) return Code;
    return FileText;
  };

  const getTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video')) return 'bg-purple-100 text-purple-600';
    if (t.includes('audio') || t.includes('music')) return 'bg-orange-100 text-orange-600';
    if (t.includes('image')) return 'bg-blue-100 text-blue-600';
    if (t.includes('embed')) return 'bg-pink-100 text-pink-600';
    return 'bg-gray-100 text-gray-600';
  };

  // SVG Chart Builder
  const buildChartPath = () => {
    if (viewsOverTime.length === 0) return { linePath: '', areaPath: '', points: [], maxVal: 0 };

    const width = 600;
    const height = 180;
    const padding = { top: 10, right: 10, bottom: 5, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...viewsOverTime.map(d => d.views), 1);
    const points = viewsOverTime.map((d, i) => {
      const x = padding.left + (i / Math.max(viewsOverTime.length - 1, 1)) * chartW;
      const y = padding.top + chartH - (d.views / maxVal) * chartH;
      return { x, y, data: d };
    });

    const lineCoords = points.map(p => `${p.x},${p.y}`).join(' L ');
    const linePath = `M ${lineCoords}`;
    const areaPath = `M ${padding.left},${padding.top + chartH} L ${lineCoords} L ${points[points.length - 1].x},${padding.top + chartH} Z`;

    return { linePath, areaPath, points, maxVal };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isOrganization = effectiveRole === 'ORG_SMALL' || effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE';

  // Individual plan → clean personal dashboard
  if (!isOrganization && !isTeamMember) {
    return <IndividualDashboard />;
  }

  const isEnterprise = effectiveRole === 'ORG_ENTERPRISE';
  const isMedium = effectiveRole === 'ORG_MEDIUM';
  const { linePath, areaPath, points } = buildChartPath();

  return (
    <DashboardLayout>
      <div>
        {/* ✨ Animated Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1">
              <div className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full animate-soundwave-1" style={{ height: '24px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-500 to-violet-600 rounded-full animate-soundwave-2" style={{ height: '32px' }}></div>
              <div className="w-1 bg-gradient-to-t from-violet-400 to-purple-600 rounded-full animate-soundwave-3" style={{ height: '40px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-500 to-violet-600 rounded-full animate-soundwave-4" style={{ height: '32px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full animate-soundwave-5" style={{ height: '24px' }}></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center gap-3 flex-wrap animate-pulse-gentle">
                Welcome back, {user?.name}!
                {isTeamMemberViewer && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <Eye size={16} /> VIEWER
                  </span>
                )}
                {isTeamMemberEditor && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-green-400 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <Pencil size={16} /> EDITOR
                  </span>
                )}
                {isTeamMemberAdmin && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <ShieldCheck size={16} /> ADMIN
                  </span>
                )}
                {isEnterprise && !isTeamMemberViewer && !isTeamMemberEditor && !isTeamMemberAdmin && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <Crown size={16} /> Enterprise
                  </span>
                )}
              </h1>
              <p className="text-secondary">Here's what's happening with your content today.</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            ROLE CHANGE REQUEST CARD — Only for VIEWER team members
           ═══════════════════════════════════════════════ */}
        {isTeamMemberViewer && (
          <div className="mb-6">
            {roleRequestSent ? (
              /* Success state */
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 text-sm">Role change request sent!</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    The account owner ({user?.organization?.name}) will review your request.
                  </p>
                </div>
              </div>
            ) : (
              /* Request form */
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ArrowUpCircle size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Need more access?</h3>
                    <p className="text-xs text-gray-500">
                      You're currently a <strong>Viewer</strong> in {user?.organization?.name}'s team. Request a role upgrade to create and edit content.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
                  {/* Role selector */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Request role</label>
                    <select
                      value={roleRequestForm.requestedRole}
                      onChange={e => setRoleRequestForm({ ...roleRequestForm, requestedRole: e.target.value })}
                      className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                    >
                      <option value="EDITOR">✏️ Editor — Create & edit content</option>
                      <option value="ADMIN">👑 Admin — Full team access</option>
                    </select>
                  </div>

                  {/* Note field */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      placeholder="Why do you need this access?..."
                      value={roleRequestForm.note}
                      onChange={e => setRoleRequestForm({ ...roleRequestForm, note: e.target.value })}
                      maxLength={200}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleRequestRoleChange}
                    disabled={roleRequestLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                  >
                    {roleRequestLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Send Request
                  </button>
                </div>

                {roleRequestError && (
                  <p className="text-xs text-red-600 mt-2">{roleRequestError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Cards — 6 cards like Pablo's Medium Business */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMedium ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 lg:gap-6 mb-8`}>
          {/* 1. Uploads */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Upload size={20} className="text-white" />
              </div>
              {stats?.changes?.uploads && (
                <div className={`flex items-center gap-1 text-sm font-medium ${stats.changes.uploads.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.changes.uploads.startsWith('+') ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {stats.changes.uploads}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 mb-1 block">Uploads</span>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalUploads || 0}</p>
            {stats?.changes?.uploads && <p className="text-xs text-gray-400 mt-1">vs last week</p>}
            <button onClick={() => navigate('/dashboard/items')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>

          {/* 2. Total Views */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Eye size={20} className="text-white" />
              </div>
              {stats?.changes?.views && (
                <div className={`flex items-center gap-1 text-sm font-medium ${stats.changes.views.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.changes.views.startsWith('+') ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {stats.changes.views}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 mb-1 block">Total Views</span>
            <p className="text-3xl font-bold text-gray-900">{(stats?.totalViews || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">All access methods</p>
            <button onClick={() => navigate(isOrganization ? '/dashboard/advanced-analytics' : '/dashboard/analytics')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>

          {/* 3. QR Scans — Medium & Enterprise only */}
          {isMedium && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-white" />
              </div>
              {stats?.changes?.qrScans && (
                <div className={`flex items-center gap-1 text-sm font-medium ${stats.changes.qrScans.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.changes.qrScans.startsWith('+') ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {stats.changes.qrScans}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 mb-1 block">QR Scans</span>
            <p className="text-3xl font-bold text-gray-900">{(stats?.totalQrScans || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Physical scans/taps</p>
            <button onClick={() => navigate(isOrganization ? '/dashboard/activity' : '/dashboard/analytics')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>
          )}

          {/* 4. Link Clicks — Medium & Enterprise only */}
          {isMedium && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <MousePointer size={20} className="text-white" />
              </div>
              {stats?.changes?.linkClicks && (
                <div className={`flex items-center gap-1 text-sm font-medium ${stats.changes.linkClicks.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.changes.linkClicks.startsWith('+') ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {stats.changes.linkClicks}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500 mb-1 block">Link Clicks</span>
            <p className="text-3xl font-bold text-gray-900">{(stats?.totalLinkClicks || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Direct link access</p>
            <button onClick={() => navigate(isOrganization ? '/dashboard/activity' : '/dashboard/analytics')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>
          )}

          {/* 5. QR Codes Generated */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <QrCode size={20} className="text-white" />
              </div>
            </div>
            <span className="text-sm text-gray-500 mb-1 block">QR Codes</span>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalQRCodes || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Total codes created</p>
            <button onClick={() => navigate('/dashboard/campaigns')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>

          {/* 6. Active Streams */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Folder size={20} className="text-white" />
              </div>
            </div>
            <span className="text-sm text-gray-500 mb-1 block">Active Streams</span>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalCampaigns || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Content streams</p>
            <button onClick={() => navigate('/dashboard/campaigns')} className="text-primary text-sm font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
              View details <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Team Members */}
        {!isTeamMemberViewer && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats?.totalTeamMembers || 0}</p>
                  <p className="text-sm opacity-90">Team Members</p>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard/team')} className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-opacity-90 transition-all">
                Manage Team
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            ✅ NEW: Views Over Time Chart
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Views Over Time
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setTimeFilter('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeFilter === 'daily' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Daily
              </button>
              <button onClick={() => setTimeFilter('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeFilter === 'weekly' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Weekly
              </button>
            </div>
          </div>

          {viewsOverTime.length === 0 ? (
            <div className="h-48 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="text-center">
                <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 text-sm">No view data yet. Share your content to start tracking!</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="h-52 bg-gradient-to-br from-purple-50/50 to-blue-50/50 rounded-xl overflow-hidden relative cursor-crosshair"
                onMouseLeave={() => setHoveredPoint(null)}>
                <svg className="w-full h-full" viewBox="0 0 600 190" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="viewsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {areaPath && <path d={areaPath} fill="url(#viewsGradient)" />}
                  {linePath && <path d={linePath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={hoveredPoint === i ? 5 : 3}
                      fill={hoveredPoint === i ? '#7C3AED' : '#8B5CF6'} stroke="white" strokeWidth="2"
                      className="cursor-pointer" onMouseEnter={() => setHoveredPoint(i)} />
                  ))}
                </svg>
                {hoveredPoint !== null && points[hoveredPoint] && (
                  <div className="absolute bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 pointer-events-none z-10"
                    style={{ left: `${Math.min(Math.max((points[hoveredPoint].x / 600) * 100, 10), 85)}%`, top: '8px', transform: 'translateX(-50%)' }}>
                    <p className="text-xs text-gray-500">{formatDate(points[hoveredPoint].data.date)}</p>
                    <p className="text-sm font-bold text-gray-900">{points[hoveredPoint].data.views} views</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 px-1">
                {viewsOverTime.length > 0 && (
                  <>
                    <span className="text-xs text-gray-400">{formatDate(viewsOverTime[0].date)}</span>
                    {viewsOverTime.length > 4 && <span className="text-xs text-gray-400">{formatDate(viewsOverTime[Math.floor(viewsOverTime.length / 2)].date)}</span>}
                    <span className="text-xs text-gray-400">{formatDate(viewsOverTime[viewsOverTime.length - 1].date)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            Quick Actions <Tooltip content="Common tasks for quick access" />
          </h3>
          <div className={`grid grid-cols-2 ${isEnterprise && !isTeamMemberViewer ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
            {!isTeamMemberViewer && (
              <button onClick={() => navigate('/dashboard/upload')} className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center">
                <Upload className="mx-auto mb-2 text-primary" size={24} />
                <span className="text-sm font-semibold text-gray-700">Upload New</span>
              </button>
            )}
            <button onClick={() => navigate('/dashboard/items')} className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center">
              <QrCode className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">My Items</span>
            </button>
            <button onClick={() => navigate(isOrganization ? '/dashboard/advanced-analytics' : '/dashboard/analytics')} className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center">
              <BarChart3 className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">{isOrganization ? 'Advanced Analytics' : 'Analytics'}</span>
            </button>
            <button onClick={() => navigate('/dashboard/campaigns')} className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center">
              <Folder className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">Streams</span>
            </button>
            {isEnterprise && !isTeamMemberViewer && (
              <>
                <button onClick={() => navigate('/dashboard/api-access')} className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center">
                  <Key className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">API Access</span>
                </button>
                <button onClick={() => navigate('/dashboard/white-label')} className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center">
                  <Palette className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">White Label</span>
                </button>
                <button onClick={() => navigate('/dashboard/integrations')} className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center">
                  <Zap className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Integrations</span>
                </button>
                <button onClick={() => navigate('/dashboard/advanced-analytics')} className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center">
                  <BarChart3 className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Advanced Analytics</span>
                </button>
                <button onClick={() => navigate('/dashboard/security')} className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center">
                  <Shield className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Security & 2FA</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════
            Recent Activity
           ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Recent Activity
            </h3>
            <button onClick={() => navigate('/dashboard/activity')}
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <Upload size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">No content uploaded yet. Start by uploading your first item!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                const typeColor = getTypeColor(item.type);
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => navigate('/dashboard/items')}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor}`}>
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <TypeIcon size={22} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-sm text-gray-500">
                        {item.stream && <span className="text-primary font-medium">{item.stream}</span>}
                        {item.stream && ' \u2022 '}
                        {timeAgo(item.uploadedAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">{item.views.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">views</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✨ Custom CSS for Soundwave Animation */}
      <style jsx>{`
        @keyframes soundwave-1 { 0%, 100% { height: 24px; } 50% { height: 32px; } }
        @keyframes soundwave-2 { 0%, 100% { height: 32px; } 50% { height: 48px; } }
        @keyframes soundwave-3 { 0%, 100% { height: 40px; } 50% { height: 56px; } }
        @keyframes soundwave-4 { 0%, 100% { height: 32px; } 50% { height: 44px; } }
        @keyframes soundwave-5 { 0%, 100% { height: 24px; } 50% { height: 36px; } }
        @keyframes pulse-gentle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.02); } }
        .animate-soundwave-1 { animation: soundwave-1 1.2s ease-in-out infinite; }
        .animate-soundwave-2 { animation: soundwave-2 1s ease-in-out infinite; animation-delay: 0.1s; }
        .animate-soundwave-3 { animation: soundwave-3 1.4s ease-in-out infinite; animation-delay: 0.2s; }
        .animate-soundwave-4 { animation: soundwave-4 1.1s ease-in-out infinite; animation-delay: 0.15s; }
        .animate-soundwave-5 { animation: soundwave-5 1.3s ease-in-out infinite; animation-delay: 0.25s; }
        .animate-pulse-gentle { animation: pulse-gentle 3s ease-in-out infinite; }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;
