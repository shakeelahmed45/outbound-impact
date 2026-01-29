import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, RefreshCw, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const TeamManagementPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'CUSTOMER_SUPPORT' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invitations
      const invRes = await api.get('/team-invitation/invitations');
      if (invRes.data.status === 'success') {
        setInvitations(invRes.data.invitations);
      }

      // Fetch team members
      const membersRes = await api.get('/team-invitation/members');
      if (membersRes.data.status === 'success') {
        setTeamMembers(membersRes.data.teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api.post('/team-invitation/invite', formData);
      
      if (response.data.status === 'success') {
        alert(`Invitation sent to ${formData.email}!`);
        setFormData({ email: '', role: 'CUSTOMER_SUPPORT' });
        setShowInviteModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await api.post(`/team-invitation/invitations/${invitationId}/resend`);
      alert('Invitation resent!');
      fetchData();
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert('Failed to resend invitation');
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!confirm('Delete this invitation?')) return;

    try {
      await api.delete(`/team-invitation/invitations/${invitationId}`);
      alert('Invitation deleted!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      alert('Failed to delete invitation');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this team member? They will lose admin access.')) return;

    try {
      await api.delete(`/team-invitation/members/${userId}`);
      alert('Team member removed!');
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
              <UserPlus size={32} />
              Team Management
            </h1>
            <p className="text-secondary">Invite and manage admin team members</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <UserPlus size={20} />
            Invite Team Member
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users size={24} className="text-gray-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">{teamMembers.length}</p>
            <p className="text-sm text-gray-600">Total Team Members</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Mail size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">
              {invitations.filter(i => i.status === 'PENDING').length}
            </p>
            <p className="text-sm opacity-90">Pending Invitations</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">
              {teamMembers.filter(m => m.role === 'ADMIN').length}
            </p>
            <p className="text-sm opacity-90">Full Admins</p>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={24} />
            Active Team Members
          </h2>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">{member.name}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{member.email}</td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          member.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role === 'ADMIN' ? 'Admin' : 'Customer Support'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          member.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Mail size={24} />
            Pending Invitations
          </h2>
          
          {invitations.filter(i => i.status === 'PENDING').length === 0 ? (
            <div className="text-center py-12">
              <Mail size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations
                .filter(i => i.status === 'PENDING')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium text-gray-800">{invitation.email}</p>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          invitation.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invitation.role === 'ADMIN' ? 'Admin' : 'Customer Support'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Sent {formatDate(invitation.createdAt)}
                        </span>
                        <span>Expires {formatDate(invitation.expiresAt)}</span>
                        <span className="text-gray-400">
                          Invited by {invitation.inviter.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendInvitation(invitation.id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Resend invitation"
                      >
                        <RefreshCw size={16} />
                        Resend
                      </button>
                      <button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete invitation"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Invite Team Member</h2>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="CUSTOMER_SUPPORT">Customer Support (Live Chat Only)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'ADMIN' 
                    ? 'Full access to all admin features'
                    : 'Limited to Live Chat management only'
                  }
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default TeamManagementPage;
