import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Trash2, AlertCircle, Loader2, RefreshCw, Clock, CheckCircle, XCircle, X, Edit2, ArrowUpCircle, MessageSquare, ShieldAlert } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Toast from '../components/common/Toast';
import useAuthStore, { canManageTeam } from '../store/authStore';
import api from '../services/api';

const TeamPage = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  // ✅ VIEWER + EDITOR cannot access team management
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
              Only the account owner or team admins can manage contributors.
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
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [updatingRoleId, setUpdatingRoleId] = useState(null); // ✅ NEW: Track which member's role is being updated
  const [formData, setFormData] = useState({
    email: '',
    role: 'VIEWER',
    message: '',
  });
  const [error, setError] = useState('');
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [approvingRequestId, setApprovingRequestId] = useState(null);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  // Individual plan: 2-contributor limit
  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const isIndividual = effectiveUser?.role === 'INDIVIDUAL';
  const INDIVIDUAL_CONTRIBUTOR_LIMIT = 2;
  const individualLimitReached = isIndividual && teamMembers.length >= INDIVIDUAL_CONTRIBUTOR_LIMIT;

  useEffect(() => {
    document.title = 'Contributors Management | Outbound Impact';
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      if (userRes.data.status === 'success') {
        setUser(userRes.data.user);
        await fetchTeamMembers();
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/team');
      if (response.data.status === 'success') {
        setTeamMembers(response.data.teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setInviting(true);

    try {
      const response = await api.post('/team/invite', formData);
      if (response.data.status === 'success') {
        setTeamMembers([response.data.teamMember, ...teamMembers]);
        setShowInviteModal(false);
        setFormData({ email: '', role: 'VIEWER', message: '' });
        showToast('Contributor invited successfully! Invitation email sent.', 'success');
      }
    } catch (error) {
      console.error('Failed to invite contributor:', error);
      
      const errorData = error.response?.data;
      if (errorData?.code === 'EMAIL_ALREADY_REGISTERED') {
        setShowWarningPopup(true);
      } else {
        setError(errorData?.message || 'Failed to invite contributor');
      }
    } finally {
      setInviting(false);
    }
  };

  // ✅ NEW: Handle role change
  const handleRoleChange = async (memberId, newRole, currentRole) => {
    // Don't update if role hasn't changed
    if (newRole === currentRole) return;

    setUpdatingRoleId(memberId);
    
    try {
      const response = await api.put(`/team/${memberId}/role`, { role: newRole });
      
      if (response.data.status === 'success') {
        // Update local state
        setTeamMembers(teamMembers.map(member => 
          member.id === memberId 
            ? { ...member, role: newRole }
            : member
        ));
        
        showToast(`Role updated to ${newRole} successfully!`, 'success');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      showToast(
        error.response?.data?.message || 'Failed to update role. Please try again.', 
        'error'
      );
      
      // Revert the change in UI by re-fetching
      fetchTeamMembers();
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleResend = async (id) => {
    setResendingId(id);
    try {
      const response = await api.post(`/team/${id}/resend`);
      if (response.data.status === 'success') {
        showToast('Invitation resent successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      showToast('Failed to resend invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleRemove = (member) => {
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    try {
      await api.delete('/team/' + memberToDelete.id);
      setTeamMembers(teamMembers.filter(m => m.id !== memberToDelete.id));
      showToast('Team member removed successfully!', 'success');
    } catch (error) {
      console.error('Failed to remove team member:', error);
      showToast('Failed to remove team member', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setMemberToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setMemberToDelete(null);
  };

  // ✅ Approve role request (change role + clear request)
  const handleApproveRequest = async (member) => {
    setApprovingRequestId(member.id);
    try {
      // First update the role
      const roleRes = await api.put(`/team/${member.id}/role`, { role: member.requestedRole });
      if (roleRes.data.status === 'success') {
        // Then dismiss the request
        await api.post(`/team/${member.id}/dismiss-request`);
        // Update local state
        setTeamMembers(teamMembers.map(m =>
          m.id === member.id
            ? { ...m, role: member.requestedRole, roleChangeRequested: false, requestedRole: null, roleChangeNote: null, roleChangeRequestedAt: null }
            : m
        ));
        showToast(`${member.email} upgraded to ${member.requestedRole}!`, 'success');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      showToast('Failed to approve request', 'error');
    } finally {
      setApprovingRequestId(null);
    }
  };

  // ✅ Dismiss role request (clear without changing role)
  const handleDismissRequest = async (memberId) => {
    setDismissingId(memberId);
    try {
      await api.post(`/team/${memberId}/dismiss-request`);
      setTeamMembers(teamMembers.map(m =>
        m.id === memberId
          ? { ...m, roleChangeRequested: false, requestedRole: null, roleChangeNote: null, roleChangeRequestedAt: null }
          : m
      ));
      showToast('Request dismissed', 'success');
    } catch (error) {
      console.error('Failed to dismiss request:', error);
      showToast('Failed to dismiss request', 'error');
    } finally {
      setDismissingId(null);
    }
  };

  // Filter members with pending role requests
  const pendingRequests = teamMembers.filter(m => m.roleChangeRequested);

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: {
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800',
        text: 'Pending'
      },
      ACCEPTED: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800',
        text: 'Accepted'
      },
      DECLINED: {
        icon: XCircle,
        color: 'bg-red-100 text-red-800',
        text: 'Declined'
      }
    };

    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  // ✅ NEW: Get role icon
  const getRoleIcon = (role) => {
    const icons = {
      VIEWER: '👁️',
      EDITOR: '✏️',
      ADMIN: '👑'
    };
    return icons[role] || '👤';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-gray-600">Loading contributors data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

      <div className="space-y-6">
        {/* Header Section - Fully Responsive */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">
              Contributors Management
            </h1>
            <p className="text-sm sm:text-base text-secondary">
              Manage your team members and permissions
            </p>
          </div>
          <button
            onClick={() => {
              if (individualLimitReached) {
                showToast('Contributor limit reached on Personal plan (2 max). Upgrade to invite more!', 'error');
                return;
              }
              setShowInviteModal(true);
              setError('');
            }}
            className={`text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base whitespace-nowrap ${
              individualLimitReached ? 'bg-orange-500 hover:bg-orange-600' : 'gradient-btn'
            }`}
          >
            <UserPlus size={18} className="sm:w-5 sm:h-5" />
            {individualLimitReached ? 'Upgrade to Add More' : 'Invite Contributor'}
          </button>
        </div>

        {/* Individual plan limit info */}
        {isIndividual && (
          <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 mb-4">
            <p className="text-sm text-purple-700">
              <strong>{teamMembers.length}/{INDIVIDUAL_CONTRIBUTOR_LIMIT}</strong> contributors used on Personal plan
              {individualLimitReached && <span className="ml-2 text-orange-600 font-medium">• Limit reached</span>}
            </p>
            {individualLimitReached && (
              <button onClick={() => window.location.href = '/dashboard/settings'} className="text-sm font-medium text-purple-600 hover:text-purple-700">
                Upgrade →
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            ROLE CHANGE REQUESTS — Shown to org owner
           ═══════════════════════════════════════════════ */}
        {pendingRequests.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowUpCircle size={18} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Role Change Requests</h3>
                <p className="text-xs text-gray-500">{pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingRequests.map((member) => {
                const roleIcons = { VIEWER: '👁️', EDITOR: '✏️', ADMIN: '👑' };
                const timeSince = (() => {
                  if (!member.roleChangeRequestedAt) return '';
                  const diff = Math.floor((Date.now() - new Date(member.roleChangeRequestedAt)) / 1000);
                  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                  return `${Math.floor(diff / 86400)}d ago`;
                })();

                return (
                  <div key={member.id} className="bg-white rounded-lg border border-orange-100 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Member info */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {member.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{member.email}</p>
                          <p className="text-xs text-gray-500">
                            {roleIcons[member.role]} {member.role} → {roleIcons[member.requestedRole]} <strong>{member.requestedRole}</strong>
                            {timeSince && <span className="ml-1 text-gray-400">• {timeSince}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Note */}
                      {member.roleChangeNote && (
                        <div className="flex items-start gap-1.5 bg-gray-50 rounded-lg px-3 py-2 sm:max-w-[280px]">
                          <MessageSquare size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-600 line-clamp-2">{member.roleChangeNote}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApproveRequest(member)}
                          disabled={approvingRequestId === member.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {approvingRequestId === member.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle size={12} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleDismissRequest(member.id)}
                          disabled={dismissingId === member.id}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {dismissingId === member.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <XCircle size={12} />
                          )}
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {teamMembers.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center border border-gray-100">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <UserPlus size={32} className="text-white sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-primary mb-2 sm:mb-3">No Team Members Yet</h3>
            <p className="text-sm sm:text-base text-secondary mb-4 sm:mb-6">
              Invite contributor to collaborate on your content.
            </p>
            <button
              onClick={() => {
                setShowInviteModal(true);
                setError('');
              }}
              className="gradient-btn text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base"
            >
              <UserPlus size={18} className="sm:w-5 sm:h-5" />
              Invite Your First Contributor
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-700">Member</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-700">Invited</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm lg:text-base flex-shrink-0">
                            {member.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{member.email}</p>
                            <p className="text-xs text-gray-500">Team Member</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        {/* ✅ NEW: Editable Role Dropdown */}
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value, member.role)}
                            disabled={updatingRoleId === member.id}
                            className={`
                              px-3 py-1.5 pr-8 bg-purple-50 text-primary rounded-lg text-xs lg:text-sm font-medium 
                              border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none 
                              cursor-pointer transition-all appearance-none
                              ${updatingRoleId === member.id ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23800080'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1rem'
                            }}
                          >
                            <option value="VIEWER">👁️ Viewer</option>
                            <option value="EDITOR">✏️ Editor</option>
                            <option value="ADMIN">👑 Admin</option>
                          </select>
                          {updatingRoleId === member.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <Loader2 className="animate-spin text-primary" size={14} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-gray-600 text-xs lg:text-sm">
                        {new Date(member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          {member.status === 'PENDING' && (
                            <button
                              onClick={() => handleResend(member.id)}
                              disabled={resendingId === member.id}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors text-xs lg:text-sm disabled:opacity-50"
                              title="Resend invitation"
                            >
                              {resendingId === member.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                              <span className="hidden lg:inline">Resend</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(member)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors text-xs lg:text-sm"
                          >
                            <Trash2 size={14} />
                            <span className="hidden lg:inline">Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - Hidden on Desktop */}
            <div className="md:hidden divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Member Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {member.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm break-all">{member.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Team Member</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Role - Editable */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Role</p>
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value, member.role)}
                          disabled={updatingRoleId === member.id}
                          className={`
                            w-full px-3 py-1.5 pr-8 bg-purple-50 text-primary rounded-lg text-sm font-medium
                            border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none
                            cursor-pointer transition-all appearance-none
                            ${updatingRoleId === member.id ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23800080'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            backgroundSize: '1rem'
                          }}
                        >
                          <option value="VIEWER">👁️ Viewer</option>
                          <option value="EDITOR">✏️ Editor</option>
                          <option value="ADMIN">👑 Admin</option>
                        </select>
                        {updatingRoleId === member.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-primary" size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                      {getStatusBadge(member.status)}
                    </div>
                  </div>

                  {/* Invited Date */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Invited</p>
                    <p className="text-sm text-gray-600">
                      {new Date(member.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {member.status === 'PENDING' && (
                      <button
                        onClick={() => handleResend(member.id)}
                        disabled={resendingId === member.id}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors text-sm disabled:opacity-50"
                      >
                        {resendingId === member.id ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            <span>Resend</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(member)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors text-sm"
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple Warning Popup */}
        {showWarningPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Email Already Registered</h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarningPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-700 mb-6">
                This email is already registered. Please use a different email ID.
              </p>
              <button
                onClick={() => setShowWarningPopup(false)}
                className="w-full gradient-btn text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && memberToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Remove Team Member?</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to remove <strong>{memberToDelete.email}</strong> from your team?
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  ⚠️ This action cannot be undone. The team member will lose access immediately.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Individual plan upgrade banner */}
        {isIndividual && (
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-xl mb-1">Ready to grow?</h3>
                <p className="text-blue-100 text-sm">Upgrade to Small Business for more contributors, team messaging, advanced analytics, and more!</p>
              </div>
              <button onClick={() => window.location.href = '/dashboard/settings'} className="px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-slate-100 transition-colors flex-shrink-0">Upgrade Now</button>
            </div>
          </div>
        )}

        {/* ✅ SUPER RESPONSIVE INVITE MODAL - GUARANTEED TO WORK ON ALL DEVICES */}
{showInviteModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
    {/* Modal Container - AGGRESSIVE height constraints */}
    <div 
      className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col" 
      style={{ 
        maxHeight: 'calc(100vh - 3rem)',
        height: 'auto'
      }}
    >
      
      {/* Compact Header - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-3 sm:px-5 sm:py-4 rounded-t-xl sm:rounded-t-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
              <Mail size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold truncate">Invite Contributor</h2>
              <p className="text-purple-100 text-xs hidden sm:block">Send a professional invitation</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowInviteModal(false);
              setFormData({ email: '', role: 'VIEWER', message: '' });
              setError('');
            }}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-all flex-shrink-0"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content Area - COMPACT */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
        <form onSubmit={handleInvite} id="invite-form">
          
          {/* Error Alert - Compact */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 animate-shake">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            
            {/* Email Address Field - Compact */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="colleague@company.com"
                required
                disabled={inviting}
              />
            </div>

            {/* Role Field - Compact */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all appearance-none cursor-pointer"
                disabled={inviting}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23800080'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="VIEWER">👁️ Viewer - Can view content</option>
                <option value="EDITOR">✏️ Editor - Can edit content</option>
                <option value="ADMIN">👑 Admin - Full access</option>
              </select>
            </div>

            {/* Personal Message Field - Compact, fewer rows */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Personal Message (Optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all"
                placeholder="e.g., Would love you to add content and stories..."
                rows={2}
                disabled={inviting}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.message.length}/500 characters
              </p>
            </div>

          </div>
        </form>
      </div>

      {/* Compact Footer - Fixed at bottom with buttons */}
      <div className="flex-shrink-0 bg-gray-50 px-4 py-2.5 sm:py-3 rounded-b-xl sm:rounded-b-2xl border-t border-gray-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowInviteModal(false);
              setFormData({ email: '', role: 'VIEWER', message: '' });
              setError('');
            }}
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
            disabled={inviting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-form"
            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            disabled={inviting}
          >
            {inviting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span className="text-xs sm:text-sm">Sending...</span>
              </>
            ) : (
              <>
                <Mail size={14} />
                <span className="text-xs sm:text-sm">Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;