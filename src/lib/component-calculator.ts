/**
 * Component Calculator Engine
 * Core calculation functions for the Spreadsheet-style Component Methodology
 */

import type { 
  ComponentBarEntry, 
  CalculatedBarResult, 
  BarMeasurements,
  BBSMetadata,
  ConcreteComponent
} from '../types/component-types.ts';
import { DEVELOPMENT_LENGTH_TABLES } from './constants.ts';
import { calculateBarsPerMember } from './enhanced-calculator.ts';

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

// Excel W10:AC10 — D²/162 kg/m, unrounded
export function calculateUnitWeight(diameter: number): number {
  return (diameter * diameter) / 162;
}

// Slab col R: 4 bends for U-bars and Y-Y combined bars, 2 for everything else.
// Beam col L: stirrups 5, curtail 0, full-span 2, other main bars 1.
function getNoOfBends(barType: string): number {
  const t = barType.toLowerCase();
  if (t.includes('stirrup')) return 5;
  if (t.includes('curtail')) return 0;
  if (/^(full span|span_|top extra|side face)/.test(t)) return t.startsWith('full span') ? 2 : 1;
  const fourBends = /^bottom bar \([xy]-[xy]\)$/.test(t)
    || /(bottom & top|top & bottom) bar \(y-y\)/.test(t)
    || t === 'top bar (y-y)';
  return fourBends ? 4 : 2;
}

// Excel col T: top main/dist bars and Y-Y main bars use CEILING(a+b+c+d+e+deduction, 5); the rest use Total − deduction
export function getCutLengthV2(
  barType: string,
  measurements: BarMeasurements,
  deductionAmount: number
): number {
  const t = barType.toLowerCase();
  const { a, b = 0, c = 0, d = 0, e = 0, f = 0, lap = 0 } = measurements;
  const usesCeiling = /top main|top dist/.test(t) || (/\(y-y\)/.test(t) && !t.includes('dist'));
  return usesCeiling
    ? ceiling(a + b + c + d + e + deductionAmount, 5)
    : a + b + c + d + e + f + lap - deductionAmount;
}

/**
 * Process a single bar entry and return calculated results (Excel columns I..U)
 */
export function calculateComponentBarEntry(
  entry: ComponentBarEntry,
  totalMembers: number, // Excel col H — see calculateBarsPerMember
  settings: { developmentLengths: Record<number, number>, standardBarLength: number }
): CalculatedBarResult {

  // 1. Total Nos (Excel col I = G*H)
  const totalNos = totalMembers * (entry.barsPerMember || 1);

  // 2. Auto-Calculate Lap if needed
  let lap = entry.measurements.lap || 0;
  if (entry.measurements.a && entry.measurements.a > settings.standardBarLength && lap === 0) {
      // Logic for long bars, only if lap not provided manually
      lap = calculateLap(entry.measurements.a, entry.diameter, settings);
  }

  // 3. Total Measurement (Excel col Q = SUM(a..lap))
  const totalMeasurement = calculateTotalMeasurement({ ...entry.measurements, lap });

  // 4. Deductions
  // Auto-detect bends if manual not provided
  const bendsCount = entry.manualNoOfDeductions !== undefined 
      ? entry.manualNoOfDeductions 
      : getNoOfBends(entry.barType);
      
  const deductionAmount = calculateDeductionAmount(bendsCount, entry.diameter);

  // 5. Cutting Length (Bar-Type Specific)
  const cuttingLength = getCutLengthV2(
    entry.barType, 
    { ...entry.measurements, lap }, 
    deductionAmount
  );

  // 6. Total Length (m)
  const totalLength = (cuttingLength * totalNos) / 1000;

  // 7. Weight
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

/**
 * Recalculate every bar of every component — the one path the table and the Excel import share
 */
export function recalculateComponents(components: ConcreteComponent[], metadata?: BBSMetadata): ConcreteComponent[] {
  const settings = {
    developmentLengths: metadata?.developmentLengths || DEVELOPMENT_LENGTH_TABLES[(metadata?.concreteGrade || 'M30') as keyof typeof DEVELOPMENT_LENGTH_TABLES],
    standardBarLength: metadata?.standardBarLength || 12000
  };
  return components.map(comp => ({
    ...comp,
    bars: comp.bars.map(bar => ({
      ...bar,
      calculated: calculateComponentBarEntry(
        bar,
        (bar.totalMembers ?? calculateBarsPerMember(bar.barType, bar.direction, comp, bar.spacing, bar.section_span_1, bar.section_span_2))
          * (comp.elementCount || 1),
        settings
      )
    }))
  }));
}

/**
 * Bars whose stored kg differ from what recalculateComponents produces now. Non-empty means a
 * formula changed since the project was saved; the table would otherwise show stale numbers as if exact.
 */
export function findCalculationDrift(components: ConcreteComponent[], metadata?: BBSMetadata): string[] {
  const fresh = recalculateComponents(components, metadata);
  const drift: string[] = [];
  components.forEach((comp, i) => comp.bars.forEach((bar, j) => {
    const stored = bar.calculated?.totalWeight;
    const now = fresh[i].bars[j].calculated?.totalWeight;
    if (stored !== undefined && now !== undefined && Math.abs(stored - now) > 1e-6) {
      drift.push(`${comp.name} ${bar.barType}: stored ${stored.toFixed(3)} kg, recalculated ${now.toFixed(3)} kg`);
    }
  }));
  return drift;
}
