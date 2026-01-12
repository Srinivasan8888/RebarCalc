import type { ShapeCode, BarDimensions } from '@/types';
import { SHAPE_DEFINITIONS } from '@/lib/constants';

interface ShapeDiagramProps {
  shapeCode: ShapeCode;
  dimensions?: BarDimensions;
  className?: string;
}

export function ShapeDiagram({ shapeCode, dimensions, className = '' }: ShapeDiagramProps) {
  const shape = SHAPE_DEFINITIONS[shapeCode];
  
  if (!shape) {
    return null;
  }

  const renderDimensionLabel = (
    dimension: 'A' | 'B' | 'C' | 'D',
    x: number,
    y: number,
    value?: number
  ) => {
    if (!shape.requiredDimensions.includes(dimension)) {
      return null;
    }

    const displayValue = value ? `${value}mm` : dimension;
    
    return (
      <g key={dimension}>
        <circle
          cx={x}
          cy={y}
          r="12"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgb(59, 130, 246)"
          strokeWidth="1"
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs font-medium fill-blue-600"
        >
          {displayValue}
        </text>
      </g>
    );
  };

  const renderS1Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* Straight bar */}
      <line x1="20" y1="50" x2="180" y2="50" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 100, 30, dimensions?.A)}
      
      {/* Dimension line */}
      <line x1="20" y1="35" x2="180" y2="35" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="20" y1="30" x2="20" y2="40" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="180" y1="30" x2="180" y2="40" stroke="rgb(156, 163, 175)" strokeWidth="1" />
    </svg>
  );

  const renderS2Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* U-bar */}
      <path d="M 20 20 L 20 80 L 180 80 L 180 20" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 100, 15, dimensions?.A)}
      {renderDimensionLabel('B', 15, 50, dimensions?.B)}
      
      {/* Dimension lines */}
      <line x1="20" y1="10" x2="180" y2="10" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="20" y1="5" x2="20" y2="15" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="180" y1="5" x2="180" y2="15" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      
      <line x1="10" y1="20" x2="10" y2="80" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="5" y1="20" x2="15" y2="20" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="5" y1="80" x2="15" y2="80" stroke="rgb(156, 163, 175)" strokeWidth="1" />
    </svg>
  );

  const renderS3Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* Stirrup with hooks */}
      <path d="M 40 10 L 20 10 L 20 90 L 180 90 L 180 10 L 160 10" fill="none" stroke="currentColor" strokeWidth="3" />
      {/* Hooks */}
      <path d="M 40 10 L 50 20" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M 160 10 L 150 20" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 100, 5, dimensions?.A)}
      {renderDimensionLabel('B', 15, 50, dimensions?.B)}
      
      {/* Dimension lines */}
      <line x1="20" y1="0" x2="180" y2="0" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="10" y1="10" x2="10" y2="90" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  );

  const renderS4Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* Cranked bar */}
      <path d="M 20 70 L 60 70 L 100 30 L 140 30 L 180 30" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 40, 85, dimensions?.A)}
      {renderDimensionLabel('B', 80, 15, dimensions?.B)}
      {renderDimensionLabel('C', 160, 15, dimensions?.C)}
      
      {/* Dimension lines */}
      <line x1="20" y1="80" x2="60" y2="80" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="100" y1="20" x2="140" y2="20" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="140" y1="20" x2="180" y2="20" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  );

  const renderS5Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* L-bar */}
      <path d="M 20 20 L 20 80 L 180 80" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 100, 95, dimensions?.A)}
      {renderDimensionLabel('B', 15, 50, dimensions?.B)}
      
      {/* Dimension lines */}
      <line x1="20" y1="90" x2="180" y2="90" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="20" y1="85" x2="20" y2="95" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="180" y1="85" x2="180" y2="95" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      
      <line x1="10" y1="20" x2="10" y2="80" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="5" y1="20" x2="15" y2="20" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="5" y1="80" x2="15" y2="80" stroke="rgb(156, 163, 175)" strokeWidth="1" />
    </svg>
  );

  const renderS6Diagram = () => (
    <svg viewBox="0 0 200 100" className={`w-full h-24 ${className}`}>
      {/* Hooked bar */}
      <path d="M 20 50 L 160 50" fill="none" stroke="currentColor" strokeWidth="3" />
      {/* Hook */}
      <path d="M 160 50 Q 180 50 180 70 Q 180 90 160 90" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Dimension labels */}
      {renderDimensionLabel('A', 90, 35, dimensions?.A)}
      
      {/* Dimension line */}
      <line x1="20" y1="40" x2="160" y2="40" stroke="rgb(156, 163, 175)" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="20" y1="35" x2="20" y2="45" stroke="rgb(156, 163, 175)" strokeWidth="1" />
      <line x1="160" y1="35" x2="160" y2="45" stroke="rgb(156, 163, 175)" strokeWidth="1" />
    </svg>
  );

  const renderDiagram = () => {
    switch (shapeCode) {
      case 'S1':
        return renderS1Diagram();
      case 'S2':
        return renderS2Diagram();
      case 'S3':
        return renderS3Diagram();
      case 'S4':
        return renderS4Diagram();
      case 'S5':
        return renderS5Diagram();
      case 'S6':
        return renderS6Diagram();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">{shape.code}</span>
        <span className="text-sm text-muted-foreground">{shape.name}</span>
      </div>
      <div className="border rounded-md p-4 bg-muted/20">
        {renderDiagram()}
      </div>
      <p className="text-xs text-muted-foreground">{shape.description}</p>
      {shape.requiredDimensions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Required dimensions: {shape.requiredDimensions.join(', ')}
        </div>
      )}
    </div>
  );
}

// Compact version for use in dropdowns or small spaces
export function ShapeIcon({ shapeCode, className = '' }: { shapeCode: ShapeCode; className?: string }) {
  const shape = SHAPE_DEFINITIONS[shapeCode];
  
  if (!shape) {
    return null;
  }

  const renderCompactDiagram = () => {
    switch (shapeCode) {
      case 'S1':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'S2':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <path d="M 4 6 L 4 18 L 20 18 L 20 6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'S3':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <path d="M 8 4 L 4 4 L 4 20 L 20 20 L 20 4 L 16 4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 8 4 L 10 6 M 16 4 L 14 6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'S4':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <path d="M 4 16 L 8 16 L 12 8 L 16 8 L 20 8" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'S5':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <path d="M 4 6 L 4 18 L 20 18" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      case 'S6':
        return (
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className}`}>
            <path d="M 4 12 L 16 12 Q 20 12 20 16 Q 20 20 16 20" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return renderCompactDiagram();
}