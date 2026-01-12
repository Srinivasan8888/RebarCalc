/**
 * Formula Template Definitions for RebarCalc
 * Provides LaTeX-like notation and metadata for all shape formulas
 */

import type { ShapeCode } from '../types';

// Formula template interface
export interface FormulaTemplate {
  code: ShapeCode;
  name: string;
  formula: string;           // LaTeX-like mathematical notation
  description: string;
  variables: string[];       // Required variables (A, B, C, D)
  deductions: string[];      // Bend deduction descriptions
  hooks?: number;           // Number of hooks
  steps: FormulaStep[];     // Step-by-step breakdown
}

// Individual calculation step
export interface FormulaStep {
  description: string;       // Human-readable description
  formula: string;          // Mathematical expression
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'sqrt' | 'constant';
  variables?: string[];     // Variables used in this step
}

// Formula templates for all 6 shapes (S1-S6)
export const FORMULA_TEMPLATES: Record<ShapeCode, FormulaTemplate> = {
  S1: {
    code: 'S1',
    name: 'Straight Bar',
    formula: 'L = A',
    description: 'Cut length equals dimension A (no bends or deductions)',
    variables: ['A'],
    deductions: [],
    steps: [
      {
        description: 'Take dimension A as cut length',
        formula: 'L = A',
        operation: 'constant',
        variables: ['A']
      }
    ]
  },

  S2: {
    code: 'S2',
    name: 'U-Bar',
    formula: 'L = A + 2B - 2D_{90°}',
    description: 'Length A plus twice B minus two 90° bend deductions',
    variables: ['A', 'B'],
    deductions: ['90° bend', '90° bend'],
    steps: [
      {
        description: 'Add main dimension A',
        formula: 'A',
        operation: 'add',
        variables: ['A']
      },
      {
        description: 'Add twice the vertical dimension B',
        formula: '2 × B',
        operation: 'add',
        variables: ['B']
      },
      {
        description: 'Subtract two 90° bend deductions',
        formula: '2 × D_{90°}',
        operation: 'subtract',
        variables: ['D_{90°}']
      }
    ]
  },

  S3: {
    code: 'S3',
    name: 'Stirrup',
    formula: 'L = 2(A + B) + 2H - 4D_{90°} - 2D_{135°}',
    description: 'Perimeter plus hooks minus bend deductions',
    variables: ['A', 'B'],
    deductions: ['90° bend', '90° bend', '90° bend', '90° bend', '135° hook', '135° hook'],
    hooks: 2,
    steps: [
      {
        description: 'Calculate perimeter: 2(A + B)',
        formula: '2 × (A + B)',
        operation: 'add',
        variables: ['A', 'B']
      },
      {
        description: 'Add two hook lengths',
        formula: '2 × H',
        operation: 'add',
        variables: ['H']
      },
      {
        description: 'Subtract four 90° bend deductions',
        formula: '4 × D_{90°}',
        operation: 'subtract',
        variables: ['D_{90°}']
      },
      {
        description: 'Subtract two 135° hook bend deductions',
        formula: '2 × D_{135°}',
        operation: 'subtract',
        variables: ['D_{135°}']
      }
    ]
  },

  S4: {
    code: 'S4',
    name: 'Cranked Bar',
    formula: 'L = A + \\sqrt{B^2 + C^2} + C - 2D_{45°}',
    description: 'Straight length plus inclined length plus vertical length minus bend deductions',
    variables: ['A', 'B', 'C'],
    deductions: ['45° bend', '45° bend'],
    steps: [
      {
        description: 'Add main horizontal dimension A',
        formula: 'A',
        operation: 'add',
        variables: ['A']
      },
      {
        description: 'Calculate inclined length using Pythagoras',
        formula: '\\sqrt{B^2 + C^2}',
        operation: 'sqrt',
        variables: ['B', 'C']
      },
      {
        description: 'Add vertical dimension C',
        formula: 'C',
        operation: 'add',
        variables: ['C']
      },
      {
        description: 'Subtract two 45° bend deductions',
        formula: '2 × D_{45°}',
        operation: 'subtract',
        variables: ['D_{45°}']
      }
    ]
  },

  S5: {
    code: 'S5',
    name: 'L-Bar',
    formula: 'L = A + B - D_{90°}',
    description: 'Sum of both dimensions minus one 90° bend deduction',
    variables: ['A', 'B'],
    deductions: ['90° bend'],
    steps: [
      {
        description: 'Add horizontal dimension A',
        formula: 'A',
        operation: 'add',
        variables: ['A']
      },
      {
        description: 'Add vertical dimension B',
        formula: 'B',
        operation: 'add',
        variables: ['B']
      },
      {
        description: 'Subtract one 90° bend deduction',
        formula: 'D_{90°}',
        operation: 'subtract',
        variables: ['D_{90°}']
      }
    ]
  },

  S6: {
    code: 'S6',
    name: 'Hooked Bar',
    formula: 'L = A + H - D_{180°}',
    description: 'Main length plus hook length minus hook bend deduction',
    variables: ['A'],
    deductions: ['180° hook bend'],
    hooks: 1,
    steps: [
      {
        description: 'Add main dimension A',
        formula: 'A',
        operation: 'add',
        variables: ['A']
      },
      {
        description: 'Add hook length',
        formula: 'H',
        operation: 'add',
        variables: ['H']
      },
      {
        description: 'Subtract 180° hook bend deduction',
        formula: 'D_{180°}',
        operation: 'subtract',
        variables: ['D_{180°}']
      }
    ]
  }
};

// Helper function to get formula template by shape code
export function getFormulaTemplate(shapeCode: ShapeCode): FormulaTemplate {
  return FORMULA_TEMPLATES[shapeCode];
}

// Helper function to get all available formula templates
export function getAllFormulaTemplates(): FormulaTemplate[] {
  return Object.values(FORMULA_TEMPLATES);
}

// Helper function to validate if a shape code has a formula template
export function hasFormulaTemplate(shapeCode: string): shapeCode is ShapeCode {
  return shapeCode in FORMULA_TEMPLATES;
}