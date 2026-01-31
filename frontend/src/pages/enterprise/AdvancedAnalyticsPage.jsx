import { useState, useEffect } from 'react';
import { BarChart3, Globe, Smartphone, Monitor, Clock, TrendingUp, Users, Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../services/api';

const AdvancedAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);  // ✅ NEW: Error state
  const [showExportToast, setShowExportToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);  // ✅ Clear previous errors
    try {
      console.log('📊 Fetching advanced analytics for timeRange:', timeRange);
      const response = await api.get(`/advanced-analytics/stats?timeRange=${timeRange}`);
      console.log('📊 Analytics response:', response.data);
      
      if (response.data.status === 'success') {
        setAnalytics(response.data.analytics);
      } else {
        setError(response.data.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('❌ Failed to fetch advanced analytics:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    const csvData = [];
    
    // Header
    csvData.push(['Outbound Impact - Advanced Analytics Report']);
    csvData.push(['Time Range:', timeRange]);
    csvData.push(['Generated:', new Date().toLocaleString()]);
    csvData.push(['']);
    
    // Overview
    csvData.push(['Overview Statistics']);
    csvData.push(['Total Views', analytics.totalViews]);
    csvData.push(['Unique Visitors', analytics.uniqueVisitors]);
    csvData.push(['Avg Session Time', analytics.avgSessionTime]);
    csvData.push(['Bounce Rate', analytics.bounceRate]);
    csvData.push(['']);
    
    // Top Countries
    csvData.push(['Top Countries']);
    csvData.push(['Country', 'Views', 'Percentage']);
    analytics.topCountries.forEach(country => {
      csvData.push([country.country, country.views, `${country.percentage}%`]);
    });
    csvData.push(['']);
    
    // Devices
    csvData.push(['Device Breakdown']);
    csvData.push(['Device', 'Count', 'Percentage']);
    analytics.devices.forEach(device => {
      csvData.push([device.type, device.count, `${device.percentage}%`]);
    });
    csvData.push(['']);
    
    // Browsers
    csvData.push(['Browser Breakdown']);
    csvData.push(['Browser', 'Count', 'Percentage']);
    analytics.browsers.forEach(browser => {
      csvData.push([browser.name, browser.count, `${browser.percentage}%`]);
    });
    csvData.push(['']);
    
    // Operating Systems
    csvData.push(['Operating Systems']);
    csvData.push(['OS', 'Count', 'Percentage']);
    analytics.os.forEach(system => {
      csvData.push([system.name, system.count, `${system.percentage}%`]);
    });
    csvData.push(['']);
    
    // Hourly Views
    csvData.push(['Activity by Time of Day']);
    csvData.push(['Time', 'Views']);
    analytics.hourlyViews.forEach(hour => {
      csvData.push([hour.hour, hour.views]);
    });
    
    // Convert to CSV
    const csvContent = csvData.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `advanced-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
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
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      let yPosition = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(128, 0, 128);
      doc.text('Outbound Impact - Advanced Analytics', 20, yPosition);
      yPosition += 8;
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Time Range: ${timeRange} | Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 15;
      
      // Overview Stats
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overview Statistics', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(`Total Views: ${analytics.totalViews.toLocaleString()}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Unique Visitors: ${analytics.uniqueVisitors.toLocaleString()}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Avg Session Time: ${analytics.avgSessionTime}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Bounce Rate: ${analytics.bounceRate}`, 20, yPosition);
      yPosition += 12;
      
      // Top Countries
      if (analytics.topCountries.length > 0) {
        doc.setFontSize(14);
        doc.text('Top Countries', 20, yPosition);
        yPosition += 5;
        
        doc.autoTable({
          startY: yPosition,
          head: [['Country', 'Views', 'Percentage']],
          body: analytics.topCountries.map(c => [c.country, c.views, `${c.percentage}%`]),
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Devices
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Device Breakdown', 20, yPosition);
      yPosition += 5;
      
      doc.autoTable({
        startY: yPosition,
        head: [['Device', 'Count', 'Percentage']],
        body: analytics.devices.map(d => [d.type, d.count, `${d.percentage}%`]),
        theme: 'striped',
        headStyles: { fillColor: [128, 0, 128] },
        margin: { left: 20 },
      });
      
      yPosition = doc.lastAutoTable.finalY + 12;
      
      // Browsers
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      if (analytics.browsers.length > 0) {
        doc.setFontSize(14);
        doc.text('Browser Breakdown', 20, yPosition);
        yPosition += 5;
        
        doc.autoTable({
          startY: yPosition,
          head: [['Browser', 'Count', 'Percentage']],
          body: analytics.browsers.map(b => [b.name, b.count, `${b.percentage}%`]),
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Operating Systems
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      if (analytics.os.length > 0) {
        doc.setFontSize(14);
        doc.text('Operating Systems', 20, yPosition);
        yPosition += 5;
        
        doc.autoTable({
          startY: yPosition,
          head: [['OS', 'Count', 'Percentage']],
          body: analytics.os.map(o => [o.name, o.count, `${o.percentage}%`]),
          theme: 'striped',
          headStyles: { fillColor: [128, 0, 128] },
          margin: { left: 20 },
        });
        
        yPosition = doc.lastAutoTable.finalY + 12;
      }
      
      // Hourly Views
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Activity by Time of Day', 20, yPosition);
      yPosition += 5;
      
      doc.autoTable({
        startY: yPosition,
        head: [['Time', 'Views']],
        body: analytics.hourlyViews.map(h => [h.hour, h.views]),
        theme: 'striped',
        headStyles: { fillColor: [128, 0, 128] },
        margin: { left: 20 },
      });
      
      doc.save(`advanced-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`);
      
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

  // ✅ NEW: Better error display
  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-red-800 mb-2">Failed to Load Analytics</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <BarChart3 className="text-gray-400 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-700 mb-2">No Analytics Data Available</h2>
            <p className="text-gray-500 mb-6">
              Analytics will appear here once your QR codes and NFC tags start getting scanned.
            </p>
            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Toast Notification */}
        {showExportToast && (
          <div className="fixed top-4 right-4 z-50 animate-slideIn max-w-sm">
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-primary" size={28} />
              Advanced Analytics
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Detailed insights and performance metrics</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            {['24h', '7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-blue-600" size={20} />
              <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-0.5 rounded-full">Live</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Views</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.uniqueVisitors.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Unique Visitors</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-orange-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.avgSessionTime}</p>
            <p className="text-sm text-gray-500">Avg. Session</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="text-red-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{analytics.bounceRate}</p>
            <p className="text-sm text-gray-500">Bounce Rate</p>
          </div>
        </div>

        {/* Geographic Data */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Top Countries</h2>
          </div>

          {analytics.topCountries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No geographic data available yet</p>
          ) : (
            <div className="space-y-4">
              {analytics.topCountries.map((country) => (
                <div key={country.country} className="flex items-center gap-4">
                  <div className="w-12 text-2xl">{getCountryFlag(country.code)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900">{country.country}</span>
                      <span className="text-primary font-bold">{country.views.toLocaleString()} views</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right font-bold text-primary">{country.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device & Browser Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Devices */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Devices</h2>
            </div>

            <div className="space-y-3">
              {analytics.devices.map((device) => (
                <div key={device.type} className="flex items-center gap-4">
                  <div className="w-24 font-semibold text-gray-900">{device.type}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
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
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-gray-900">Browsers</h2>
            </div>

            {analytics.browsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No browser data available yet</p>
            ) : (
              <div className="space-y-3">
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
            )}
          </div>
        </div>

        {/* Operating Systems - Full Width */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Operating Systems</h2>

          {analytics.os.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No OS data available yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          )}
        </div>

        {/* Time of Day Activity - Clean App Design */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-primary" size={20} />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activity by Time of Day</h2>
              <p className="text-xs sm:text-sm text-gray-600">Peak engagement times</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-56 sm:h-64">
            {analytics.hourlyViews.map((data) => {
              const maxViews = Math.max(...analytics.hourlyViews.map(h => h.views), 1);
              const heightPercent = data.views > 0 ? Math.max((data.views / maxViews) * 100, 5) : 0;
              const isPeakTime = data.views === maxViews && data.views > 0;
              
              return (
                <div key={data.hour} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-full">
                    <div className="relative w-full group">
                      {/* Tooltip */}
                      {data.views > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                            <p className="font-bold">{data.hour}</p>
                            <p>{data.views} views</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isPeakTime
                            ? 'bg-gradient-to-t from-red-500 to-orange-400'
                            : data.views > 0
                            ? 'bg-gradient-to-t from-primary to-secondary'
                            : 'bg-gray-200'
                        }`}
                        style={{ 
                          height: `${heightPercent}%`,
                          minHeight: data.views > 0 ? '8px' : '4px'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Labels */}
                  <div className="text-center">
                    <div className={`text-xs md:text-sm font-bold ${isPeakTime ? 'text-red-500' : 'text-gray-700'}`}>
                      {data.views}
                    </div>
                    <div className={`text-[10px] md:text-xs ${isPeakTime ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                      {data.hour}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export Options - Compact Design */}
        <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!analytics}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!analytics || exportingPDF}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            <span>{exportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Animations */}
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

export default AdvancedAnalyticsPage;
