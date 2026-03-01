import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Calendar, HardDrive, FileText, Folder, Users,
  Activity, Ban, Unlock, Shield, Trash2, Edit, UserCheck,
  TrendingUp, Clock, Eye, MessageSquare, Download
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      if (response.data.status === 'success') {
        setUser(response.data.user);
        setActivities(response.data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    const action = user.status === 'suspended' ? 'unsuspend' : 'suspend';
    const confirmMsg = user.status === 'suspended'
      ? 'Unsuspend this user?'
      : 'Suspend this user? They will be blocked from the platform.';
    
    if (!confirm(confirmMsg)) return;

    try {
      const response = await api.post(`/admin/users/${userId}/suspend`, {
        suspend: action === 'suspend'
      });

      if (response.data.status === 'success') {
        alert(`User ${action}ed successfully`);
        fetchUserDetails();
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleImpersonate = async () => {
    if (!confirm(`Login as ${user.email}?`)) return;

    try {
      const response = await api.post(`/admin/users/${userId}/impersonate`);
      
      if (response.data.status === 'success') {
        const impersonateUrl = `${window.location.origin}/dashboard?impersonate_token=${response.data.token}`;
        window.open(impersonateUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to impersonate:', error);
      alert('Failed to impersonate user');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;

    try {
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.status === 'success') {
        alert('User deleted successfully');
        navigate('/admin-panel/users');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const formatStorage = (bytes) => {
    if (!bytes || bytes === '0') return '0.00 GB';
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const getActivityIcon = (type) => {
    const icons = {
      'item_created': <FileText className="text-green-500" size={16} />,
      'campaign_created': <Folder className="text-purple-500" size={16} />,
      'team_member_added': <Users className="text-blue-500" size={16} />,
    };
    return icons[type] || <Activity className="text-gray-500" size={16} />;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
          <button
            onClick={() => navigate('/admin-panel/users')}
            className="mt-4 text-purple-600 hover:text-purple-800"
          >
            Back to Users
          </button>
        </div>
      </AdminLayout>
    );
  }

  const storagePercent = ((Number(user.storageUsed) / Number(user.storageLimit)) * 100).toFixed(1);

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin-panel/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Users
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleImpersonate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserCheck size={16} />
                Login as User
              </button>
              <button
                onClick={handleSuspend}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  user.status === 'suspended'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {user.status === 'suspended' ? <Unlock size={16} /> : <Ban size={16} />}
                {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Items Created</span>
              <FileText className="text-green-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user._count.items}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Campaigns</span>
              <Folder className="text-purple-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user._count.campaigns}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Team Members</span>
              <Users className="text-blue-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{user._count.teamMembers || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Storage Used</span>
              <HardDrive className="text-yellow-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{storagePercent}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatStorage(user.storageUsed)} / {formatStorage(user.storageLimit)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-4 sm:gap-6 min-w-max">
            {['overview', 'activity', 'items', 'team'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 font-medium capitalize ${
                  activeTab === tab
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Plan Type</label>
                  <p className="text-gray-900 font-medium mt-1">
                    {user.role === 'INDIVIDUAL' ? 'Individual' :
                     user.role === 'ORG_SMALL' ? 'Small Organization' :
                     user.role === 'ORG_MEDIUM' ? 'Medium Organization' :
                     user.role === 'ORG_ENTERPRISE' ? 'Enterprise' : user.role}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Subscription Status</label>
                  <p className={`font-medium mt-1 ${
                    user.subscriptionStatus === 'active' ? 'text-green-600' :
                    user.subscriptionStatus === 'canceled' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {user.subscriptionStatus || 'None'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Account Status</label>
                  <p className={`font-medium mt-1 ${
                    user.status === 'suspended' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {user.status === 'suspended' ? 'Suspended' : 'Active'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Last Login</label>
                  <p className="text-gray-900 mt-1">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Stripe Customer ID</label>
                  <p className="text-gray-900 mt-1 font-mono text-sm">
                    {user.stripeCustomerId || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Storage Usage</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Used</span>
                    <span className="font-medium">{formatStorage(user.storageUsed)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Total Limit</span>
                    <span className="font-medium">{formatStorage(user.storageLimit)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className={`h-3 rounded-full ${
                        storagePercent > 90 ? 'bg-red-500' :
                        storagePercent > 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{storagePercent}% used</p>
                </div>

                {storagePercent > 90 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ Storage almost full! User may need to upgrade or delete files.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Items</h2>
            <div className="space-y-3">
              {user.items && user.items.length > 0 ? (
                user.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.type} • {item.views} views</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No items created yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members</h2>
            <div className="space-y-3">
              {user.teamMembers && user.teamMembers.length > 0 ? (
                user.teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{member.role}</p>
                      <p className="text-xs text-gray-500">
                        Added {new Date(member.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No team members</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserDetailPage;