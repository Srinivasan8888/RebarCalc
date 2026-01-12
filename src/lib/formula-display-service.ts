/**
 * Formula Display Service for RebarCalc
 * Generates formula breakdowns and tooltips for calculation transparency
 */

import type { 
  BarEntry, 
  ProjectConfig, 
  ShapeCode,
  BarDimensions 
} from '../types';
import { 
  calculateBendDeduction, 
  calculateHookLength,
  calculateCutLength 
} from './calculator';
import { FORMULA_TEMPLATES } from './formula-templates';

// Formula breakdown result interface
export interface FormulaBreakdown {
  shapeCode: ShapeCode;
  shapeName: string;
  formula: string;           // Mathematical formula with LaTeX-like notation
  steps: CalculationStep[];
  finalResult: number;
  units: string;
  codeReference?: string;    // Reference to building code clause
}

// Individual calculation step with actual values
export interface CalculationStep {
  description: string;       // Human-readable description
  formula: string;          // Mathematical expression with substituted values
  value: number;            // Calculated value for this step
  units: string;            // Units (mm, degrees, etc.)
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'sqrt' | 'constant';
  isDeduction?: boolean;    // True if this step is a bend deduction
  isHook?: boolean;         // True if this step involves hook calculation
}

// Formula display service class
export class FormulaDisplayService {
  
  /**
   * Generate complete formula breakdown for a bar entry
   */
  generateBreakdown(bar: BarEntry, config: ProjectConfig): FormulaBreakdown {
    const template = FORMULA_TEMPLATES[bar.shapeCode];
    const steps = this.generateSteps(bar, config);
    const finalResult = calculateCutLength(bar, config);
    
    return {
      shapeCode: bar.shapeCode,
      shapeName: template.name,
      formula: this.formatFormulaWithValues(template.formula, bar, config),
      steps,
      finalResult,
      units: 'mm',
      codeReference: this.getCodeReference(config, bar.shapeCode)
    };
  }

  /**
   * Get simple tooltip formula for quick reference
   */
  getFormulaTooltip(shapeCode: ShapeCode): string {
    const template = FORMULA_TEMPLATES[shapeCode];
    return `${shapeCode} - ${template.name}: ${template.formula}`;
  }

  /**
   * Generate step-by-step calculation with actual values
   */
  generateSteps(bar: BarEntry, config: ProjectConfig): CalculationStep[] {
    const template = FORMULA_TEMPLATES[bar.shapeCode];
    const steps: CalculationStep[] = [];
    
    // Process each step from the template
    for (const templateStep of template.steps) {
      const step = this.processTemplateStep(templateStep, bar, config);
      if (step) {
        steps.push(step);
      }
    }
    
    return steps;
  }

  /**
   * Format formula string by substituting actual values
   */
  formatFormula(formula: string, substitutions: Record<string, number>): string {
    let formatted = formula;
    
    // Replace variables with actual values
    for (const [variable, value] of Object.entries(substitutions)) {
      const regex = new RegExp(`\\b${variable}\\b`, 'g');
      formatted = formatted.replace(regex, value.toString());
    }
    
    return formatted;
  }

  /**
   * Process a template step and convert it to a calculation step with actual values
   */
  private processTemplateStep(
    templateStep: any, 
    bar: BarEntry, 
    config: ProjectConfig
  ): CalculationStep | null {
    const { dimensions, diameter } = bar;
    
    switch (templateStep.operation) {
      case 'constant':
        return this.processConstantStep(templateStep, dimensions);
      
      case 'add':
        return this.processAddStep(templateStep, dimensions, diameter, config);
      
      case 'subtract':
        return this.processSubtractStep(templateStep, dimensions, diameter, config);
      
      case 'sqrt':
        return this.processSqrtStep(templateStep, dimensions);
      
      default:
        return null;
    }
  }

  /**
   * Process constant step (like dimension A)
   */
  private processConstantStep(
    templateStep: any, 
    _dimensions: BarDimensions
  ): CalculationStep {
    const variable = templateStep.variables[0];
    const value = this.getDimensionValue(variable, _dimensions);
    
    return {
      description: templateStep.description,
      formula: `${variable} = ${value}`,
      value,
      units: 'mm',
      operation: 'constant'
    };
  }

