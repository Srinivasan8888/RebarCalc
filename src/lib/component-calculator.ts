/**
 * Component Calculator Engine
 * Core calculation functions for the Spreadsheet-style Component Methodology
 */

import type { 
  ComponentBarEntry, 
  CalculatedBarResult, 
  BarMeasurements
} from '../types/component-types.ts';

import { WEIGHT_PER_METER } from './constants.ts';

/**
 * Excel-compatible ROUNDUP function
 * Rounds a number up to specified number of digits
 */
export function roundUp(num: number, digits: number = 0): number {
  const factor = Math.pow(10, digits);
  return Math.ceil(num * factor) / factor;
}

/**
 * Excel-compatible CEILING function
 * Rounds a number up to the nearest multiple of significance
 */
export function ceiling(num: number, significance: number): number {
  if (significance === 0) return 0;
  return Math.ceil(num / significance) * significance;
}

/**
 * Calculate LAP length based on span and global settings
 * Formula: If Total > StandardLength, Lap = ROUNDUP((A / StandardLength) * Ld, 0)
 */
export function calculateLap(
  measurementA: number, 
  diameter: number,
  settings: { developmentLengths: Record<number, number>, standardBarLength: number }
): number {
  const { developmentLengths, standardBarLength } = settings;
  
  // If span is less than standard length, no lap needed usually
  if (measurementA <= standardBarLength) return 0;
  
  const ld = developmentLengths[diameter] || (50 * diameter); // Fallback to 50d
  
  // Formula: ROUNDUP((Span / 12000) * Ld, 0)
  return roundUp((measurementA / standardBarLength) * ld, 0);
}

/**
 * Calculate number of bars based on span and spacing
 * Formula: ROUNDUP(Span / Spacing, 0) + 1 (if standard counting) 
 * OR just ROUNDUP(Span/Spacing) for "Total Members" logic in Excel
 */
export function calculateNumberOfBars(
  span: number,        // mm
  spacing: number,     // mm (c/c)
  cover: number        // mm
): number {
  if (spacing <= 0) return 0;
  const effectiveSpan = Math.max(0, span - (2 * cover));
  return Math.ceil(effectiveSpan / spacing) + 1;
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
  if (WEIGHT_PER_METER && WEIGHT_PER_METER[diameter]) {
    return WEIGHT_PER_METER[diameter];
  }
  return (diameter * diameter) / 162;
}

/**
 * Bar types with 4 bends (from Excel analysis)
 */
const BENDS_4_TYPES = new Set([
  "Bottom & Top Bar (Y-Y)",
  "Bottom Bar (X-X)",
  "Bottom Bar (X-X) G2 to I2",
  "Bottom Bar (Y-Y)",
  "Bottom Bar (Y-Y) I3 to C4",
  "Bottom Bar (Y-Y) O3 to C4",
  "Top & Bottom Bar (Y-Y)",
  "Top Bar (X -X) N1 to O2",
  "Top Bar (Y-Y)",
  "Top Bar (Y-Y) F2 to C4",
  "Top Bar (Y-Y) K4 to K5",
  "Top Bar (Y-Y) Q6 to Q8",
]);

/**
 * Determine Number of Bends based on Bar Type
 * Uses exact Excel data - all other types have 2 bends
 */
function getNoOfBends(barType: string): number {
  return BENDS_4_TYPES.has(barType) ? 4 : 2;
}

/**
 * Determine Cut Length formula based on Bar Type
 * Defaulting to Total - Deduction for standard behavior
 * This aligns with Excel formulas usually being (Sum of Segments) - Deductions
 */
/**
 * Determine Cut Length formula based on Bar Type
 * Derived from verification against Excel logic:
 * 1. Special Y-Y Group (+65mm adjustment, ignore 'f'): 
 *    - Bottom Bar (Y-Y) [Non-Full Span], Bottom & Top Bar (Y-Y), Top Bar (Y-Y)
 * 2. Add 35 Group (+35mm adjustment):
 *    - Top MainBar (Any), Top Dist Bar (Any), Bottom Bar (Y-Y) Full Span
 * 3. Standard Group (Total - Deduction):
 *    - Bottom Bar (X-X), Top Bar (X-X), etc.
 */
/**
 * Determine Cut Length formula based on Bar Type
 * Derived from verification against Excel logic:
 * 1. Group +35 (Sum Without Lap + 35):
 *    - Top MainBar (Any)
 *    - Top Dist Bar (Any)
 *    - Bottom Bar (Y-Y) [Full Span OR Upto]
 * 2. Group +65 (Sum With Lap - f + 65):
 *    - Bottom Bar (Y-Y) [Pure: Not Dist, Not Full Span, Not Upto]
 *    - Bottom & Top Bar (Y-Y)
 *    - Top Bar (Y-Y) [Pure]
 * 3. Standard Group (Sum With Lap - Deduction):
 *    - Bottom Bar Dist (Y-Y)
 *    - Bottom Bar (X-X)
 *    - Everything else
 */
