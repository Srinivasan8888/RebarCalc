import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentBarEntry, CalculatedBarResult } from '@/types/component-types';

interface CalculationVerificationBadgeProps {
  bar: ComponentBarEntry;
  calculated?: CalculatedBarResult;
  className?: string;
}

export function CalculationVerificationBadge({ 
  bar, 
  calculated, 
  className 
}: CalculationVerificationBadgeProps) {
  
  if (!calculated) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">Not calculated</span>
      </div>
    );
  }

  // Check if this is a U-bar (has b, c, d segments)
  const isUBar = bar.measurements.b && bar.measurements.c && bar.measurements.d;
  
  // Verify calculation method
  const segmentSum = (bar.measurements.a || 0) + 
                    (bar.measurements.b || 0) + 
                    (bar.measurements.c || 0) + 
                    (bar.measurements.d || 0) + 
                    (bar.measurements.e || 0) + 
                    (bar.measurements.f || 0) + 
                    (bar.measurements.lap || 0);
  
  const matchesTotal = Math.abs(segmentSum - calculated.totalMeasurement) < 5; // Allow 5mm tolerance
  
  // Determine verification status
  let status: 'verified' | 'warning' | 'info' = 'info';
  let message = 'Standard calculation';
  
  if (bar.barType.includes('Bottom Bar') && isUBar) {
    if (matchesTotal) {
      status = 'verified';
      message = 'Excel BBS format ✓';
    } else {
      status = 'warning';
      message = `Check calculation (${segmentSum} ≠ ${calculated.totalMeasurement})`;
    }
  } else if (bar.barType.includes('Dist') && bar.measurements.a && bar.measurements.b) {
    if (matchesTotal) {
      status = 'verified';
      message = 'Distribution bar ✓';
    } else {
      status = 'warning';
      message = 'Check calculation';
    }
  } else if (matchesTotal) {
    status = 'verified';
    message = 'Calculation verified';
  }

  const icons = {
    verified: CheckCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    verified: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const Icon = icons[status];

  return (
    <div className={cn(
      "flex items-center gap-1",
      colors[status],
      className
    )}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
}