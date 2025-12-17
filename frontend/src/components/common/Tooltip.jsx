import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ 
  content, 
  children, 
  position = 'top',
  icon = true,
  iconSize = 16,
  className = '',
  maxWidth = '250px'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    // Detect mobile devices
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Close tooltip when clicking outside
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsVisible(false);
      }
    };

    if (isVisible && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, isMobile]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsVisible(false);
    }
  };

  const handleClick = (e) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation();
      setIsVisible(!isVisible);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent';
    }
  };

  return (
    // ✅ FIXED: Changed from <div> to <span> to prevent nesting issues when used inside <p> tags
    <span className={`relative inline-flex items-center ${className}`} ref={tooltipRef}>
      {/* Trigger Element */}
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-help inline-flex items-center"
      >
        {children || (
          icon && (
            <HelpCircle 
              size={iconSize} 
              className="text-primary hover:text-secondary transition-colors"
            />
          )
        )}
      </span>

      {/* Tooltip Content */}
      {isVisible && (
        <div
          className={`absolute z-50 ${getPositionClasses()} animate-fadeIn`}
          style={{ maxWidth }}
        >
          <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl">
            {content}
            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
            />
          </div>
        </div>
      )}
    </span>
  );
};

export default Tooltip;
