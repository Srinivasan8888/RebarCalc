import { Shield, ShieldCheck, ShieldAlert, Info, Settings, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectConfig, BarEntry, ShapeCode } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';

interface CalculationVerificationIndicatorProps {
  bar: BarEntry;
  config: ProjectConfig;
  className?: string;
  showDetails?: boolean;
}

export interface CalculationConfidence {
  level: 'high' | 'medium' | 'low';
  score: number; // 0-100
  factors: ConfidenceFactor[];
  dataSource: DataSourceInfo;
}

interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number;
}

interface DataSourceInfo {
  profileSource: 'standard' | 'custom' | 'manual';
  profileName: string;
  parametersUsed: string[];
  lastModified?: Date;
}

export function CalculationVerificationIndicator({ 
  bar, 
  config, 
  className,
  showDetails = false 
}: CalculationVerificationIndicatorProps) {
  const confidence = calculateConfidence(bar, config);
  
  const getConfidenceIcon = (level: CalculationConfidence['level']) => {
    switch (level) {
      case 'high':
        return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
    }
  };

  const getConfidenceColor = (level: CalculationConfidence['level']) => {
    switch (level) {
      case 'high':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-red-200 bg-red-50 text-red-800';
    }
  };

  const getDataSourceIcon = (source: DataSourceInfo['profileSource']) => {
    switch (source) {
      case 'standard':
        return <FileText className="h-3 w-3 text-blue-600" />;
      case 'custom':
        return <Settings className="h-3 w-3 text-purple-600" />;
      case 'manual':
        return <Info className="h-3 w-3 text-gray-600" />;
    }
  };

  if (!showDetails) {
    // Compact indicator for table display
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {getConfidenceIcon(confidence.level)}
        <span className="text-xs font-medium">
          {confidence.score}%
        </span>
      </div>
    );
  }

  // Detailed indicator for modal or expanded view
  return (
    <div className={cn("space-y-3", className)}>
      {/* Confidence Level */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        getConfidenceColor(confidence.level)
      )}>
        <div className="flex items-center gap-2">
          {getConfidenceIcon(confidence.level)}
          <span className="font-medium">
            Calculation Confidence: {confidence.level.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{confidence.score}%</div>
          <div className="text-xs opacity-75">Confidence Score</div>
        </div>
      </div>

      {/* Data Source Attribution */}
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          {getDataSourceIcon(confidence.dataSource.profileSource)}
          <span className="font-medium text-sm">Data Source</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span>Profile:</span>
            <Badge variant="outline" className="text-xs">
              {confidence.dataSource.profileName}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Type:</span>
            <span className="capitalize text-muted-foreground">
              {confidence.dataSource.profileSource}
            </span>
          </div>
          {confidence.dataSource.lastModified && (
            <div className="flex items-center justify-between">
              <span>Modified:</span>
              <span className="text-muted-foreground text-xs">
                {confidence.dataSource.lastModified.toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Parameters Used */}
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="font-medium text-sm mb-2">Parameters Applied</div>
        <div className="flex flex-wrap gap-1">
          {confidence.dataSource.parametersUsed.map((param, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {param}
            </Badge>
          ))}
        </div>
      </div>

      {/* Confidence Factors */}
      {confidence.factors.length > 0 && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="font-medium text-sm mb-2">Confidence Factors</div>
          <div className="space-y-2">
            {confidence.factors.map((factor, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  factor.impact === 'positive' && "bg-green-500",
                  factor.impact === 'negative' && "bg-red-500",
                  factor.impact === 'neutral' && "bg-gray-400"
                )} />
                <div className="flex-1">
                  <div className="font-medium">{factor.factor}</div>
                  <div className="text-muted-foreground text-xs">
                    {factor.description}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}
                  {factor.weight}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate confidence score and factors for a bar calculation
 */
function calculateConfidence(bar: BarEntry, config: ProjectConfig): CalculationConfidence {
  const factors: ConfidenceFactor[] = [];
  let baseScore = 50; // Start with neutral confidence
  
  // Get profile information
  const profile = config.codeProfileId ? codeProfileService.getProfile(config.codeProfileId) : null;
  
  // Factor 1: Code profile source
  if (profile && !profile.isEditable) {
    // Standard profile (IS 456, BS 8110)
    factors.push({
      factor: 'Standard Code Profile',
      impact: 'positive',
      description: `Using ${profile.standard} standard parameters`,
      weight: 25
    });
    baseScore += 25;
  } else if (profile && profile.isEditable) {
    // Custom profile
    factors.push({
      factor: 'Custom Profile',
      impact: 'neutral',
      description: 'Using user-defined parameters',
      weight: 0
    });
  } else {
    // Manual/legacy configuration
    factors.push({
      factor: 'Manual Configuration',
      impact: 'negative',
      description: 'Parameters not from standard profile',
      weight: -15
    });
    baseScore -= 15;
  }
  
  // Factor 2: Shape complexity
  const shapeComplexity = getShapeComplexity(bar.shapeCode);
  if (shapeComplexity === 'simple') {
    factors.push({
      factor: 'Simple Shape',
      impact: 'positive',
      description: 'Straightforward calculation with minimal bends',
      weight: 10
    });
    baseScore += 10;
  } else if (shapeComplexity === 'complex') {
    factors.push({
      factor: 'Complex Shape',
      impact: 'negative',
      description: 'Multiple bends and deductions increase calculation complexity',
      weight: -10
    });
    baseScore -= 10;
  }
  
  // Factor 3: Dimension completeness
  const requiredDims = getRequiredDimensions(bar.shapeCode);
  const providedDims = Object.values(bar.dimensions).filter(d => d !== undefined && d > 0).length;
  if (providedDims >= requiredDims.length) {
    factors.push({
      factor: 'Complete Dimensions',
      impact: 'positive',
      description: 'All required dimensions provided',
      weight: 15
    });
    baseScore += 15;
  } else {
    factors.push({
      factor: 'Missing Dimensions',
      impact: 'negative',
      description: `${requiredDims.length - providedDims} dimensions missing or zero`,
      weight: -20
    });
    baseScore -= 20;
  }
  
  // Factor 4: Standard diameter
  const standardDiameters = [6, 8, 10, 12, 16, 20, 25, 32];
  if (standardDiameters.includes(bar.diameter)) {
    factors.push({
      factor: 'Standard Diameter',
      impact: 'positive',
      description: 'Using standard rebar diameter',
      weight: 5
    });
    baseScore += 5;
  } else {
    factors.push({
      factor: 'Non-standard Diameter',
      impact: 'negative',
      description: 'Unusual diameter may affect calculation accuracy',
      weight: -10
    });
    baseScore -= 10;
  }
  
  // Factor 5: Recent profile updates
  if (profile && config.updatedAt) {
    const daysSinceUpdate = Math.floor((Date.now() - config.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate <= 30) {
      factors.push({
        factor: 'Recent Configuration',
        impact: 'positive',
        description: 'Profile updated within last 30 days',
        weight: 5
      });
      baseScore += 5;
    }
  }
  
  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, baseScore));
  
  // Determine confidence level
  let level: CalculationConfidence['level'];
  if (finalScore >= 80) {
    level = 'high';
  } else if (finalScore >= 60) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  // Build data source info
  const dataSource: DataSourceInfo = {
    profileSource: profile ? (profile.isEditable ? 'custom' : 'standard') : 'manual',
    profileName: profile ? profile.name : 'Manual Configuration',
    parametersUsed: getParametersUsed(bar, config),
    lastModified: config.updatedAt
  };
  
  return {
    level,
    score: finalScore,
    factors,
    dataSource
  };
}

/**
 * Get shape complexity level
 */
function getShapeComplexity(shapeCode: ShapeCode): 'simple' | 'medium' | 'complex' {
  switch (shapeCode) {
    case 'S1':
      return 'simple';
    case 'S2':
    case 'S6':
      return 'medium';
    case 'S3':
    case 'S4':
    case 'S5':
      return 'complex';
    default:
      return 'medium';
  }
}

/**
 * Get required dimensions for a shape
 */
function getRequiredDimensions(shapeCode: ShapeCode): string[] {
  switch (shapeCode) {
    case 'S1':
      return ['A'];
    case 'S2':
    case 'S6':
      return ['A', 'B'];
    case 'S3':
      return ['A', 'B'];
    case 'S4':
      return ['A', 'B', 'C'];
    case 'S5':
      return ['A', 'B', 'C'];
    default:
      return ['A'];
  }
}

/**
 * Get list of parameters used in calculation
 */
function getParametersUsed(bar: BarEntry, config: ProjectConfig): string[] {
  const params: string[] = [];
  
  // Always use diameter
  params.push(`Diameter: ${bar.diameter}mm`);
  
  // Add bend deductions based on shape
  switch (bar.shapeCode) {
    case 'S2':
    case 'S6':
      params.push(`90° deduction: ${config.bendDeductions.deg90}d`);
      params.push(`Hook multiplier: ${config.defaultHookMultiplier}d`);
      break;
    case 'S3':
      params.push(`90° deduction: ${config.bendDeductions.deg90}d`);
      params.push(`135° deduction: ${config.bendDeductions.deg135}d`);
      params.push(`Hook multiplier: ${config.defaultHookMultiplier}d`);
      break;
    case 'S4':
      params.push(`45° deduction: ${config.bendDeductions.deg45}d`);
      params.push(`135° deduction: ${config.bendDeductions.deg135}d`);
      break;
    case 'S5':
      params.push(`90° deduction: ${config.bendDeductions.deg90}d`);
      break;
  }
  
  return params;
}