import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, HardDrive, QrCode } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import usePullToRefresh from '../hooks/usePullToRefresh';
import PullToRefresh from '../components/PullToRefresh';

const IndividualDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalViews: 0,
    storageUsed: 0,
    storageLimit: 2147483648, // 2GB default
    qrCodesGenerated: 0,
  });
  const [loading, setLoading] = useState(true);

  // Pull-to-refresh hook
  const { isRefreshing, pullDistance, isPulling, containerRef } = usePullToRefresh(
    async () => {
      await fetchDashboardStats();
    }
  );

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
      {/* Pull-to-refresh indicator */}
      <PullToRefresh 
        isRefreshing={isRefreshing} 
        pullDistance={pullDistance} 
        isPulling={isPulling}
      />

      {/* Main content with ref for pull-to-refresh */}
      <div ref={containerRef} className="overflow-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-secondary">
            Here's an overview of your Outbound Impact account
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-semibold mb-1">
                  {stat.title}
                </h3>
                <p className="text-3xl font-bold text-primary">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Storage Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <HardDrive className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">Storage Usage</h3>
              <p className="text-sm text-gray-600">
                {formatBytes(stats.storageUsed)} of {formatBytes(stats.storageLimit)} used
              </p>
            </div>
          </div>

          {/* Storage Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {storagePercentage.toFixed(1)}% used
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Upload size={24} />
              <span className="font-semibold">Upload New Content</span>
            </button>
            
            <button
              onClick={() => navigate('/dashboard/items')}
              className="flex items-center gap-3 p-4 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all"
            >
              <QrCode size={24} />
              <span className="font-semibold">View My Items</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default IndividualDashboard;