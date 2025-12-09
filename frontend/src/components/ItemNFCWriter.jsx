import { useState, useEffect } from 'react';
import { X, Smartphone, Wifi, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

const ItemNFCWriter = ({ item, nfcUrl, onSuccess, onError, onClose }) => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle'); // idle, writing, success, error
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Use provided nfcUrl or generate from item
  const finalNfcUrl = nfcUrl || `${window.location.origin}/l/${item?.slug}?source=nfc`;

  useEffect(() => {
    // Check if Web NFC API is available
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const writeNFC = async () => {
    if (!nfcSupported) {
      setError('NFC is not supported on this device/browser');
      if (onError) onError(new Error('NFC not supported'));
      return;
    }

    try {
      setNfcStatus('writing');
      setError(null);

      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: finalNfcUrl }]
      });

      setNfcStatus('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('NFC write error:', err);
      setNfcStatus('error');
      
      if (err.name === 'NotAllowedError') {
        setError('NFC permission denied. Please allow NFC access.');
      } else if (err.name === 'NotSupportedError') {
        setError('NFC is not supported on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('NFC tag is not readable. Try a different tag.');
      } else {
        setError(err.message || 'Failed to write NFC tag');
      }
      
      if (onError) onError(err);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(finalNfcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-bold text-primary">Write NFC Tag</h2>
          <p className="text-sm text-gray-500 mt-1">{item?.title || 'Item'}</p>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* NFC URL Display */}
        <div className="mb-6 p-4 bg-purple-50 rounded-xl">
          <p className="text-xs text-gray-600 mb-2">NFC URL:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-primary font-mono break-all">
              {finalNfcUrl}
            </code>
            <button
              onClick={copyUrl}
              className="p-2 hover:bg-purple-100 rounded-lg transition"
              title="Copy URL"
            >
              {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* NFC Support Check */}
        {nfcSupported ? (
          <>
            {/* Write Button */}
            <button
              onClick={writeNFC}
              disabled={nfcStatus === 'writing'}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition ${
                nfcStatus === 'writing'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : nfcStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
              }`}
            >
              {nfcStatus === 'writing' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Hold NFC tag near device...</span>
                </>
              ) : nfcStatus === 'success' ? (
                <>
                  <CheckCircle size={20} />
                  <span>Tag Written Successfully!</span>
                </>
              ) : (
                <>
                  <Wifi size={20} />
                  <span>Write to NFC Tag</span>
                </>
              )}
            </button>

            {/* Status Messages */}
            {nfcStatus === 'success' && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl flex items-start gap-3">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-green-800">Success!</p>
                  <p className="text-sm text-green-700">
                    NFC tag programmed. Tap it with any phone to open this item.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">How to Write:</h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. Click "Write to NFC Tag"</li>
                <li>2. Hold a blank NFC tag near your device</li>
                <li>3. Wait for confirmation</li>
                <li>4. Test by tapping the tag with any phone</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            {/* NFC Not Supported */}
            <div className="p-4 bg-yellow-50 rounded-xl flex items-start gap-3 mb-6">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-yellow-800">Web NFC Not Available</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your browser doesn't support Web NFC. Use Chrome on Android, or use an NFC writing app.
                </p>
              </div>
            </div>

            {/* Manual Instructions */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-3">Manual NFC Writing:</h3>
              <ol className="text-sm text-gray-600 space-y-3">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">1</span>
                  <span>Download an NFC writing app (NFC Tools, NXP TagWriter)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">2</span>
                  <span>Select "Write" → "URL/Link"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">3</span>
                  <span>Paste this URL: <button onClick={copyUrl} className="text-primary underline">{copied ? 'Copied!' : 'Copy URL'}</button></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs">4</span>
                  <span>Tap your NFC tag to write</span>
                </li>
              </ol>
            </div>

            {/* App Links */}
            <div className="mt-4 flex gap-3">
              <a
                href="https://play.google.com/store/apps/details?id=com.wakdev.wdnfc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 border-2 border-primary text-primary rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 transition"
              >
                <ExternalLink size={18} />
                NFC Tools
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.nxp.nfc.tagwriter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <ExternalLink size={18} />
                TagWriter
              </a>
            </div>
          </>
        )}

        {/* Recommended Tags */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold text-gray-800 mb-2">Recommended NFC Tags:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• NTAG213 (144 bytes) - Small URLs</li>
            <li>• NTAG215 (504 bytes) - Medium URLs</li>
            <li>• NTAG216 (888 bytes) - Long URLs</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Available on Amazon, AliExpress, or specialty NFC suppliers.
          </p>
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemNFCWriter;