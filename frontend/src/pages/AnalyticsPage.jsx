import { useState, useEffect } from 'react';
import { TrendingUp, Eye, FolderOpen, BarChart3, Download, FileText, Clock } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import api from '../services/api';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExportToast, setShowExportToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchHourlyData();
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

  const fetchHourlyData = async () => {
    try {
      const response = await api.get('/analytics/time-of-day');
      if (response.data.status === 'success') {
        setHourlyData(response.data.activityByHour);
      }
    } catch (error) {
      console.error('Failed to fetch hourly data:', error);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    // Prepare CSV data
    const csvData = [];
    
    // Add header
    csvData.push(['Outbound Impact - Analytics Report']);
    csvData.push(['Generated:', new Date().toLocaleString()]);
    csvData.push(['']); // Empty row
    
    // Summary stats
    csvData.push(['Summary Statistics']);
    csvData.push(['Total Views', analytics.totalViews || 0]);
    csvData.push(['Total Items', analytics.totalItems || 0]);
    csvData.push(['Active Campaigns', analytics.campaignStats?.length || 0]);
    csvData.push(['']); // Empty row
    
    // Content by Type
    if (analytics.itemsByType && Object.keys(analytics.itemsByType).length > 0) {
      csvData.push(['Content by Type']);
      csvData.push(['Type', 'Count', 'Percentage']);
      Object.entries(analytics.itemsByType).forEach(([type, count]) => {
        const percentage = Math.round((count / analytics.totalItems) * 100);
        csvData.push([type, count, `${percentage}%`]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Campaign Performance
    if (analytics.campaignStats && analytics.campaignStats.length > 0) {
      csvData.push(['Campaign Performance']);
      csvData.push(['Campaign Name', 'Items', 'Views']);
      analytics.campaignStats.forEach((campaign) => {
        csvData.push([campaign.name, campaign.itemCount, campaign.views]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Recent Items
    if (analytics.recentItems && analytics.recentItems.length > 0) {
      csvData.push(['Recent Items']);
      csvData.push(['Title', 'Type', 'Campaign', 'Views', 'Created Date']);
      analytics.recentItems.forEach((item) => {
        csvData.push([
          item.title,
          item.type,
          item.campaign ? item.campaign.name : '-',
          item.views,
          new Date(item.createdAt).toLocaleDateString()
        ]);
      });
      csvData.push(['']); // Empty row
    }
    
    // Hourly Activity
    if (hourlyData && hourlyData.length > 0) {
      csvData.push(['Activity by Time of Day']);
      csvData.push(['Hour', 'Views']);
      hourlyData.forEach((data) => {
        csvData.push([data.hourLabel, data.views]);
      });
    }
    
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToastMessage('✅ CSV exported successfully!');
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 3000);
  };

  const handleExportPDF = async () => {
    if (!analytics) return;

    setExportingPDF(true);
    
    try {
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      let yPosition = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(128, 0, 128); // Purple
      doc.text('Outbound Impact - Analytics Report', 20, yPosition);
      yPosition += 10;
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 15;
      
      // Summary Stats
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary Statistics', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(`Total Views: ${analytics.totalViews || 0}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Total Items: ${analytics.totalItems || 0}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Active Campaigns: ${analytics.campaignStats?.length || 0}`, 20, yPosition);
      yPosition += 12;
      
      // Content by Type Table
      if (analytics.itemsByType && Object.keys(analytics.itemsByType).length > 0) {
        doc.setFontSize(14);
        doc.text('Content by Type', 20, yPosition);
        yPosition += 5;
        
        const typeData = Object.entries(analytics.itemsByType).map(([type, count]) => {
          const percentage = Math.round((count / analytics.totalItems) * 100);
          return [type, count, `${percentage}%`];
        });
        
        doc.autoTable({
          startY: yPosition,
          head: [['Type', 'Count', 'Percentage']],
          body: typeData,
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Campaign Performance Table
      if (analytics.campaignStats && analytics.campaignStats.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Campaign Performance', 20, yPosition);
        yPosition += 5;
        
        const campaignData = analytics.campaignStats.map((campaign) => [
          campaign.name,
          campaign.itemCount,
          campaign.views
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Campaign Name', 'Items', 'Views']],
          body: campaignData,
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Recent Items Table
      if (analytics.recentItems && analytics.recentItems.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Recent Items', 20, yPosition);
        yPosition += 5;
        
        const itemsData = analytics.recentItems.map((item) => [
          item.title.substring(0, 30) + (item.title.length > 30 ? '...' : ''),
          item.type,
          item.campaign ? item.campaign.name : '-',
          item.views,
          new Date(item.createdAt).toLocaleDateString()
        ]);
        
        doc.autoTable({
          startY: yPosition,
          head: [['Title', 'Type', 'Campaign', 'Views', 'Created']],
          body: itemsData,
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 30 }
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Hourly Activity Table
      if (hourlyData && hourlyData.length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Activity by Time of Day', 20, yPosition);
        yPosition += 5;
        
        // Split into two columns for better layout
        const firstHalf = hourlyData.slice(0, 12).map(d => [d.hourLabel, d.views]);
        const secondHalf = hourlyData.slice(12, 24).map(d => [d.hourLabel, d.views]);
        
        // First column
        doc.autoTable({
          startY: yPosition,
          head: [['Hour', 'Views']],
          body: firstHalf,
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20, right: 105 },
        });
        
        // Second column
        const firstTableY = yPosition;
        doc.autoTable({
          startY: firstTableY,
          head: [['Hour', 'Views']],
          body: secondHalf,
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 105, right: 20 },
        });
      }
      
      // Save the PDF
      doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      setToastMessage('✅ PDF exported successfully!');
      setShowExportToast(true);
      setTimeout(() => setShowExportToast(false), 3000);
    } catch (error) {
      console.error('PDF export error:', error);
      setToastMessage('❌ Failed to export PDF');
      setShowExportToast(true);
      setTimeout(() => setShowExportToast(false), 3000);
    } finally {
      setExportingPDF(false);
    }
  };

  // Calculate hourly stats
  const getHourlyStats = () => {
    if (!hourlyData || hourlyData.length === 0) {
      return {
        peakHour: '--:--',
        peakViews: 0,
        avgPerHour: 0,
        activeHours: 0
      };
    }

    const maxViews = Math.max(...hourlyData.map(d => d.views));
    const peakHourData = hourlyData.find(d => d.views === maxViews);
    const totalViews = hourlyData.reduce((sum, d) => sum + d.views, 0);
    const activeHours = hourlyData.filter(d => d.views > 0).length;
    
    return {
      peakHour: peakHourData ? peakHourData.hourLabel : '--:--',
      peakViews: maxViews,
      avgPerHour: Math.round(totalViews / 24),
      activeHours
    };
  };

  const hourlyStats = getHourlyStats();

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
        {/* Toast Notification */}
        {showExportToast && (
          <div className="fixed top-4 right-4 z-50 animate-slideIn">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
              <p className="font-semibold">{toastMessage}</p>
            </div>
          </div>
        )}

        {/* Header with Export Buttons */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Analytics Dashboard</h1>
            <p className="text-secondary">Track your content performance and engagement</p>
          </div>
          
          {/* EXPORT BUTTONS */}
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={!analytics}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!analytics || exportingPDF}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <FileText size={20} />
              <span>{exportingPDF ? 'Generating...' : 'Export PDF'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* ACTIVITY BY TIME OF DAY CARD - NOW WITH REAL DATA */}
        <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-3xl shadow-2xl p-8 border-2 border-orange-200 mb-8 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-300/20 to-red-300/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-300/20 to-orange-300/20 rounded-full -ml-48 -mb-48 blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Clock size={32} className="text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">
                    Activity by Time of Day
                  </h3>
                  <p className="text-gray-700 font-medium">Your peak engagement hours</p>
                </div>
              </div>
              
              {hourlyData && hourlyData.some(d => d.views > 0) && (
                <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-xl border-2 border-orange-300 shadow-lg">
                  <p className="text-sm text-orange-700 font-bold">✨ Live Data</p>
                  <p className="text-xs text-gray-600">Real-time Analytics</p>
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-white shadow-xl">
              {/* 24 Hour Visualization */}
              <div className="mb-8">
                {hourlyData && hourlyData.length > 0 ? (
                  <div className="flex items-end justify-between h-64 gap-1">
                    {hourlyData.map((data, index) => {
                      const maxViews = Math.max(...hourlyData.map(d => d.views), 1);
                      const heightPercent = data.views > 0 ? Math.max((data.views / maxViews) * 100, 5) : 0;
                      const isPeakTime = data.views === maxViews && data.views > 0;
                      
                      return (
                        <div key={data.hour} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center justify-end h-full">
                            <div className="relative w-full group">
                              {/* Tooltip */}
                              {data.views > 0 && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                                    <p className="font-bold">{data.hourLabel}</p>
                                    <p>{data.views} {data.views === 1 ? 'view' : 'views'}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Bar */}
                              <div
                                className={`w-full rounded-t-lg transition-all duration-300 ${
                                  isPeakTime
                                    ? 'bg-gradient-to-t from-red-500 to-orange-400 shadow-lg'
                                    : data.views > 0
                                    ? 'bg-gradient-to-t from-orange-400 to-yellow-300'
                                    : 'bg-gray-200'
                                }`}
                                style={{ 
                                  height: `${heightPercent}%`,
                                  minHeight: data.views > 0 ? '8px' : '4px'
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Hour Label */}
                          <span className={`text-xs font-medium ${
                            index % 3 === 0 ? 'block' : 'hidden md:block'
                          } ${isPeakTime ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>
                            {data.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Clock size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="font-semibold">No activity data yet</p>
                      <p className="text-sm">Start sharing your content to see hourly patterns</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-xl border-2 border-orange-300 text-center">
                  <p className="text-xs text-orange-700 font-semibold mb-1">Peak Hour</p>
                  <p className="text-2xl font-bold text-orange-900">{hourlyStats.peakHour}</p>
                  {hourlyStats.peakViews > 0 && (
                    <p className="text-xs text-orange-600 mt-1">{hourlyStats.peakViews} views</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-xl border-2 border-red-300 text-center">
                  <p className="text-xs text-red-700 font-semibold mb-1">Peak Views</p>
                  <p className="text-2xl font-bold text-red-900">{hourlyStats.peakViews}</p>
                  {hourlyStats.peakViews > 0 && (
                    <p className="text-xs text-red-600 mt-1">in one hour</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 rounded-xl border-2 border-yellow-300 text-center">
                  <p className="text-xs text-yellow-700 font-semibold mb-1">Avg/Hour</p>
                  <p className="text-2xl font-bold text-yellow-900">{hourlyStats.avgPerHour}</p>
                  {hourlyStats.avgPerHour > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">views/hour</p>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-pink-100 to-pink-200 p-4 rounded-xl border-2 border-pink-300 text-center">
                  <p className="text-xs text-pink-700 font-semibold mb-1">Active Hours</p>
                  <p className="text-2xl font-bold text-pink-900">{hourlyStats.activeHours}</p>
                  {hourlyStats.activeHours > 0 && (
                    <p className="text-xs text-pink-600 mt-1">of 24 hours</p>
                  )}
                </div>
              </div>

              {/* Insights */}
              {hourlyData && hourlyData.some(d => d.views > 0) && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-xl text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <TrendingUp size={24} />
                    <h4 className="text-xl font-bold">Engagement Insights</h4>
                  </div>
                  <p className="text-orange-100 text-sm">
                    Your content receives the most engagement at {hourlyStats.peakHour}. 
                    Consider scheduling important updates during this time for maximum impact!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content by Type & Campaign Performance */}
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

        {/* Recent Items */}
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

      {/* Add animations to global CSS */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
