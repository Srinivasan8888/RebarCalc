/**
 * RebarCalc Calculation Engine
 * Core calculation functions for Bar Bending Schedule (BBS)
 */

import type { 
  ProjectConfig, 
  BarEntry, 
  CalculatedBar, 
  BarDimensions,
  ShapeCode,
  DiameterSummary,
  ShapeSummary,
  MemberSummary
} from '../types';
import { SHAPE_DEFINITIONS } from './constants';

// ============================================================================
// BEND DEDUCTION CALCULATOR
// ============================================================================

/**
 * Calculate bend deduction based on angle and diameter
 * Uses configurable multipliers from ProjectConfig
 * 
 * @param angle - Bend angle in degrees (45, 90, 135, 180)
 * @param diameter - Bar diameter in mm
 * @param config - Project configuration with bend deduction multipliers
 * @returns Bend deduction in mm
 */
export function calculateBendDeduction(
  angle: number,
  diameter: number,
  config: ProjectConfig
): number {
  const { bendDeductions } = config;
  
  switch (angle) {
    case 45:
      return bendDeductions.deg45 * diameter;
    case 90:
      return bendDeductions.deg90 * diameter;
    case 135:
      return bendDeductions.deg135 * diameter;
    case 180:
      // 180° bend (hook turn) - typically same as 90° or custom
      return bendDeductions.deg90 * diameter;
    default:
      // For non-standard angles, interpolate or use 90° as default
      return bendDeductions.deg90 * diameter;
  }
}

/**
 * Calculate total bend deductions for a shape based on its bend angles
 */
export function calculateTotalBendDeduction(
  shapeCode: ShapeCode,
  diameter: number,
  config: ProjectConfig
): number {
  const shape = SHAPE_DEFINITIONS[shapeCode];
  return shape.bendAngles.reduce(
    (total, angle) => total + calculateBendDeduction(angle, diameter, config),
    0
  );
}

// ============================================================================
// HOOK LENGTH CALCULATOR
// ============================================================================

/**
 * Calculate hook length based on diameter and multiplier
 * IS standard: Hook = 9 × Diameter
 * 
 * @param diameter - Bar diameter in mm
 * @param multiplier - Hook multiplier (default: 9 per IS code)
 * @returns Hook length in mm
 */
export function calculateHookLength(
  diameter: number,
  multiplier: number
): number {
  return multiplier * diameter;
}

// ============================================================================
// SHAPE FORMULA CALCULATORS (S1-S6)
// ============================================================================

/**
 * S1 - Straight bar: Cut length = A
 */
export function calculateS1(
  dimensions: BarDimensions,
  _config: ProjectConfig,
  _diameter: number
): number {
  return dimensions.A;
}

/**
 * S2 - U-bar: Cut length = A + 2×B − bend deductions
 * Has two 90° bends
 */
export function calculateS2(
  dimensions: BarDimensions,
  config: ProjectConfig,
  diameter: number
): number {
  const B = dimensions.B ?? 0;
  const bendDeduction = 2 * calculateBendDeduction(90, diameter, config);
  return dimensions.A + (2 * B) - bendDeduction;
}

/**
 * S3 - Stirrup: Cut length = 2×(A + B) + 2×hook − bend deductions
 * Has four 90° bends and two 135° bends (for hooks)
 */
export function calculateS3(
  dimensions: BarDimensions,
  config: ProjectConfig,
  diameter: number
): number {
  const B = dimensions.B ?? 0;
  const hookLength = calculateHookLength(diameter, config.defaultHookMultiplier);
  
  // 4 × 90° bends + 2 × 135° bends
  const bendDeduction90 = 4 * calculateBendDeduction(90, diameter, config);
  const bendDeduction135 = 2 * calculateBendDeduction(135, diameter, config);
  
  return 2 * (dimensions.A + B) + (2 * hookLength) - bendDeduction90 - bendDeduction135;
}

/**
 * S4 - Cranked bar: Cut length = A + inclined length + C − bend deductions
 * Inclined length = √(B² + C²) where B is horizontal offset, C is vertical rise
 * Has two 45° bends
 */
export function calculateS4(
  dimensions: BarDimensions,
  config: ProjectConfig,
  diameter: number
): number {
  const B = dimensions.B ?? 0;
  const C = dimensions.C ?? 0;
  const inclinedLength = Math.sqrt(B * B + C * C);
  const bendDeduction = 2 * calculateBendDeduction(45, diameter, config);
  
  return dimensions.A + inclinedLength + C - bendDeduction;
}

/**
 * S5 - L-bar: Cut length = A + B − bend deduction
 * Has one 90° bend
 */
export function calculateS5(
  dimensions: BarDimensions,
  config: ProjectConfig,
  diameter: number
): number {
  const B = dimensions.B ?? 0;
  const bendDeduction = calculateBendDeduction(90, diameter, config);
  
  return dimensions.A + B - bendDeduction;
}

/**
 * S6 - Hooked bar: Cut length = A + hook − bend deduction
 * Has one 180° bend (hook turn)
 */
export function calculateS6(
  dimensions: BarDimensions,
  config: ProjectConfig,
  diameter: number
): number {
  const hookLength = calculateHookLength(diameter, config.defaultHookMultiplier);
  const bendDeduction = calculateBendDeduction(180, diameter, config);
  
  return dimensions.A + hookLength - bendDeduction;
}

