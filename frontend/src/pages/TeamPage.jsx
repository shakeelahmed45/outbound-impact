import { useState, useEffect } from 'react';
import { UserPlus, Mail, Shield, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const TeamPage = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'VIEWER',
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/team');
      if (response.data.status === 'success') {
        setTeamMembers(response.data.teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/team/invite', formData);
      if (response.data.status === 'success') {
        setTeamMembers([response.data.teamMember, ...teamMembers]);
        setShowInviteModal(false);
        setFormData({ email: '', role: 'VIEWER' });
        alert('Team member invited successfully!');
      }
    } catch (error) {
      console.error('Failed to invite team member:', error);
      alert(error.response?.data?.message || 'Failed to invite team member');
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await api.delete('/team/' + id);
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      alert('Team member removed successfully!');
    } catch (error) {
      console.error('Failed to remove team member:', error);
      alert('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          >
            <UserPlus size={20} />
            Invite Member
          </button>
        </div>

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
              className="gradient-btn text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <UserPlus size={20} />
              Invite Your First Member
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Member</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Invited</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                          {member.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-100 text-primary rounded-full text-sm font-medium">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-primary mb-6">Invite Team Member</h3>
              
              <form onSubmit={handleInvite}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="colleague@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="VIEWER">Viewer - Can view content</option>
                      <option value="EDITOR">Editor - Can edit content</option>
                      <option value="ADMIN">Admin - Full access</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setFormData({ email: '', role: 'VIEWER' });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    Send Invite
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