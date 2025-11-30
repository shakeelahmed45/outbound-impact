import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle size={24} className="text-green-500" />,
    error: <XCircle size={24} className="text-red-500" />,
    warning: <AlertCircle size={24} className="text-yellow-500" />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${colors[type]} border-2 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-slide-in`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <p className="flex-1 text-gray-800 font-medium">{message}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default Toast;