/**
 * Bar types that use CEILING formula: CEILING(a+b+c+d+e+deduction, 5)
 * Based on analysis of 197 bar types from Excel
 */
const CEILING_BAR_TYPES = new Set([
  // Bottom & Top variants
  "Bottom & Top Bar (Y-Y)",
  "Top & Bottom Bar (Y-Y)",
  
  // Bottom Bar (Y-Y) - all variants except Dist
  "Bottom Bar (Y-Y)",
  "Bottom Bar (Y-Y) Full Span",
  "Bottom Bar (Y-Y) Full Span (C8 To C9)",
  "Bottom Bar (Y-Y) Full Span C5 to C4",
  "Bottom Bar (Y-Y) I3 to C4",
  "Bottom Bar (Y-Y) O3 to C4",
  "Bottom Bar (Y-Y) upto 2550",
  "Bottom Bar (Y-Y) upto 3650",
  
  // Bottom Bar (X-X) special cases
  "Bottom Bar (X-X) G2 to I2",
  
  // Top Bar variants
  "Top Bar (X -X) N1 to O2",
  "Top Bar (Y-Y)",
  "Top Bar (Y-Y) F2 to C4",
  "Top Bar (Y-Y) Full Span",
  "Top Bar (Y-Y) K4 to K5",
  "Top Bar (Y-Y) Q6 to Q8",
  
  // Top Dist Bar - most variants
  "Top Dist Bar (X-X)",
  "Top Dist Bar (X-X) - A2 only",
  "Top Dist Bar (X-X) - A3 only",
  "Top Dist Bar (X-X) - A7 only",
  "Top Dist Bar (X-X) - B1 only & A2 link",
  "Top Dist Bar (X-X) - B2 only",
  "Top Dist Bar (X-X) - B6 only",
  "Top Dist Bar (X-X) - B6 to D7",
  "Top Dist Bar (X-X) - C2 to D1",
  "Top Dist Bar (X-X) - E5 only",
  "Top Dist Bar (X-X) - Left",
  "Top Dist Bar (X-X) - Left & Right",
  "Top Dist Bar (X-X) - Left G5 to H3",
  "Top Dist Bar (X-X) - Left K1 to L1",
  "Top Dist Bar (X-X) - Left M5 to N5",
  "Top Dist Bar (X-X) - Right",
  "Top Dist Bar (X-X) -C2 link",
  "Top Dist Bar (Y-Y) - A2 only upto 1225",
  "Top Dist Bar (Y-Y) - A2 only upto 1225 (Top & Bottom)",
  "Top Dist Bar (Y-Y) - A2 only upto 2835",
  "Top Dist Bar (Y-Y) - A5 only",
  "Top Dist Bar (Y-Y) - B2 only",
  "Top Dist Bar (Y-Y) - Bottom",
  "Top Dist Bar (Y-Y) - C8 to C9",
  "Top Dist Bar (Y-Y) - C9 only",
  "Top Dist Bar (Y-Y) - C9 to D7",
  "Top Dist Bar (Y-Y) - G1 only",
  "Top Dist Bar (Y-Y) - G4 only",
  "Top Dist Bar (Y-Y) - G4 to G5",
  "Top Dist Bar (Y-Y) - I4 only",
  "Top Dist Bar (Y-Y) - J1 only",
  "Top Dist Bar (Y-Y) - K5 only",
  "Top Dist Bar (Y-Y) - M1 only",
  "Top Dist Bar (Y-Y) - O5 only",
  "Top Dist Bar (Y-Y) - P1 only",
  "Top Dist Bar (Y-Y) - Q8 only",
  "Top Dist Bar (Y-Y) - Short Segment only",
  "Top Dist Bar (Y-Y) - Top",
  "Top Dist Bar (Y-Y) - Top & Bottom",
  "Top Dist Bar (Y-Y) - Top & Bottom (A7 Link)",
  "Top Dist Bar (Y-Y) - Top (B1 only)",
  "Top Dist Bar (Y-Y) - Top A7 only",
  "Top Dist Bar (Y-Y) - Top C2 only",
  "Top Dist Bar (Y-Y) - Top D1 only",
  "Top Dist Bar (Y-Y) -K5 only",
  "Top Dist Bar (Y-Y) -O5 only",
  "Top Dist Bar (Y-Y) -Q8 only",
  "Top Dist Bar (Y-Y) -Top L1 to L2",
  "Top DistBar (Y-Y) - Bottom (Lift)",
  
  // Top Main Bar - most variants
  "Top Main Bar (X-X) - G5 to H3",
  "Top Main Bar (X-X) - H1 to I2",
  "Top Main Bar (X-X) - J4 to K4",
  "Top Main Bar (X-X) - Left & Right",
  "Top Main Bar (X-X) - Left K1 to L1",
  "Top Main Bar (X-X) - M5 to N5",
  "Top Main Bar (X-X) - P4 to Q6",
  "Top Main Bar (X-X) - Right",
  "Top Main Bar (Y-Y) - A7 to A9",
  "Top Main Bar (Y-Y) - C2 to C4",
  "Top Main Bar (Y-Y) - C5 to C4",
  "Top Main Bar (Y-Y) - D1 to D2",
  "Top Main Bar (Y-Y) - Right",
  "Top Main Bar (Y-Y) - Short Segment to A9",
  "Top Main Bar (Y-Y) -Top L1 to L2",
]);

