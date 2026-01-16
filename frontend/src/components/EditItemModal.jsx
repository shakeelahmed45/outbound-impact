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

    // ✅ FIXED: Validate button fields for ALL item types
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
        // ✅ FIXED: Send button fields for ALL types
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      {/* ✅ RESPONSIVE MODAL CONTAINER - Guaranteed to work on all devices */}
      <div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" 
        style={{ 
          maxHeight: 'calc(100vh - 3rem)',
          height: 'auto'
        }}
      >
        
        {/* ✅ FIXED HEADER - Always visible at top */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                <Save size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-bold truncate">Edit Item</h2>
                <p className="text-purple-100 text-xs sm:text-sm">Update your {item.type.toLowerCase()} content</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-all flex-shrink-0"
              aria-label="Close modal"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* ✅ SCROLLABLE CONTENT AREA - Takes available space */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSubmit} id="edit-item-form">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3 sm:mb-4 animate-shake">
                <p className="text-xs sm:text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              
              {/* Title Field */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Enter title"
                  required
                  disabled={saving}
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Add a description"
                  disabled={saving}
                />
              </div>

              {/* TEXT Content Field */}
              {item.type === 'TEXT' && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all"
                    placeholder="Write your content here..."
                    required
                    disabled={saving}
                  />
                </div>
              )}

              {/* ✅ BUTTON FIELDS - Available for ALL types */}
              <div className="border-t-2 border-gray-200 pt-3 sm:pt-4">
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                        <ExternalLink size={16} className="text-white sm:w-5 sm:h-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-purple-900 mb-1">
                        🔗 Custom Button (Optional)
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Add a call-to-action button that appears with your content.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {/* Button Text */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={formData.buttonText}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        placeholder="e.g., Visit Website"
                        maxLength={50}
                        disabled={saving}
                      />
                    </div>

                    {/* Button URL */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Button URL
                      </label>
                      <input
                        type="url"
                        value={formData.buttonUrl}
                        onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        placeholder="https://example.com"
                        disabled={saving}
                      />
                    </div>

                    {/* Button Preview */}
                    {formData.buttonText && formData.buttonUrl && (
                      <div className="mt-2 p-2 sm:p-3 bg-white border-2 border-purple-200 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Preview:</p>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-md"
                        >
                          <ExternalLink size={14} className="sm:w-4 sm:h-4" />
                          {formData.buttonText}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Note for non-TEXT items */}
              {item.type !== 'TEXT' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5 sm:p-3">
                  <p className="text-xs sm:text-sm text-blue-800">
                    <strong>Note:</strong> You can edit the title, description, and button link. 
                    To change the {item.type.toLowerCase()} file itself, please create a new item.
                  </p>
                </div>
              )}

            </div>
          </form>
        </div>

        {/* ✅ FIXED FOOTER - Always visible at bottom */}
        <div className="flex-shrink-0 bg-gray-50 px-4 py-2.5 sm:px-6 sm:py-3 rounded-b-xl sm:rounded-b-2xl border-t-2 border-gray-200">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-item-form"
              disabled={saving}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span className="text-xs sm:text-sm">Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span className="text-xs sm:text-sm">Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
