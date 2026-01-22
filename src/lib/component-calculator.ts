/**
 * Component Calculator Engine
 * Core calculation functions for the Spreadsheet-style Component Methodology
 */

import type { 
  ConcreteComponent, 
  ComponentBarEntry, 
  CalculatedBarResult, 
  ComponentSummary,
  ProjectSteelSummary,
  BarMeasurements
} from '../types/component-types';

import { WEIGHT_PER_METER } from './constants';

/**
 * Calculate number of bars based on span and spacing
 * Formula: ((Span - 2 * Cover) / Spacing) + 1
 * Result is rounded up to nearest integer
 */
export function calculateNumberOfBars(
  span: number,        // mm
  spacing: number,     // mm (c/c)
  cover: number        // mm
): number {
  if (spacing <= 0) return 0;
  
  const effectiveSpan = Math.max(0, span - (2 * cover));
  // Standard formula: (Effective Span / Spacing) + 1
  return Math.floor(effectiveSpan / spacing) + 1;
}

/**
 * Calculate total raw measurement length from segments
 * Standard: Sum of a + b + c + d + e + f + lap
 */
export function calculateTotalMeasurement(
  measurements: BarMeasurements
): number {
  const { a, b = 0, c = 0, d = 0, e = 0, f = 0, lap = 0 } = measurements;
  return a + b + c + d + e + f + lap;
}

/**
 * Calculate total measurement for U-Bar (Scorpion-tail shape)
 * The C-shape legs (b, c, d) appear on BOTH ends of the bar.
 * Formula: a + 2*b + 2*c + 2*d + e + f
 * Where:
 *   a = Bottom Span
 *   b = Horizontal leg (Beam - Cover) on each end
 *   c = Vertical leg (Depth - 2*Cover) on each end
 *   d = Horizontal leg into slab on each end (same as b for symmetric cases)
 *   e = Left Top Extension
 *   f = Right Top Extension
 */
export function calculateUBarTotalMeasurement(
  measurements: BarMeasurements
): number {
  const { a, b = 0, c = 0, d = 0, e = 0, f = 0, lap = 0 } = measurements;
  // C-shape on BOTH ends: 2*(b + c + d) + span + extensions
  return a + (2 * b) + (2 * c) + (2 * d) + e + f + lap;
}

/**
 * Calculate deduction amount based on number of bends and diameter
 * Standard: 2D per 90 degree bend
 */
export function calculateDeductionAmount(
  noOfDeductions: number,
  diameter: number,
  bendMultiplier: number = 2 // Default 2D for 90 deg
): number {
  return noOfDeductions * bendMultiplier * diameter;
}

/**
 * Calculate weight from diameter and length
 * Uses standard constant tables or formula D*D/162
 */
export function calculateUnitWeight(diameter: number): number {
  // Use lookup table if available, otherwise formula
  if (WEIGHT_PER_METER[diameter]) {
    return WEIGHT_PER_METER[diameter];
  }
  return (diameter * diameter) / 162;
}

/**
 * Process a single bar entry and return calculated results
 */
export function calculateComponentBarEntry(
  entry: ComponentBarEntry,
  componentSpan: number, // Relevant span for calculating No. of Bars (e.g. Span B forbars along A)
  cover: number,
  isUBar: boolean = false // Flag for Slab U-Bar calculation
): CalculatedBarResult {
  
  // 1. Calculate No. of Bars
  // If manual override is provided, use it. Otherwise calculate.
  let noOfBars = entry.manualNoOfBars;
  
  if (noOfBars === undefined) {
    if (entry.spacing > 0 && componentSpan > 0) {
      noOfBars = calculateNumberOfBars(componentSpan, entry.spacing, cover);
    } else {
      noOfBars = 1; // Default to 1 if not calculable
    }
  }

  // 2. Calculate Measurements
  // Use U-Bar formula if flagged (accounts for C-shape on both ends)
  const totalMeasurement = isUBar 
    ? calculateUBarTotalMeasurement(entry.measurements)
    : calculateTotalMeasurement(entry.measurements);
  
  // 3. Calculate Deductions
  // If manual override, use it (assumes quantity of bends, not mm)
  // Otherwise default to 0 (user must specify bends for now, or we infer from shape later)
  const noOfDeductions = entry.manualNoOfDeductions || 0;
  const deductionAmount = calculateDeductionAmount(noOfDeductions, entry.diameter);
  
  // 4. Cutting Length
  const cuttingLength = totalMeasurement - deductionAmount;
  
  // 5. Total Length (m)
  const totalLength = (cuttingLength * noOfBars) / 1000;
  
  // 6. Weight Calculations
  const unitWeight = calculateUnitWeight(entry.diameter);
  const totalWeight = totalLength * unitWeight;
  
  return {
    totalMeasurement,
    noOfDeductions,
    deductionAmount,
    cuttingLength,
    noOfBars,
    totalLength,
    unitWeight,
    totalWeight
  };
}

