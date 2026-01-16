import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink, Save } from 'lucide-react';
import api from '../services/api';

const EditItemModal = ({ item, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    buttonText: '',
    buttonUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        content: item.type === 'TEXT' ? item.mediaUrl || '' : '',
        buttonText: item.buttonText || '',
        buttonUrl: item.buttonUrl || '',
      });
      setError('');
    }
  }, [item, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ✅ FIXED: Validate button fields for ALL item types (not just TEXT)
    if (formData.buttonText && !formData.buttonUrl) {
      setError('Please enter button URL');
      return;
    }
    if (formData.buttonUrl && !formData.buttonText) {
      setError('Please enter button text');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        // ✅ FIXED: Send button fields for ALL types (not just TEXT)
        buttonText: formData.buttonText || null,
        buttonUrl: formData.buttonUrl || null,
      };

      // Add content for TEXT items
      if (item.type === 'TEXT') {
        updateData.content = formData.content;
      }

      const response = await api.put(`/items/${item.id}`, updateData);

      if (response.data.status === 'success') {
        onSuccess(response.data.item);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Edit Item</h2>
            <p className="text-sm text-gray-600 mt-1">Update your {item.type.toLowerCase()} content</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Add a description"
            />
          </div>

          {/* TEXT Content */}
          {item.type === 'TEXT' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Write your content here..."
                required
              />
            </div>
          )}

          {/* ✅ FIXED: Button Fields - NOW AVAILABLE FOR ALL ITEM TYPES */}
          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                    <ExternalLink size={24} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-primary mb-2">
                    🔗 Custom Button (Optional)
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Add a call-to-action button that appears with your content.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Visit Website"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Button URL
                  </label>
                  <input
                    type="url"
                    value={formData.buttonUrl}
                    onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {formData.buttonText && formData.buttonUrl && (
                <div className="mt-4 p-4 bg-white border border-purple-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <ExternalLink size={18} />
                    {formData.buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File type info for non-TEXT items */}
          {item.type !== 'TEXT' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can edit the title, description, and button link. 
                To change the {item.type.toLowerCase()} file itself, please create a new item.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 gradient-btn text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;
