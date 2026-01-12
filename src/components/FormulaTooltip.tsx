import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShapeCode } from '@/types';
import { formulaDisplayService } from '@/lib/formula-display-service';

interface FormulaTooltipProps {
  shapeCode: ShapeCode;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function FormulaTooltip({ 
  shapeCode, 
  children, 
  className,
  side = 'top',
  align = 'center'
}: FormulaTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const formula = formulaDisplayService.getFormulaTooltip(shapeCode);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate position based on side and align props
    let x = 0;
    let y = 0;

    switch (side) {
      case 'top':
        x = rect.left + (align === 'start' ? 0 : align === 'end' ? rect.width : rect.width / 2);
        y = rect.top - 8;
        break;
      case 'bottom':
        x = rect.left + (align === 'start' ? 0 : align === 'end' ? rect.width : rect.width / 2);
        y = rect.bottom + 8;
        break;
      case 'left':
        x = rect.left - 8;
        y = rect.top + (align === 'start' ? 0 : align === 'end' ? rect.height : rect.height / 2);
        break;
      case 'right':
        x = rect.right + 8;
        y = rect.top + (align === 'start' ? 0 : align === 'end' ? rect.height : rect.height / 2);
        break;
    }

    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    }
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  const handleFocus = (e: React.FocusEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top - 8;
    
    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        className={cn(
          "relative inline-flex items-center cursor-help",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        role="button"
        aria-label={`Formula for ${shapeCode}: ${formula}`}
        aria-describedby={isVisible ? `tooltip-${shapeCode}` : undefined}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          id={`tooltip-${shapeCode}`}
          role="tooltip"
          className="fixed z-50 pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: getTransform(side, align)
          }}
        >
          <div className={cn(
            "bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg border",
            "max-w-xs text-sm font-mono whitespace-nowrap",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{formula}</span>
            </div>
            
            {/* Tooltip arrow */}
            <div 
              className={cn(
                "absolute w-2 h-2 bg-popover border rotate-45",
                getArrowClasses(side)
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Helper function to get transform based on position
function getTransform(side: string, align: string): string {
  switch (side) {
    case 'top':
      return align === 'start' ? 'translateY(-100%)' : 
             align === 'end' ? 'translate(-100%, -100%)' : 
             'translate(-50%, -100%)';
    case 'bottom':
      return align === 'start' ? 'translateY(0%)' : 
             align === 'end' ? 'translate(-100%, 0%)' : 
             'translate(-50%, 0%)';
    case 'left':
      return align === 'start' ? 'translate(-100%, 0%)' : 
             align === 'end' ? 'translate(-100%, -100%)' : 
             'translate(-100%, -50%)';
    case 'right':
      return align === 'start' ? 'translateY(0%)' : 
             align === 'end' ? 'translateY(-100%)' : 
             'translateY(-50%)';
    default:
      return 'translate(-50%, -100%)';
  }
}

// Helper function to get arrow positioning classes
function getArrowClasses(side: string): string {
  switch (side) {
    case 'top':
      return 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-0 border-l-0';
    case 'bottom':
      return 'top-[-4px] left-1/2 -translate-x-1/2 border-b-0 border-r-0';
    case 'left':
      return 'right-[-4px] top-1/2 -translate-y-1/2 border-l-0 border-b-0';
    case 'right':
      return 'left-[-4px] top-1/2 -translate-y-1/2 border-r-0 border-t-0';
    default:
      return 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-0 border-l-0';
  }
}

// Simple wrapper for adding formula tooltip to any element
export function WithFormulaTooltip({ 
  shapeCode, 
  children, 
  ...props 
}: FormulaTooltipProps) {
  return (
    <FormulaTooltip shapeCode={shapeCode} {...props}>
      {children}
    </FormulaTooltip>
  );
}