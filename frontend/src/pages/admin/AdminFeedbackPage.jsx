import { useState, useEffect } from 'react';
import { MessageSquare, Mail, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const AdminFeedbackPage = () => {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [selectedStatus]);

  const fetchFeedback = async () => {
    try {
      const params = selectedStatus ? `?status=${selectedStatus}` : '';
      const response = await api.get(`/feedback/all${params}`);
      if (response.data.status === 'success') {
        setFeedback(response.data.feedback);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await api.put(`/feedback/${id}/status`, { status });
      if (response.data.status === 'success') {
        setFeedback(feedback.map(f => f.id === id ? response.data.feedback : f));
        fetchFeedback();
        alert('Feedback status updated!');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      await api.delete(`/feedback/${id}`);
      setFeedback(feedback.filter(f => f.id !== id));
      fetchFeedback();
      alert('Feedback deleted!');
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      REVIEWED: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      PENDING: <Clock size={16} />,
      REVIEWED: <Mail size={16} />,
      RESOLVED: <CheckCircle size={16} />,
    };
    return icons[status] || <Clock size={16} />;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
            <MessageSquare size={32} />
            User Feedback
          </h1>
          <p className="text-secondary">Manage and respond to user feedback</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={24} className="text-gray-600" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Feedback</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.pending}</p>
            <p className="text-sm opacity-90">Pending</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Mail size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.reviewed}</p>
            <p className="text-sm opacity-90">Reviewed</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={24} />
            </div>
            <p className="text-3xl font-bold mb-1">{stats.resolved}</p>
            <p className="text-sm opacity-90">Resolved</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="font-semibold text-gray-700">Filter by Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Feedback</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        {feedback.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Feedback</h3>
            <p className="text-gray-500">
              {selectedStatus ? `No ${selectedStatus.toLowerCase()} feedback found` : 'No feedback submissions yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{item.subject}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      From: <strong>{item.user.name}</strong> ({item.user.email}) • 
                      {item.user.role} • 
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">{item.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  {item.status !== 'REVIEWED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all flex items-center gap-2"
                    >
                      <Mail size={16} />
                      Mark as Reviewed
                    </button>
                  )}
                  {item.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Mark as Resolved
                    </button>
                  )}
                  {item.status !== 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'PENDING')}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-all flex items-center gap-2"
                    >
                      <Clock size={16} />
                      Mark as Pending
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeedbackPage;