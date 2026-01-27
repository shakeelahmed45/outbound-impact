import { useEffect, useState } from 'react';
import { 
  Users, FileText, Folder, DollarSign, Database, TrendingUp, 
  Activity, AlertCircle, Eye, MessageSquare, ShoppingCart,
  ArrowUp, ArrowDown, RefreshCw, Download, Calendar,
  Clock, CheckCircle, XCircle, Zap
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [statsRes, analyticsRes, activitiesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/analytics?range=${timeRange}`),
        api.get('/admin/recent-activities?limit=10')
      ]);

      if (statsRes.data.status === 'success') {
        setStats(statsRes.data.stats);
      }
      if (analyticsRes.data.status === 'success') {
        setAnalytics(analyticsRes.data.analytics);
      }
      if (activitiesRes.data.status === 'success') {
        setActivities(activitiesRes.data.activities);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatStorage = (bytes) => {
    if (!bytes || bytes === '0') return '0.00 GB';
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, previousValue, prefix = '' }) => {
    const change = getPercentageChange(value, previousValue);
    const isPositive = change >= 0;

    return (
      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow" style={{ borderColor: color }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{prefix}{value?.toLocaleString() || 0}</p>
          </div>
          <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon style={{ color }} size={28} />
          </div>
        </div>
        {previousValue !== undefined && (
          <div className="flex items-center gap-2">
            {isPositive ? (
              <ArrowUp className="text-green-500" size={16} />
            ) : (
              <ArrowDown className="text-red-500" size={16} />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-gray-500">vs last period</span>
          </div>
        )}
      </div>
    );
  };

  const ActivityItem = ({ activity }) => {
    const getActivityIcon = (type) => {
      const icons = {
        'user_registered': <Users className="text-blue-500" size={16} />,
        'item_created': <FileText className="text-green-500" size={16} />,
        'campaign_created': <Folder className="text-purple-500" size={16} />,
        'subscription_upgraded': <DollarSign className="text-yellow-500" size={16} />,
        'chat_started': <MessageSquare className="text-indigo-500" size={16} />,
      };
      return icons[type] || <Activity className="text-gray-500" size={16} />;
    };

    return (
      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{activity.description}</p>
          <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
        </div>
      </div>
    );
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

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">Real-time insights and platform overview</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAllData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers}
            previousValue={stats?.previousPeriod?.totalUsers}
            icon={Users}
            color="#3b82f6"
          />
          <StatCard
            title="Active Subscriptions"
            value={stats?.activeSubscriptions}
            previousValue={stats?.previousPeriod?.activeSubscriptions}
            icon={DollarSign}
            color="#10b981"
          />
          <StatCard
            title="Total Items"
            value={stats?.totalItems}
            previousValue={stats?.previousPeriod?.totalItems}
            icon={FileText}
            color="#8b5cf6"
          />
          <StatCard
            title="Total Campaigns"
            value={stats?.totalCampaigns}
            previousValue={stats?.previousPeriod?.totalCampaigns}
            icon={Folder}
            color="#f59e0b"
          />
        </div>

        {/* Revenue & Storage Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-green-100 mb-1">Monthly Recurring Revenue</p>
                <p className="text-4xl font-bold">{formatCurrency(analytics?.revenue?.mrr)}</p>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <DollarSign size={32} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-green-400">
              <div>
                <p className="text-green-100 text-sm mb-1">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.thisMonth)}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm mb-1">Last Month</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.lastMonth)}</p>
              </div>
            </div>
          </div>

          {/* Storage Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-purple-100 mb-1">Total Storage Used</p>
                <p className="text-4xl font-bold">{formatStorage(stats?.totalStorageUsed)}</p>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Database size={32} />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-purple-100">Storage Utilization</span>
                <span className="font-medium">{analytics?.storage?.utilizationPercent || 0}%</span>
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all"
                  style={{ width: `${Math.min(analytics?.storage?.utilizationPercent || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="text-purple-600" size={24} />
              User Growth
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.userGrowth || []}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart className="text-purple-600" size={24} />
              Subscription Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.subscriptionDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(analytics?.subscriptionDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity & Content Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-purple-600" size={24} />
                Recent Activity
              </h2>
              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="text-purple-600" size={24} />
              Quick Stats
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Active Chats</span>
                  <MessageSquare className="text-blue-600" size={16} />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.chatStats?.active || 0}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <Clock className="text-green-600" size={16} />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {analytics?.chatStats?.avgResponseTime || '0m'}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Satisfaction Rate</span>
                  <CheckCircle className="text-purple-600" size={16} />
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {analytics?.chatStats?.satisfactionRate || '0%'}
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Total Views</span>
                  <Eye className="text-yellow-600" size={16} />
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.totalViews?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Users by Plan</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Individual</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.usersByRole?.INDIVIDUAL || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {((stats?.usersByRole?.INDIVIDUAL || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Small Organization</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.usersByRole?.ORG_SMALL || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {((stats?.usersByRole?.ORG_SMALL || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-2">Medium Organization</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats?.usersByRole?.ORG_MEDIUM || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {((stats?.usersByRole?.ORG_MEDIUM || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-600 mb-2">Enterprise</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats?.usersByRole?.ORG_ENTERPRISE || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {((stats?.usersByRole?.ORG_ENTERPRISE || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
