import { Calculator, Info, Minus, Plus, Radical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BarEntry, ProjectConfig } from '@/types';
import { CalculationVerificationIndicator } from './CalculationVerificationIndicator';
import { formulaDisplayService, type CalculationStep } from '@/lib/formula-display-service';

interface FormulaBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  bar: BarEntry;
  config: ProjectConfig;
}

export function FormulaBreakdownModal({ 
  isOpen, 
  onClose, 
  bar, 
  config 
}: FormulaBreakdownModalProps) {
  const breakdown = formulaDisplayService.generateBreakdown(bar, config);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Formula Breakdown - {breakdown.shapeName} ({breakdown.shapeCode})
          </DialogTitle>
          <DialogDescription>
            Step-by-step calculation showing how the cut length is derived
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formula Overview */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Formula</span>
            </div>
            <div className="font-mono text-lg bg-background p-3 rounded border">
              {breakdown.formula}
            </div>
            {breakdown.codeReference && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm font-medium text-blue-900 mb-1">Code Reference</div>
                <div className="text-sm text-blue-800">{breakdown.codeReference}</div>
              </div>
            )}
          </div>

          {/* Bar Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Bar Details</h4>
              <div className="space-y-1 text-sm">
                <div>Shape: <Badge variant="outline">{bar.shapeCode}</Badge></div>
                <div>Diameter: <span className="font-mono">{bar.diameter}mm</span></div>
                <div>Quantity: <span className="font-mono">{bar.quantity}</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Dimensions</h4>
              <div className="space-y-1 text-sm">
                <div>A: <span className="font-mono">{bar.dimensions.A}mm</span></div>
                {bar.dimensions.B && <div>B: <span className="font-mono">{bar.dimensions.B}mm</span></div>}
                {bar.dimensions.C && <div>C: <span className="font-mono">{bar.dimensions.C}mm</span></div>}
                {bar.dimensions.D && <div>D: <span className="font-mono">{bar.dimensions.D}mm</span></div>}
              </div>
            </div>
          </div>

          {/* Step-by-Step Calculation */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Step-by-Step Calculation
            </h4>
            
            <div className="space-y-3">
              {breakdown.steps.map((step, index) => (
                <CalculationStepCard 
                  key={index} 
                  step={step} 
                  stepNumber={index + 1}
                  isLast={index === breakdown.steps.length - 1}
                />
              ))}
            </div>

            {/* Final Result */}
            <div className="bg-primary/10 border-primary/20 border-2 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">Final Result</Badge>
                  <span className="font-medium">Cut Length</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold">
                    {Math.round(breakdown.finalResult)} {breakdown.units}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ({breakdown.finalResult.toFixed(2)} {breakdown.units} exact)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Verification */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculation Verification
            </h4>
            <CalculationVerificationIndicator 
              bar={bar} 
              config={config}
              showDetails={true}
            />
          </div>

          {/* Code Profile Info */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="font-medium mb-3 flex items-center gap-2">
              <Badge variant="outline">{config.codeStandard}</Badge>
              Code Profile Parameters
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">Bend Deductions</div>
                <div className="space-y-1 pl-2">
                  <div>45° bends: <span className="font-mono">{config.bendDeductions.deg45}d</span></div>
                  <div>90° bends: <span className="font-mono">{config.bendDeductions.deg90}d</span></div>
                  <div>135° bends: <span className="font-mono">{config.bendDeductions.deg135}d</span></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-muted-foreground">Hook Parameters</div>
                <div className="space-y-1 pl-2">
                  <div>Hook multiplier: <span className="font-mono">{config.defaultHookMultiplier}d</span></div>
                  <div>For {bar.diameter}mm bar: <span className="font-mono">{config.defaultHookMultiplier * bar.diameter}mm</span></div>
                </div>
              </div>
            </div>
            {config.codeProfileId && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Active Profile: {config.codeProfileId}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Individual calculation step card component
function CalculationStepCard({ 
  step, 
  stepNumber, 
  isLast 
}: { 
  step: CalculationStep; 
  stepNumber: number; 
  isLast: boolean;
}) {
  const getOperationIcon = (operation: CalculationStep['operation']) => {
    switch (operation) {
      case 'add':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'subtract':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'sqrt':
        return <Radical className="h-4 w-4 text-blue-600" />;
      case 'constant':
        return <Info className="h-4 w-4 text-gray-600" />;
      default:
        return <Calculator className="h-4 w-4 text-gray-600" />;
    }
  };

  const getOperationColor = (operation: CalculationStep['operation']) => {
    switch (operation) {
      case 'add':
        return 'border-green-200 bg-green-50';
      case 'subtract':
        return 'border-red-200 bg-red-50';
      case 'sqrt':
        return 'border-blue-200 bg-blue-50';
      case 'constant':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 relative",
      getOperationColor(step.operation),
      step.isDeduction && "border-red-300 bg-red-50",
      step.isHook && "border-orange-300 bg-orange-50"
    )}>
      <div className="flex items-start gap-3">
        {/* Step Number and Icon */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-medium">
            {stepNumber}
          </div>
          {getOperationIcon(step.operation)}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1">
            {step.description}
            {step.isDeduction && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Deduction
              </Badge>
            )}
            {step.isHook && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Hook
              </Badge>
            )}
          </div>
          
          <div className="font-mono text-sm bg-background p-2 rounded border">
            {step.formula}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-muted-foreground">
              {step.operation.charAt(0).toUpperCase() + step.operation.slice(1)} operation
            </div>
            <div className="font-mono font-medium">
              {step.operation === 'subtract' ? '-' : '+'}{step.value.toFixed(1)} {step.units}
            </div>
          </div>
        </div>
      </div>

      {/* Connection line to next step */}
      {!isLast && (
        <div className="absolute left-8 bottom-[-12px] w-0.5 h-6 bg-border" />
      )}
    </div>
  );
}