/**
 * Auto-calculate Slab U-Bar Measurements based on Component Config
 * Used to pre-fill measurements
 */
export function calculateSlabUBarMeasurements(
  direction: 'X' | 'Y',
  component: ConcreteComponent
): BarMeasurements {
  // If missing data, return empty/zeros
  if (!component.beamWidths || !component.topExtensions) {
     return { a: direction === 'X' ? component.spanX : component.spanY };
  }

  const { left: beamLeft, right: beamRight, top: beamTop, bottom: beamBottom } = component.beamWidths;
  const { left: extLeft, right: extRight, top: extTop, bottom: extBottom } = component.topExtensions;

  // Formula inferred from User Request:
  // a = Span
  // b = Start Beam Width - Cover
  // c = Slab Depth - 2 * Cover (Vertical Rise)
  // d = End Beam Width - Cover
  // e = Top Extension Start
  // f = Top Extension End
  
  const cover = component.cover || 25;
  const depth = component.depth || 125; // Default slab depth if not set
  const verticalRise = Math.max(0, depth - (2 * cover));

  if (direction === 'X') {
    // Bottom Bar (X-X)
    return {
      a: component.spanX,
      b: Math.max(0, beamLeft - cover), 
      c: verticalRise,
      d: Math.max(0, beamRight - cover),
      e: extLeft,
      f: extRight,
      lap: 0
    };
  } else {
     // Bottom Bar (Y-Y)
     return {
      a: component.spanY,
      b: Math.max(0, beamTop - cover), 
      c: verticalRise,
      d: Math.max(0, beamBottom - cover),
      e: extTop,
      f: extBottom,
      lap: 0
     };
  }
}

/**
 * Auto-calculate Slab Distribution Bar Measurements
 * Logic:
 * a = Span
 * b = Start Beam - Cover
 * c = End Beam - Cover
 * d = 10 * Diameter (Foot Length)
 * e = 10 * Diameter (Foot Length)
 */
export function calculateSlabDistributionMeasurements(
  direction: 'X' | 'Y',
  component: ConcreteComponent,
  diameter: number
): BarMeasurements {
   // Default measurements if missing data
   if (!component.beamWidths) {
      return { a: direction === 'X' ? component.spanX : component.spanY };
   }

   const { left: beamLeft, right: beamRight, top: beamTop, bottom: beamBottom } = component.beamWidths;
   const cover = component.cover || 25;
   const footLength = 10 * diameter;

   if (direction === 'X') {
     // Dist Bar along X
     return {
       a: component.spanX,
       b: Math.max(0, beamLeft - cover),
       c: Math.max(0, beamRight - cover),
       d: footLength,
       e: footLength,
       f: 0, 
       lap: 0
     };
   } else {
      // Dist Bar along Y
      return {
       a: component.spanY,
       b: Math.max(0, beamTop - cover), 
       c: Math.max(0, beamBottom - cover),
       d: footLength,
       e: footLength,
       f: 0,
       lap: 0
      };
   }
}

/**
 * Calculate totals for a specific component
 */
export function calculateComponentSummary(
  component: ConcreteComponent
): ComponentSummary {
  let totalBars = 0;
  let totalLengthM = 0;
  let totalWeightKg = 0;
  
  component.bars.forEach(bar => {
    if (bar.calculated) {
      totalBars += bar.calculated.noOfBars;
      totalLengthM += bar.calculated.totalLength;
      totalWeightKg += bar.calculated.totalWeight;
    }
  });
  
  return {
    componentId: component.id,
    componentName: component.name,
    totalBars,
    totalLengthM,
    totalWeightKg
  };
}

/**
 * Calculate Grand Totals for entire project
 * Grouped by Diameter
 */
export function calculateProjectTotal(
  components: ConcreteComponent[]
): ProjectSteelSummary {
  const byDiameter: { [diameter: number]: { lengthM: number; weightKg: number } } = {};
  let totalWeightKg = 0;
  
  components.forEach(comp => {
    comp.bars.forEach(bar => {
      if (bar.calculated) {
        const dia = bar.diameter;
        if (!byDiameter[dia]) {
          byDiameter[dia] = { lengthM: 0, weightKg: 0 };
        }
        
        byDiameter[dia].lengthM += bar.calculated.totalLength;
        byDiameter[dia].weightKg += bar.calculated.totalWeight;
        
        totalWeightKg += bar.calculated.totalWeight;
      }
    });
  });
  
  return {
    byDiameter,
    totalWeightKg,
    totalWeightMT: totalWeightKg / 1000
  };
}
