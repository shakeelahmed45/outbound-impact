import { useEffect, useState } from 'react';
import { Search, Edit, Trash2, Filter, Shield, Mail, Users, AlertCircle, X, Copy, Check } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm,
          role: roleFilter
        }
      });
      
      if (response.data.status === 'success') {
        setUsers(response.data.users);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.status === 'success') {
        alert('User deleted successfully');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  // ✅ NEW: Remove user from team
  const handleRemoveFromTeam = async (teamMemberId, userEmail, orgName) => {
    if (!confirm(`Remove ${userEmail} from ${orgName}'s team? This will restore their personal account access.`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/team-members/${teamMemberId}`);
      if (response.data.status === 'success') {
        alert(`✅ User removed from team! ${userEmail} can now access their personal account.`);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to remove from team:', error);
      alert('Failed to remove user from team');
    }
  };

  // ✅ NEW: Send password reset
  const handlePasswordReset = async (userId, userEmail) => {
    if (!confirm(`Generate password reset link for ${userEmail}?`)) {
      return;
    }

    try {
      const response = await api.post(`/admin/users/${userId}/password-reset`);
      if (response.data.status === 'success') {
        setResetLink(response.data.resetLink);
        setShowResetModal(true);
      }
    } catch (error) {
      console.error('Failed to generate reset link:', error);
      alert('Failed to generate password reset link');
    }
  };

  const copyResetLink = () => {
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatStorage = (bytes) => {
    if (!bytes || bytes === '0') return '0.00 GB';
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      INDIVIDUAL: 'bg-blue-100 text-blue-800',
      ORG_SMALL: 'bg-green-100 text-green-800',
      ORG_MEDIUM: 'bg-purple-100 text-purple-800',
      ORG_ENTERPRISE: 'bg-yellow-100 text-yellow-800',
      ADMIN: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // ✅ NEW: Get team status badge
  const getTeamStatusBadge = (status) => {
    const badges = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      ACCEPTED: { color: 'bg-green-100 text-green-800', text: 'Active' },
      INACTIVE: { color: 'bg-gray-100 text-gray-600', text: 'Inactive' },
      DECLINED: { color: 'bg-red-100 text-red-800', text: 'Declined' }
    };
    return badges[status] || badges.PENDING;
  };

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage all platform users and team memberships</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                <option value="">All Roles</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORG_SMALL">Small Org</option>
                <option value="ORG_MEDIUM">Medium Org</option>
                <option value="ORG_ENTERPRISE">Enterprise</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Storage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Content</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Team Membership</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('ORG_', '')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {formatStorage(user.storageUsed)}
                          </p>
                          <p className="text-xs text-gray-500">
                            of {formatStorage(user.storageLimit)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {user._count.campaigns} campaigns
                          </p>
                          <p className="text-gray-500">
                            {user._count.items} items
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.memberOf && user.memberOf.length > 0 ? (
                          <div className="space-y-2">
                            {user.memberOf.map((membership) => {
                              const badge = getTeamStatusBadge(membership.status);
                              return (
                                <div key={membership.id} className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Users size={14} className="text-blue-600" />
                                      <span className="text-xs font-semibold text-blue-900">
                                        {membership.user.name}
                                      </span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                                      {badge.text}
                                    </span>
                                  </div>
                                  <p className="text-xs text-blue-700 mb-1">
                                    Role: {membership.role}
                                  </p>
                                  {membership.status === 'ACCEPTED' && (
                                    <button
                                      onClick={() => handleRemoveFromTeam(
                                        membership.id,
                                        user.email,
                                        membership.user.name
                                      )}
                                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                      title="Remove from team and restore personal access"
                                    >
                                      <Shield size={12} />
                                      Restore Personal Access
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No team memberships</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePasswordReset(user.id, user.email)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send password reset link"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Password Reset Link</h3>
                    <p className="text-sm text-gray-600">Valid for 1 hour</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetLink('');
                    setCopied(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2 font-semibold">Reset Link:</p>
                <div className="bg-white border border-gray-300 rounded-lg p-3 break-all text-sm text-gray-800 font-mono">
                  {resetLink}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyResetLink}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetLink('');
                    setCopied(false);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> This link expires in 1 hour. Send it to the user via email or secure channel.
                  </p>
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
