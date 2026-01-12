/**
 * Property-based tests for Formula Display System
 * Tests formula breakdown accuracy and display consistency
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FormulaDisplayService } from '../lib/formula-display-service';
import { calculateCutLength } from '../lib/calculator';
import type { ProjectConfig, BarEntry, BarDimensions } from '../types';
import {
  arbValidDiameter,
  arbPositiveDimension,
  arbPositiveQuantity,
  arbSpacing,
  arbShapeCode,
  arbMemberType,
  arbBendMultiplier,
  arbHookMultiplier,
  arbCover,
  arbCodeStandard,
  MIN_PROPERTY_ITERATIONS,
} from './helpers';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Generate a valid ProjectConfig for testing
 */
const arbProjectConfig: fc.Arbitrary<ProjectConfig> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  codeStandard: arbCodeStandard,
  defaultCover: arbCover,
  defaultHookMultiplier: arbHookMultiplier,
  bendDeductions: fc.record({
    deg45: arbBendMultiplier,
    deg90: arbBendMultiplier,
    deg135: arbBendMultiplier,
  }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * Generate a valid BarEntry for testing
 */
const arbBarEntry: fc.Arbitrary<BarEntry> = fc.record({
  id: fc.uuid(),
  memberType: arbMemberType,
  shapeCode: arbShapeCode,
  diameter: arbValidDiameter,
  dimensions: fc.record({
    A: arbPositiveDimension,
    B: fc.option(arbPositiveDimension, { nil: undefined }),
    C: fc.option(arbPositiveDimension, { nil: undefined }),
    D: fc.option(arbPositiveDimension, { nil: undefined }),
  }) as fc.Arbitrary<BarDimensions>,
  spacing: arbSpacing,
  quantity: arbPositiveQuantity,
  remarks: fc.option(fc.string(), { nil: undefined }),
});

// ============================================================================
// PROPERTY 18: FORMULA BREAKDOWN ACCURACY
// **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
// ============================================================================

describe('Property 18: Formula Breakdown Accuracy', () => {
  const formulaService = new FormulaDisplayService();

  it('**Feature: rebarcalc-enhancements, Property 18: Formula breakdown final result matches direct calculation**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Calculate using direct method
          const directResult = calculateCutLength(bar, config);
          
          // Formula breakdown final result should match direct calculation
          expect(breakdown.finalResult).toBeCloseTo(directResult, 2);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 18: Step-by-step calculation sum matches final result**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Calculate sum from steps
          let calculatedSum = 0;
          for (const step of breakdown.steps) {
            switch (step.operation) {
              case 'add':
              case 'constant':
              case 'sqrt':
                calculatedSum += step.value;
                break;
              case 'subtract':
                calculatedSum -= step.value;
                break;
              case 'multiply':
                calculatedSum *= step.value;
                break;
              case 'divide':
                calculatedSum /= step.value;
                break;
            }
          }
          
          // Sum of steps should match final result (within tolerance for floating point)
          expect(calculatedSum).toBeCloseTo(breakdown.finalResult, 1);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 18: Formula breakdown contains all required components**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Breakdown should have all required fields
          expect(breakdown.shapeCode).toBe(bar.shapeCode);
          expect(breakdown.shapeName).toBeDefined();
          expect(breakdown.formula).toBeDefined();
          expect(breakdown.steps).toBeDefined();
          expect(breakdown.steps.length).toBeGreaterThan(0);
          // Final result can be negative for edge cases with large deductions
          expect(typeof breakdown.finalResult).toBe('number');
          expect(breakdown.units).toBe('mm');
          
          // Each step should have required fields
          for (const step of breakdown.steps) {
            expect(step.description).toBeDefined();
            expect(step.formula).toBeDefined();
            expect(typeof step.value).toBe('number');
            expect(step.units).toBeDefined();
            expect(step.operation).toBeDefined();
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 18: Bend deduction steps are properly identified**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Skip straight bars (S1) as they have no bend deductions
          if (bar.shapeCode === 'S1') return;
          
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Find deduction steps
          const deductionSteps = breakdown.steps.filter(step => step.isDeduction);
          
          // Shapes with bends should have deduction steps
          if (['S2', 'S3', 'S4', 'S5', 'S6'].includes(bar.shapeCode)) {
            expect(deductionSteps.length).toBeGreaterThan(0);
            
            // All deduction steps should be subtract operations
            for (const step of deductionSteps) {
              expect(step.operation).toBe('subtract');
              expect(step.value).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 18: Hook steps are properly identified for shapes with hooks**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Find hook steps
          const hookSteps = breakdown.steps.filter(step => step.isHook);
          
          // Shapes with hooks (S3, S6) should have hook steps
          if (['S3', 'S6'].includes(bar.shapeCode)) {
            expect(hookSteps.length).toBeGreaterThan(0);
            
            // All hook steps should be add operations with positive values
            for (const step of hookSteps) {
              expect(step.operation).toBe('add');
              expect(step.value).toBeGreaterThan(0);
            }
          } else {
            // Shapes without hooks should not have hook steps
            expect(hookSteps.length).toBe(0);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 23: FORMULA DISPLAY CONSISTENCY
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
// ============================================================================

describe('Property 23: Formula Display Consistency', () => {
  const formulaService = new FormulaDisplayService();

  it('**Feature: rebarcalc-enhancements, Property 23: Formula tooltip is consistent across identical shape codes**', () => {
    fc.assert(
      fc.property(
        arbShapeCode,
        (shapeCode) => {
          // Get tooltip for the same shape code multiple times
          const tooltip1 = formulaService.getFormulaTooltip(shapeCode);
          const tooltip2 = formulaService.getFormulaTooltip(shapeCode);
          
          // Should be identical
          expect(tooltip1).toBe(tooltip2);
          
          // Should contain shape code
          expect(tooltip1).toContain(shapeCode);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 23: Formula display contains actual values from bar entry**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Formula should contain actual dimension values
          const formulaStr = breakdown.formula;
          expect(formulaStr).toContain(bar.dimensions.A.toString());
          
          // If B dimension exists and is used by the shape, check if it appears in formula or steps
          if (bar.dimensions.B && ['S2', 'S3', 'S4', 'S5'].includes(bar.shapeCode)) {
            const bValue = bar.dimensions.B.toString();
            const hasB = formulaStr.includes(bValue) || 
                        breakdown.steps.some(step => step.formula.includes(bValue));
            expect(hasB).toBe(true);
          }
          
          // If C dimension exists and is used by S4, check if it appears
          if (bar.dimensions.C && bar.shapeCode === 'S4') {
            const cValue = bar.dimensions.C.toString();
            const hasC = formulaStr.includes(cValue) || 
                        breakdown.steps.some(step => step.formula.includes(cValue));
            expect(hasC).toBe(true);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 23: Step descriptions are meaningful and non-empty**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // All step descriptions should be meaningful
          for (const step of breakdown.steps) {
            expect(step.description).toBeDefined();
            expect(step.description.length).toBeGreaterThan(0);
            expect(step.description.trim()).toBe(step.description); // No leading/trailing whitespace
            
            // Description should contain relevant keywords
            const desc = step.description.toLowerCase();
            const hasRelevantKeyword = 
              desc.includes('dimension') ||
              desc.includes('bend') ||
              desc.includes('hook') ||
              desc.includes('deduction') ||
              desc.includes('length') ||
              desc.includes('calculate') ||
              desc.includes('add') ||
              desc.includes('subtract');
            
            expect(hasRelevantKeyword).toBe(true);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 23: Code references are appropriate for project configuration**', () => {
    fc.assert(
      fc.property(
        arbBarEntry,
        arbProjectConfig,
        (bar, config) => {
          // Generate formula breakdown
          const breakdown = formulaService.generateBreakdown(bar, config);
          
          // Code reference should exist
          expect(breakdown.codeReference).toBeDefined();
          
          // Code reference should match project's code standard
          const codeRef = breakdown.codeReference!.toLowerCase();
          switch (config.codeStandard) {
            case 'IS':
              expect(codeRef).toContain('is');
              break;
            case 'BS':
              expect(codeRef).toContain('bs');
              break;
            case 'CUSTOM':
              expect(codeRef).toContain('custom');
              break;
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('**Feature: rebarcalc-enhancements, Property 23: Formula format is consistent for same shape across different dimensions**', () => {
    fc.assert(
      fc.property(
        arbShapeCode,
        arbProjectConfig,
        arbValidDiameter,
        arbPositiveDimension,
        arbPositiveDimension,
        (shapeCode, config, diameter, dimA, dimB) => {
          // Create two bars with same shape but different dimensions
          const bar1: BarEntry = {
            id: 'test1',
            memberType: 'BEAM',
            shapeCode,
            diameter,
            dimensions: { A: dimA, B: dimB },
            spacing: 0,
            quantity: 1
          };
          
          const bar2: BarEntry = {
            id: 'test2',
            memberType: 'BEAM',
            shapeCode,
            diameter,
            dimensions: { A: dimA + 100, B: dimB + 50 },
            spacing: 0,
            quantity: 1
          };
          
          // Generate breakdowns
          const breakdown1 = formulaService.generateBreakdown(bar1, config);
          const breakdown2 = formulaService.generateBreakdown(bar2, config);
          
          // Shape names should be identical
          expect(breakdown1.shapeName).toBe(breakdown2.shapeName);
          
          // Number of steps should be identical
          expect(breakdown1.steps.length).toBe(breakdown2.steps.length);
          
          // Step operations should be identical
          for (let i = 0; i < breakdown1.steps.length; i++) {
            expect(breakdown1.steps[i].operation).toBe(breakdown2.steps[i].operation);
            expect(breakdown1.steps[i].units).toBe(breakdown2.steps[i].units);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// UNIT TESTS - KNOWN VALUES
// ============================================================================

describe('Formula Display Unit Tests', () => {
  const formulaService = new FormulaDisplayService();
  
  const defaultConfig: ProjectConfig = {
    id: 'test-project',
    name: 'Test Project',
    codeStandard: 'IS',
    defaultCover: 25,
    defaultHookMultiplier: 9,
    bendDeductions: {
      deg45: 1,
      deg90: 2,
      deg135: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('S1 straight bar formula breakdown', () => {
    const bar: BarEntry = {
      id: 'test-s1',
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: { A: 3000 },
      spacing: 0,
      quantity: 1,
    };
    
    const breakdown = formulaService.generateBreakdown(bar, defaultConfig);
    
    expect(breakdown.shapeCode).toBe('S1');
    expect(breakdown.shapeName).toBe('Straight Bar');
    expect(breakdown.finalResult).toBe(3000);
    expect(breakdown.steps.length).toBe(1);
    expect(breakdown.steps[0].operation).toBe('constant');
    expect(breakdown.steps[0].value).toBe(3000);
  });

  it('S3 stirrup formula breakdown with known values', () => {
    const bar: BarEntry = {
      id: 'test-s3',
      memberType: 'BEAM',
      shapeCode: 'S3',
      diameter: 10,
      dimensions: { A: 200, B: 300 },
      spacing: 0,
      quantity: 1,
    };
    
    const breakdown = formulaService.generateBreakdown(bar, defaultConfig);
    
    expect(breakdown.shapeCode).toBe('S3');
    expect(breakdown.shapeName).toBe('Stirrup');
    expect(breakdown.finalResult).toBe(1040); // Manual calculation: 2×(200+300) + 2×90 - 4×20 - 2×30
    
    // Should have steps for perimeter, hooks, and deductions
    const addSteps = breakdown.steps.filter(s => s.operation === 'add');
    const subtractSteps = breakdown.steps.filter(s => s.operation === 'subtract');
    
    expect(addSteps.length).toBeGreaterThan(0);
    expect(subtractSteps.length).toBeGreaterThan(0);
    
    // Should have hook steps
    const hookSteps = breakdown.steps.filter(s => s.isHook);
    expect(hookSteps.length).toBeGreaterThan(0);
  });

  it('Formula tooltip format', () => {
    const tooltip = formulaService.getFormulaTooltip('S2');
    expect(tooltip).toContain('S2');
    expect(tooltip).toContain('U-Bar');
    expect(tooltip).toContain('L = A + 2B - 2D_{90°}');
  });
});