import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, X, Loader2, Trash2, Edit2, Check,
  FolderOpen, Rocket, Users, QrCode, AlertCircle, RefreshCw,
  Image as ImageIcon, Video, Music, FileText, Code, Globe, ShieldAlert
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Toast from '../../components/common/Toast';
import useAuthStore, { canManageTeam } from '../../store/authStore';
import api from '../../services/api';

const getTypeIcon = (type) => {
  const icons = { IMAGE: ImageIcon, VIDEO: Video, AUDIO: Music, TEXT: FileText, EMBED: Code };
  return icons[type] || FileText;
};

// ✅ FIX: skipCache config to bypass the 2-minute GET cache in api.js
const NO_CACHE = { skipCache: true };

const OrganizationsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ✅ VIEWER + EDITOR cannot access organization management
  if (!canManageTeam()) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={40} className="text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Access Restricted
            </h1>
            <p className="text-gray-600 mb-2">
              <strong>Your role: {user?.teamRole}</strong>
            </p>
            <p className="text-gray-600 mb-6">
              Only the account owner or team admins can manage organizations.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrganization, setSelectedOrganization] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Manage modal
  const [manageTab, setManageTab] = useState('streams');
  const [orgDetail, setOrgDetail] = useState(null);
  const [unassigned, setUnassigned] = useState({ items: [], campaigns: [], cohorts: [] });
  const [teamMembers, setTeamMembers] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manageError, setManageError] = useState('');

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  const closeToast = () => setToast({ show: false, message: '', type: 'success' });

  // ✅ FIX: Clear org + team cache after every mutation
  const clearOrgCache = () => {
    if (api.clearCache) {
      api.clearCache('organizations');
      api.clearCache('team');
    }
  };

  useEffect(() => {
    document.title = 'Organizations | Outbound Impact';
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      clearOrgCache();
      const res = await api.get('/organizations', NO_CACHE);
      if (res.data.status === 'success') {
        setOrganizations(res.data.organizations);
      }
    } catch (err) {
      console.error('❌ Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // CREATE / EDIT
  // ═══════════════════════════════════════
  const openCreate = () => {
    setFormData({ name: '', description: '' });
    setFormError('');
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEdit = (org) => {
    setFormData({ name: org.name, description: org.description || '' });
    setFormError('');
    setIsEditing(true);
    setSelectedOrg(org);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Organization name is required');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      if (isEditing) {
        await api.put(`/organizations/${selectedOrg.id}`, formData);
        showToast('Organization updated successfully!');
      } else {
        await api.post('/organizations', formData);
        showToast('Organization created successfully!');
      }
      setShowCreateModal(false);
      clearOrgCache();
      fetchOrganizations();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save');
    } finally {
      setFormLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════
  const handleDelete = async () => {
    try {
      setFormLoading(true);
      await api.delete(`/organizations/${selectedOrg.id}`);
      showToast('Organization deleted. Content has been unassigned.');
      setShowDeleteModal(false);
      clearOrgCache();
      fetchOrganizations();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // MANAGE MODAL
  // ✅ FIX: Each API call is INDEPENDENT — no Promise.all
  // One failure won't kill the others
  // All calls use NO_CACHE to bypass 2-min GET cache
  // ═══════════════════════════════════════════════════════
  const openManage = (org, tab = 'streams') => {
    setSelectedOrg(org);
    setManageTab(tab);
    setSelectedIds([]);
    setManageError('');
    setOrgDetail(null);
    setUnassigned({ items: [], campaigns: [], cohorts: [] });
    setTeamMembers([]);
    setShowManageModal(true);
    loadManageData(org.id);
  };

  const loadManageData = async (orgId) => {
    setManageLoading(true);
    setManageError('');
    clearOrgCache();
    const errors = [];

    // ✅ Call 1: Organization detail (what's assigned)
    try {
      const res = await api.get(`/organizations/${orgId}`, NO_CACHE);
      console.log('📋 Org detail:', res.data);
      if (res.data.status === 'success') {
        setOrgDetail(res.data.organization);
      }
    } catch (err) {
      console.error('❌ Org detail failed:', err.response?.data || err.message);
      errors.push('org detail: ' + (err.response?.data?.message || err.message));
    }

    // ✅ Call 2: Unassigned content (what can be added)
    try {
      const res = await api.get('/organizations/unassigned', NO_CACHE);
      console.log('📋 Unassigned:', res.data);
      if (res.data.status === 'success') {
        setUnassigned({
          items: res.data.items || [],
          campaigns: res.data.campaigns || [],
          cohorts: res.data.cohorts || [],
        });
      }
    } catch (err) {
      console.error('❌ Unassigned failed:', err.response?.data || err.message);
      errors.push('unassigned content: ' + (err.response?.data?.message || err.message));
    }

    // ✅ Call 3: Team members (for team tab)
    try {
      const res = await api.get('/team', NO_CACHE);
      console.log('📋 Team:', res.data);
      if (res.data.status === 'success') {
        setTeamMembers(
          res.data.teamMembers?.filter(m => m.status === 'ACCEPTED') || []
        );
      }
    } catch (err) {
      console.error('❌ Team failed:', err.response?.data || err.message);
      errors.push('team: ' + (err.response?.data?.message || err.message));
    }

    if (errors.length > 0) {
      setManageError('Failed to load: ' + errors.join(' | '));
    }
    setManageLoading(false);
  };

  const refreshManage = async () => {
    if (!selectedOrg) return;
    await loadManageData(selectedOrg.id);
    setSelectedIds([]);
  };

  // ═══════════════════════════════════════
  // ASSIGN / REMOVE
  // ═══════════════════════════════════════
  const handleAssign = async (type) => {
    if (selectedIds.length === 0) return;
    setAssignLoading(true);
    try {
      const endpointMap = {
        items: 'assign-items',
        streams: 'assign-streams',
        cohorts: 'assign-cohorts',
        members: 'assign-members',
      };
      const bodyMap = {
        items: { itemIds: selectedIds },
        streams: { campaignIds: selectedIds },
        cohorts: { cohortIds: selectedIds },
        members: { teamMemberIds: selectedIds },
      };
      await api.post(
        `/organizations/${selectedOrg.id}/${endpointMap[type]}`,
        bodyMap[type]
      );
      showToast(`${selectedIds.length} ${type} assigned!`);
      setSelectedIds([]);
      clearOrgCache();
      await refreshManage();
      fetchOrganizations();
    } catch (err) {
      console.error('❌ Assign failed:', err.response?.data || err.message);
      showToast(err.response?.data?.message || 'Failed to assign', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemove = async (type, id) => {
    setAssignLoading(true);
    try {
      const endpointMap = {
        items: 'remove-items',
        streams: 'remove-streams',
        cohorts: 'remove-cohorts',
        members: 'remove-members',
      };
      const bodyMap = {
        items: { itemIds: [id] },
        streams: { campaignIds: [id] },
        cohorts: { cohortIds: [id] },
        members: { teamMemberIds: [id] },
      };
      await api.post(
        `/organizations/${selectedOrg.id}/${endpointMap[type]}`,
        bodyMap[type]
      );
      showToast('Removed!');
      clearOrgCache();
      await refreshManage();
      fetchOrganizations();
    } catch (err) {
      showToast('Failed to remove', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleId = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filter by dropdown
  const filtered = organizations.filter(org =>
    selectedOrganization === 'all' || org.name === selectedOrganization
  );

  // ═══════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="text-slate-600">Loading organizations...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      <div className="max-w-6xl">
        {/* ══════════════════════════════════════════
            HEADER — Pablo exact
           ══════════════════════════════════════════ */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Multi-Brand Management
            </h2>
            <p className="text-slate-600">
              Manage multiple brands and regional operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg font-medium"
            >
              <option value="all">All Brands</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.name}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Brand</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ORGANIZATION CARDS — Pablo stacked layout
           ══════════════════════════════════════════ */}
        {organizations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              No Organizations Yet
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Create your first organization to start grouping streams, uploads,
              cohorts and team members.
            </p>
            <button
              onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Plus size={18} /> Create First Organization
            </button>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {filtered.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                {/* Top row: Icon + Name + Compliance Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {org.regions} cohort{org.regions !== 1 ? 's' : ''} •{' '}
                        {org.activeUsers} active user
                        {org.activeUsers !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      org.compliance === '100%'
                        ? 'bg-green-100 text-green-700'
                        : parseInt(org.compliance) >= 95
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {org.compliance} Compliant
                  </span>
                </div>

                {/* 4-column stats — Pablo exact */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Cohorts</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {org.regions}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Streams</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {org.campaigns}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">Uploads</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {org.assets}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600 mb-1">QR Codes</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {org.qrCodes}
                    </p>
                  </div>
                </div>

                {/* ACTION BUTTONS — Pablo cohort card pattern */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => openManage(org, 'streams')}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 text-sm"
                  >
                    Manage Content
                  </button>
                  <button
                    onClick={() => openManage(org, 'members')}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 text-sm"
                  >
                    Manage Team
                  </button>
                  <button
                    onClick={() => openEdit(org)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrg(org);
                      setShowDeleteModal(true);
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════
            BOTTOM SUMMARY — Pablo exact 3-column
           ══════════════════════════════════════════ */}
        {organizations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600 mb-1">
                {selectedOrganization === 'all' ? 'Total Brands' : 'Brand'}
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {selectedOrganization === 'all' ? organizations.length : 1}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600 mb-1">
                {selectedOrganization === 'all' ? 'Total Cohorts' : 'Cohorts'}
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {filtered.reduce((sum, o) => sum + o.regions, 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-600 mb-1">
                {selectedOrganization === 'all'
                  ? 'Total Active Users'
                  : 'Active Users'}
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {filtered.reduce((sum, o) => sum + o.activeUsers, 0)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          CREATE / EDIT MODAL — Pablo gradient header
         ══════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold">
                  {isEditing ? 'Edit Organization' : 'Create Organization'}
                </h2>
                <p className="text-purple-100 text-sm">
                  {isEditing
                    ? 'Update organization details'
                    : 'Add a new brand workspace'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{formError}</p>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Smith Family Memorial"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What is this organization for?"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  What are Organizations?
                </p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Group related streams, uploads, and cohorts together</li>
                  <li>• Assign specific team members to each organization</li>
                  <li>• Track QR codes and compliance per organization</li>
                  <li>
                    • Content is never deleted when removing from an organization
                  </li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {isEditing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
         ══════════════════════════════════════════════════ */}
      {showDeleteModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                Delete Organization
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-slate-600 mb-3">
                Are you sure you want to delete{' '}
                <strong>"{selectedOrg.name}"</strong>?
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ All streams, uploads, and cohorts inside will be{' '}
                  <strong>unassigned, not deleted</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={formLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MANAGE MODAL — 4 tabs: Streams, Uploads, Cohorts, Team
         ══════════════════════════════════════════════════════════ */}
      {showManageModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-3 sm:p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedOrg.name}</h2>
                  <p className="text-purple-100 text-sm">
                    Assign streams, uploads, cohorts and team members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 4 Tabs */}
            <div className="flex border-b border-slate-200 px-4 sm:px-6 flex-shrink-0 overflow-x-auto">
              {[
                {
                  key: 'streams',
                  label: 'Streams',
                  icon: Rocket,
                  count: orgDetail?.campaigns?.length || 0,
                },
                {
                  key: 'items',
                  label: 'Uploads',
                  icon: FolderOpen,
                  count: orgDetail?.items?.length || 0,
                },
                {
                  key: 'cohorts',
                  label: 'Cohorts',
                  icon: Globe,
                  count: orgDetail?.cohorts?.length || 0,
                },
                {
                  key: 'members',
                  label: 'Team',
                  icon: Users,
                  count: orgDetail?.members?.length || 0,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setManageTab(tab.key);
                    setSelectedIds([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    manageTab === tab.key
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      manageTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* ✅ Error banner with retry */}
              {manageError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        size={16}
                        className="text-red-600 flex-shrink-0"
                      />
                      <p className="text-sm text-red-800">{manageError}</p>
                    </div>
                    <button
                      onClick={() => loadManageData(selectedOrg.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm font-medium"
                    >
                      <RefreshCw size={14} /> Retry
                    </button>
                  </div>
                </div>
              )}

              {manageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : (
                <>
                  {/* ── STREAMS TAB ── */}
                  {manageTab === 'streams' && (
                    <ManageSection
                      title="Streams"
                      assigned={orgDetail?.campaigns || []}
                      unassignedList={unassigned.campaigns || []}
                      selectedIds={selectedIds}
                      toggleId={toggleId}
                      onAssign={() => handleAssign('streams')}
                      onRemove={(id) => handleRemove('streams', id)}
                      assignLoading={assignLoading}
                      renderAssigned={(c) => (
                        <div className="flex items-center gap-2 min-w-0">
                          <Rocket
                            size={14}
                            className="text-green-600 flex-shrink-0"
                          />
                          <span className="text-sm text-slate-800 truncate">
                            {c.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {c._count?.items || 0} items
                          </span>
                          {c.qrCodeUrl && (
                            <QrCode
                              size={12}
                              className="text-green-500 flex-shrink-0"
                            />
                          )}
                        </div>
                      )}
                      renderUnassigned={(c) => (
                        <>
                          <Rocket
                            size={14}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <span className="text-sm text-slate-800 truncate">
                            {c.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
                            {c._count?.items || 0} items
                          </span>
                        </>
                      )}
                    />
                  )}

                  {/* ── UPLOADS TAB ── */}
                  {manageTab === 'items' && (
                    <ManageSection
                      title="Uploads"
                      assigned={orgDetail?.items || []}
                      unassignedList={unassigned.items || []}
                      selectedIds={selectedIds}
                      toggleId={toggleId}
                      onAssign={() => handleAssign('items')}
                      onRemove={(id) => handleRemove('items', id)}
                      assignLoading={assignLoading}
                      renderAssigned={(item) => {
                        const Icon = getTypeIcon(item.type);
                        return (
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon
                              size={14}
                              className="text-green-600 flex-shrink-0"
                            />
                            <span className="text-sm text-slate-800 truncate">
                              {item.title}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.views} views
                            </span>
                          </div>
                        );
                      }}
                      renderUnassigned={(item) => {
                        const Icon = getTypeIcon(item.type);
                        return (
                          <>
                            <Icon
                              size={14}
                              className="text-slate-400 flex-shrink-0"
                            />
                            <span className="text-sm text-slate-800 truncate">
                              {item.title}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
                              {item.views} views
                            </span>
                          </>
                        );
                      }}
                    />
                  )}

                  {/* ── COHORTS TAB ── */}
                  {manageTab === 'cohorts' && (
                    <ManageSection
                      title="Cohorts"
                      assigned={orgDetail?.cohorts || []}
                      unassignedList={unassigned.cohorts || []}
                      selectedIds={selectedIds}
                      toggleId={toggleId}
                      onAssign={() => handleAssign('cohorts')}
                      onRemove={(id) => handleRemove('cohorts', id)}
                      assignLoading={assignLoading}
                      renderAssigned={(c) => (
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe
                            size={14}
                            className="text-green-600 flex-shrink-0"
                          />
                          <span className="text-sm text-slate-800 truncate">
                            {c.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {c._count?.members || 0} members •{' '}
                            {c._count?.streams || 0} streams
                          </span>
                        </div>
                      )}
                      renderUnassigned={(c) => (
                        <>
                          <Globe
                            size={14}
                            className="text-slate-400 flex-shrink-0"
                          />
                          <span className="text-sm text-slate-800 truncate">
                            {c.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
                            {c._count?.members || 0} members
                          </span>
                        </>
                      )}
                    />
                  )}

                  {/* ── TEAM MEMBERS TAB ── */}
                  {manageTab === 'members' && (
                    <div className="space-y-5">
                      {/* Assigned members */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                          Assigned Team Members (
                          {orgDetail?.members?.length || 0})
                        </h4>
                        {!orgDetail?.members ||
                        orgDetail.members.length === 0 ? (
                          <p className="text-sm text-slate-400 py-3 bg-slate-50 rounded-lg text-center">
                            No team members assigned yet — select from the list
                            below to add
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto">
                            {orgDetail.members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0">
                                    {m.teamMember.email[0].toUpperCase()}
                                  </div>
                                  <span className="text-sm text-slate-800 truncate">
                                    {m.teamMember.email}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                    {m.teamMember.role}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    handleRemove('members', m.teamMember.id)
                                  }
                                  disabled={assignLoading}
                                  className="text-red-400 hover:text-red-600 text-xs font-medium flex-shrink-0 ml-2"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Available members to add */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700">
                            Available Team Members (
                            {
                              teamMembers.filter(
                                (tm) =>
                                  !orgDetail?.members?.some(
                                    (m) => m.teamMember.id === tm.id
                                  )
                              ).length
                            }
                            )
                          </h4>
                          {selectedIds.length > 0 && (
                            <button
                              onClick={() => handleAssign('members')}
                              disabled={assignLoading}
                              className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                              {assignLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              Add {selectedIds.length} selected
                            </button>
                          )}
                        </div>
                        {(() => {
                          const assignedIds =
                            orgDetail?.members?.map(
                              (m) => m.teamMember.id
                            ) || [];
                          const available = teamMembers.filter(
                            (tm) => !assignedIds.includes(tm.id)
                          );
                          if (teamMembers.length === 0) {
                            return (
                              <p className="text-sm text-slate-400 py-3 bg-slate-50 rounded-lg text-center">
                                No team members found. Invite team members from
                                the Contributors page first.
                              </p>
                            );
                          }
                          if (available.length === 0) {
                            return (
                              <p className="text-sm text-slate-400 py-3 bg-slate-50 rounded-lg text-center">
                                All team members are already assigned to this
                                organization
                              </p>
                            );
                          }
                          return (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {available.map((tm) => {
                                const selected = selectedIds.includes(tm.id);
                                return (
                                  <button
                                    key={tm.id}
                                    onClick={() => toggleId(tm.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                      selected
                                        ? 'bg-blue-50 border border-blue-300'
                                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                                    }`}
                                  >
                                    <div
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                        selected
                                          ? 'bg-blue-600 border-blue-600'
                                          : 'border-slate-300'
                                      }`}
                                    >
                                      {selected && (
                                        <Check
                                          size={12}
                                          className="text-white"
                                        />
                                      )}
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                                      {tm.email[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm text-slate-800 truncate">
                                      {tm.email}
                                    </span>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium ml-auto flex-shrink-0">
                                      {tm.role}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* ══════════════════════════════════════════════════
   Reusable Manage Section (Streams, Uploads, Cohorts)
   ══════════════════════════════════════════════════ */
const ManageSection = ({
  title,
  assigned,
  unassignedList,
  selectedIds,
  toggleId,
  onAssign,
  onRemove,
  assignLoading,
  renderAssigned,
  renderUnassigned,
}) => (
  <div className="space-y-5">
    {/* Currently Assigned */}
    <div>
      <h4 className="text-sm font-medium text-slate-700 mb-2">
        Assigned {title} ({assigned.length})
      </h4>
      {assigned.length === 0 ? (
        <p className="text-sm text-slate-400 py-3 bg-slate-50 rounded-lg text-center">
          No {title.toLowerCase()} assigned yet — select from below to add
        </p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {assigned.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2"
            >
              {renderAssigned(item)}
              <button
                onClick={() => onRemove(item.id)}
                disabled={assignLoading}
                className="text-red-400 hover:text-red-600 text-xs font-medium flex-shrink-0 ml-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Unassigned — select with checkboxes */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-700">
          Unassigned {title} ({unassignedList.length})
        </h4>
        {selectedIds.length > 0 && (
          <button
            onClick={onAssign}
            disabled={assignLoading}
            className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {assignLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Add {selectedIds.length} selected
          </button>
        )}
      </div>
      {unassignedList.length === 0 ? (
        <div className="py-4 bg-slate-50 rounded-lg text-center">
          <p className="text-sm text-slate-400">
            No unassigned {title.toLowerCase()} available
          </p>
          <p className="text-xs text-slate-400 mt-1">
            All your {title.toLowerCase()} are either already assigned to an
            organization, or you haven't created any yet.
          </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {unassignedList.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleId(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selected
                    ? 'bg-blue-50 border border-blue-300'
                    : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300'
                  }`}
                >
                  {selected && <Check size={12} className="text-white" />}
                </div>
                {renderUnassigned(item)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export default OrganizationsPage;
