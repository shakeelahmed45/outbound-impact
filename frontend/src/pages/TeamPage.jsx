import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, AlertCircle, Loader2, RefreshCw, Clock, CheckCircle, XCircle, X } from 'lucide-react';
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
    message: '', // ✨ NEW: Custom invitation message
  });
  const [error, setError] = useState('');
  const [showWarningPopup, setShowWarningPopup] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      if (userRes.data.status === 'success') {
        setUser(userRes.data.user);
        // ✅ REMOVED RESTRICTION - Load team members for ALL users including INDIVIDUAL
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
        alert('✅ Contributor invited successfully! Invitation email sent.');
      }
    } catch (error) {
      console.error('Failed to invite contributor:', error);
      
      const errorData = error.response?.data;
      if (errorData?.code === 'EMAIL_ALREADY_REGISTERED') {
        // Show simple warning popup
        setShowWarningPopup(true);
      } else {
        setError(errorData?.message || 'Failed to invite contributor');
      }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section - Fully Responsive */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">
              Team Management
            </h1>
            <p className="text-sm sm:text-base text-secondary">
              Manage your team members and permissions
            </p>
          </div>
          <button
            onClick={() => {
              setShowInviteModal(true);
              setError('');
            }}
            className="gradient-btn text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm sm:text-base whitespace-nowrap"
          >
            <UserPlus size={18} className="sm:w-5 sm:h-5" />
            Invite Contributor
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800 font-medium">{error}</p>
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
                        <span className="px-2 lg:px-3 py-1 bg-purple-100 text-primary rounded-full text-xs lg:text-sm font-medium whitespace-nowrap">
                          {member.role}
                        </span>
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
                            onClick={() => handleRemove(member.id)}
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
                    {/* Role */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
                      <span className="inline-block px-2.5 py-1 bg-purple-100 text-primary rounded-full text-xs font-medium">
                        {member.role}
                      </span>
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
                      onClick={() => handleRemove(member.id)}
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

        {/* Invite Modal - Mobile Responsive */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-primary">Invite Contributor</h3>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 ml-13 sm:ml-15">
                Send a professional invitation email with a secure link
              </p>
              
              <form onSubmit={handleInvite}>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      placeholder="colleague@company.com"
                      required
                      disabled={inviting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                      disabled={inviting}
                    >
                      <option value="VIEWER">👁️ Viewer - Can view content</option>
                      <option value="EDITOR">✏️ Editor - Can edit content</option>
                      <option value="ADMIN">👑 Admin - Full access</option>
                    </select>
                  </div>

                  {/* ✨ Personal Message Field - Mobile Optimized */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm sm:text-base"
                      placeholder="e.g., Would love you to add content and stories about nan as we are putting together a memorial for her..."
                      rows={3}
                      disabled={inviting}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.message.length}/500 characters • Explain why you're inviting this person
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setFormData({ email: '', role: 'VIEWER', message: '' });
                      setError('');
                    }}
                    className="flex-1 px-4 py-2.5 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all text-sm sm:text-base"
                    disabled={inviting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 gradient-btn text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
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