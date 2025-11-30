import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const NetworkWarning = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-600 to-red-500 text-white py-4 px-4 text-center z-50 shadow-lg animate-pulse">
      <div className="flex items-center justify-center gap-2">
        <WifiOff size={20} />
        <p className="font-semibold">⚠️ Please connect your internet</p>
      </div>
    </div>
  );
};

export default NetworkWarning;
