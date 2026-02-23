import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rocket, Eye, ChevronRight, Loader2, QrCode } from 'lucide-react';
import api from '../services/api';

const PublicCohortViewer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cohort, setCohort] = useState(null);

  useEffect(() => {
    fetchCohort();
  }, [slug]);

  const fetchCohort = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/cohorts/public/${slug}`);
      if (res.data.status === 'success') {
        setCohort(res.data.cohort);
      }
    } catch (err) {
      console.error('Failed to fetch cohort:', err);
      if (err.response?.status === 404) {
        setError('This cohort was not found or is no longer active.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading content...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Content Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // No streams
  if (!cohort || cohort.streams.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket size={28} className="text-purple-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{cohort?.name || 'Cohort'}</h2>
          <p className="text-gray-500 text-sm">No content has been assigned to this group yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  // Success — show streams
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">
            {cohort.organization}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{cohort.name}</h1>
          {cohort.description && (
            <p className="text-gray-500 text-sm">{cohort.description}</p>
          )}
        </div>
      </div>

      {/* Streams List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-4">{cohort.streams.length} stream{cohort.streams.length !== 1 ? 's' : ''} available</p>

        <div className="space-y-3">
          {cohort.streams.map(stream => (
            <a
              key={stream.id}
              href={`/c/${stream.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-purple-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Logo or icon */}
                {stream.logoUrl ? (
                  <img
                    src={stream.logoUrl}
                    alt={stream.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Rocket size={22} className="text-white" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                    {stream.name}
                  </h3>
                  {stream.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{stream.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Eye size={12} /> {(stream.views || 0).toLocaleString()} views
                    </span>
                    <span className="text-xs text-gray-400">
                      {stream.itemCount || 0} item{(stream.itemCount || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8">
        <p className="text-xs text-gray-400">
          Powered by <a href="/" className="text-purple-500 hover:text-purple-700 font-medium">Outbound Impact</a>
        </p>
      </div>
    </div>
  );
};

export default PublicCohortViewer;
