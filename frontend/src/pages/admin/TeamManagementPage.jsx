import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, RefreshCw, Users, CheckCircle, Clock, Shield, X } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const TeamManagementPage = () => {
  const [invitations, setInvitations]     = useState([]);
  const [teamMembers, setTeamMembers]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData]           = useState({ email: '', role: 'CUSTOMER_SUPPORT' });
  const [submitting, setSubmitting]       = useState(false);
  const [toast, setToast]                 = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, membersRes] = await Promise.all([
        api.get('/team-invitation/invitations').catch(() => ({ data: { invitations: [] } })),
        api.get('/team-invitation/members').catch(() => ({ data: { teamMembers: [] } })),
      ]);
      if (invRes.data.status === 'success')     setInvitations(invRes.data.invitations || []);
      if (membersRes.data.status === 'success') setTeamMembers(membersRes.data.teamMembers || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: correct route is /admin-invite, not /invite
  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/team-invitation/admin-invite', formData);
      if (response.data.status === 'success') {
        showToast(`Invitation sent to ${formData.email}!`);
        setFormData({ email: '', role: 'CUSTOMER_SUPPORT' });
        setShowInviteModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send invitation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await api.post(`/team-invitation/invitations/${invitationId}/resend`);
      showToast('Invitation resent!');
      fetchData();
    } catch (err) {
      showToast('Failed to resend invitation', 'error');
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!confirm('Delete this invitation?')) return;
    try {
      await api.delete(`/team-invitation/invitations/${invitationId}`);
      showToast('Invitation deleted!');
      fetchData();
    } catch (err) {
      showToast('Failed to delete invitation', 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this team member? They will lose admin access.')) return;
    try {
      await api.delete(`/team-invitation/members/${userId}`);
      showToast('Team member removed!');
      fetchData();
    } catch (err) {
      showToast('Failed to remove member', 'error');
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

  const pendingInvitations = invitations.filter(i => i.status === 'PENDING');

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-semibold transition-all ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.type === 'error' ? <X size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus size={28} className="text-purple-600" />
              Team Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">Invite and manage admin team members</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md w-full sm:w-auto justify-center"
          >
            <UserPlus size={18} />
            Invite Team Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Users,        label: 'Total Members',       value: teamMembers.length,                          bg: 'bg-white border border-gray-200',        text: 'text-gray-800',   sub: 'text-gray-500'  },
            { icon: Mail,         label: 'Pending Invitations', value: pendingInvitations.length,                   bg: 'bg-blue-600',                            text: 'text-white',      sub: 'text-blue-100'  },
            { icon: Shield,       label: 'Full Admins',         value: teamMembers.filter(m => m.role === 'ADMIN').length, bg: 'bg-purple-600',               text: 'text-white',      sub: 'text-purple-100'},
          ].map(({ icon: Icon, label, value, bg, text, sub }) => (
            <div key={label} className={`rounded-2xl shadow-md p-5 ${bg}`}>
              <Icon size={22} className={`${text} opacity-80 mb-3`} />
              <p className={`text-3xl font-bold ${text} mb-0.5`}>{value}</p>
              <p className={`text-sm ${sub}`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Active Team Members */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-purple-600" /> Active Team Members
          </h2>

          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No team members yet. Invite someone to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Name', 'Email', 'Role', 'Joined', 'Status', ''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800 text-sm">{member.name}</p>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">{member.email}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.role === 'ADMIN' ? 'Admin' : 'Support'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-500">{formatDate(member.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button onClick={() => handleRemoveMember(member.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove member">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.role === 'ADMIN' ? 'Admin' : 'Support'}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.status}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(member.createdAt)}</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMember(member.id)}
                        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pending Invitations */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Mail size={20} className="text-blue-500" /> Pending Invitations
          </h2>

          {pendingInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No pending invitations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800 text-sm truncate">{inv.email}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          inv.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {inv.role === 'ADMIN' ? 'Admin' : 'Support'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> Sent {formatDate(inv.createdAt)}
                        </span>
                        <span>Expires {formatDate(inv.expiresAt)}</span>
                        {inv.inviter && (
                          <span>by {inv.inviter.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleResendInvitation(inv.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
                        <RefreshCw size={13} /> Resend
                      </button>
                      <button onClick={() => handleDeleteInvitation(inv.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="CUSTOMER_SUPPORT">Customer Support (Live Chat Only)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formData.role === 'ADMIN'
                    ? 'Full access to all admin features including user management.'
                    : 'Limited to Live Chat management only.'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
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