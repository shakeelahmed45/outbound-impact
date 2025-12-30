import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const SplashScreen = ({ onAnimationEnd }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (onAnimationEnd) {
              onAnimationEnd();
            }
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onAnimationEnd]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-200 to-violet-300 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-200 to-purple-300 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Luxury Logo Container */}
        <div className="mb-10 relative">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 w-40 h-40 mx-auto">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 blur-xl opacity-40 animate-pulse"></div>
          </div>
          
          {/* Main Logo Circle with Spinning Border */}
          <div className="relative w-40 h-40 mx-auto">
            {/* Spinning Gradient Border */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 rounded-full animate-spin-slow"></div>
            
            {/* White Inner Circle */}
            <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center shadow-2xl">
              {/* Your Original Logo */}
              <img 
                src="/logo.webp" 
                alt="Outbound Impact" 
                className="w-24 h-24 object-contain animate-pulse-gentle"
              />
            </div>
          </div>

          {/* Sparkle Effects */}
          <Sparkles className="absolute top-2 right-8 text-yellow-400 animate-pulse" size={20} />
          <Sparkles className="absolute bottom-4 left-6 text-purple-400 animate-pulse delay-500" size={16} />
        </div>

        {/* App Name with Gradient */}
        <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
          Outbound Impact
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 text-sm font-medium mb-10 tracking-wider uppercase">
          WHERE CONNECTION LIVES
        </p>

        {/* Modern Progress Bar */}
        <div className="w-80 mx-auto">
          <div className="relative">
            {/* Background Track */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              {/* Gradient Progress */}
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 transition-all duration-300 ease-out rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
              </div>
            </div>
          </div>
          
          {/* Progress Text */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loading</span>
            <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
        </div>

        {/* Bottom Tagline */}
        <p className="text-gray-400 text-xs mt-12 font-medium tracking-wide">
          Share Your Impact • Inspire the World
        </p>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 3s ease-in-out infinite;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;