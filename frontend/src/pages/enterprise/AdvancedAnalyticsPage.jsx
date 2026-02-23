import { useState, useEffect } from 'react';
import {
  BarChart3, Globe, Smartphone, Monitor, Clock, TrendingUp, Users, Download,
  FileText, QrCode, Nfc, Link2, FolderOpen, Image, Video, Music, FileType,
  Code, Eye, Shield, Building2, UserCheck, MessageSquare, ClipboardCheck,
  Activity, Database, Share2, Lock, Unlock, ChevronDown, ChevronUp,
  Loader2, RefreshCw, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../services/api';

// ═══════════════════════════════════════════
// Tab definitions
// ═══════════════════════════════════════════
const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'content', label: 'Content', icon: Image },
  { id: 'delivery', label: 'Delivery', icon: QrCode },
  { id: 'streams', label: 'Streams', icon: FolderOpen },
  { id: 'engagement', label: 'Engagement', icon: Globe },
  { id: 'team', label: 'Team & Activity', icon: Users },
];

// ═══════════════════════════════════════════
// Helper components
// ═══════════════════════════════════════════
const StatCard = ({ icon: Icon, label, value, sub, color = 'from-purple-500 to-purple-600' }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl shadow-md p-4 text-white`}>
    <div className="flex items-center justify-between mb-2">
      <Icon size={18} className="opacity-80" />
    </div>
    <p className="text-2xl font-bold mb-0.5">{value}</p>
    <p className="text-xs opacity-90">{label}</p>
    {sub && <p className="text-[10px] opacity-70 mt-1">{sub}</p>}
  </div>
);

const ProgressBar = ({ label, value, max, color = 'from-purple-500 to-purple-600', extra }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 sm:w-32 font-medium text-gray-800 text-sm truncate">{label}</div>
      <div className="flex-1">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`bg-gradient-to-r ${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-20 text-right">
        <span className="font-bold text-sm text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {extra && <span className="text-[10px] text-gray-400 block">{extra}</span>}
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className="text-purple-600" />}
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const EmptyState = ({ text }) => (
  <div className="text-center py-8">
    <BarChart3 size={28} className="mx-auto mb-2 text-gray-300" />
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

const MediaIcon = ({ type }) => {
  const icons = { IMAGE: Image, VIDEO: Video, AUDIO: Music, TEXT: FileText, EMBED: Code, OTHER: FileType };
  const I = icons[type] || FileType;
  return <I size={16} />;
};

const CountryFlag = ({ code }) => {
  const flags = {
    US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', DE: '🇩🇪', AU: '🇦🇺', FR: '🇫🇷', IN: '🇮🇳', JP: '🇯🇵',
    CN: '🇨🇳', BR: '🇧🇷', PK: '🇵🇰', MX: '🇲🇽', IT: '🇮🇹', ES: '🇪🇸', KR: '🇰🇷', NL: '🇳🇱',
    TR: '🇹🇷', ID: '🇮🇩', SA: '🇸🇦', NG: '🇳🇬', AR: '🇦🇷', RU: '🇷🇺', ZA: '🇿🇦', EG: '🇪🇬',
    TH: '🇹🇭', PH: '🇵🇭', VN: '🇻🇳', PL: '🇵🇱', SE: '🇸🇪', BE: '🇧🇪', CH: '🇨🇭', AT: '🇦🇹',
    IE: '🇮🇪', NO: '🇳🇴', DK: '🇩🇰', SG: '🇸🇬', MY: '🇲🇾', NZ: '🇳🇿', PT: '🇵🇹', GR: '🇬🇷',
    AE: '🇦🇪', IL: '🇮🇱', BD: '🇧🇩', LK: '🇱🇰',
  };
  return <span className="text-xl">{flags[code] || '🌍'}</span>;
};

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
const AdvancedAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [showExportToast, setShowExportToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => { fetchAnalytics(); }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/advanced-analytics/stats?timeRange=${timeRange}`);
      if (res.data.status === 'success') setAnalytics(res.data.analytics);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const toast = (msg) => { setToastMessage(msg); setShowExportToast(true); setTimeout(() => setShowExportToast(false), 3000); };

  // ═══════════════════════════════════════════
  // CSV Export — ALL data
  // ═══════════════════════════════════════════
  const handleExportCSV = () => {
    if (!analytics) return;
    const a = analytics;
    const rows = [];
    const add = (...cols) => rows.push(cols);

    add('Outbound Impact — Advanced Analytics Report');
    add('Time Range', timeRange);
    add('Generated', new Date().toLocaleString());
    add('');

    // Overview
    add('═══ OVERVIEW ═══');
    add('Total Views', a.totalViews);
    add('Unique Visitors', a.uniqueVisitors);
    add('Avg Session Time', a.avgSessionTime);
    add('Bounce Rate', a.bounceRate);
    add('Total Items', a.totalItems);
    add('Total Streams', a.totalStreams);
    add('Storage Used (GB)', a.totalStorageGB);
    add('Items Created in Range', a.itemsCreatedInRange);
    add('');

    // Delivery Sources
    add('═══ DELIVERY SOURCES ═══');
    add('Source', 'Count', 'Percentage');
    add('QR Code Scans', a.deliverySources.qr.count, `${a.deliverySources.qr.percentage}%`);
    add('NFC Taps', a.deliverySources.nfc.count, `${a.deliverySources.nfc.percentage}%`);
    add('Direct Links', a.deliverySources.direct.count, `${a.deliverySources.direct.percentage}%`);
    add('');

    // Daily Source Trend
    if (a.dailySourceTrend?.length > 0) {
      add('═══ DAILY SOURCE TREND ═══');
      add('Date', 'QR', 'NFC', 'Direct');
      a.dailySourceTrend.forEach(d => add(d.date, d.qr, d.nfc, d.direct));
      add('');
    }

    // Content by Type
    add('═══ CONTENT BY TYPE ═══');
    add('Type', 'Count', 'Views', 'Storage (MB)', 'Percentage');
    a.contentByType.forEach(c => add(c.type, c.count, c.views, c.storageMB, `${c.percentage}%`));
    add('');

    // Top Items
    add('═══ TOP ITEMS ═══');
    add('Title', 'Type', 'Total Views', 'QR Views', 'NFC Views', 'Direct Views');
    a.topItems.forEach(i => add(i.title, i.type, i.views, i.viewsQr, i.viewsNfc, i.viewsDirect));
    add('');

    // Top Streams
    add('═══ TOP STREAMS ═══');
    add('Name', 'Category', 'Views', 'QR Views', 'NFC Views', 'Items', 'Password Protected');
    a.topStreams.forEach(s => add(s.name, s.category, s.views, s.viewsQr, s.viewsNfc, s.itemCount, s.passwordProtected ? 'Yes' : 'No'));
    add('');

    // Stream Categories
    add('═══ STREAM CATEGORIES ═══');
    add('Category', 'Count', 'Views');
    a.streamCategories.forEach(c => add(c.category, c.count, c.views));
    add('');

    // Countries
    add('═══ TOP COUNTRIES ═══');
    add('Country', 'Code', 'Views', 'Percentage');
    a.topCountries.forEach(c => add(c.country, c.code, c.views, `${c.percentage}%`));
    add('');

    // Devices
    add('═══ DEVICES ═══');
    add('Device', 'Count', 'Percentage');
    a.devices.forEach(d => add(d.type, d.count, `${d.percentage}%`));
    add('');

    // Browsers
    add('═══ BROWSERS ═══');
    add('Browser', 'Count', 'Percentage');
    a.browsers.forEach(b => add(b.name, b.count, `${b.percentage}%`));
    add('');

    // Operating Systems
    add('═══ OPERATING SYSTEMS ═══');
    add('OS', 'Count', 'Percentage');
    a.os.forEach(o => add(o.name, o.count, `${o.percentage}%`));
    add('');

    // Hourly Views
    add('═══ HOURLY VIEWS ═══');
    add('Time', 'Views');
    a.hourlyViews.forEach(h => add(h.hour, h.views));
    add('');

    // Daily Trend
    if (a.dailyTrend?.length > 0) {
      add('═══ DAILY VIEW TREND ═══');
      add('Date', 'Views');
      a.dailyTrend.forEach(d => add(d.date, d.views));
      add('');
    }

    // Organizations
    if (a.orgBreakdown?.length > 0) {
      add('═══ ORGANIZATIONS ═══');
      add('Name', 'Status', 'Items', 'Streams', 'Members');
      a.orgBreakdown.forEach(o => add(o.name, o.status, o.itemCount, o.streamCount, o.memberCount));
      add('');
    }

    // Cohorts
    if (a.cohortBreakdown?.length > 0) {
      add('═══ COHORTS ═══');
      add('Name', 'Status', 'Members', 'Streams');
      a.cohortBreakdown.forEach(c => add(c.name, c.status, c.memberCount, c.streamCount));
      add('');
    }

    // Workflows
    add('═══ WORKFLOWS ═══');
    add('Status', 'Count');
    a.workflowStatuses.forEach(w => add(w.status, w.count));
    add('');

    // Team
    add('═══ TEAM ═══');
    add('Role', 'Count');
    a.teamRoles.forEach(r => add(r.role, r.count));
    add('');

    // Messaging
    add('═══ MESSAGING ═══');
    add('Total Messages', a.totalMessages);
    add('Sent', a.messagesSent);
    add('Received', a.messagesReceived);
    add('Internal', a.messagesInternal);
    add('External', a.messagesExternal);
    add('');
    add('Audit Events', a.auditCount);

    // Build CSV
    const csv = rows.map(r => r.map(c => {
      const s = String(c ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `advanced-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast('✅ CSV exported successfully!');
  };

  // ═══════════════════════════════════════════
  // PDF Export
  // ═══════════════════════════════════════════
  const handleExportPDF = async () => {
    if (!analytics) return;
    setExportingPDF(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      const a = analytics;
      let y = 20;
      const purple = [128, 0, 128];

      const heading = (text) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14); doc.setTextColor(0, 0, 0);
        doc.text(text, 20, y); y += 6;
      };
      const table = (head, body) => {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.autoTable({ startY: y, head: [head], body, theme: 'striped', headStyles: { fillColor: purple }, margin: { left: 20 }, styles: { fontSize: 9 } });
        y = doc.lastAutoTable.finalY + 10;
      };

      doc.setFontSize(20); doc.setTextColor(...purple);
      doc.text('Outbound Impact — Advanced Analytics', 20, y); y += 8;
      doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(`Time: ${timeRange} | Generated: ${new Date().toLocaleString()}`, 20, y); y += 12;

      heading('Overview');
      table(['Metric', 'Value'], [
        ['Total Views', a.totalViews.toLocaleString()], ['Unique Visitors', a.uniqueVisitors.toLocaleString()],
        ['Avg Session', a.avgSessionTime], ['Bounce Rate', a.bounceRate],
        ['Items', a.totalItems], ['Streams', a.totalStreams],
        ['Storage (GB)', a.totalStorageGB], ['New Items', a.itemsCreatedInRange],
      ]);

      heading('Delivery Sources');
      table(['Source', 'Count', '%'], [
        ['QR Scans', a.deliverySources.qr.count, `${a.deliverySources.qr.percentage}%`],
        ['NFC Taps', a.deliverySources.nfc.count, `${a.deliverySources.nfc.percentage}%`],
        ['Direct', a.deliverySources.direct.count, `${a.deliverySources.direct.percentage}%`],
      ]);

      heading('Content by Type');
      table(['Type', 'Count', 'Views', 'Storage (MB)'], a.contentByType.map(c => [c.type, c.count, c.views, c.storageMB]));

      if (a.topItems.length) { heading('Top Items'); table(['Title', 'Type', 'Views', 'QR', 'NFC', 'Direct'], a.topItems.map(i => [i.title, i.type, i.views, i.viewsQr, i.viewsNfc, i.viewsDirect])); }
      if (a.topStreams.length) { heading('Top Streams'); table(['Name', 'Category', 'Views', 'Items'], a.topStreams.map(s => [s.name, s.category, s.views, s.itemCount])); }
      if (a.topCountries.length) { heading('Countries'); table(['Country', 'Views', '%'], a.topCountries.map(c => [c.country, c.views, `${c.percentage}%`])); }

      heading('Devices'); table(['Device', 'Count', '%'], a.devices.map(d => [d.type, d.count, `${d.percentage}%`]));
      heading('Browsers'); table(['Browser', 'Count', '%'], a.browsers.map(b => [b.name, b.count, `${b.percentage}%`]));
      heading('OS'); table(['OS', 'Count', '%'], a.os.map(o => [o.name, o.count, `${o.percentage}%`]));

      if (a.orgBreakdown?.length) { heading('Organizations'); table(['Name', 'Items', 'Streams', 'Members'], a.orgBreakdown.map(o => [o.name, o.itemCount, o.streamCount, o.memberCount])); }
      if (a.cohortBreakdown?.length) { heading('Cohorts'); table(['Name', 'Members', 'Streams'], a.cohortBreakdown.map(c => [c.name, c.memberCount, c.streamCount])); }
      if (a.workflowStatuses?.length) { heading('Workflows'); table(['Status', 'Count'], a.workflowStatuses.map(w => [w.status, w.count])); }

      heading('Team & Messaging');
      table(['Metric', 'Value'], [
        ['Team Members', a.totalTeamMembers], ['Messages Sent', a.messagesSent],
        ['Messages Received', a.messagesReceived], ['Audit Events', a.auditCount],
      ]);

      doc.save(`advanced-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast('✅ PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast('❌ Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // ═══════════════════════════════════════════
  // Loading / Empty
  // ═══════════════════════════════════════════
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  const a = analytics;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Toast */}
        {showExportToast && (
          <div className="fixed top-4 right-4 z-50 animate-slideIn">
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium">{toastMessage}</div>
          </div>
        )}

        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={26} />
              Advanced Analytics
            </h1>
            <p className="text-sm text-gray-500">Comprehensive tracking across all your data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAnalytics} className="p-2 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200">
              <RefreshCw size={16} />
            </button>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════
            TAB: OVERVIEW
           ═══════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={TrendingUp} label="Total Views" value={a.totalViews.toLocaleString()} color="from-blue-500 to-blue-600" />
              <StatCard icon={Users} label="Unique Visitors" value={a.uniqueVisitors.toLocaleString()} color="from-green-500 to-green-600" />
              <StatCard icon={Clock} label="Avg Session" value={a.avgSessionTime} color="from-purple-500 to-purple-600" />
              <StatCard icon={BarChart3} label="Bounce Rate" value={a.bounceRate} color="from-orange-500 to-orange-600" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Image} label="Total Items" value={a.totalItems} sub={`${a.itemsCreatedInRange} new in period`} color="from-violet-500 to-violet-600" />
              <StatCard icon={FolderOpen} label="Total Streams" value={a.totalStreams} sub={`${a.totalStreamViews.toLocaleString()} stream views`} color="from-indigo-500 to-indigo-600" />
              <StatCard icon={Database} label="Storage Used" value={`${a.totalStorageGB} GB`} color="from-cyan-500 to-cyan-600" />
              <StatCard icon={Activity} label="Audit Events" value={a.auditCount} sub="in this period" color="from-slate-500 to-slate-600" />
            </div>

            {/* Delivery Sources Summary */}
            <SectionCard title="Delivery Sources" icon={QrCode}>
              <div className="space-y-3">
                <ProgressBar label="QR Code Scans" value={a.deliverySources.qr.count} max={a.totalViews || 1} color="from-purple-500 to-purple-600" extra={`${a.deliverySources.qr.percentage}%`} />
                <ProgressBar label="NFC Taps" value={a.deliverySources.nfc.count} max={a.totalViews || 1} color="from-blue-500 to-blue-600" extra={`${a.deliverySources.nfc.percentage}%`} />
                <ProgressBar label="Direct Links" value={a.deliverySources.direct.count} max={a.totalViews || 1} color="from-gray-400 to-gray-500" extra={`${a.deliverySources.direct.percentage}%`} />
              </div>
            </SectionCard>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1"><Building2 size={16} className="text-purple-600" /><span className="text-xs text-gray-500">Organizations</span></div>
                <p className="text-xl font-bold text-gray-900">{a.totalOrgs}</p>
                <p className="text-[10px] text-gray-400">{a.activeOrgs} active</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1"><UserCheck size={16} className="text-blue-600" /><span className="text-xs text-gray-500">Cohorts</span></div>
                <p className="text-xl font-bold text-gray-900">{a.totalCohorts}</p>
                <p className="text-[10px] text-gray-400">{a.totalCohortMembers} members</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1"><ClipboardCheck size={16} className="text-green-600" /><span className="text-xs text-gray-500">Workflows</span></div>
                <p className="text-xl font-bold text-gray-900">{a.totalWorkflows}</p>
                <p className="text-[10px] text-gray-400">{a.workflowsInRange} in period</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} className="text-pink-600" /><span className="text-xs text-gray-500">Messages</span></div>
                <p className="text-xl font-bold text-gray-900">{a.totalMessages}</p>
                <p className="text-[10px] text-gray-400">{a.messagesSent} sent · {a.messagesReceived} received</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
            TAB: CONTENT
           ═══════════════════════════════════ */}
        {activeTab === 'content' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Image} label="Total Items" value={a.totalItems} color="from-violet-500 to-violet-600" />
              <StatCard icon={Database} label="Storage" value={`${a.totalStorageGB} GB`} color="from-cyan-500 to-cyan-600" />
              <StatCard icon={Share2} label="Sharing Enabled" value={a.sharingEnabled} color="from-green-500 to-green-600" />
              <StatCard icon={Lock} label="Sharing Disabled" value={a.sharingDisabled} color="from-red-400 to-red-500" />
            </div>

            {/* Content by Media Type */}
            <SectionCard title="Content by Media Type" icon={FileType}>
              {a.contentByType.length === 0 ? <EmptyState text="No items yet" /> : (
                <div className="space-y-3">
                  {a.contentByType.map(c => (
                    <div key={c.type} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><MediaIcon type={c.type} /></div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">{c.type}</span>
                          <span className="text-xs text-gray-500">{c.count} items · {c.views.toLocaleString()} views · {c.storageMB} MB</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                      </div>
                      <span className="font-bold text-sm text-purple-700 w-10 text-right">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Top Performing Items */}
            <SectionCard title="Top Performing Items" icon={Eye}>
              {a.topItems.length === 0 ? <EmptyState text="No item views yet" /> : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Item</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Type</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Views</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">QR</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">NFC</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">Direct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.topItems.map((item, i) => (
                        <tr key={item.id} className={`border-b border-gray-50 ${i === 0 ? 'bg-purple-50/50' : ''}`}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 max-w-[180px] truncate">{item.title}</td>
                          <td className="py-2.5 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.type}</span></td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-700">{item.views.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 hidden sm:table-cell">{item.viewsQr}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 hidden sm:table-cell">{item.viewsNfc}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 hidden sm:table-cell">{item.viewsDirect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ═══════════════════════════════════
            TAB: DELIVERY
           ═══════════════════════════════════ */}
        {activeTab === 'delivery' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={QrCode} label="QR Code Scans" value={a.deliverySources.qr.count.toLocaleString()} sub={`${a.deliverySources.qr.percentage}% of views`} color="from-purple-500 to-purple-600" />
              <StatCard icon={Nfc} label="NFC Taps" value={a.deliverySources.nfc.count.toLocaleString()} sub={`${a.deliverySources.nfc.percentage}% of views`} color="from-blue-500 to-blue-600" />
              <StatCard icon={Link2} label="Direct Links" value={a.deliverySources.direct.count.toLocaleString()} sub={`${a.deliverySources.direct.percentage}% of views`} color="from-gray-500 to-gray-600" />
            </div>

            {/* Daily Source Trend */}
            <SectionCard title="Daily Delivery Trend" icon={TrendingUp}>
              {!a.dailySourceTrend || a.dailySourceTrend.length === 0 ? <EmptyState text="No delivery data yet" /> : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                        <th className="text-right py-2 px-3 font-medium text-purple-600">QR</th>
                        <th className="text-right py-2 px-3 font-medium text-blue-600">NFC</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Direct</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-900">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.dailySourceTrend.map(d => (
                        <tr key={d.date} className="border-b border-gray-50">
                          <td className="py-2 px-3 text-gray-800 font-medium">{d.date}</td>
                          <td className="py-2 px-3 text-right text-purple-700">{d.qr}</td>
                          <td className="py-2 px-3 text-right text-blue-700">{d.nfc}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{d.direct}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{d.qr + d.nfc + d.direct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ═══════════════════════════════════
            TAB: STREAMS
           ═══════════════════════════════════ */}
        {activeTab === 'streams' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={FolderOpen} label="Total Streams" value={a.totalStreams} color="from-indigo-500 to-indigo-600" />
              <StatCard icon={Eye} label="Stream Views" value={a.totalStreamViews.toLocaleString()} color="from-blue-500 to-blue-600" />
              <StatCard icon={Unlock} label="Public Streams" value={a.publicStreams} color="from-green-500 to-green-600" />
              <StatCard icon={Lock} label="Password Protected" value={a.passwordProtectedStreams} color="from-orange-500 to-orange-600" />
            </div>

            {/* Category Breakdown */}
            <SectionCard title="Stream Categories" icon={FolderOpen}>
              {a.streamCategories.length === 0 ? <EmptyState text="No stream categories" /> : (
                <div className="space-y-3">
                  {a.streamCategories.map(c => {
                    const maxViews = Math.max(...a.streamCategories.map(x => x.views), 1);
                    return (
                      <ProgressBar key={c.category} label={c.category} value={c.views} max={maxViews} extra={`${c.count} streams`} color="from-indigo-500 to-indigo-600" />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Top Streams */}
            <SectionCard title="Top Performing Streams" icon={TrendingUp}>
              {a.topStreams.length === 0 ? <EmptyState text="No stream views yet" /> : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Stream</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">Category</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Views</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">QR</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">NFC</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Items</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">🔒</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.topStreams.map((s, i) => (
                        <tr key={s.id} className={`border-b border-gray-50 ${i === 0 ? 'bg-indigo-50/50' : ''}`}>
                          <td className="py-2.5 px-3 font-medium text-gray-900 max-w-[160px] truncate">{s.name}</td>
                          <td className="py-2.5 px-3 hidden sm:table-cell"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.category}</span></td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{s.views.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 hidden sm:table-cell">{s.viewsQr}</td>
                          <td className="py-2.5 px-3 text-right text-gray-600 hidden sm:table-cell">{s.viewsNfc}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700">{s.itemCount}</td>
                          <td className="py-2.5 px-3 text-center hidden sm:table-cell">{s.passwordProtected ? '🔒' : '🔓'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ═══════════════════════════════════
            TAB: ENGAGEMENT
           ═══════════════════════════════════ */}
        {activeTab === 'engagement' && (
          <div className="space-y-5">
            {/* Countries */}
            <SectionCard title="Top Countries" icon={Globe}>
              {a.topCountries.length === 0 ? <EmptyState text="No geographic data yet" /> : (
                <div className="space-y-3">
                  {a.topCountries.map(c => (
                    <div key={c.country} className="flex items-center gap-3">
                      <CountryFlag code={c.code} />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">{c.country}</span>
                          <span className="font-bold text-purple-700 text-sm">{c.views.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                      </div>
                      <span className="w-10 text-right font-bold text-sm text-purple-700">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Devices & Browsers side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SectionCard title="Devices" icon={Smartphone}>
                <div className="space-y-3">
                  {a.devices.map(d => {
                    const maxD = Math.max(...a.devices.map(x => x.count), 1);
                    return <ProgressBar key={d.type} label={d.type} value={d.count} max={maxD} color="from-blue-500 to-blue-600" extra={`${d.percentage}%`} />;
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Browsers" icon={Monitor}>
                <div className="space-y-3">
                  {a.browsers.map(b => {
                    const maxB = Math.max(...a.browsers.map(x => x.count), 1);
                    return <ProgressBar key={b.name} label={b.name} value={b.count} max={maxB} color="from-purple-500 to-purple-600" extra={`${b.percentage}%`} />;
                  })}
                </div>
              </SectionCard>
            </div>

            {/* OS */}
            <SectionCard title="Operating Systems" icon={Monitor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {a.os.map(o => {
                  const maxO = Math.max(...a.os.map(x => x.count), 1);
                  return <ProgressBar key={o.name} label={o.name} value={o.count} max={maxO} color="from-orange-500 to-orange-600" extra={`${o.percentage}%`} />;
                })}
              </div>
            </SectionCard>

            {/* Time of Day */}
            <SectionCard title="Activity by Time of Day" icon={Clock}>
              <div className="flex items-end justify-between gap-1.5 h-48 sm:h-56">
                {a.hourlyViews.map(data => {
                  const maxV = Math.max(...a.hourlyViews.map(h => h.views), 1);
                  const pct = data.views > 0 ? Math.max((data.views / maxV) * 100, 5) : 0;
                  const isPeak = data.views === maxV && data.views > 0;
                  return (
                    <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        <div className="relative w-full group">
                          <div className={`w-full rounded-t-lg transition-all ${
                            isPeak ? 'bg-gradient-to-t from-red-500 to-orange-400' : data.views > 0 ? 'bg-gradient-to-t from-purple-500 to-purple-400' : 'bg-gray-200'
                          }`} style={{ height: `${pct}%`, minHeight: data.views > 0 ? '6px' : '3px' }} />
                        </div>
                      </div>
                      <div className={`text-xs font-bold ${isPeak ? 'text-red-500' : 'text-gray-700'}`}>{data.views}</div>
                      <div className={`text-[10px] ${isPeak ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{data.hour}</div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Daily View Trend */}
            {a.dailyTrend?.length > 0 && (
              <SectionCard title="Daily View Trend" icon={TrendingUp}>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Views</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.dailyTrend.map((d, i) => {
                        const prev = i > 0 ? a.dailyTrend[i - 1].views : d.views;
                        const diff = d.views - prev;
                        return (
                          <tr key={d.date} className="border-b border-gray-50">
                            <td className="py-2 px-3 text-gray-800 font-medium">{d.date}</td>
                            <td className="py-2 px-3 text-right font-bold text-purple-700">{d.views}</td>
                            <td className="py-2 px-3 text-right">
                              {diff > 0 && <span className="text-green-600 text-xs flex items-center justify-end gap-0.5"><ArrowUpRight size={12} />+{diff}</span>}
                              {diff < 0 && <span className="text-red-500 text-xs flex items-center justify-end gap-0.5"><ArrowDownRight size={12} />{diff}</span>}
                              {diff === 0 && <span className="text-gray-400 text-xs flex items-center justify-end gap-0.5"><Minus size={12} />0</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            TAB: TEAM & ACTIVITY
           ═══════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Team Members" value={a.totalTeamMembers} color="from-blue-500 to-blue-600" />
              <StatCard icon={MessageSquare} label="Messages" value={a.totalMessages} sub={`${a.messagesSent} sent · ${a.messagesReceived} received`} color="from-pink-500 to-pink-600" />
              <StatCard icon={ClipboardCheck} label="Workflows" value={a.totalWorkflows} sub={`${a.workflowsInRange} in period`} color="from-green-500 to-green-600" />
              <StatCard icon={Activity} label="Audit Events" value={a.auditCount} color="from-slate-500 to-slate-600" />
            </div>

            {/* Team Role Distribution */}
            <SectionCard title="Team Roles" icon={Users}>
              {a.teamRoles.length === 0 ? <EmptyState text="No team members" /> : (
                <div className="space-y-3">
                  {a.teamRoles.map(r => {
                    const maxR = Math.max(...a.teamRoles.map(x => x.count), 1);
                    return <ProgressBar key={r.role} label={r.role} value={r.count} max={maxR} color="from-blue-500 to-blue-600" />;
                  })}
                </div>
              )}
            </SectionCard>

            {/* Messaging Breakdown */}
            <SectionCard title="Messaging Activity" icon={MessageSquare}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{a.messagesSent}</p>
                  <p className="text-xs text-gray-500">Sent</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{a.messagesReceived}</p>
                  <p className="text-xs text-gray-500">Received</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{a.messagesInternal}</p>
                  <p className="text-xs text-gray-500">Internal</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{a.messagesExternal}</p>
                  <p className="text-xs text-gray-500">External</p>
                </div>
              </div>
            </SectionCard>

            {/* Workflow Status */}
            <SectionCard title="Workflow Status Breakdown" icon={ClipboardCheck}>
              {a.workflowStatuses.length === 0 ? <EmptyState text="No workflows" /> : (
                <div className="space-y-3">
                  {a.workflowStatuses.map(w => {
                    const colors = {
                      DRAFT: 'from-gray-400 to-gray-500', PENDING: 'from-yellow-400 to-yellow-500',
                      IN_REVIEW: 'from-blue-400 to-blue-500', APPROVED: 'from-green-400 to-green-500',
                      REJECTED: 'from-red-400 to-red-500', PUBLISHED: 'from-purple-400 to-purple-500',
                    };
                    return <ProgressBar key={w.status} label={w.status} value={w.count} max={a.totalWorkflows} color={colors[w.status] || 'from-gray-400 to-gray-500'} />;
                  })}
                </div>
              )}
            </SectionCard>

            {/* Workflow Asset Types */}
            {a.workflowAssetTypes?.length > 0 && (
              <SectionCard title="Workflow Asset Types" icon={FileType}>
                <div className="space-y-3">
                  {a.workflowAssetTypes.map(t => (
                    <ProgressBar key={t.type} label={t.type} value={t.count} max={a.totalWorkflows} color="from-indigo-400 to-indigo-500" />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Organizations */}
            {a.orgBreakdown?.length > 0 && (
              <SectionCard title="Organization Breakdown" icon={Building2}>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Organization</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Items</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Streams</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.orgBreakdown.map(o => (
                        <tr key={o.id} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{o.name}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{o.itemCount}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{o.streamCount}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{o.memberCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* Cohorts */}
            {a.cohortBreakdown?.length > 0 && (
              <SectionCard title="Cohort Breakdown" icon={UserCheck}>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Cohort</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">Status</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Members</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Streams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.cohortBreakdown.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{c.name}</td>
                          <td className="py-2 px-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span></td>
                          <td className="py-2 px-3 text-right text-gray-700">{c.memberCount}</td>
                          <td className="py-2 px-3 text-right text-gray-700">{c.streamCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            EXPORT BUTTONS (Always visible)
           ═══════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 mt-6 mb-4">
          <button
            onClick={handleExportCSV}
            disabled={!analytics}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-green-500 text-green-600 rounded-xl font-semibold text-sm hover:bg-green-50 transition-all disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!analytics || exportingPDF}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50"
          >
            <FileText size={16} /> {exportingPDF ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardLayout>
  );
};

export default AdvancedAnalyticsPage;
