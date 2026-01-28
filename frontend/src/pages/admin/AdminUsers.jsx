import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Trash2, Shield, Users, X, Copy, Check, Eye, Ban, Unlock, 
  Download, RefreshCw, UserCheck, HardDrive, ChevronDown, CheckSquare,
  Filter, Activity, Calendar, Edit, Lock, AlertCircle, TrendingUp,
  FileText, Folder, Clock, DollarSign
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    subscriptionStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Modals
  const [showFilters, setShowFilters] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserPreview, setShowUserPreview] = useState(false);
  
  // Modal data
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [storageLimit, setStorageLimit] = useState('');
  const [newRole, setNewRole] = useState('');
  const [userActivity, setUserActivity] = useState([]);
  
  // Loading states
  const [actionLoading, setActionLoading] = useState({});
  
  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, filters, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm,
          sortBy,
          sortOrder,
          ...filters
        }
      });
      
      if (response.data.status === 'success') {
        setUsers(response.data.users);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // TOAST NOTIFICATION
  // ═══════════════════════════════════════════════════════════
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // ═══════════════════════════════════════════════════════════
  // BULK ACTIONS
  // ═══════════════════════════════════════════════════════════
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      showToast('Please select an action and at least one user', 'error');
      return;
    }

    const confirmMessage = `Are you sure you want to ${bulkAction} ${selectedUsers.length} user(s)?`;
    if (!confirm(confirmMessage)) return;

    setActionLoading({ bulk: true });
    try {
      const response = await api.post('/admin/users/bulk-action', {
        action: bulkAction,
        userIds: selectedUsers
      });

      if (response.data.status === 'success') {
        showToast(`✅ ${response.data.message}`, 'success');
        setSelectedUsers([]);
        setBulkAction('');
        setShowBulkModal(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      showToast('Bulk action failed', 'error');
    } finally {
      setActionLoading({ bulk: false });
    }
  };

  // ═══════════════════════════════════════════════════════════
  // USER ACTIONS
  // ═══════════════════════════════════════════════════════════
  const handleViewDetails = (userId) => {
    navigate(`/admin-panel/users/${userId}`);
  };

  const handleViewPreview = async (user) => {
    setSelectedUser(user);
    setShowUserPreview(true);
    
    // Fetch recent activity
    try {
      const response = await api.get(`/admin/users/${user.id}/activity`);
      if (response.data.status === 'success') {
        setUserActivity(response.data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const handleSuspendUser = async (userId, currentStatus, userEmail) => {
    const action = currentStatus === 'suspended' ? 'unsuspend' : 'suspend';
    const confirmMsg = currentStatus === 'suspended' 
      ? `Unsuspend ${userEmail}? They will regain access.`
      : `Suspend ${userEmail}? They will be blocked from the platform.`;
    
    if (!confirm(confirmMsg)) return;

    setActionLoading({ [userId]: 'suspend' });
    try {
      const response = await api.post(`/admin/users/${userId}/suspend`, {
        suspend: action === 'suspend'
      });

      if (response.data.status === 'success') {
        showToast(`✅ User ${action}ed successfully`, 'success');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
      showToast('Failed to suspend user', 'error');
    } finally {
      setActionLoading({ [userId]: false });
    }
  };

  const handleBanUser = async (userId, userEmail) => {
    const reason = prompt(`Ban ${userEmail} permanently?\n\nEnter reason for ban:`);
    if (!reason) return;

    setActionLoading({ [userId]: 'ban' });
    try {
      const response = await api.post(`/admin/users/${userId}/ban`, { reason });

      if (response.data.status === 'success') {
        showToast('✅ User banned permanently', 'success');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      showToast('Failed to ban user', 'error');
    } finally {
      setActionLoading({ [userId]: false });
    }
  };

  const handleImpersonateUser = async (userId, userEmail) => {
    if (!confirm(`Login as ${userEmail}?\n\nYou will be logged in as this user in a new tab.`)) {
      return;
    }

    setActionLoading({ [userId]: 'impersonate' });
    try {
      const response = await api.post(`/admin/users/${userId}/impersonate`);
      
      if (response.data.status === 'success') {
        const impersonateUrl = `${window.location.origin}/admin/impersonate?token=${response.data.token}`;
        window.open(impersonateUrl, '_blank');
        showToast('✅ Opened user session in new tab', 'success');
      }
    } catch (error) {
      console.error('Failed to impersonate user:', error);
      showToast('Failed to impersonate user', 'error');
    } finally {
      setActionLoading({ [userId]: false });
    }
  };

  const handleDelete = async (userId, userEmail) => {
    const confirmation = prompt(
      `⚠️ DELETE ${userEmail}?\n\nThis will permanently delete:\n- User account\n- All items\n- All campaigns\n- All files\n\nType "DELETE" to confirm:`
    );
    
    if (confirmation !== 'DELETE') return;

    setActionLoading({ [userId]: 'delete' });
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.status === 'success') {
        showToast('✅ User deleted successfully', 'success');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setActionLoading({ [userId]: false });
    }
  };

  const handlePasswordReset = async (userId, userEmail) => {
    if (!confirm(`Generate password reset link for ${userEmail}?`)) {
      return;
    }

    setActionLoading({ [userId]: 'reset' });
    try {
      const response = await api.post(`/admin/users/${userId}/password-reset`);
      if (response.data.status === 'success') {
        setResetLink(response.data.resetLink);
        setShowResetModal(true);
      }
    } catch (error) {
      console.error('Failed to generate reset link:', error);
      showToast('Failed to generate password reset link', 'error');
    } finally {
      setActionLoading({ [userId]: false });
    }
  };

  const handleRemoveFromTeam = async (teamMemberId, userEmail, orgName) => {
    if (!confirm(`Remove ${userEmail} from ${orgName}'s team?`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/team-members/${teamMemberId}`);
      if (response.data.status === 'success') {
        showToast(`✅ User removed from team!`, 'success');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to remove from team:', error);
      showToast('Failed to remove user from team', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // STORAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  const handleAdjustStorage = (user) => {
    setSelectedUser(user);
    setStorageLimit((Number(user.storageLimit) / (1024 * 1024 * 1024)).toFixed(2));
    setShowStorageModal(true);
  };

  const handleSaveStorage = async () => {
    if (!storageLimit || isNaN(storageLimit)) {
      showToast('Please enter a valid storage limit', 'error');
      return;
    }

    try {
      const bytes = Math.round(parseFloat(storageLimit) * 1024 * 1024 * 1024);
      const response = await api.put(`/admin/users/${selectedUser.id}/storage`, {
        storageLimit: bytes.toString()
      });
      
      if (response.data.status === 'success') {
        showToast('✅ Storage limit updated', 'success');
        setShowStorageModal(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update storage:', error);
      showToast('Failed to update storage limit', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ROLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  const handleChangeRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!newRole || newRole === selectedUser.role) {
      showToast('Please select a different role', 'error');
      return;
    }

    try {
      const response = await api.put(`/admin/users/${selectedUser.id}`, {
        role: newRole
      });
      
      if (response.data.status === 'success') {
        showToast('✅ User role updated', 'success');
        setShowRoleModal(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast('Failed to update user role', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════
  const handleExportUsers = async () => {
    try {
      const response = await api.get('/admin/users/export', {
        params: { ...filters, search: searchTerm },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('✅ Users exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export users:', error);
      showToast('Failed to export users', 'error');
    }
  };

  const handleExportSelected = async () => {
    if (selectedUsers.length === 0) {
      showToast('Please select users to export', 'error');
      return;
    }

    try {
      const response = await api.post('/admin/users/export-selected', {
        userIds: selectedUsers
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_selected_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`✅ ${selectedUsers.length} users exported`, 'success');
    } catch (error) {
      console.error('Failed to export selected:', error);
      showToast('Failed to export selected users', 'error');
    }
  };

  const copyResetLink = () => {
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════
  const formatStorage = (bytes) => {
    if (!bytes || bytes === '0') return '0.00 GB';
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'INDIVIDUAL': 'bg-blue-100 text-blue-800',
      'ORG_SMALL': 'bg-green-100 text-green-800',
      'ORG_MEDIUM': 'bg-purple-100 text-purple-800',
      'ORG_ENTERPRISE': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : status === 'suspended'
      ? 'bg-red-100 text-red-800'
      : status === 'banned'
      ? 'bg-red-900 text-white'
      : 'bg-gray-100 text-gray-800';
  };

  const getRoleName = (role) => {
    const names = {
      'INDIVIDUAL': 'Individual',
      'ORG_SMALL': 'Small Org',
      'ORG_MEDIUM': 'Medium Org',
      'ORG_ENTERPRISE': 'Enterprise'
    };
    return names[role] || role;
  };

  const getStoragePercent = (used, limit) => {
    if (!limit || limit === '0' || Number(limit) === 0) return '0.0';
    const percent = ((Number(used) / Number(limit)) * 100).toFixed(1);
    return percent;
  };

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white flex items-center gap-2 animate-fade-in`}>
            {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">
              {pagination.total} total users • {selectedUsers.length} selected
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={16} />
              Filters
              {Object.values(filters).some(v => v) && (
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
              )}
            </button>
            
            <button
              onClick={handleExportUsers}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download size={16} />
              Export
            </button>
            
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Plans</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ORG_SMALL">Small Org</option>
                  <option value="ORG_MEDIUM">Medium Org</option>
                  <option value="ORG_ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription</label>
                <select
                  value={filters.subscriptionStatus}
                  onChange={(e) => setFilters({ ...filters, subscriptionStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Subscriptions</option>
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="storageUsed-desc">Storage: High to Low</option>
                  <option value="storageUsed-asc">Storage: Low to High</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setFilters({ role: '', status: '', subscriptionStatus: '', dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-purple-900 font-medium">
                {selectedUsers.length} user(s) selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Select action...</option>
                <option value="suspend">Suspend Users</option>
                <option value="unsuspend">Unsuspend Users</option>
                <option value="delete">Delete Users</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || actionLoading.bulk}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.bulk ? 'Processing...' : 'Apply'}
              </button>
              <button
                onClick={handleExportSelected}
                className="px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50"
              >
                <Download size={16} className="inline mr-2" />
                Export Selected
              </button>
            </div>
            <button
              onClick={() => setSelectedUsers([])}
              className="text-purple-600 hover:text-purple-800"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Storage</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Content</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => {
                  const storagePercent = getStoragePercent(user.storageUsed, user.storageLimit);
                  const isLoading = actionLoading[user.id];
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="text-purple-600" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.memberOf && user.memberOf.length > 0 && (
                              <p className="text-xs text-purple-600 mt-1">
                                Team: {user.memberOf[0].user.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(user.subscriptionStatus)}`}>
                          {user.subscriptionStatus || 'none'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{formatStorage(user.storageUsed)}</p>
                          <p className="text-gray-500 text-xs">of {formatStorage(user.storageLimit)}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                storagePercent > 90 ? 'bg-red-500' :
                                storagePercent > 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(storagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-900">
                            <FileText size={14} />
                            <span>{user._count?.items || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <Folder size={14} />
                            <span>{user._count?.campaigns || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        {user.lastLoginAt && (
                          <p className="text-xs text-gray-500">
                            Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => handleViewDetails(user.id)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="View Full Details"
                            disabled={isLoading}
                          >
                            <Eye size={16} />
                          </button>

                          {/* Quick Preview */}
                          <button
                            onClick={() => handleViewPreview(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Quick Preview"
                            disabled={isLoading}
                          >
                            <Activity size={16} />
                          </button>
                          
                          {/* Impersonate */}
                          <button
                            onClick={() => handleImpersonateUser(user.id, user.email)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Login as User"
                            disabled={isLoading}
                          >
                            {isLoading === 'impersonate' ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>

                          {/* Suspend/Unsuspend */}
                          <button
                            onClick={() => handleSuspendUser(user.id, user.status, user.email)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title={user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                            disabled={isLoading}
                          >
                            {isLoading === 'suspend' ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : user.status === 'suspended' ? (
                              <Unlock size={16} />
                            ) : (
                              <Ban size={16} />
                            )}
                          </button>

                          {/* Storage */}
                          <button
                            onClick={() => handleAdjustStorage(user)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"
                            title="Adjust Storage"
                            disabled={isLoading}
                          >
                            <HardDrive size={16} />
                          </button>

                          {/* Role */}
                          <button
                            onClick={() => handleChangeRole(user)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="Change Role"
                            disabled={isLoading}
                          >
                            <Edit size={16} />
                          </button>

                          {/* Password Reset */}
                          <button
                            onClick={() => handlePasswordReset(user.id, user.email)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Reset Password"
                            disabled={isLoading}
                          >
                            {isLoading === 'reset' ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Shield size={16} />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(user.id, user.email)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete User"
                            disabled={isLoading}
                          >
                            {isLoading === 'delete' ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* MODALS - Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Password Reset Link</h2>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Share this link with the user. It will expire in 1 hour.
              </p>
              
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={resetLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={copyResetLink}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              
              {copied && (
                <p className="text-green-600 text-sm">✅ Link copied to clipboard!</p>
              )}
            </div>
          </div>
        )}

        {/* Storage Modal */}
        {showStorageModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Adjust Storage Limit</h2>
                <button onClick={() => setShowStorageModal(false)}>
                  <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User: {selectedUser.email}</p>
                <p className="text-sm text-gray-600 mb-4">
                  Current: {formatStorage(selectedUser.storageUsed)} / {formatStorage(selectedUser.storageLimit)}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Storage Limit (GB)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={storageLimit}
                  onChange={(e) => setStorageLimit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 10.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 2 GB (Individual), 5 GB (Small), 10 GB (Medium), 50 GB (Enterprise)
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveStorage}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowStorageModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Change User Role</h2>
                <button onClick={() => setShowRoleModal(false)}>
                  <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">User: {selectedUser.email}</p>
                <p className="text-sm text-gray-600 mb-4">
                  Current Role: {getRoleName(selectedUser.role)}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ORG_SMALL">Small Organization</option>
                  <option value="ORG_MEDIUM">Medium Organization</option>
                  <option value="ORG_ENTERPRISE">Enterprise</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveRole}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Preview Modal */}
        {showUserPreview && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                    <p className="text-gray-600">{selectedUser.email}</p>
                  </div>
                  <button onClick={() => setShowUserPreview(false)}>
                    <X size={24} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="text-blue-600" size={20} />
                      <span className="text-sm text-gray-600">Items</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{selectedUser._count?.items || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="text-purple-600" size={20} />
                      <span className="text-sm text-gray-600">Campaigns</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{selectedUser._count?.campaigns || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="text-green-600" size={20} />
                      <span className="text-sm text-gray-600">Storage</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">{getStoragePercent(selectedUser.storageUsed, selectedUser.storageLimit)}%</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity size={20} className="text-purple-600" />
                    Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userActivity.length > 0 ? (
                      userActivity.map((activity, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                          <Clock size={16} className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowUserPreview(false);
                      handleViewDetails(selectedUser.id);
                    }}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    View Full Details
                  </button>
                  <button
                    onClick={() => setShowUserPreview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
