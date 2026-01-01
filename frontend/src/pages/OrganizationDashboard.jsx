import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, Users, Folder, QrCode } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalViews: 0,
    storageUsed: 0,
    storageLimit: 10737418240, // 250GB default for small org
    qrCodesGenerated: 0,
    teamMembers: 0,
    campaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      if (response.data.status === 'success') {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const storagePercentage = stats.storageLimit > 0 
    ? (stats.storageUsed / stats.storageLimit) * 100 
    : 0;

  const statCards = [
    {
      title: 'Total Uploads',
      value: stats.totalUploads,
      icon: Upload,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: 'from-violet-500 to-violet-600',
    },
    {
      title: 'Team Members',
      value: stats.teamMembers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Campaigns',
      value: stats.campaigns,
      icon: Folder,
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'QR Codes',
      value: stats.qrCodesGenerated,
      icon: QrCode,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

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
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {user?.role === 'ORG_SMALL' && '🏢 Small Organization Dashboard'}
          {user?.role === 'ORG_MEDIUM' && '🏛️ Medium Organization Dashboard'}
          {user?.role === 'ORG_ENTERPRISE' && '🏢 Enterprise Dashboard'}
        </h1>
        <p className="text-secondary text-lg">
          Welcome back, {user?.name}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-primary mb-1">{card.value}</p>
              <p className="text-secondary text-sm">{card.title}</p>
            </div>
          );
        })}
      </div>

      {/* Storage Usage */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
        <h3 className="text-xl font-bold text-primary mb-4">Storage Usage</h3>
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}
            </span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                storagePercentage > 90
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : storagePercentage > 70
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-primary to-secondary'
              }`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
          <span className="absolute right-0 top-6 text-sm font-semibold text-gray-700">
            {storagePercentage.toFixed(1)}%
          </span>
        </div>

        {storagePercentage > 70 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ You're running low on storage. Consider upgrading your plan or deleting unused items.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/dashboard/team')}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
          >
            <Users className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-semibold text-gray-700">Manage Team</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/campaigns')}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
          >
            <Folder className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-semibold text-gray-700">Campaigns</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/upload')}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
          >
            <Upload className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-semibold text-gray-700">Upload</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard/advanced-analytics')}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
          >
            <Eye className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-semibold text-gray-700">Advanced Analytics</span>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizationDashboard;