import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const GuideSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden hover:border-primary/30 transition-colors">
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-primary/5 hover:to-secondary/5 transition-all"
      >
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          {title}
        </h3>
        {isOpen ? (
          <ChevronUp className="text-primary" size={20} />
        ) : (
          <ChevronDown className="text-secondary" size={20} />
        )}
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="p-6 bg-white border-t border-gray-100 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};

export default GuideSection;