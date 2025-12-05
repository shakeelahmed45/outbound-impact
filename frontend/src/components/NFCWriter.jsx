import { useState } from 'react';
import { Nfc, Check, X, AlertCircle, Info } from 'lucide-react';

/**
 * NFCWriter Component
 * Allows users to write NFC tags directly from browser
 * Uses Web NFC API (Chrome Android, Safari iOS 13+)
 */
const NFCWriter = ({ item, nfcUrl, onSuccess, onError }) => {
  const [writing, setWriting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);

  // Check if NFC is supported
  const checkNFCSupport = () => {
    if (!('NDEFReader' in window)) {
      setSupported(false);
      return false;
    }
    return true;
  };

  // Write NFC tag
  const writeNFCTag = async () => {
    if (!checkNFCSupport()) {
      setError('NFC is not supported on this device/browser');
      return;
    }

    setWriting(true);
    setError(null);
    setSuccess(false);

    try {
      const ndef = new NDEFReader();
      
      // Request permission and write
      await ndef.write({
        records: [
          {
            recordType: "url",
            data: nfcUrl
          }
        ]
      });

      setSuccess(true);
      setWriting(false);
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('NFC write error:', err);
      
      let errorMessage = 'Failed to write NFC tag';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'NFC permission denied. Please allow NFC access.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'NFC is not supported on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'NFC tag is not writable or out of range.';
      }
      
      setError(errorMessage);
      setWriting(false);
      
      if (onError) {
        onError(err);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
          <Nfc className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Write NFC Tag</h3>
          <p className="text-sm text-gray-600">Tap to write this item to an NFC tag</p>
        </div>
      </div>

      {/* NFC URL Display */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-gray-600 mb-1">NFC URL:</p>
        <p className="text-sm text-gray-900 break-all font-mono">{nfcUrl}</p>
      </div>

      {/* Browser Support Warning */}
      {!supported && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-yellow-900">NFC Not Supported</p>
            <p className="text-xs text-yellow-700 mt-1">
              Your browser doesn't support Web NFC. Use Chrome on Android or Safari on iOS 13+.
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 animate-in fade-in duration-300">
          <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-green-900">NFC Tag Written!</p>
            <p className="text-xs text-green-700 mt-1">
              The tag is ready to use. Tap it with any phone to view your content.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <X className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold text-red-900">Write Failed</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Write Button */}
      <button
        onClick={writeNFCTag}
        disabled={!supported || writing}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          !supported || writing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-violet-500 text-white hover:shadow-lg'
        }`}
      >
        <Nfc size={20} className={writing ? 'animate-pulse' : ''} />
        {writing ? 'Hold tag near phone...' : 'Write to NFC Tag'}
      </button>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-semibold text-blue-900 mb-1">How to write:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Write to NFC Tag" button</li>
              <li>Hold a blank NFC tag near your phone</li>
              <li>Wait for success confirmation</li>
              <li>Test by tapping the tag with any phone</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Where to buy tags */}
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          Don't have NFC tags?{' '}
          <a 
            href="https://amazon.com/nfc-tags" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            Buy NFC tags →
          </a>
        </p>
      </div>
    </div>
  );
};

export default NFCWriter;