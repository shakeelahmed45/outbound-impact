import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, QrCode, BarChart3, Users, Folder, Key, Palette, Zap, Shield, Crown } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, userRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/auth/me'),
      ]);

      if (statsRes.data.status === 'success') {
        setStats(statsRes.data.stats);
      }

      if (userRes.data.status === 'success') {
        setUser(userRes.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (bytes) => {
    if (!bytes || bytes === 0) return '0.00 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const calculateStoragePercentage = () => {
    const storageUsed = Number(user?.storageUsed || 0);
    const storageLimit = Number(user?.storageLimit || 2147483648);
    
    if (storageLimit === 0) return 0;
    
    const percentage = Math.round((storageUsed / storageLimit) * 100);
    return Math.min(percentage, 100);
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

  const isOrganization = user?.role === 'ORG_SMALL' || user?.role === 'ORG_MEDIUM' || user?.role === 'ORG_ENTERPRISE';
  const isEnterprise = user?.role === 'ORG_ENTERPRISE';
  const storagePercentage = calculateStoragePercentage();
  const storageUsedGB = formatStorage(Number(user?.storageUsed || 0));
  const storageLimitGB = formatStorage(Number(user?.storageLimit || 2147483648));

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
              Welcome back, {user?.name}!
              {isEnterprise && (
                <span className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  <Crown size={16} />
                  Enterprise
                </span>
              )}
            </h1>
            <p className="text-secondary">Here's what's happening with your content today.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Upload size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalUploads || 0}</p>
            <p className="text-sm text-gray-600">Total Uploads</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Eye size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalViews || 0}</p>
            <p className="text-sm text-gray-600">Total Views</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <QrCode size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalQRCodes || 0}</p>
            <p className="text-sm text-gray-600">QR Codes</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Folder size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalCampaigns || 0}</p>
            <p className="text-sm text-gray-600">Campaigns</p>
          </div>
        </div>

        {/* Team Members */}
        {isOrganization && (
          <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Team Members</h3>
                <p className="text-lg opacity-90">{stats?.totalTeamMembers || 0} active members</p>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Users size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Storage Usage */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-primary mb-4">Storage Usage</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {storageUsedGB} / {storageLimitGB}
                </span>
                <span className="text-sm font-medium text-primary">
                  {storagePercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all"
                  style={{ width: storagePercentage + '%' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Number(user?.storageUsed || 0).toLocaleString()} bytes used of {Number(user?.storageLimit || 2147483648).toLocaleString()} bytes
              </p>
            </div>
          </div>
          {storagePercentage > 80 && !isEnterprise && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium">
                ⚠️ You're running low on storage! Consider upgrading your plan.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-primary mb-4">Quick Actions</h3>
          <div className={`grid grid-cols-2 ${isEnterprise ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <Upload className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">Upload New</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/items')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <QrCode className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">My Items</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/analytics')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <BarChart3 className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">Analytics</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/campaigns')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <Folder className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">Campaigns</span>
            </button>

            {/* Enterprise-Only Quick Actions */}
            {isEnterprise && (
              <>
                <button
                  onClick={() => navigate('/dashboard/api-access')}
                  className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center"
                >
                  <Key className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">API Access</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/white-label')}
                  className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center"
                >
                  <Palette className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">White Label</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/integrations')}
                  className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center"
                >
                  <Zap className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Integrations</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/advanced-analytics')}
                  className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center"
                >
                  <BarChart3 className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Advanced Analytics</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/security')}
                  className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-xl hover:border-yellow-500 hover:bg-yellow-100 transition-all text-center"
                >
                  <Shield className="mx-auto mb-2 text-yellow-600" size={24} />
                  <span className="text-sm font-semibold text-gray-700">Security & 2FA</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;