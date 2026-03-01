import { useState, useEffect } from 'react';
import { Globe, QrCode, Wifi, MousePointer, Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const GeographyPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    try { const res = await api.get('/admin/geography'); if (res.data.status === 'success') setData(res.data); }
    catch (err) { console.error('Geography fetch error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></AdminLayout>;

  const totalScans = data?.totalScans || 0;
  const qrScans = data?.totalQrScans || 0;
  const nfcScans = data?.totalNfcScans || 0;
  const directScans = data?.totalDirectScans || 0;
  const countries = data?.countries || [];
  const devices = data?.devices || [];
  const topItems = data?.topItems || [];

  const deviceIcons = { Mobile: Smartphone, Desktop: Monitor, Tablet: Tablet };
  const totalDevices = devices.reduce((s, d) => s + d.count, 0);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"><Globe size={28} /></div>
              <div><h3 className="text-xl font-bold">Global View Tracking</h3><p className="text-blue-100">Real-time data from IP geolocation on every view</p></div>
            </div>
            <div className="text-right"><p className="text-3xl font-bold">{totalScans.toLocaleString()}</p><p className="text-blue-100 text-sm">Total views</p></div>
          </div>
        </div>

        {/* Scan breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'QR Scans', val: qrScans, icon: QrCode, color: 'purple' },
            { label: 'NFC Taps', val: nfcScans, icon: Wifi, color: 'blue' },
            { label: 'Direct Links', val: directScans, icon: MousePointer, color: 'green' },
            { label: 'Total Views', val: totalScans, icon: Eye, color: 'slate' },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-xl border border-${s.color}-200 p-4 text-center`}>
              <s.icon className={`mx-auto text-${s.color}-500 mb-2`} size={24} />
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900">{s.val.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{totalScans > 0 ? ((s.val / totalScans) * 100).toFixed(1) : 0}%</p>
            </div>
          ))}
        </div>

        {/* Country Breakdown + Devices side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Country table — Real data from Analytics */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Views by Country</h3>
              <p className="text-sm text-slate-500">From IP geolocation tracking</p>
            </div>
            {countries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No geographic data yet. Views will appear here as users scan your QR codes.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">#</th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">Country</th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">Views</th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-6 text-sm text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-6 font-medium text-slate-900">{c.country}</td>
                        <td className="py-3 px-6 text-sm font-bold text-slate-900">{c.views.toLocaleString()}</td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 w-20">
                              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${c.percentage}%` }}></div>
                            </div>
                            <span className="text-xs text-slate-600">{c.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Views by Device</h3>
            {devices.length === 0 ? (
              <p className="text-slate-500">No device data yet.</p>
            ) : (
              <div className="space-y-4">
                {devices.map((d, idx) => {
                  const Icon = deviceIcons[d.device] || Monitor;
                  const pct = totalDevices > 0 ? ((d.count / totalDevices) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <Icon className="text-slate-600" size={24} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-900">{d.device}</span>
                          <span className="text-sm font-bold text-slate-700">{d.count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Items by Views */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-bold text-slate-900">Top Content by Views</h3></div>
          {topItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No items with views yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">#</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Content</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Owner</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Total</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">QR</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">NFC</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-700">Direct</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-6 text-sm text-slate-500">{idx + 1}</td>
                      <td className="py-4 px-6 font-medium text-slate-900 truncate max-w-[200px]">{item.title}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{item.owner}</td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-900">{item.views.toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm text-purple-600">{item.qrScans.toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm text-blue-600">{item.nfcScans.toLocaleString()}</td>
                      <td className="py-4 px-6 text-sm text-green-600">{item.directScans.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default GeographyPage;
