// IndividualDashboard.jsx — Personal Plan Dashboard (Pablo-inspired)
// Sections: Welcome banner, Stats, Storage, Quick Actions, Recent Items, Upgrade

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Eye, QrCode, HardDrive, Plus, ChevronRight,
  ArrowUp, ArrowDown, FolderOpen, Sparkles, Video, Music, FileText,
  Image as ImageIcon, Code, ExternalLink, AlertCircle
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const getTypeIcon = (type) => {
  const icons = { VIDEO: Video, IMAGE: ImageIcon, AUDIO: Music, TEXT: FileText, EMBED: Code };
  return icons[type?.toUpperCase()] || FileText;
};

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (n === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ChangeBadge = ({ value }) => {
  if (!value || value === '0%' || value === '+0%' || value === '-0%') return null;
  const isPositive = !String(value).startsWith('-');
  return (
    <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      {value}
    </div>
  );
};

const IndividualDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-activity?limit=5'),
      ]);
      if (statsRes.data.status === 'success') setStats(statsRes.data.stats);
      if (activityRes.data.status === 'success') setRecentItems(activityRes.data.recentActivity || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
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

  const storageUsed = Number(stats?.storageUsed || 0);
  const storageLimit = Number(stats?.storageLimit || 2147483648);
  const storagePct = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;
  const totalUploads = stats?.totalUploads || 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* 1. WELCOME BANNER */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="flex justify-center items-center h-full gap-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0] || 'there'}!</h1>
            <p className="text-purple-100 sm:text-lg">Your personal dashboard is ready. Create QR codes to share your content with the world.</p>
          </div>
          <Sparkles className="absolute top-4 right-4 text-white/30" size={48} />
        </div>

        {/* 2. STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Uploads — shows 5-item limit */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-500 p-3 rounded-xl"><Upload size={24} className="text-white" /></div>
              <ChangeBadge value={stats?.changes?.uploads} />
            </div>
            <p className="text-sm text-slate-600 mb-1">Uploads</p>
            <p className="text-3xl font-bold text-slate-900">{totalUploads}</p>
            <p className="text-xs text-slate-500 mt-2">{totalUploads}/5 items</p>
            <div className="mt-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min((totalUploads / 5) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Total Views */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-green-500 p-3 rounded-xl"><Eye size={24} className="text-white" /></div>
              <ChangeBadge value={stats?.changes?.views} />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total Views</p>
            <p className="text-3xl font-bold text-slate-900">{(stats?.totalViews || 0).toLocaleString()}</p>
          </div>

          {/* QR Codes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-500 p-3 rounded-xl"><QrCode size={24} className="text-white" /></div>
              <ChangeBadge value={stats?.changes?.qrScans} />
            </div>
            <p className="text-sm text-slate-600 mb-1">QR Codes</p>
            <p className="text-3xl font-bold text-slate-900">{stats?.qrCodesGenerated || 0}</p>
          </div>
        </div>

        {/* 3. STORAGE CARD */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-orange-500 p-3 rounded-xl"><HardDrive size={24} className="text-white" /></div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Storage</h3>
              <p className="text-sm text-slate-600">{formatBytes(storageUsed)} of {formatBytes(storageLimit)} used</p>
            </div>
            <span className={`text-2xl font-bold ${storagePct > 80 ? 'text-red-600' : 'text-slate-900'}`}>{storagePct}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${storagePct > 80 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(storagePct, 100)}%` }} />
          </div>
          {storagePct > 80 && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={12} /> Storage almost full. Consider upgrading your plan.</p>
          )}
        </div>

        {/* 4. QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button onClick={() => navigate('/dashboard/upload')} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-6 flex items-center gap-4 hover:opacity-90 transition-opacity group">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={24} /></div>
            <div className="text-left">
              <h3 className="font-bold text-lg">Upload New Content</h3>
              <p className="text-purple-200 text-sm">Add images, videos, audio, or text</p>
            </div>
            <ChevronRight size={24} className="ml-auto" />
          </button>

          <button onClick={() => navigate('/dashboard/items')} className="bg-white border-2 border-slate-200 text-slate-900 rounded-xl p-6 flex items-center gap-4 hover:border-purple-500 transition-colors group">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <FolderOpen size={24} className="text-slate-600 group-hover:text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">View My Items</h3>
              <p className="text-slate-600 text-sm">Manage your uploads and QR codes</p>
            </div>
            <ChevronRight size={24} className="ml-auto text-slate-400" />
          </button>
        </div>

        {/* 5. RECENT ITEMS */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Recent Items</h3>
            <button onClick={() => navigate('/dashboard/items')} className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          {recentItems.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No items yet. Upload your first content!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                return (
                  <div key={item.id} onClick={() => navigate('/dashboard/items')} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <TypeIcon size={20} className="text-purple-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.title || 'Untitled'}</p>
                        <p className="text-sm text-slate-500">{item.views || 0} views{item.stream && <> &middot; {item.stream}</>} &middot; {new Date(item.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-400 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. UPGRADE BANNER */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xl mb-1">Ready to grow?</h3>
              <p className="text-blue-100 text-sm">Upgrade to Small Business for unlimited uploads, advanced analytics, and more!</p>
            </div>
            <button onClick={() => navigate('/dashboard/settings')} className="px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-slate-100 transition-colors flex-shrink-0">Upgrade Now</button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default IndividualDashboard;
