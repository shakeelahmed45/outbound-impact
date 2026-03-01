import { useState } from 'react';
import { Users, Globe, DollarSign, Activity, FileText, Download, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const DataExportsPage = () => {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      if (type === 'customers') {
        // Use real existing export endpoint
        const res = await api.get('/admin/users/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert(`${type} export backend not yet implemented. The Customers CSV export works via /admin/users/export.`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Check console for details.');
    } finally { setExporting(null); }
  };

  const ExportCard = ({ type, icon: Icon, iconColor, title, desc, formats }) => (
    <button
      onClick={() => handleExport(type)}
      disabled={exporting === type}
      className="p-4 border-2 border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left disabled:opacity-50"
    >
      <div className="flex items-center gap-3 mb-2">
        {exporting === type ? <Loader2 className="text-purple-600 animate-spin" size={24} /> : <Icon className={iconColor} size={24} />}
        <h4 className="font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="text-sm text-slate-600">{desc}</p>
      <div className="mt-3 flex gap-2">
        {formats.map(f => <span key={f} className="px-2 py-1 bg-slate-100 rounded text-xs">{f}</span>)}
      </div>
    </button>
  );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Quick Exports */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Exports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExportCard type="customers" icon={Users} iconColor="text-purple-600" title="All Customers" desc="Export complete customer list with plan, status, storage, items" formats={['CSV']} />
            <ExportCard type="geography" icon={Globe} iconColor="text-blue-600" title="Scan & View Data" desc="Item views breakdown by QR, NFC, and direct access" formats={['CSV']} />
            <ExportCard type="revenue" icon={DollarSign} iconColor="text-green-600" title="Revenue Report" desc="MRR breakdown by plan from Stripe subscription data" formats={['CSV']} />
            <ExportCard type="usage" icon={Activity} iconColor="text-orange-600" title="Usage Analytics" desc="User activity, storage usage, item counts per user" formats={['CSV']} />
          </div>
        </div>

        {/* Custom Export */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Custom Data Export</h3>
              <p className="text-sm text-slate-700 mb-4">Need specific data? Custom export builder will allow filtering by date range, plan type, and custom fields.</p>
              <button onClick={() => alert('Custom export builder coming soon. Use the quick exports above for now.')} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Create Custom Export</button>
            </div>
          </div>
        </div>

        {/* Recent Exports — Empty state (no export history tracking yet) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Exports</h3>
          <div className="text-center py-8">
            <Download size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No export history yet</p>
            <p className="text-sm text-slate-400 mt-1">Downloads will be tracked here once export logging is implemented</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DataExportsPage;
