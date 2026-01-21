import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Eye, QrCode, BarChart3, Users, Folder, Key, Palette, Zap, Shield, Crown } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Tooltip from '../components/common/Tooltip';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: Check if user is a team member VIEWER
  const isTeamMemberViewer = user?.isTeamMember && user?.teamRole === 'VIEWER';
  
  // ✅ FIXED: Get effective role for organization features
  const effectiveUser = user?.isTeamMember ? user.organization : user;
  const effectiveRole = effectiveUser?.role;

  useEffect(() => {
    document.title = 'Dashboard | Outbound Impact';
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
    // ✅ FIXED: Use effective user's storage
    const storageUsed = Number(effectiveUser?.storageUsed || 0);
    const storageLimit = Number(effectiveUser?.storageLimit || 2147483648);
    
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

  // ✅ FIXED: Use effective role for organization checks
  const isOrganization = effectiveRole === 'ORG_SMALL' || effectiveRole === 'ORG_MEDIUM' || effectiveRole === 'ORG_ENTERPRISE';
  const isEnterprise = effectiveRole === 'ORG_ENTERPRISE';
  const storagePercentage = calculateStoragePercentage();
  // ✅ FIXED: Use effective user's storage
  const storageUsedGB = formatStorage(Number(effectiveUser?.storageUsed || 0));
  const storageLimitGB = formatStorage(Number(effectiveUser?.storageLimit || 2147483648));

  return (
    <DashboardLayout>
      <div>
        {/* ✨ NEW: Animated Header with Soundwave/Mic Animation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ✨ Animated Soundwave Bars (Mic Animation) */}
            <div className="hidden sm:flex items-center gap-1">
              <div className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full animate-soundwave-1" style={{ height: '24px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-500 to-violet-600 rounded-full animate-soundwave-2" style={{ height: '32px' }}></div>
              <div className="w-1 bg-gradient-to-t from-violet-400 to-purple-600 rounded-full animate-soundwave-3" style={{ height: '40px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-500 to-violet-600 rounded-full animate-soundwave-4" style={{ height: '32px' }}></div>
              <div className="w-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-full animate-soundwave-5" style={{ height: '24px' }}></div>
            </div>

            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center gap-3 flex-wrap animate-pulse-gentle">
                Welcome back, {user?.name}!
                {/* ✅ FIXED: Show VIEWER badge for team members */}
                {isTeamMemberViewer && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <Eye size={16} />
                    VIEWER
                  </span>
                )}
                {isEnterprise && !isTeamMemberViewer && (
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    <Crown size={16} />
                    Enterprise
                  </span>
                )}
              </h1>
              <p className="text-secondary">Here's what's happening with your content today.</p>
            </div>
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
            <p className="text-sm text-gray-600 flex items-center gap-1">
              Total Uploads
              <Tooltip content="Total number of items you've uploaded" iconSize={14} />
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Eye size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalViews || 0}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              Total Views
              <Tooltip content="Total number of times your content has been viewed" iconSize={14} />
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <QrCode size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalQRCodes || 0}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              QR Codes Generated
              <Tooltip content="Number of QR codes generated for Streams" iconSize={14} />
            </p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Folder size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">{stats?.totalCampaigns || 0}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              Active Streams
              <Tooltip content="Number of streams you've created" iconSize={14} />
            </p>
          </div>
        </div>

        {/* ✅ FIXED: Team Members Card - Now available for ALL users including INDIVIDUAL */}
        {!isTeamMemberViewer && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats?.totalTeamMembers || 0}</p>
                    <p className="text-sm opacity-90">Team Members</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/team')}
                className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
              >
                Manage Team
              </button>
            </div>
          </div>
        )}

        {/* Storage Usage */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            Storage Usage
            <Tooltip content="Your current storage usage and available space" />
          </h3>
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
                {Number(effectiveUser?.storageUsed || 0).toLocaleString()} bytes used of {Number(effectiveUser?.storageLimit || 2147483648).toLocaleString()} bytes
              </p>
            </div>
          </div>
          {storagePercentage > 80 && !isEnterprise && !isTeamMemberViewer && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-medium">
                ⚠️ You're running low on storage! Consider upgrading your plan.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            Quick Actions
            <Tooltip content="Common tasks for quick access" />
          </h3>
          <div className={`grid grid-cols-2 ${isEnterprise && !isTeamMemberViewer ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
            {/* ✅ FIXED: Hide Upload for VIEWERS (they can't upload) */}
            {!isTeamMemberViewer && (
              <button
                onClick={() => navigate('/dashboard/upload')}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
              >
                <Upload className="mx-auto mb-2 text-primary" size={24} />
                <span className="text-sm font-semibold text-gray-700">Upload New</span>
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/items')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <QrCode className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">My Items</span>
            </button>
            <button
              onClick={() => navigate(isOrganization ? '/dashboard/advanced-analytics' : '/dashboard/analytics')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <BarChart3 className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">
                {isOrganization ? 'Advanced Analytics' : 'Analytics'}
              </span>
            </button>
            <button
              onClick={() => navigate('/dashboard/campaigns')}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-purple-50 transition-all text-center"
            >
              <Folder className="mx-auto mb-2 text-primary" size={24} />
              <span className="text-sm font-semibold text-gray-700">Streams</span>
            </button>

            {/* ✅ FIXED: Enterprise-Only Quick Actions - HIDDEN for VIEWERS */}
            {isEnterprise && !isTeamMemberViewer && (
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

      {/* ✨ Custom CSS for Soundwave Animation */}
      <style jsx>{`
        @keyframes soundwave-1 {
          0%, 100% { height: 24px; }
          50% { height: 32px; }
        }
        @keyframes soundwave-2 {
          0%, 100% { height: 32px; }
          50% { height: 48px; }
        }
        @keyframes soundwave-3 {
          0%, 100% { height: 40px; }
          50% { height: 56px; }
        }
        @keyframes soundwave-4 {
          0%, 100% { height: 32px; }
          50% { height: 44px; }
        }
        @keyframes soundwave-5 {
          0%, 100% { height: 24px; }
          50% { height: 36px; }
        }
        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.02);
          }
        }
        .animate-soundwave-1 {
          animation: soundwave-1 1.2s ease-in-out infinite;
        }
        .animate-soundwave-2 {
          animation: soundwave-2 1s ease-in-out infinite;
          animation-delay: 0.1s;
        }
        .animate-soundwave-3 {
          animation: soundwave-3 1.4s ease-in-out infinite;
          animation-delay: 0.2s;
        }
        .animate-soundwave-4 {
          animation: soundwave-4 1.1s ease-in-out infinite;
          animation-delay: 0.15s;
        }
        .animate-soundwave-5 {
          animation: soundwave-5 1.3s ease-in-out infinite;
          animation-delay: 0.25s;
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 3s ease-in-out infinite;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;