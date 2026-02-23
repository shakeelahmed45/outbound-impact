import { useState, useEffect } from 'react';
import { GitBranch, CheckCircle, XCircle, Clock, Eye, Plus, Send, Loader2, X, Trash2, Edit3, FileText, Image, Video, Music, File, AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { canEdit, canDelete } from '../../store/authStore';
import api from '../../services/api';

const WorkflowsPage = () => {
  // Data
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, approved: 0, needsChanges: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingWorkflow, setViewingWorkflow] = useState(null);
  const [approvingWorkflow, setApprovingWorkflow] = useState(null);
  const [requestingChanges, setRequestingChanges] = useState(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({ assetName: '', assetType: 'TEXT', assetUrl: '', submitNow: false });
  const [editForm, setEditForm] = useState({ assetName: '', assetType: '', assetUrl: '' });
  const [changeFeedback, setChangeFeedback] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // ═══════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workflows');
      if (res.data.status === 'success') {
        setWorkflows(res.data.workflows);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════

  const handleCreate = async () => {
    if (!createForm.assetName.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.post('/workflows', createForm);
      if (res.data.status === 'success') {
        setShowCreateModal(false);
        setCreateForm({ assetName: '', assetType: 'TEXT', assetUrl: '', submitNow: false });
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Create failed:', err);
      alert(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForReview = async (id) => {
    try {
      setActionLoading(true);
      await api.post(`/workflows/${id}/submit`);
      fetchWorkflows();
    } catch (err) {
      console.error('Submit failed:', err);
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingWorkflow) return;
    try {
      setActionLoading(true);
      await api.post(`/workflows/${approvingWorkflow.id}/approve`);
      setApprovingWorkflow(null);
      fetchWorkflows();
    } catch (err) {
      console.error('Approve failed:', err);
      alert(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!requestingChanges || !changeFeedback.trim()) return;
    try {
      setActionLoading(true);
      await api.post(`/workflows/${requestingChanges.id}/request-changes`, { feedback: changeFeedback });
      setRequestingChanges(null);
      setChangeFeedback('');
      fetchWorkflows();
    } catch (err) {
      console.error('Request changes failed:', err);
      alert(err.response?.data?.message || 'Failed to request changes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingWorkflow) return;
    try {
      setActionLoading(true);
      await api.put(`/workflows/${editingWorkflow.id}`, editForm);
      setEditingWorkflow(null);
      fetchWorkflows();
    } catch (err) {
      console.error('Edit failed:', err);
      alert(err.response?.data?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWorkflow) return;
    try {
      setActionLoading(true);
      await api.delete(`/workflows/${deletingWorkflow.id}`);
      setDeletingWorkflow(null);
      fetchWorkflows();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (w) => {
    setEditForm({ assetName: w.assetName, assetType: w.assetType || 'TEXT', assetUrl: w.assetUrl || '' });
    setEditingWorkflow(w);
  };

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  const filtered = workflows.filter(w => {
    if (filter === 'pending') return w.status === 'PENDING_REVIEW';
    if (filter === 'approved') return w.status === 'APPROVED';
    if (filter === 'changes') return w.status === 'NEEDS_CHANGES';
    if (filter === 'draft') return w.status === 'DRAFT';
    return true;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'PENDING_REVIEW': return 'bg-orange-100 text-orange-700';
      case 'NEEDS_CHANGES': return 'bg-red-100 text-red-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'NEEDS_CHANGES': return 'Needs Changes';
      case 'DRAFT': return 'Draft';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle size={14} />;
      case 'PENDING_REVIEW': return <Clock size={14} />;
      case 'NEEDS_CHANGES': return <AlertCircle size={14} />;
      case 'DRAFT': return <FileText size={14} />;
      default: return null;
    }
  };

  const getAssetIcon = (type) => {
    switch (type) {
      case 'VIDEO': return <Video size={18} className="text-purple-500" />;
      case 'IMAGE': return <Image size={18} className="text-blue-500" />;
      case 'AUDIO': return <Music size={18} className="text-pink-500" />;
      case 'PDF': return <FileText size={18} className="text-red-500" />;
      default: return <File size={18} className="text-gray-500" />;
    }
  };

  const getTimeSince = (dateStr) => {
    if (!dateStr) return '—';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const assetTypes = [
    { value: 'VIDEO', label: '🎬 Video', icon: Video },
    { value: 'IMAGE', label: '🖼️ Image', icon: Image },
    { value: 'AUDIO', label: '🎵 Audio', icon: Music },
    { value: 'TEXT', label: '📝 Text', icon: FileText },
    { value: 'PDF', label: '📄 PDF', icon: FileText },
  ];

  const filterTabs = [
    { id: 'all', label: 'All', count: stats.total, color: 'bg-purple-100 text-purple-700' },
    { id: 'pending', label: 'Pending', count: stats.pending, color: 'bg-orange-100 text-orange-700' },
    { id: 'approved', label: 'Approved', count: stats.approved, color: 'bg-green-100 text-green-700' },
    { id: 'changes', label: 'Needs Changes', count: stats.needsChanges, color: 'bg-red-100 text-red-700' },
    { id: 'draft', label: 'Drafts', count: stats.draft, color: 'bg-gray-200 text-gray-700' },
  ];

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Content Workflows</h1>
            <p className="text-gray-500 text-sm">Review and approve content before it goes live</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchWorkflows} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5">
              <RefreshCw size={15} /> Refresh
            </button>
            {/* ✅ Create — hidden for VIEWER */}
            {canEdit() && (
            <button onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-sm">
              <Plus size={16} /> New Submission
            </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'border-purple-200 bg-purple-50', text: 'text-purple-700' },
            { label: 'Pending', value: stats.pending, color: 'border-orange-200 bg-orange-50', text: 'text-orange-700' },
            { label: 'Approved', value: stats.approved, color: 'border-green-200 bg-green-50', text: 'text-green-700' },
            { label: 'Needs Changes', value: stats.needsChanges, color: 'border-red-200 bg-red-50', text: 'text-red-700' },
            { label: 'Drafts', value: stats.draft, color: 'border-gray-200 bg-gray-50', text: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.color} p-3 text-center`}>
              <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {filterTabs.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === f.id ? f.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label} {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>

        {/* Workflow Cards */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={28} className="animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading workflows...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <GitBranch size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {filter === 'all' ? 'No workflows yet' : `No ${filterTabs.find(f => f.id === filter)?.label.toLowerCase()} workflows`}
            </p>
            <p className="text-gray-400 text-sm mt-1">Click "New Submission" to submit content for review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((workflow) => (
              <div key={workflow.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Top row: asset info + status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getAssetIcon(workflow.assetType)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-0.5 truncate">{workflow.assetName}</h3>
                      <p className="text-sm text-gray-500">
                        Submitted by {workflow.submittedByName || 'Unknown'} • {getTimeSince(workflow.submittedAt || workflow.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusStyle(workflow.status)}`}>
                    {getStatusIcon(workflow.status)} {getStatusLabel(workflow.status)}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Version</p>
                    <p className="text-sm font-semibold text-gray-900">{workflow.version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Comments</p>
                    <p className="text-sm font-semibold text-gray-900">{workflow.comments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Type</p>
                    <p className="text-sm font-semibold text-gray-900">{workflow.assetType || '—'}</p>
                  </div>
                </div>

                {/* Feedback banner */}
                {workflow.feedback && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-medium text-red-600 mb-1">📝 Reviewer Feedback{workflow.reviewedBy ? ` (${workflow.reviewedBy})` : ''}</p>
                    <p className="text-sm text-red-700">{workflow.feedback}</p>
                  </div>
                )}

                {/* Approved banner */}
                {workflow.status === 'APPROVED' && workflow.approvedAt && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✅ Approved by {workflow.reviewedBy || 'Admin'} • {getTimeSince(workflow.approvedAt)}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {/* PENDING → Approve / Request Changes */}
                  {workflow.status === 'PENDING_REVIEW' && (
                    <>
                      <button onClick={() => setApprovingWorkflow(workflow)}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 text-sm flex items-center justify-center gap-1.5 transition-colors">
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button onClick={() => { setRequestingChanges(workflow); setChangeFeedback(''); }}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 text-sm flex items-center justify-center gap-1.5 transition-colors">
                        <XCircle size={15} /> Request Changes
                      </button>
                    </>
                  )}

                  {/* DRAFT → Submit for Review / Edit */}
                  {workflow.status === 'DRAFT' && canEdit() && (
                    <>
                      <button onClick={() => handleSubmitForReview(workflow.id)}
                        disabled={actionLoading}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-medium hover:bg-orange-100 text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                        <Send size={15} /> Submit for Review
                      </button>
                      <button onClick={() => openEdit(workflow)}
                        className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 text-sm transition-colors">
                        <Edit3 size={15} />
                      </button>
                    </>
                  )}

                  {/* NEEDS_CHANGES → Resubmit / Edit */}
                  {workflow.status === 'NEEDS_CHANGES' && canEdit() && (
                    <>
                      <button onClick={() => handleSubmitForReview(workflow.id)}
                        disabled={actionLoading}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-medium hover:bg-orange-100 text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                        <RefreshCw size={15} /> Resubmit (v{(() => { const p = workflow.version.replace('v','').split('.'); return `${p[0]}.${parseInt(p[1]||'0')+1}`; })()})
                      </button>
                      <button onClick={() => openEdit(workflow)}
                        className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg font-medium hover:bg-gray-100 text-sm transition-colors">
                        <Edit3 size={15} />
                      </button>
                    </>
                  )}

                  {/* View Details (all statuses) */}
                  <button onClick={() => setViewingWorkflow(workflow)}
                    className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 text-sm flex items-center gap-1.5 transition-colors">
                    <Eye size={15} /> Details
                  </button>

                  {/* ✅ Delete — hidden for VIEWER + EDITOR */}
                  {canDelete() && (
                  <button onClick={() => setDeletingWorkflow(workflow)}
                    className="px-3 py-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 text-sm transition-colors">
                    <Trash2 size={15} />
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* CREATE WORKFLOW MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold">New Content Submission</h3>
                <p className="text-purple-200 text-sm">Submit content for review and approval</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Name *</label>
                <input type="text" placeholder="e.g., Q1 Marketing Video, Product Launch Banner..."
                  value={createForm.assetName} onChange={e => setCreateForm({...createForm, assetName: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {assetTypes.map(t => (
                    <button key={t.value} onClick={() => setCreateForm({...createForm, assetType: t.value})}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                        createForm.assetType === t.value
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content URL <span className="text-gray-400">(optional)</span></label>
                <input type="url" placeholder="https://... link to the content for preview"
                  value={createForm.assetUrl} onChange={e => setCreateForm({...createForm, assetUrl: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
              </div>
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <input type="checkbox" id="submitNow" checked={createForm.submitNow}
                  onChange={e => setCreateForm({...createForm, submitNow: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded" />
                <label htmlFor="submitNow" className="text-sm text-orange-700">
                  <strong>Submit for review immediately</strong>
                  <span className="text-orange-500 block text-xs">If unchecked, it will be saved as a Draft</span>
                </label>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate}
                disabled={actionLoading || !createForm.assetName.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {createForm.submitNow ? 'Submit for Review' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* VIEW DETAILS MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {viewingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingWorkflow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0">
              <div>
                <h3 className="text-xl font-bold">Workflow Details</h3>
                <p className="text-gray-300 text-sm">{viewingWorkflow.assetName}</p>
              </div>
              <button onClick={() => setViewingWorkflow(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(viewingWorkflow.status)}`}>
                  {getStatusIcon(viewingWorkflow.status)} {getStatusLabel(viewingWorkflow.status)}
                </span>
                <span className="text-sm text-gray-500">• {viewingWorkflow.version}</span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Content Type</p>
                  <div className="flex items-center gap-1.5">
                    {getAssetIcon(viewingWorkflow.assetType)}
                    <p className="text-sm font-medium text-gray-900">{viewingWorkflow.assetType || 'Not specified'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Submitted By</p>
                  <p className="text-sm font-medium text-gray-900">{viewingWorkflow.submittedByName || 'Unknown'}</p>
                  {viewingWorkflow.submittedByEmail && (
                    <p className="text-xs text-gray-400">{viewingWorkflow.submittedByEmail}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Submitted</p>
                  <p className="text-sm font-medium text-gray-900">{viewingWorkflow.submittedAt ? getTimeSince(viewingWorkflow.submittedAt) : 'Not submitted'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">{getTimeSince(viewingWorkflow.createdAt)}</p>
                </div>
              </div>

              {/* Content URL */}
              {viewingWorkflow.assetUrl && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium mb-1">Content URL</p>
                  <a href={viewingWorkflow.assetUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-purple-700 hover:underline break-all">{viewingWorkflow.assetUrl}</a>
                </div>
              )}

              {/* Feedback */}
              {viewingWorkflow.feedback && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-600 font-medium mb-1">📝 Reviewer Feedback{viewingWorkflow.reviewedBy ? ` — ${viewingWorkflow.reviewedBy}` : ''}</p>
                  <p className="text-sm text-red-700">{viewingWorkflow.feedback}</p>
                </div>
              )}

              {/* Approved info */}
              {viewingWorkflow.status === 'APPROVED' && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700">
                    ✅ Approved by <strong>{viewingWorkflow.reviewedBy || 'Admin'}</strong>
                    {viewingWorkflow.approvedAt && ` • ${getTimeSince(viewingWorkflow.approvedAt)}`}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Timeline</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-gray-600">Created {getTimeSince(viewingWorkflow.createdAt)}</span>
                  </div>
                  {viewingWorkflow.submittedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span className="text-gray-600">Submitted for review {getTimeSince(viewingWorkflow.submittedAt)}</span>
                    </div>
                  )}
                  {viewingWorkflow.reviewedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${viewingWorkflow.status === 'APPROVED' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-gray-600">
                        {viewingWorkflow.status === 'APPROVED' ? 'Approved' : 'Changes requested'} by {viewingWorkflow.reviewedBy} {getTimeSince(viewingWorkflow.reviewedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button onClick={() => setViewingWorkflow(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* APPROVE CONFIRMATION MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {approvingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setApprovingWorkflow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold">Approve Content</h3>
                <p className="text-green-200 text-sm">This content will be marked as approved</p>
              </div>
              <button onClick={() => setApprovingWorkflow(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100 mb-4">
                <CheckCircle size={24} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{approvingWorkflow.assetName}</p>
                  <p className="text-sm text-gray-500 mt-1">Submitted by {approvingWorkflow.submittedByName} • {approvingWorkflow.version}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this content? Once approved, the submitter will be notified and the content can go live.
              </p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setApprovingWorkflow(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleApprove}
                disabled={actionLoading}
                className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* REQUEST CHANGES MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {requestingChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRequestingChanges(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold">Request Changes</h3>
                <p className="text-red-200 text-sm">Provide feedback for the submitter</p>
              </div>
              <button onClick={() => setRequestingChanges(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {getAssetIcon(requestingChanges.assetType)}
                <div>
                  <p className="font-medium text-gray-900">{requestingChanges.assetName}</p>
                  <p className="text-xs text-gray-500">by {requestingChanges.submittedByName} • {requestingChanges.version}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback *</label>
                <textarea
                  rows={4}
                  placeholder="Explain what changes are needed..."
                  value={changeFeedback}
                  onChange={e => setChangeFeedback(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">The submitter will see this feedback and can revise their content</p>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setRequestingChanges(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleRequestChanges}
                disabled={actionLoading || !changeFeedback.trim()}
                className="px-5 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* EDIT WORKFLOW MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {editingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingWorkflow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold">Edit Submission</h3>
                <p className="text-gray-300 text-sm">{editingWorkflow.assetName}</p>
              </div>
              <button onClick={() => setEditingWorkflow(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Name *</label>
                <input type="text" value={editForm.assetName} onChange={e => setEditForm({...editForm, assetName: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {assetTypes.map(t => (
                    <button key={t.value} onClick={() => setEditForm({...editForm, assetType: t.value})}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-all ${
                        editForm.assetType === t.value
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content URL</label>
                <input type="url" value={editForm.assetUrl} onChange={e => setEditForm({...editForm, assetUrl: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setEditingWorkflow(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleEdit}
                disabled={actionLoading || !editForm.assetName.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ═══════════════════════════════════════════════ */}
      {deletingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeletingWorkflow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Workflow?</h3>
              <p className="text-sm text-gray-500 mb-1">
                <strong>"{deletingWorkflow.assetName}"</strong>
              </p>
              <p className="text-sm text-gray-400">This action cannot be undone.</p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button onClick={() => setDeletingWorkflow(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default WorkflowsPage;