// ============================================================================
// WEIGHT CALCULATOR
// ============================================================================

/**
 * Calculate weight of a bar from diameter and length
 * Industry formula: Weight (kg) = (D² / 162) × Length (m)
 * 
 * @param diameter - Bar diameter in mm
 * @param lengthMm - Bar length in mm
 * @returns Weight in kg
 */
export function calculateWeight(diameter: number, lengthMm: number): number {
  const lengthM = lengthMm / 1000;
  return (diameter * diameter / 162) * lengthM;
}

// ============================================================================
// MAIN CALCULATOR ENGINE
// ============================================================================

/**
 * Shape calculator function map
 */
const SHAPE_CALCULATORS: Record<
  ShapeCode, 
  (dimensions: BarDimensions, config: ProjectConfig, diameter: number) => number
> = {
  S1: calculateS1,
  S2: calculateS2,
  S3: calculateS3,
  S4: calculateS4,
  S5: calculateS5,
  S6: calculateS6,
};

/**
 * Calculate cut length for a single bar entry
 * 
 * @param bar - Bar entry with shape, dimensions, and diameter
 * @param config - Project configuration
 * @returns Cut length in mm
 */
export function calculateCutLength(bar: BarEntry, config: ProjectConfig): number {
  const calculator = SHAPE_CALCULATORS[bar.shapeCode];
  return calculator(bar.dimensions, config, bar.diameter);
}

/**
 * Process a single bar entry and return calculated results
 */
export function calculateBar(bar: BarEntry, config: ProjectConfig): CalculatedBar {
  const cutLength = calculateCutLength(bar, config);
  const unitWeight = calculateWeight(bar.diameter, cutLength);
  const totalLength = cutLength * bar.quantity;
  const totalWeight = unitWeight * bar.quantity;
  
  return {
    ...bar,
    cutLength,
    unitWeight,
    totalLength,
    totalWeight,
  };
}

/**
 * Process all bar entries and return calculated results
 * 
 * @param bars - Array of bar entries
 * @param config - Project configuration
 * @returns Array of calculated bars with cut lengths and weights
 */
export function calculateAll(
  bars: BarEntry[], 
  config: ProjectConfig
): CalculatedBar[] {
  return bars.map(bar => calculateBar(bar, config));
}

// ============================================================================
// SUMMARY AGGREGATION
// ============================================================================

/**
 * Summarize bars by diameter
 * Groups bars and sums total length and weight
 */
export function summarizeByDiameter(bars: CalculatedBar[]): DiameterSummary[] {
  const groups = new Map<number, DiameterSummary>();
  
  for (const bar of bars) {
    const existing = groups.get(bar.diameter);
    if (existing) {
      existing.totalLength += bar.totalLength / 1000; // Convert mm to m
      existing.totalWeight += bar.totalWeight;
      existing.barCount += bar.quantity;
    } else {
      groups.set(bar.diameter, {
        diameter: bar.diameter,
        totalLength: bar.totalLength / 1000,
        totalWeight: bar.totalWeight,
        barCount: bar.quantity,
      });
    }
  }
  
  return Array.from(groups.values()).sort((a, b) => a.diameter - b.diameter);
}

/**
 * Summarize bars by shape code
 * Groups bars and sums total length and weight
 */
export function summarizeByShape(bars: CalculatedBar[]): ShapeSummary[] {
  const groups = new Map<ShapeCode, ShapeSummary>();
  
  for (const bar of bars) {
    const existing = groups.get(bar.shapeCode);
    if (existing) {
      existing.totalLength += bar.totalLength / 1000;
      existing.totalWeight += bar.totalWeight;
      existing.barCount += bar.quantity;
    } else {
      groups.set(bar.shapeCode, {
        shapeCode: bar.shapeCode,
        shapeName: SHAPE_DEFINITIONS[bar.shapeCode].name,
        totalLength: bar.totalLength / 1000,
        totalWeight: bar.totalWeight,
        barCount: bar.quantity,
      });
    }
  }
  
  return Array.from(groups.values());
}

/**
 * Summarize bars by member type
 * Groups bars and sums total length and weight
 */
export function summarizeByMember(bars: CalculatedBar[]): MemberSummary[] {
  const groups = new Map<string, MemberSummary>();
  
  for (const bar of bars) {
    const existing = groups.get(bar.memberType);
    if (existing) {
      existing.totalLength += bar.totalLength / 1000;
      existing.totalWeight += bar.totalWeight;
      existing.barCount += bar.quantity;
    } else {
      groups.set(bar.memberType, {
        memberType: bar.memberType,
        totalLength: bar.totalLength / 1000,
        totalWeight: bar.totalWeight,
        barCount: bar.quantity,
      });
    }
  }
  
  return Array.from(groups.values());
}

/**
 * Calculate grand totals across all bars
 */
export function calculateGrandTotals(bars: CalculatedBar[]): {
  totalLengthM: number;
  totalWeightKg: number;
  totalWeightMT: number;
  barCount: number;
} {
  const totalLengthM = bars.reduce((sum, bar) => sum + bar.totalLength / 1000, 0);
  const totalWeightKg = bars.reduce((sum, bar) => sum + bar.totalWeight, 0);
  
  return {
    totalLengthM,
    totalWeightKg,
    totalWeightMT: totalWeightKg / 1000,
    barCount: bars.reduce((sum, bar) => sum + bar.quantity, 0),
  };
}
