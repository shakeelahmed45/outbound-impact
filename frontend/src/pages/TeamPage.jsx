import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, AlertCircle, Loader2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const TeamPage = () => {
  const { user, setUser } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'VIEWER',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      if (userRes.data.status === 'success') {
        setUser(userRes.data.user);
        
        const userRole = userRes.data.user.role;
        if (userRole === 'ORG_SMALL' || userRole === 'ORG_MEDIUM' || userRole === 'ORG_ENTERPRISE') {
          await fetchTeamMembers();
        }
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
        setFormData({ email: '', role: 'VIEWER' });
        alert('✅ Team member invited successfully! Invitation email sent.');
      }
    } catch (error) {
      console.error('Failed to invite team member:', error);
      setError(error.response?.data?.message || 'Failed to invite team member');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (id) => {
    setResendingId(id);
    try {
      const response = await api.post(`/team/${id}/resend`);
      if (response.data.status === 'success') {
        alert('✅ Invitation resent successfully!');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert('❌ Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await api.delete('/team/' + id);
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      alert('✅ Team member removed successfully!');
    } catch (error) {
      console.error('Failed to remove team member:', error);
      alert('❌ Failed to remove team member');
    }
  };

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

  const isOrganization = user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="text-gray-600">Loading team data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isOrganization) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3">Team Features Not Available</h3>
            <p className="text-secondary mb-2">
              Team management is available for Small Organization, Medium Organization, and Enterprise plans.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Current Plan: <span className="font-semibold text-primary">{user?.role || 'INDIVIDUAL'}</span>
            </p>
            <a
              href="/plans"
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:shadow-lg transition-all"
            >
              View Plans & Upgrade
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Team Management</h1>
            <p className="text-secondary">Manage your team members and permissions</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
          >
            <UserPlus size={20} />
            Invite Member
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {teamMembers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3">No Team Members Yet</h3>
            <p className="text-secondary mb-6">
              Invite team members to collaborate on your content.
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 hover:shadow-lg transition-all"
            >
              <UserPlus size={20} />
              Invite Your First Member
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Member</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Invited</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                            {member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.email}</p>
                            <p className="text-xs text-gray-500">Team Member</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-primary rounded-full text-sm font-medium">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {member.status === 'PENDING' && (
                            <button
                              onClick={() => handleResend(member.id)}
                              disabled={resendingId === member.id}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors text-sm disabled:opacity-50"
                              title="Resend invitation"
                            >
                              {resendingId === member.id ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                <RefreshCw size={16} />
                              )}
                              Resend
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(member.id)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors text-sm"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Mail size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary">Invite Team Member</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 ml-15">
                Send a professional invitation email with a secure link
              </p>
              
              <form onSubmit={handleInvite}>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="colleague@company.com"
                      required
                      disabled={inviting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={inviting}
                    >
                      <option value="VIEWER">👁️ Viewer - Can view content</option>
                      <option value="EDITOR">✏️ Editor - Can edit content</option>
                      <option value="ADMIN">👑 Admin - Full access</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>📧 Email will include:</strong> Professional invitation with your logo, role details, and a secure acceptance link that expires in 7 days.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setFormData({ email: '', role: 'VIEWER' });
                      setError('');
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    disabled={inviting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={inviting}
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;