  /**
   * Process addition step
   */
  private processAddStep(
    templateStep: any, 
    dimensions: BarDimensions, 
    diameter: number, 
    config: ProjectConfig
  ): CalculationStep {
    const variables = templateStep.variables || [];
    let value = 0;
    let formulaParts: string[] = [];
    
    for (const variable of variables) {
      if (variable === 'H') {
        // Hook length calculation
        const hookLength = calculateHookLength(diameter, config.defaultHookMultiplier);
        value += hookLength;
        formulaParts.push(`H = ${config.defaultHookMultiplier} × ${diameter} = ${hookLength}`);
      } else if (variable.startsWith('D_')) {
        // This shouldn't happen in add steps, but handle gracefully
        continue;
      } else {
        // Regular dimension
        const dimValue = this.getDimensionValue(variable, dimensions);
        value += dimValue;
        formulaParts.push(`${variable} = ${dimValue}`);
      }
    }
    
    // Handle special cases like 2×B or 2×(A+B)
    if (templateStep.formula.includes('2 ×')) {
      if (templateStep.formula.includes('(A + B)')) {
        const A = dimensions.A;
        const B = dimensions.B || 0;
        value = 2 * (A + B);
        formulaParts = [`2 × (${A} + ${B}) = ${value}`];
      } else if (templateStep.formula.includes('2 × B')) {
        const B = dimensions.B || 0;
        value = 2 * B;
        formulaParts = [`2 × ${B} = ${value}`];
      } else if (templateStep.formula.includes('2 × H')) {
        const hookLength = calculateHookLength(diameter, config.defaultHookMultiplier);
        value = 2 * hookLength;
        formulaParts = [`2 × H = 2 × ${hookLength} = ${value}`];
      }
    }
    
    return {
      description: templateStep.description,
      formula: formulaParts.join(', '),
      value,
      units: 'mm',
      operation: 'add',
      isHook: variables.includes('H')
    };
  }

  /**
   * Process subtraction step (bend deductions)
   */
  private processSubtractStep(
    templateStep: any, 
    _dimensions: BarDimensions, 
    diameter: number, 
    config: ProjectConfig
  ): CalculationStep {
    const variables = templateStep.variables || [];
    let value = 0;
    let formulaParts: string[] = [];
    
    for (const variable of variables) {
      if (variable.includes('D_{90°}')) {
        const deduction = calculateBendDeduction(90, diameter, config);
        const multiplier = this.extractMultiplier(templateStep.formula);
        value += multiplier * deduction;
        formulaParts.push(`${multiplier} × D_{90°} = ${multiplier} × ${deduction} = ${multiplier * deduction}`);
      } else if (variable.includes('D_{45°}')) {
        const deduction = calculateBendDeduction(45, diameter, config);
        const multiplier = this.extractMultiplier(templateStep.formula);
        value += multiplier * deduction;
        formulaParts.push(`${multiplier} × D_{45°} = ${multiplier} × ${deduction} = ${multiplier * deduction}`);
      } else if (variable.includes('D_{135°}')) {
        const deduction = calculateBendDeduction(135, diameter, config);
        const multiplier = this.extractMultiplier(templateStep.formula);
        value += multiplier * deduction;
        formulaParts.push(`${multiplier} × D_{135°} = ${multiplier} × ${deduction} = ${multiplier * deduction}`);
      } else if (variable.includes('D_{180°}')) {
        const deduction = calculateBendDeduction(180, diameter, config);
        value += deduction;
        formulaParts.push(`D_{180°} = ${deduction}`);
      }
    }
    
    return {
      description: templateStep.description,
      formula: formulaParts.join(', '),
      value,
      units: 'mm',
      operation: 'subtract',
      isDeduction: true
    };
  }

