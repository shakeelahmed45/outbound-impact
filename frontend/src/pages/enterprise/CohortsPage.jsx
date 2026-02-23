import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit3, UserPlus, FileText, Trash2, X, ChevronRight, QrCode, Download, Copy, Check, Loader2, Share2, Eye, Rocket, Upload as UploadIcon, Pause, Archive, Play, Clock, BarChart3, MoreHorizontal, Mail } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { canEdit, canDelete } from '../../store/authStore';
import api from '../../services/api';

const CohortsPage = () => {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editingCohort, setEditingCohort] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingCohort, setDeletingCohort] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Manage Members modal
  const [managingCohort, setManagingCohort] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // CSV Import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  // Assign Streams modal
  const [assigningCohort, setAssigningCohort] = useState(null);
  const [allStreams, setAllStreams] = useState([]);
  const [assignedStreamIds, setAssignedStreamIds] = useState([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [savingStreams, setSavingStreams] = useState(false);

  // QR / Share modal
  const [qrCohort, setQrCohort] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // ═══════════════════════════════════
  // FETCH COHORTS
  // ═══════════════════════════════════
  useEffect(() => { fetchCohorts(); }, []);

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cohorts');
      if (res.data.status === 'success') {
        setCohorts(res.data.cohorts);
      }
    } catch (err) {
      console.error('Failed to fetch cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════
  // CREATE
  // ═══════════════════════════════════
  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      setCreating(true);
      const res = await api.post('/cohorts', { name: createName.trim(), description: createDescription.trim() || null });
      if (res.data.status === 'success') {
        setCohorts(prev => [res.data.cohort, ...prev]);
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create cohort');
    } finally {
      setCreating(false);
    }
  };

  // ═══════════════════════════════════
  // EDIT (with status)
  // ═══════════════════════════════════
  const openEdit = (cohort) => {
    setEditingCohort(cohort);
    setEditName(cohort.name);
    setEditDescription(cohort.description || '');
    setEditStatus(cohort.status || 'active');
  };

  const handleEdit = async () => {
    if (!editName.trim()) return;
    try {
      setSaving(true);
      const res = await api.put(`/cohorts/${editingCohort.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
      });
      if (res.data.status === 'success') {
        setCohorts(prev => prev.map(c =>
          c.id === editingCohort.id
            ? { ...c, name: editName.trim(), description: editDescription.trim() || null, status: editStatus }
            : c
        ));
        setEditingCohort(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cohort');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════
  // DELETE
  // ═══════════════════════════════════
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await api.delete(`/cohorts/${deletingCohort.id}`);
      if (res.data.status === 'success') {
        setCohorts(prev => prev.filter(c => c.id !== deletingCohort.id));
        setDeletingCohort(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete cohort');
    } finally {
      setDeleting(false);
    }
  };

  // ═══════════════════════════════════
  // MEMBERS
  // ═══════════════════════════════════
  const openMembers = async (cohort) => {
    setManagingCohort(cohort);
    setMembersLoading(true);
    setMemberSearch('');
    setShowAddForm(false);
    setAddMemberName(''); setAddMemberEmail('');
    try {
      const res = await api.get(`/cohorts/${cohort.id}/members`);
      if (res.data.status === 'success') setMembers(res.data.members);
    } catch (err) { console.error('Fetch members error:', err); }
    finally { setMembersLoading(false); }
  };

  const handleAddMember = async () => {
    if (!addMemberName.trim() && !addMemberEmail.trim()) return;
    try {
      setAddingMember(true);
      const res = await api.post(`/cohorts/${managingCohort.id}/members`, {
        members: [{ name: addMemberName.trim(), email: addMemberEmail.trim() }],
      });
      if (res.data.status === 'success') {
        const membersRes = await api.get(`/cohorts/${managingCohort.id}/members`);
        if (membersRes.data.status === 'success') setMembers(membersRes.data.members);
        setCohorts(prev => prev.map(c =>
          c.id === managingCohort.id ? { ...c, memberCount: (c.memberCount || 0) + res.data.added } : c
        ));
        setAddMemberName(''); setAddMemberEmail('');
        setShowAddForm(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      setRemovingMemberId(memberId);
      await api.delete(`/cohorts/${managingCohort.id}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setCohorts(prev => prev.map(c =>
        c.id === managingCohort.id ? { ...c, memberCount: Math.max(0, (c.memberCount || 0) - 1) } : c
      ));
    } catch (err) { console.error('Remove member error:', err); }
    finally { setRemovingMemberId(null); }
  };

  // CSV
  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    try {
      setImporting(true);
      const res = await api.post(`/cohorts/${managingCohort.id}/members/import`, { csvData: csvText });
      if (res.data.status === 'success') {
        alert(res.data.message);
        const membersRes = await api.get(`/cohorts/${managingCohort.id}/members`);
        if (membersRes.data.status === 'success') setMembers(membersRes.data.members);
        setCohorts(prev => prev.map(c =>
          c.id === managingCohort.id ? { ...c, memberCount: (c.memberCount || 0) + res.data.added } : c
        ));
        setShowCsvModal(false);
        setCsvText('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import CSV');
    } finally { setImporting(false); }
  };

  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  // ═══════════════════════════════════
  // STREAMS
  // ═══════════════════════════════════
  const openAssignStreams = async (cohort) => {
    setAssigningCohort(cohort);
    setStreamsLoading(true);
    try {
      const campaignsRes = await api.get('/campaigns');
      const campaigns = campaignsRes.data.campaigns || campaignsRes.data || [];
      setAllStreams(Array.isArray(campaigns) ? campaigns : []);
      const assignedRes = await api.get(`/cohorts/${cohort.id}/streams`);
      if (assignedRes.data.status === 'success') {
        setAssignedStreamIds(assignedRes.data.streams.map(s => s.id));
      }
    } catch (err) { console.error('Fetch streams error:', err); }
    finally { setStreamsLoading(false); }
  };

  const toggleStream = (campaignId) => {
    setAssignedStreamIds(prev =>
      prev.includes(campaignId) ? prev.filter(id => id !== campaignId) : [...prev, campaignId]
    );
  };

  const handleSaveStreams = async () => {
    try {
      setSavingStreams(true);
      const res = await api.post(`/cohorts/${assigningCohort.id}/streams`, { campaignIds: assignedStreamIds });
      if (res.data.status === 'success') {
        setCohorts(prev => prev.map(c =>
          c.id === assigningCohort.id ? { ...c, streamCount: assignedStreamIds.length } : c
        ));
        setAssigningCohort(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign streams');
    } finally { setSavingStreams(false); }
  };

  // ═══════════════════════════════════
  // SHARE / QR
  // ═══════════════════════════════════
  const getCohortUrl = (slug) => `${window.location.origin}/g/${slug}`;

  const handleCopyLink = (slug) => {
    navigator.clipboard.writeText(getCohortUrl(slug));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = async (cohort) => {
    if (!cohort.qrCodeUrl) return;
    try {
      const response = await fetch(cohort.qrCodeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cohort-${cohort.slug}-qr.png`; a.click();
      URL.revokeObjectURL(url);
    } catch { window.open(cohort.qrCodeUrl, '_blank'); }
  };

  const shareToSocial = (platform, slug, name) => {
    const url = encodeURIComponent(getCohortUrl(slug));
    const text = encodeURIComponent(`Check out ${name} on Outbound Impact`);
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://x.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`,
      reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
      email: `mailto:?subject=${encodeURIComponent(name)}&body=${text}%20${url}`,
      sms: `sms:?body=${text}%20${url}`,
      snapchat: `https://www.snapchat.com/scan?attachmentUrl=${url}`,
      threads: `https://www.threads.net/intent/post?text=${text}%20${url}`,
      tiktok: `https://www.tiktok.com/share?url=${url}`,
    };
    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=500');
    }
  };

  const handleNativeShare = async (slug, name) => {
    const url = getCohortUrl(slug);
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text: `Check out ${name} on Outbound Impact`, url });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // ═══════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════
  const filteredCohorts = cohorts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMembers = cohorts.reduce((sum, c) => sum + (c.memberCount || 0), 0);
  const totalStreams = cohorts.reduce((sum, c) => sum + (c.streamCount || 0), 0);
  const activeCohorts = cohorts.filter(c => c.status === 'active').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-100 text-green-700', label: 'Active', icon: Play };
      case 'paused': return { bg: 'bg-orange-100 text-orange-700', label: 'Paused', icon: Pause };
      case 'archived': return { bg: 'bg-gray-100 text-gray-500', label: 'Archived', icon: Archive };
      default: return { bg: 'bg-green-100 text-green-700', label: 'Active', icon: Play };
    }
  };

  const getTimeSince = (date) => {
    if (!date) return '—';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Cohort Management</h1>
            <p className="text-gray-500 text-sm">Define and manage audience segments for targeted campaigns</p>
          </div>
          {/* ✅ Create — hidden for VIEWER */}
          {canEdit() && (
          <button
            onClick={() => { setShowCreateModal(true); setCreateName(''); setCreateDescription(''); }}
            className="gradient-btn text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
          >
            <Plus size={18} /> Create Cohort
          </button>
          )}
        </div>

        {/* Search + Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search cohorts..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'paused', label: 'Paused' },
              { key: 'archived', label: 'Archived' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === f.key
                    ? f.key === 'active' ? 'bg-green-100 text-green-700'
                      : f.key === 'paused' ? 'bg-orange-100 text-orange-700'
                      : f.key === 'archived' ? 'bg-gray-200 text-gray-600'
                      : 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredCohorts.length === 0 && cohorts.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cohorts Yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Create your first cohort to organize your audience into groups. Each cohort gets its own QR code that shows only the streams you assign to it.
            </p>
            {canEdit() && (
            <button
              onClick={() => { setShowCreateModal(true); setCreateName(''); setCreateDescription(''); }}
              className="gradient-btn text-white px-6 py-2.5 rounded-xl font-semibold"
            >
              <Plus size={18} className="inline mr-1" /> Create Your First Cohort
            </button>
            )}
          </div>
        ) : (
          /* Cohort Cards */
          <div className="space-y-4 mb-8">
            {filteredCohorts.map((cohort) => {
              const badge = getStatusBadge(cohort.status);
              const StatusIcon = badge.icon;
              const isArchived = cohort.status === 'archived';

              return (
                <div key={cohort.id} className={`bg-white rounded-xl border border-gray-200 p-5 sm:p-6 hover:shadow-lg transition-shadow ${isArchived ? 'opacity-60' : ''}`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-0.5 truncate">{cohort.name}</h3>
                      {cohort.description && <p className="text-sm text-gray-500 truncate">{cohort.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg}`}>
                        <StatusIcon size={12} /> {badge.label}
                      </span>
                      {/* ✅ Delete — hidden for VIEWER + EDITOR */}
                      {canDelete() && (
                      <button onClick={() => setDeletingCohort(cohort)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-500 mb-0.5">Members</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{(cohort.memberCount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-500 mb-0.5">Streams</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{cohort.streamCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-500 mb-0.5">QR Code</p>
                      <button onClick={() => setQrCohort(cohort)} className="text-purple-600 text-sm font-semibold hover:text-purple-800 flex items-center gap-1 mt-0.5">
                        <QrCode size={16} /> View
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-500 mb-0.5">Last Activity</p>
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" /> {getTimeSince(cohort.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                    <button onClick={() => openMembers(cohort)} className="flex-1 min-w-[100px] px-3 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 text-sm transition-colors flex items-center justify-center gap-1.5">
                      <UserPlus size={15} /> Members
                    </button>
                    <button onClick={() => openAssignStreams(cohort)} className="flex-1 min-w-[100px] px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 text-sm transition-colors flex items-center justify-center gap-1.5">
                      <Rocket size={15} /> Assign Streams
                    </button>
                    <button onClick={() => setQrCohort(cohort)} className="flex-1 min-w-[100px] px-3 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 text-sm transition-colors flex items-center justify-center gap-1.5">
                      <Share2 size={15} /> Share
                    </button>
                    <button onClick={() => window.location.href = '/dashboard/advanced-analytics'} className="flex-1 min-w-[100px] px-3 py-2 bg-amber-50 text-amber-600 rounded-lg font-medium hover:bg-amber-100 text-sm transition-colors flex items-center justify-center gap-1.5">
                      <BarChart3 size={15} /> Analytics
                    </button>
                    {/* ✅ Edit — hidden for VIEWER */}
                    {canEdit() && (
                    <button onClick={() => openEdit(cohort)} className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 text-sm transition-colors">
                      <Edit3 size={15} />
                    </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCohorts.length === 0 && cohorts.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-12 text-center">
                <Users className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 font-medium">No cohorts match your filters</p>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {cohorts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Cohorts</p>
              <p className="text-3xl font-bold text-gray-900">{cohorts.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{activeCohorts}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Members</p>
              <p className="text-3xl font-bold text-gray-900">{totalMembers.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Avg Members/Cohort</p>
              <p className="text-3xl font-bold text-gray-900">{cohorts.length > 0 ? Math.round(totalMembers / cohorts.length) : 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          MODALS
         ═══════════════════════════════════════ */}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)}>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 -mx-6 -mt-6 mb-6 rounded-t-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Create New Cohort</h3>
              <p className="text-purple-200 text-sm">Define a new audience segment</p>
            </div>
            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name *</label>
              <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. VIP Customers, Grade 5 Parents..." autoFocus
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="What is this group for?" rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-none" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-purple-700">A unique QR code will be generated automatically. You can then add members and assign streams to it.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={creating || !createName.trim()}
              className="flex-1 gradient-btn text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Cohort'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* EDIT MODAL (with Status: Active / Paused / Archived) */}
      {editingCohort && (
        <ModalOverlay onClose={() => setEditingCohort(null)}>
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 -mx-6 -mt-6 mb-6 rounded-t-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Edit Cohort</h3>
              <p className="text-gray-300 text-sm">Update cohort details</p>
            </div>
            <button onClick={() => setEditingCohort(null)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohort Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none bg-white">
                <option value="active">🟢 Active</option>
                <option value="paused">🟠 Paused</option>
                <option value="archived">⚫ Archived</option>
              </select>
            </div>
            {/* Activity info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Members:</strong> {editingCohort.memberCount || 0} •
                <strong> Streams:</strong> {editingCohort.streamCount || 0} •
                <strong> Created:</strong> {new Date(editingCohort.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setEditingCohort(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleEdit} disabled={saving || !editName.trim()}
              className="flex-1 gradient-btn text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* DELETE CONFIRM */}
      {deletingCohort && (
        <ModalOverlay onClose={() => setDeletingCohort(null)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900">Delete Cohort?</h3>
            <button onClick={() => setDeletingCohort(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>"{deletingCohort.name}"</strong>? This will permanently remove all {deletingCohort.memberCount || 0} members and stream assignments. The QR code will stop working.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeletingCohort(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {deleting ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : 'Delete Cohort'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* MANAGE MEMBERS MODAL (Pablo style) */}
      {managingCohort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setManagingCohort(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold">Manage Members</h3>
                <p className="text-blue-200 text-sm">{managingCohort.name} • {members.length} members</p>
              </div>
              <button onClick={() => setManagingCohort(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Search + Add Member + CSV */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input type="text" placeholder="Search members by name or email..."
                    value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  <button onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 whitespace-nowrap">
                    {showAddForm ? 'Cancel' : 'Add Member'}
                  </button>
                  <button onClick={() => setShowCsvModal(true)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-200 whitespace-nowrap flex items-center gap-1">
                    <UploadIcon size={14} /> CSV
                  </button>
                </div>
              </div>

              {/* Inline Add Form (slides open) */}
              {showAddForm && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                  <p className="text-sm font-medium text-blue-800 mb-3">Add New Member</p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="Name" value={addMemberName} onChange={(e) => setAddMemberName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                    <input type="email" placeholder="Email address" value={addMemberEmail} onChange={(e) => setAddMemberEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                  </div>
                  <button onClick={handleAddMember}
                    disabled={addingMember || (!addMemberName.trim() && !addMemberEmail.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-blue-700">
                    {addingMember ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add Member
                  </button>
                </div>
              )}

              {/* Members List */}
              {membersLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No members yet. Click "Add Member" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members
                    .filter(m => {
                      if (!memberSearch) return true;
                      const q = memberSearch.toLowerCase();
                      return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
                    })
                    .map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {(member.name || member.email || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{member.name || '—'}</p>
                          <p className="text-sm text-gray-500 truncate">{member.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                        {/* ✅ Remove member — hidden for VIEWER + EDITOR */}
                        {canDelete() && (
                        <button onClick={() => handleRemoveMember(member.id)}
                          disabled={removingMemberId === member.id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium">
                          {removingMemberId === member.id ? <Loader2 size={14} className="animate-spin" /> : 'Remove'}
                        </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {members.length > 0 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing {members.filter(m => !memberSearch || (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) || (m.email || '').toLowerCase().includes(memberSearch.toLowerCase())).length} of {members.length} members
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setManagingCohort(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <ModalOverlay onClose={() => setShowCsvModal(false)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900">Import Members from CSV</h3>
            <button onClick={() => setShowCsvModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700">CSV must have a header row with columns: <strong>name, email</strong> (at least one required)</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
            <input type="file" accept=".csv,.txt" onChange={handleCsvFile}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Or paste CSV content</label>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6}
              placeholder={"name,email\nAhmed Khan,ahmed@example.com\nSara Ali,sara@example.com"}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCsvModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleCsvImport} disabled={importing || !csvText.trim()}
              className="flex-1 gradient-btn text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {importing ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : 'Import Members'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ASSIGN STREAMS MODAL (Pablo style gradient header) */}
      {assigningCohort && (
        <ModalOverlay onClose={() => setAssigningCohort(null)}>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 -mx-6 -mt-6 mb-5 rounded-t-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Assign Streams</h3>
              <p className="text-purple-200 text-sm">Share content with {assigningCohort.name}</p>
            </div>
            <button onClick={() => setAssigningCohort(null)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
          </div>

          <p className="text-sm text-gray-500 mb-4">Select which streams members of this cohort will see when they scan the QR code:</p>

          {streamsLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-500" /></div>
          ) : allStreams.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Rocket size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No streams found. Create a stream first.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
                {allStreams.map(stream => (
                  <label key={stream.id}
                    className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border-2 transition-colors ${
                      assignedStreamIds.includes(stream.id)
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}>
                    <input type="checkbox" checked={assignedStreamIds.includes(stream.id)}
                      onChange={() => toggleStream(stream.id)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{stream.name}</p>
                      {stream.description && <p className="text-xs text-gray-500 truncate">{stream.description}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{stream._count?.items || stream.itemCount || 0} items</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setAssigningCohort(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveStreams} disabled={savingStreams}
                  className="flex-1 gradient-btn text-white py-2.5 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingStreams ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : `Assign ${assignedStreamIds.length} Stream(s)`}
                </button>
              </div>
            </>
          )}
        </ModalOverlay>
      )}

      {/* QR CODE + SOCIAL SHARE MODAL */}
      {qrCohort && (
        <ModalOverlay onClose={() => { setQrCohort(null); setCopiedLink(false); }}>
          <div className="text-center relative">
            <button onClick={() => { setQrCohort(null); setCopiedLink(false); }}
              className="absolute -top-1 -right-1 p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Share Cohort</h3>
            <p className="text-sm text-gray-500 mb-5">{qrCohort.name}</p>

            {/* QR Code */}
            {qrCohort.qrCodeUrl ? (
              <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 inline-block mb-5">
                <img src={qrCohort.qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-2xl p-8 mb-5">
                <QrCode size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-400 text-sm mt-2">QR code not available</p>
              </div>
            )}

            {/* Link */}
            <div className="bg-gray-50 rounded-lg p-3 mb-5">
              <p className="text-xs text-gray-500 mb-1">Share Link</p>
              <p className="text-sm font-mono text-purple-600 break-all">{getCohortUrl(qrCohort.slug)}</p>
            </div>

            {/* Copy + Download */}
            <div className="flex gap-3 mb-5">
              <button onClick={() => handleCopyLink(qrCohort.slug)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                {copiedLink ? <><Check size={16} className="text-green-600" /> Copied!</> : <><Copy size={16} /> Copy Link</>}
              </button>
              {qrCohort.qrCodeUrl && (
                <button onClick={() => handleDownloadQR(qrCohort)}
                  className="flex-1 gradient-btn text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2">
                  <Download size={16} /> Download QR
                </button>
              )}
            </div>

            {/* Social Media Share */}
            <div className="border-t border-gray-200 pt-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Share on Social Media</p>
              
              {/* Row 1: Major platforms */}
              <div className="flex justify-center gap-2.5 mb-2.5">
                {/* WhatsApp */}
                <button onClick={() => shareToSocial('whatsapp', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="WhatsApp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                {/* X (Twitter) */}
                <button onClick={() => shareToSocial('x', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="X (Twitter)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                {/* Facebook */}
                <button onClick={() => shareToSocial('facebook', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#1877F2] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                {/* LinkedIn */}
                <button onClick={() => shareToSocial('linkedin', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#0A66C2] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </button>
                {/* Instagram (link copy - no direct share API) */}
                <button onClick={() => { handleCopyLink(qrCohort.slug); }}
                  className="w-11 h-11 bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Instagram (copies link)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </button>
              </div>

              {/* Row 2: More platforms */}
              <div className="flex justify-center gap-2.5 mb-3">
                {/* Telegram */}
                <button onClick={() => shareToSocial('telegram', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#0088cc] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Telegram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </button>
                {/* Threads */}
                <button onClick={() => shareToSocial('threads', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Threads">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.592 12c.025 3.086.715 5.496 2.053 7.164 1.43 1.783 3.63 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.266 1.332-3.084.88-.779 2.116-1.218 3.59-1.274 1.08-.04 2.082.105 2.99.429l.004-.158c-.028-1.36-.226-2.372-.596-3.006-.408-.7-1.08-1.06-2.06-1.1h-.04c-.79.016-1.83.332-2.395.882l-1.394-1.5c.955-.888 2.24-1.373 3.743-1.4h.067c1.6.056 2.81.676 3.6 1.84.55.813.87 1.897.973 3.26.387.176.746.381 1.072.614 1.122.803 1.907 1.882 2.27 3.12.503 1.714.29 3.88-1.278 5.416C18.14 23.2 15.65 23.96 12.186 24zm-1.366-8.436c-.786.03-1.38.202-1.765.513-.384.31-.573.717-.547 1.178.026.453.273.85.716 1.148.484.326 1.165.487 1.924.449 1.084-.058 1.878-.462 2.432-1.237.348-.487.593-1.1.735-1.834-.622-.2-1.3-.295-2.018-.275l-.088.003-.005-.001c-.413.016-.837.026-1.384.056z"/></svg>
                </button>
                {/* Pinterest */}
                <button onClick={() => shareToSocial('pinterest', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#E60023] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Pinterest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>
                </button>
                {/* Reddit */}
                <button onClick={() => shareToSocial('reddit', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-[#FF4500] text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Reddit">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm6.066 13.71c.147.047.27.142.347.267.077.124.107.272.082.416a4.788 4.788 0 0 1-.667 1.62c-.39.58-.91 1.07-1.523 1.427-.614.358-1.303.577-2.014.637-.71.06-1.428-.042-2.1-.298a5.578 5.578 0 0 1-.485-.211 .404.404 0 0 0-.49.066.404.404 0 0 0-.028.495c.068.1.084.16.04.28-.092.247-.447.49-.852.49-.186 0-.358-.06-.5-.177a.55.55 0 0 1-.198-.447c.007-.178.094-.37.27-.504a.4.4 0 0 0 .066-.49.4.4 0 0 0-.445-.215 5.835 5.835 0 0 1-2.142-.025 5.14 5.14 0 0 1-1.916-.834 4.72 4.72 0 0 1-1.378-1.489 4.292 4.292 0 0 1-.513-1.776.476.476 0 0 1 .087-.315.44.44 0 0 1 .272-.18.483.483 0 0 1-.133-.314c0-.197.12-.375.3-.45a.49.49 0 0 1 .53.066 2.593 2.593 0 0 1 .375-.618c.32-.398.758-.685 1.244-.821a2.178 2.178 0 0 1 1.49.104c.45.198.83.526 1.09.938a.236.236 0 0 0 .186.112c1.157.07 2.322.07 3.48 0a.236.236 0 0 0 .187-.112c.26-.412.64-.74 1.09-.938a2.178 2.178 0 0 1 1.49-.104c.486.136.925.423 1.244.821.155.193.28.404.374.618a.49.49 0 0 1 .531-.066c.18.075.3.253.3.45a.483.483 0 0 1-.133.314z"/></svg>
                </button>
                {/* Email */}
                <button onClick={() => shareToSocial('email', qrCohort.slug, qrCohort.name)}
                  className="w-11 h-11 bg-gray-600 text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform" title="Email">
                  <Mail size={20} />
                </button>
              </div>

              {/* More button — native device share */}
              <button onClick={() => handleNativeShare(qrCohort.slug, qrCohort.name)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                <MoreHorizontal size={18} /> More sharing options...
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

// ═══════════════════════════════════
// MODAL WRAPPER
// ═══════════════════════════════════
const ModalOverlay = ({ children, onClose, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6 max-h-[85vh] overflow-y-auto shadow-2xl`}
      onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export default CohortsPage;
