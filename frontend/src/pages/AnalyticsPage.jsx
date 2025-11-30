import { useState, useEffect } from 'react';
import { TrendingUp, Eye, FolderOpen, BarChart3 } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics');
      if (response.data.status === 'success') {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Analytics</h1>
          <p className="text-secondary">Track your content performance and engagement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Eye size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {analytics?.totalViews || 0}
            </p>
            <p className="text-sm text-gray-600">Total Views</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <BarChart3 size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {analytics?.totalItems || 0}
            </p>
            <p className="text-sm text-gray-600">Total Items</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <FolderOpen size={24} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-1">
              {analytics?.campaignStats?.length || 0}
            </p>
            <p className="text-sm text-gray-600">Active Campaigns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary mb-6">Content by Type</h3>
            {analytics?.itemsByType && Object.keys(analytics.itemsByType).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(analytics.itemsByType).map(([type, count]) => {
                  const total = analytics.totalItems || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={type}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-gray-700">{type}</span>
                        <span className="text-primary font-semibold">{count} items</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
                          style={{ width: percentage + '%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No items yet</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-primary mb-6">Campaign Performance</h3>
            {analytics?.campaignStats && analytics.campaignStats.length > 0 ? (
              <div className="space-y-4">
                {analytics.campaignStats.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{campaign.name}</p>
                      <p className="text-sm text-gray-600">{campaign.itemCount} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{campaign.views}</p>
                      <p className="text-xs text-gray-600">views</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No campaigns yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-primary mb-6">Recent Items</h3>
          {analytics?.recentItems && analytics.recentItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaign</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Views</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.recentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{item.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-purple-100 text-primary rounded-full text-sm">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {item.campaign ? item.campaign.name : '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">{item.views}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No items yet</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;