import { useState, useEffect } from 'react';
import { BarChart3, Globe, Smartphone, Monitor, Clock, TrendingUp, Users } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../services/api';

const AdvancedAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/advanced-analytics/stats?timeRange=${timeRange}`);
      
      if (response.data.status === 'success') {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCountryFlag = (code) => {
    const flags = {
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'CA': '🇨🇦',
      'DE': '🇩🇪',
      'AU': '🇦🇺',
      'FR': '🇫🇷',
      'IN': '🇮🇳',
      'JP': '🇯🇵',
      'CN': '🇨🇳',
      'BR': '🇧🇷',
      'PK': '🇵🇰'
    };
    return flags[code] || '🌍';
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

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
              <BarChart3 className="text-yellow-600" size={32} />
              Advanced Analytics
            </h1>
            <p className="text-secondary">Deep insights into your audience and engagement</p>
          </div>
          
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-semibold"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{analytics.totalViews.toLocaleString()}</p>
            <p className="text-sm opacity-90">Total Views</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Users size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{analytics.uniqueVisitors.toLocaleString()}</p>
            <p className="text-sm opacity-90">Unique Visitors</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{analytics.avgSessionTime}</p>
            <p className="text-sm opacity-90">Avg. Session Time</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{analytics.bounceRate}</p>
            <p className="text-sm opacity-90">Bounce Rate</p>
          </div>
        </div>

        {/* Geography */}
        {analytics.topCountries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Geographic Distribution</h2>
            </div>

            <div className="space-y-4">
              {analytics.topCountries.map((country, index) => (
                <div key={country.code} className="flex items-center gap-4">
                  <div className="w-8 text-center font-bold text-gray-400">#{index + 1}</div>
                  <div className="w-12 h-8 rounded overflow-hidden flex items-center justify-center bg-gray-100">
                    <span className="text-2xl">{getCountryFlag(country.code)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{country.country}</span>
                      <span className="text-sm text-gray-600">{country.views.toLocaleString()} views</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-6 text-right font-bold text-primary">{country.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Devices */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Device Types</h2>
            </div>

            <div className="space-y-4">
              {analytics.devices.map((device) => (
                <div key={device.type} className="flex items-center gap-4">
                  <div className="w-24 font-semibold text-gray-900">{device.type}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                        style={{ width: `${device.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="font-bold text-primary">{device.percentage}%</span>
                    <span className="text-xs text-gray-500 block">{device.count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Browsers */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Browsers</h2>
            </div>

            <div className="space-y-4">
              {analytics.browsers.map((browser) => (
                <div key={browser.name} className="flex items-center gap-4">
                  <div className="w-24 font-semibold text-gray-900">{browser.name}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                        style={{ width: `${browser.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="font-bold text-primary">{browser.percentage}%</span>
                    <span className="text-xs text-gray-500 block">{browser.count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operating Systems - Full Width */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Operating Systems</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.os.map((system) => (
              <div key={system.name} className="flex items-center gap-4">
                <div className="w-24 font-semibold text-gray-900">{system.name}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full"
                      style={{ width: `${system.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="font-bold text-primary">{system.percentage}%</span>
                  <span className="text-xs text-gray-500 block">{system.count.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time of Day Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Activity by Time of Day</h2>
          </div>

          <div className="flex items-end justify-between gap-2 h-64">
            {analytics.hourlyViews.map((data) => {
              const maxViews = Math.max(...analytics.hourlyViews.map(h => h.views), 1);
              const height = (data.views / maxViews) * 100;
              
              return (
                <div key={data.hour} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">{data.views}</div>
                  <div
                    className="w-full bg-gradient-to-t from-primary to-secondary rounded-t-lg hover:opacity-80 transition-all cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${data.hour}: ${data.views} views`}
                  />
                  <div className="text-xs text-gray-500 mt-2 font-mono">{data.hour}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export Options */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => alert('CSV export feature coming soon!')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => alert('PDF export feature coming soon!')}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Export PDF Report
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdvancedAnalyticsPage;