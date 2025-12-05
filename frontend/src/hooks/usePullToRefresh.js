import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for pull-to-refresh functionality
 * @param {Function} onRefresh - Function to call when refresh is triggered
 * @param {Object} options - Configuration options
 * @returns {Object} - { isRefreshing, pullDistance, containerRef }
 */
const usePullToRefresh = (onRefresh, options = {}) => {
  const {
    pullThreshold = 80, // Distance to pull before triggering refresh
    maxPullDistance = 150, // Maximum pull distance
    resistance = 2.5, // Pull resistance multiplier
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let currentY = 0;

    const handleTouchStart = (e) => {
      // Only start if scrolled to top
      if (container.scrollTop <= 0) {
        touchStartY = e.touches[0].clientY;
        setStartY(touchStartY);
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;

      // Only pull down when at top of page
      if (deltaY > 0 && container.scrollTop <= 0) {
        // Prevent default scrolling while pulling
        e.preventDefault();
        
        // Apply resistance to make pulling feel natural
        const distance = Math.min(deltaY / resistance, maxPullDistance);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      // Trigger refresh if pulled beyond threshold
      if (pullDistance >= pullThreshold && !isRefreshing) {
        setIsRefreshing(true);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          // Keep showing refresh indicator for minimum duration
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        // Snap back if not enough distance
        setPullDistance(0);
      }
    };

    // Mouse events for desktop testing
    let isMouseDown = false;
    let mouseStartY = 0;

    const handleMouseDown = (e) => {
      if (container.scrollTop <= 0) {
        isMouseDown = true;
        mouseStartY = e.clientY;
        setStartY(mouseStartY);
        setIsPulling(true);
      }
    };

    const handleMouseMove = (e) => {
      if (!isMouseDown || !isPulling || isRefreshing) return;

      const deltaY = e.clientY - mouseStartY;

      if (deltaY > 0 && container.scrollTop <= 0) {
        const distance = Math.min(deltaY / resistance, maxPullDistance);
        setPullDistance(distance);
      }
    };

    const handleMouseUp = async () => {
      if (!isMouseDown) return;

      isMouseDown = false;
      setIsPulling(false);

      if (pullDistance >= pullThreshold && !isRefreshing) {
        setIsRefreshing(true);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        setPullDistance(0);
      }
    };

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // Mouse events (for desktop testing)
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPulling, isRefreshing, pullDistance, pullThreshold, maxPullDistance, resistance, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    containerRef,
  };
};

export default usePullToRefresh;