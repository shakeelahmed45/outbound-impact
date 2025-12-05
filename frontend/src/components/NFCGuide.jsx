import { Smartphone, Zap, ShieldCheck, Sparkles, QrCode } from 'lucide-react';

/**
 * NFCGuide Component
 * Educational guide about NFC technology for users
 */
const NFCGuide = ({ onClose }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-500 p-6 rounded-t-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">What is NFC?</h2>
        <p className="text-purple-100">Near Field Communication - The future of content sharing</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        
        {/* What is NFC */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">📱 How NFC Works</h3>
          <p className="text-gray-700 leading-relaxed">
            NFC (Near Field Communication) lets people tap their phone on a tag or sticker to instantly 
            open your content. No camera scanning required - just a quick tap!
          </p>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">✨ Why Use NFC?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Zap className="text-green-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-semibold text-green-900 text-sm">Instant Access</p>
                <p className="text-xs text-green-700">Opens in under 1 second</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Smartphone className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-semibold text-blue-900 text-sm">No App Needed</p>
                <p className="text-xs text-blue-700">Works with all modern phones</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <ShieldCheck className="text-purple-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-semibold text-purple-900 text-sm">Works in Dark</p>
                <p className="text-xs text-purple-700">No camera or light needed</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Sparkles className="text-orange-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-semibold text-orange-900 text-sm">Professional</p>
                <p className="text-xs text-orange-700">Premium user experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* NFC vs QR */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">🆚 NFC vs QR Codes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Feature</th>
                  <th className="text-center py-2 px-3 font-semibold text-purple-600">NFC</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">QR Code</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">Speed</td>
                  <td className="text-center py-2 px-3">⚡ Instant</td>
                  <td className="text-center py-2 px-3">2-3 seconds</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">Works in dark</td>
                  <td className="text-center py-2 px-3">✅ Yes</td>
                  <td className="text-center py-2 px-3">❌ No</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">Cost</td>
                  <td className="text-center py-2 px-3">$0.50-2/tag</td>
                  <td className="text-center py-2 px-3">Free</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-3">Durability</td>
                  <td className="text-center py-2 px-3">⭐⭐⭐⭐⭐</td>
                  <td className="text-center py-2 px-3">⭐⭐⭐</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Professional feel</td>
                  <td className="text-center py-2 px-3">⭐⭐⭐⭐⭐</td>
                  <td className="text-center py-2 px-3">⭐⭐⭐</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Use Cases */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">💼 Popular Use Cases</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2">
              <span className="text-purple-600 font-bold text-sm">→</span>
              <p className="text-sm text-gray-700"><strong>Business Cards:</strong> Tap to share contact info</p>
            </div>
            <div className="flex items-start gap-2 p-2">
              <span className="text-purple-600 font-bold text-sm">→</span>
              <p className="text-sm text-gray-700"><strong>Product Tags:</strong> Tap to view specs/videos</p>
            </div>
            <div className="flex items-start gap-2 p-2">
              <span className="text-purple-600 font-bold text-sm">→</span>
              <p className="text-sm text-gray-700"><strong>Event Badges:</strong> Tap to access schedule/info</p>
            </div>
            <div className="flex items-start gap-2 p-2">
              <span className="text-purple-600 font-bold text-sm">→</span>
              <p className="text-sm text-gray-700"><strong>Posters/Displays:</strong> Tap for more details</p>
            </div>
          </div>
        </div>

        {/* Compatibility */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">📱 Phone Compatibility</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
            <div>
              <p className="font-semibold text-gray-800">✅ iPhone:</p>
              <p>iPhone 7 and newer</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">✅ Android:</p>
              <p>Most phones since 2015</p>
            </div>
          </div>
        </div>

        {/* Buy Tags CTA */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
          <h4 className="font-bold text-purple-900 mb-2">🏷️ Get NFC Tags</h4>
          <p className="text-sm text-purple-800 mb-3">
            Ready to start using NFC? Purchase high-quality NFC tags online.
          </p>
          <div className="flex gap-2 flex-wrap">
            <a
              href="https://amazon.com/s?k=nfc+tags"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
            >
              Buy on Amazon
            </a>
            <a
              href="https://www.aliexpress.com/wholesale?SearchText=nfc+tags"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors"
            >
              Budget Options
            </a>
          </div>
          <p className="text-xs text-purple-700 mt-2">
            💡 Tip: Look for "NTAG215" or "NTAG216" tags - they work with all phones
          </p>
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      )}
    </div>
  );
};

export default NFCGuide;