  /**
   * Process square root step (for cranked bars)
   */
  private processSqrtStep(
    templateStep: any, 
    dimensions: BarDimensions
  ): CalculationStep {
    const B = dimensions.B || 0;
    const C = dimensions.C || 0;
    const value = Math.sqrt(B * B + C * C);
    
    return {
      description: templateStep.description,
      formula: `√(${B}² + ${C}²) = √(${B * B} + ${C * C}) = ${value.toFixed(1)}`,
      value,
      units: 'mm',
      operation: 'sqrt'
    };
  }

  /**
   * Get dimension value by variable name
   */
  private getDimensionValue(variable: string, dimensions: BarDimensions): number {
    switch (variable) {
      case 'A': return dimensions.A;
      case 'B': return dimensions.B || 0;
      case 'C': return dimensions.C || 0;
      case 'D': return dimensions.D || 0;
      default: return 0;
    }
  }

  /**
   * Extract multiplier from formula string (e.g., "2 × D_{90°}" returns 2)
   */
  private extractMultiplier(formula: string): number {
    const match = formula.match(/(\d+)\s*×/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Format formula with actual values substituted
   */
  private formatFormulaWithValues(
    formula: string, 
    bar: BarEntry, 
    config: ProjectConfig
  ): string {
    const { dimensions, diameter } = bar;
    let formatted = formula;
    
    // Substitute dimension values - be more careful with replacements
    formatted = formatted.replace(/\bA\b/g, dimensions.A.toString());
    
    if (dimensions.B !== undefined) {
      // First handle multiplied terms like "2B" before replacing B alone
      formatted = formatted.replace(/(\d+)\s*×?\s*B/g, (_, mult) => {
        const result = parseInt(mult) * dimensions.B!;
        return result.toString();
      });
      // Then replace standalone B
      formatted = formatted.replace(/\bB\b/g, dimensions.B.toString());
    }
    
    if (dimensions.C !== undefined) {
      formatted = formatted.replace(/\bC\b/g, dimensions.C.toString());
    }
    
    if (dimensions.D !== undefined) {
      formatted = formatted.replace(/\bD\b/g, dimensions.D.toString());
    }
    
    // Substitute hook length
    const hookLength = calculateHookLength(diameter, config.defaultHookMultiplier);
    formatted = formatted.replace(/\bH\b/g, hookLength.toString());
    
    // Substitute bend deductions
    const d45 = calculateBendDeduction(45, diameter, config);
    const d90 = calculateBendDeduction(90, diameter, config);
    const d135 = calculateBendDeduction(135, diameter, config);
    const d180 = calculateBendDeduction(180, diameter, config);
    
    formatted = formatted.replace(/D_{45°}/g, d45.toString());
    formatted = formatted.replace(/D_{90°}/g, d90.toString());
    formatted = formatted.replace(/D_{135°}/g, d135.toString());
    formatted = formatted.replace(/D_{180°}/g, d180.toString());
    
    return formatted;
  }

  /**
   * Get building code reference for the calculation
   */
  private getCodeReference(config: ProjectConfig, shapeCode: ShapeCode): string {
    const codeStandard = config.codeStandard;
    
    switch (codeStandard) {
      case 'IS':
        return this.getISCodeReference(shapeCode);
      case 'BS':
        return this.getBSCodeReference(shapeCode);
      default:
        return 'Custom parameters';
    }
  }

  /**
   * Get IS code reference
   */
  private getISCodeReference(shapeCode: ShapeCode): string {
    switch (shapeCode) {
      case 'S3':
      case 'S6':
        return 'IS 456:2000, Clause 26.2.2.1 (Hook length = 9d)';
      case 'S2':
      case 'S4':
      case 'S5':
        return 'IS 456:2000, Clause 26.2.3 (Bend deductions)';
      default:
        return 'IS 456:2000';
    }
  }

  /**
   * Get BS code reference
   */
  private getBSCodeReference(shapeCode: ShapeCode): string {
    switch (shapeCode) {
      case 'S3':
      case 'S6':
        return 'BS 8110, Hook length provisions';
      case 'S2':
      case 'S4':
      case 'S5':
        return 'BS 8110, Bend deduction provisions';
      default:
        return 'BS 8110';
    }
  }
}

// Export singleton instance
export const formulaDisplayService = new FormulaDisplayService();