/**
 * Determine Cut Length formula based on Bar Type
 * Simplified version that directly maps to Excel formulas:
 * 1. CEILING types: CEILING(a+b+c+d+e+deduction, 5)
 * 2. STANDARD types: Total - Deduction
 */
export function getCutLengthV2(
  barType: string,
  measurements: BarMeasurements,
  deductionAmount: number
): number {
  const { a, b=0, c=0, d=0, e=0, f=0, lap=0 } = measurements;
  const sumWithLap = a + b + c + d + e + f + lap;
  
  // Check if this bar type uses CEILING formula
  if (CEILING_BAR_TYPES.has(barType)) {
    // CEILING formula: CEILING(a+b+c+d+e+deduction, 5)
    // Note: This ADDS the deduction instead of subtracting!
    return ceiling(a + b + c + d + e + deductionAmount, 5);
  }
  
  // Default: STANDARD formula (Total - Deduction)
  return sumWithLap - deductionAmount;
}

/**
 * Process a single bar entry and return calculated results
 * MATCHING EXCEL LOGIC "PIXEL PERFECT"
 */
export function calculateComponentBarEntry(
  entry: ComponentBarEntry,
  componentSpan: number, // Span used for spacing calc
  _cover: number, // Currently unused but kept for API compatibility
  settings: { developmentLengths: Record<number, number>, standardBarLength: number },
  isUBar: boolean = false
): CalculatedBarResult {
  
  // 1. Calculate No. of Members (Rows in Excel: "Total no. of members Reqd")
  let totalMembers = entry.totalMembers;
  if (totalMembers === undefined) {
      if (entry.spacing > 0 && componentSpan > 0) {
          // Excel logic uses FULL span, not effective span
          // Formula: ROUNDUP(Span/Spacing, 0)
          totalMembers = roundUp(componentSpan / entry.spacing, 0);
      } else {
          totalMembers = 1;
      }
  }

  // 2. Calculate Total Nos (Rows in Excel: "Total nos.")
  const barsPerMember = entry.barsPerMember || 1;
  const totalNos = totalMembers * barsPerMember;

  // 3. Auto-Calculate Lap if needed
  let lap = entry.measurements.lap || 0;
  if (entry.measurements.a && entry.measurements.a > settings.standardBarLength && lap === 0) {
      // Logic for long bars, only if lap not provided manually
      lap = calculateLap(entry.measurements.a, entry.diameter, settings);
  }

  // 4. Total Measurement
  const { a, b = 0, c = 0, d = 0, e = 0, f = 0 } = entry.measurements;
  // Use UBar logic if flagged
  const totalMeasurement = isUBar
      ? calculateUBarTotalMeasurement({ ...entry.measurements, lap })
      : (a + b + c + d + e + f + lap);

  // 5. Deductions
  // Auto-detect bends if manual not provided
  const bendsCount = entry.manualNoOfDeductions !== undefined 
      ? entry.manualNoOfDeductions 
      : getNoOfBends(entry.barType);
      
  const deductionAmount = calculateDeductionAmount(bendsCount, entry.diameter);

  // 6. Cutting Length (Bar-Type Specific)
  const cuttingLength = getCutLengthV2(
    entry.barType, 
    { ...entry.measurements, lap }, 
    deductionAmount
  );


  // 7. Total Length (m)
  const totalLength = (cuttingLength * totalNos) / 1000;

  // 8. Weight
  const unitWeight = calculateUnitWeight(entry.diameter);
  const totalWeight = totalLength * unitWeight;

  return {
    totalMeasurement,
    noOfDeductions: bendsCount,
    deductionAmount,
    cuttingLength,
    noOfBars: totalNos, // Used for display
    totalLength,
    unitWeight,
    totalWeight
  };
}
