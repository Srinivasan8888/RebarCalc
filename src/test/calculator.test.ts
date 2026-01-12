/**
 * Property-based tests for RebarCalc Calculation Engine
 * Uses fast-check library for property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateBendDeduction,
  calculateHookLength,
  calculateWeight,
  calculateS1,
  calculateS2,
  calculateS3,
  calculateS4,
  calculateS5,
  calculateS6,
  calculateCutLength,
  calculateAll,
  summarizeByDiameter,
  summarizeByShape,
  summarizeByMember,
  calculateGrandTotals,
} from '../lib/calculator';
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
// PROPERTY 3: BEND DEDUCTION CONFIGURATION
// ============================================================================

describe('Property 3: Bend Deduction Configuration', () => {
  it('45° bend deduction = config.deg45 × diameter', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        arbProjectConfig,
        (diameter, config) => {
          const result = calculateBendDeduction(45, diameter, config);
          const expected = config.bendDeductions.deg45 * diameter;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('90° bend deduction = config.deg90 × diameter', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        arbProjectConfig,
        (diameter, config) => {
          const result = calculateBendDeduction(90, diameter, config);
          const expected = config.bendDeductions.deg90 * diameter;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('135° bend deduction = config.deg135 × diameter', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        arbProjectConfig,
        (diameter, config) => {
          const result = calculateBendDeduction(135, diameter, config);
          const expected = config.bendDeductions.deg135 * diameter;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 4: HOOK LENGTH CONFIGURATION
// ============================================================================

describe('Property 4: Hook Length Configuration', () => {
  it('hook length = multiplier × diameter', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        arbHookMultiplier,
        (diameter, multiplier) => {
          const result = calculateHookLength(diameter, multiplier);
          const expected = multiplier * diameter;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 2: WEIGHT CALCULATION CORRECTNESS
// ============================================================================

describe('Property 2: Weight Calculation Correctness', () => {
  it('weight = (D² / 162) × (L / 1000) kg', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        fc.integer({ min: 100, max: 12000 }), // length in mm
        (diameter, lengthMm) => {
          const result = calculateWeight(diameter, lengthMm);
          const expected = (diameter * diameter / 162) * (lengthMm / 1000);
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('weight is always non-negative', () => {
    fc.assert(
      fc.property(
        arbValidDiameter,
        fc.integer({ min: 0, max: 12000 }),
        (diameter, lengthMm) => {
          const result = calculateWeight(diameter, lengthMm);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 1: SHAPE FORMULA CORRECTNESS
// ============================================================================

describe('Property 1: Shape Formula Correctness', () => {
  it('S1 (Straight): cut length = A', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, config, diameter) => {
          const dimensions: BarDimensions = { A };
          const result = calculateS1(dimensions, config, diameter);
          expect(result).toBe(A);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('S2 (U-bar): cut length = A + 2×B − 2×(90° deduction)', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, B, config, diameter) => {
          const dimensions: BarDimensions = { A, B };
          const result = calculateS2(dimensions, config, diameter);
          const bendDeduction = 2 * config.bendDeductions.deg90 * diameter;
          const expected = A + 2 * B - bendDeduction;
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('S3 (Stirrup): cut length = 2×(A+B) + 2×hook − 4×(90°) − 2×(135°)', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, B, config, diameter) => {
          const dimensions: BarDimensions = { A, B };
          const result = calculateS3(dimensions, config, diameter);
          
          const hookLength = config.defaultHookMultiplier * diameter;
          const bend90 = 4 * config.bendDeductions.deg90 * diameter;
          const bend135 = 2 * config.bendDeductions.deg135 * diameter;
          const expected = 2 * (A + B) + 2 * hookLength - bend90 - bend135;
          
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('S4 (Cranked): cut length = A + √(B²+C²) + C − 2×(45°)', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbPositiveDimension,
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, B, C, config, diameter) => {
          const dimensions: BarDimensions = { A, B, C };
          const result = calculateS4(dimensions, config, diameter);
          
          const inclined = Math.sqrt(B * B + C * C);
          const bendDeduction = 2 * config.bendDeductions.deg45 * diameter;
          const expected = A + inclined + C - bendDeduction;
          
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('S5 (L-bar): cut length = A + B − 1×(90°)', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, B, config, diameter) => {
          const dimensions: BarDimensions = { A, B };
          const result = calculateS5(dimensions, config, diameter);
          
          const bendDeduction = config.bendDeductions.deg90 * diameter;
          const expected = A + B - bendDeduction;
          
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('S6 (Hooked): cut length = A + hook − 1×(180°)', () => {
    fc.assert(
      fc.property(
        arbPositiveDimension,
        arbProjectConfig,
        arbValidDiameter,
        (A, config, diameter) => {
          const dimensions: BarDimensions = { A };
          const result = calculateS6(dimensions, config, diameter);
          
          const hookLength = config.defaultHookMultiplier * diameter;
          const bendDeduction = config.bendDeductions.deg90 * diameter; // 180° uses 90° deduction
          const expected = A + hookLength - bendDeduction;
          
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 5: SUMMARY AGGREGATION CONSISTENCY
// ============================================================================

describe('Property 5: Summary Aggregation Consistency', () => {
  it('sum of diameter summary weights = grand total weight', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 20 }),
        arbProjectConfig,
        (bars, config) => {
          const calculatedBars = calculateAll(bars, config);
          const diameterSummary = summarizeByDiameter(calculatedBars);
          const grandTotal = calculateGrandTotals(calculatedBars);
          
          const summaryTotal = diameterSummary.reduce((sum, s) => sum + s.totalWeight, 0);
          expect(summaryTotal).toBeCloseTo(grandTotal.totalWeightKg, 3);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('sum of shape summary weights = grand total weight', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 20 }),
        arbProjectConfig,
        (bars, config) => {
          const calculatedBars = calculateAll(bars, config);
          const shapeSummary = summarizeByShape(calculatedBars);
          const grandTotal = calculateGrandTotals(calculatedBars);
          
          const summaryTotal = shapeSummary.reduce((sum, s) => sum + s.totalWeight, 0);
          expect(summaryTotal).toBeCloseTo(grandTotal.totalWeightKg, 3);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('sum of member summary weights = grand total weight', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 20 }),
        arbProjectConfig,
        (bars, config) => {
          const calculatedBars = calculateAll(bars, config);
          const memberSummary = summarizeByMember(calculatedBars);
          const grandTotal = calculateGrandTotals(calculatedBars);
          
          const summaryTotal = memberSummary.reduce((sum, s) => sum + s.totalWeight, 0);
          expect(summaryTotal).toBeCloseTo(grandTotal.totalWeightKg, 3);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// PROPERTY 6: MEMBER TYPE ISOLATION
// ============================================================================

describe('Property 6: Member Type Isolation', () => {
  it('filtering by member type returns only bars of that type', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 50 }),
        arbMemberType,
        (bars, targetMemberType) => {
          // Filter bars by the target member type
          const filteredBars = bars.filter(bar => bar.memberType === targetMemberType);
          
          // All filtered bars should have the target member type
          for (const bar of filteredBars) {
            expect(bar.memberType).toBe(targetMemberType);
          }
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('union of all member type filters equals original set', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 50 }),
        (bars) => {
          // Filter bars by each member type
          const beamBars = bars.filter(bar => bar.memberType === 'BEAM');
          const columnBars = bars.filter(bar => bar.memberType === 'COLUMN');
          const slabBars = bars.filter(bar => bar.memberType === 'SLAB');
          
          // Union of all filtered sets
          const unionBars = [...beamBars, ...columnBars, ...slabBars];
          
          // Union should have same length as original
          expect(unionBars.length).toBe(bars.length);
          
          // Union should contain all original bars (by ID)
          const originalIds = new Set(bars.map(bar => bar.id));
          const unionIds = new Set(unionBars.map(bar => bar.id));
          
          expect(unionIds).toEqual(originalIds);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });

  it('member type filtering is exhaustive and mutually exclusive', () => {
    fc.assert(
      fc.property(
        fc.array(arbBarEntry, { minLength: 1, maxLength: 50 }),
        (bars) => {
          const memberTypes: Array<'BEAM' | 'COLUMN' | 'SLAB'> = ['BEAM', 'COLUMN', 'SLAB'];
          
          // Each bar should belong to exactly one member type
          for (const bar of bars) {
            const matchingTypes = memberTypes.filter(type => bar.memberType === type);
            expect(matchingTypes.length).toBe(1);
          }
          
          // Total count across all member types should equal original count
          const totalFilteredCount = memberTypes.reduce((count, type) => {
            return count + bars.filter(bar => bar.memberType === type).length;
          }, 0);
          
          expect(totalFilteredCount).toBe(bars.length);
        }
      ),
      { numRuns: MIN_PROPERTY_ITERATIONS }
    );
  });
});

// ============================================================================
// UNIT TESTS - KNOWN VALUES
// ============================================================================

describe('Unit Tests - Known Values', () => {
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

  it('S3 stirrup calculation matches manual calculation', () => {
    // A=200mm, B=300mm, diameter=10mm, hookMultiplier=9
    // Expected: 2×(200+300) + 2×(9×10) − 4×(2×10) − 2×(3×10)
    //         = 1000 + 180 − 80 − 60 = 1040mm
    const dimensions: BarDimensions = { A: 200, B: 300 };
    const result = calculateS3(dimensions, defaultConfig, 10);
    expect(result).toBe(1040);
  });

  it('weight calculation matches manual calculation', () => {
    // 12mm bar, 2000mm length
    // Weight = (12² / 162) × 2 = (144/162) × 2 = 1.778 kg
    const result = calculateWeight(12, 2000);
    expect(result).toBeCloseTo(1.778, 2);
  });

  it('calculateCutLength dispatches to correct shape calculator', () => {
    const bar: BarEntry = {
      id: 'test-bar',
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: { A: 3000 },
      spacing: 0,
      quantity: 10,
    };
    
    const result = calculateCutLength(bar, defaultConfig);
    expect(result).toBe(3000); // S1 = straight = A
  });
});
