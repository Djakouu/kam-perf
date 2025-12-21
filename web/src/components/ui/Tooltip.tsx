import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Center horizontally
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      
      // Position above
      let top = triggerRect.top - tooltipRect.height - 8;

      // Boundary checks
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top < 10) {
        // Flip to bottom if not enough space on top
        top = triggerRect.bottom + 8;
      }

      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <div 
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={cn(
            "fixed z-50 px-3 py-2 text-sm font-medium text-neutral-700 bg-white rounded-lg shadow-lg border border-neutral-200 whitespace-nowrap pointer-events-none transition-opacity duration-200",
            className
          )}
          style={{ top: position.top, left: position.left, width: 'max-content' }}
        >
          {content}
          {/* Arrow (optional, simplified) */}
          <div className="absolute w-2 h-2 bg-white border-r border-b border-neutral-200 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1" 
               style={{ display: position.top < (triggerRef.current?.getBoundingClientRect().top || 0) ? 'block' : 'none' }} />
           <div className="absolute w-2 h-2 bg-white border-l border-t border-neutral-200 transform rotate-45 left-1/2 -translate-x-1/2 -top-1" 
               style={{ display: position.top > (triggerRef.current?.getBoundingClientRect().top || 0) ? 'block' : 'none' }} />
        </div>
      )}
    </div>
  );
}
