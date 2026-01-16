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

    // Validate button fields for ALL item types
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
        buttonText: formData.buttonText || null,
        buttonUrl: formData.buttonUrl || null,
      };

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      {/* ULTRA-COMPACT MODAL - Maximum space efficiency */}
      <div 
        className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-sm flex flex-col" 
        style={{ 
          maxHeight: 'calc(100vh - 16px)',
          height: 'auto'
        }}
      >
        
        {/* MINIMAL HEADER */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-3 py-2 rounded-t-lg sm:rounded-t-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Save size={16} className="flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold truncate">Edit Item</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-full transition-all flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT - ULTRA COMPACT */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <form onSubmit={handleSubmit} id="edit-item-form">
            
            {/* Error - Minimal */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-1.5 mb-2">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  disabled={saving}
                />
              </div>

              {/* TEXT Content */}
              {item.type === 'TEXT' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    required
                    disabled={saving}
                  />
                </div>
              )}

              {/* MINIMAL BUTTON SECTION */}
              <div className="border-t border-gray-200 pt-2">
                <div className="bg-purple-50 border border-purple-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center flex-shrink-0">
                      <ExternalLink size={12} className="text-white" />
                    </div>
                    <h4 className="text-xs font-bold text-purple-900">Custom Button (Optional)</h4>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Button Text"
                      maxLength={50}
                      disabled={saving}
                    />
                    <input
                      type="url"
                      value={formData.buttonUrl}
                      onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="https://example.com"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* MINIMAL NOTE */}
              {item.type !== 'TEXT' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Edit title, description & button. To change the {item.type.toLowerCase()} file, create a new item.
                  </p>
                </div>
              )}

            </div>
          </form>
        </div>

        {/* FIXED FOOTER - ALWAYS VISIBLE */}
        <div className="flex-shrink-0 bg-gray-50 px-3 py-2 rounded-b-lg sm:rounded-b-xl border-t border-gray-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-item-form"
              disabled={saving}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded text-sm font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save</span>
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
