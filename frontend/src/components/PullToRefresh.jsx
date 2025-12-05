import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh - Visual indicator component for pull-to-refresh
 * @param {boolean} isRefreshing - Whether refresh is in progress
 * @param {number} pullDistance - Current pull distance
 * @param {boolean} isPulling - Whether user is currently pulling
 */
const PullToRefresh = ({ isRefreshing, pullDistance, isPulling }) => {
  const pullThreshold = 80;
  const opacity = Math.min(pullDistance / pullThreshold, 1);
  const rotation = (pullDistance / pullThreshold) * 360;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance, 100)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div
        className="mt-4 bg-white rounded-full shadow-lg p-3 flex items-center justify-center"
        style={{
          opacity: opacity,
          transform: `scale(${Math.min(pullDistance / 100, 1)})`,
          transition: isPulling ? 'none' : 'opacity 0.3s ease-out, transform 0.3s ease-out',
        }}
      >
        <RefreshCw
          className={`text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`}
          size={24}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.1s linear',
          }}
        />
      </div>
      
      {/* Loading text */}
      {isRefreshing && (
        <div
          className="absolute top-20 text-purple-600 font-semibold text-sm"
          style={{
            animation: 'fadeIn 0.3s ease-in',
          }}
        >
          Refreshing...
        </div>
      )}
    </div>
  );
};

export default PullToRefresh;