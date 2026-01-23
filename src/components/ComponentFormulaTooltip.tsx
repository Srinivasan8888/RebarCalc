import React, { useState } from 'react';
import { Info, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentBarEntry } from '@/types/component-types';

interface ComponentFormulaTooltipProps {
  bar: ComponentBarEntry;
  children: React.ReactNode;
  className?: string;
}

export function ComponentFormulaTooltip({ 
  bar, 
  children, 
  className 
}: ComponentFormulaTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const getFormulaInfo = (barType: string) => {
    const normalizedType = barType.toLowerCase();
    
    if (normalizedType.includes('bottom bar (x-x)') || normalizedType.includes('bottom bar (y-y)')) {
      return {
        title: 'U-Bar Calculation (Excel BBS Format)',
        formula: 'a + b + c + d + e + f',
        description: 'Standard addition of all segments',
        segments: [
          'a = Bottom span',
          'b = 2 × beam penetration',
          'c = 4 × vertical rise',
          'd = Single vertical rise',
          'e = Single vertical rise', 
          'f = Top extensions'
        ]
      };
    }
    
    if (normalizedType.includes('dist')) {
      return {
        title: 'Distribution Bar',
        formula: 'a + b + c + d + e',
        description: 'Uses perpendicular span',
        segments: [
          'a = Perpendicular span',
          'b = Beam - cover',
          'c = Beam - cover',
          'd = Foot length (95mm)',
          'e = Foot length (95mm)'
        ]
      };
    }
    
    if (normalizedType.includes('top')) {
      return {
        title: 'Top Bar',
        formula: 'a + b + c + d + e + f',
        description: 'Standard addition',
        segments: [
          'a = Span',
          'b = Beam penetration',
          'c = Vertical rise',
          'd = Beam penetration',
          'e = Extension',
          'f = Extension'
        ]
      };
    }
    
    return {
      title: 'Standard Bar',
      formula: 'a + b + c + d + e + f',
      description: 'Standard addition of segments',
      segments: ['Segments added as specified']
    };
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ 
      x: rect.left + rect.width / 2, 
      y: rect.top - 8 
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const formulaInfo = getFormulaInfo(bar.barType);

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
        tabIndex={0}
        role="button"
        aria-label={`Formula for ${bar.barType}: ${formulaInfo.formula}`}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          role="tooltip"
          className="fixed z-50 pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className={cn(
            "bg-popover text-popover-foreground px-4 py-3 rounded-md shadow-lg border",
            "max-w-sm text-sm",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Calculator className="h-4 w-4 text-primary" />
                <span>{formulaInfo.title}</span>
              </div>
              
              <div className="font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                {formulaInfo.formula}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {formulaInfo.description}
              </div>
              
              <div className="space-y-1">
                {formulaInfo.segments.map((segment, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    • {segment}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tooltip arrow */}
            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border rotate-45 border-t-0 border-l-0" />
          </div>
        </div>
      )}
    </>
  );
}