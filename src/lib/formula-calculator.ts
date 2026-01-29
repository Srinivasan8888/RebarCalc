/**
 * Formula-Driven Calculator
 * Uses canonical formulas from bar_type_canonical_formulas.json
 * to calculate bar measurements dynamically
 */

import type { BarMeasurements, ConcreteComponent, BarDirection } from '../types/component-types';
// Note: This file uses old canonical formulas - consider migrating to formula-engine.ts
import canonicalFormulas from '../../bar_type_canonical_formulas.json';

// Type for canonical bar data
interface CanonicalBar {
  bar_type: string;
  diameter: number;
  spacing: number;
  bars_per_member: number;
  total_members: number;
  total_nos: number;
  a: number | null;
  b: number | null;
  c: number | null;
  d: number | null;
  e: number | null;
  f: number | null;
  lap: number | null;
  total_measurement: number;
  no_of_bends: number;
  deduction: number;
  cut_length: number;
  total_length_m: number;
  formulas: {
    a: string | null;
    b: string | null;
    c: string | null;
    d: string | null;
    e: string | null;
    f: string | null;
    lap: string | null;
    total_members: string | null;
    total_nos: string | null;
    total: string | null;
    bends: string | null;
    deduction: string | null;
    cut_length: string | null;
    total_length: string | null;
  };
  _canonical_metadata: {
    bar_type: string;
    total_occurrences: number;
    formula_variations: number;
    most_common_formula_count: number;
    formula_usage_percentage: string;
    is_canonical: boolean;
    note: string;
  };
}

// Cache for canonical formulas
const canonicalBarsMap = new Map<string, CanonicalBar>();

// Initialize the map
function initializeCanonicalBars() {
  if (canonicalBarsMap.size > 0) return; // Already initialized
  
  const bars = (canonicalFormulas as any).canonical_bars as CanonicalBar[];
  bars.forEach(bar => {
    canonicalBarsMap.set(bar.bar_type, bar);
  });
  
  console.log(`📚 Loaded ${canonicalBarsMap.size} canonical bar formulas`);
}

/**
 * Normalize bar type name to match canonical formulas
 */
function normalizeBarTypeName(barType: string): string {
  let normalized = barType.trim();
  
  // Fix spacing issues
  normalized = normalized.replace(/\(X\s*-\s*X\)/gi, '(X-X)');
  normalized = normalized.replace(/\(Y\s*-\s*Y\)/gi, '(Y-Y)');
  
  // Remove location-specific suffixes (everything after direction marker)
  normalized = normalized.replace(/(\([XY]-[XY]\)).*$/, '$1');
  
  return normalized.trim();
}

/**
 * Parse and evaluate Excel formula
 * Replaces cell references with actual values
 */
function evaluateFormula(
  formula: string | null,
  context: {
    component: ConcreteComponent;
    direction: BarDirection;
    diameter: number;
    cover: number;
  }
): number {
  if (!formula) return 0;
  
  const { component, direction, diameter: _diameter, cover } = context;
  const span = direction === 'X' ? component.spanX : component.spanY;
  const perpSpan = direction === 'X' ? component.spanY : component.spanX;
  const depth = component.depth || 125;
  
  // Common Excel formulas and their meanings
  // $G$4 = cover (always 30 in the Excel)
  // C11, D11 = spanX, spanY
  // C13, D13 = beam widths
  // F11 = depth
  
  let expr = formula;
  
  // Replace common patterns
  expr = expr.replace(/\$G\$4/g, cover.toString());
  expr = expr.replace(/\$F\$\d+/g, depth.toString());
  
  // For direction-specific replacements
  if (direction === 'X') {
    // X direction uses spanX, beamLeft, beamRight
    expr = expr.replace(/C\d+/g, span.toString());
    expr = expr.replace(/D\d+/g, perpSpan.toString());
  } else {
    // Y direction uses spanY, beamTop, beamBottom
    expr = expr.replace(/C\d+/g, perpSpan.toString());
    expr = expr.replace(/D\d+/g, span.toString());
  }
  
  // Remove Excel operators and convert to JavaScript
  expr = expr.replace(/^=\+?/, ''); // Remove leading = or =+
  expr = expr.replace(/\*/g, '*');
  expr = expr.replace(/\//g, '/');
  
  // Handle simple arithmetic expressions
  try {
    // Use Function constructor for safe evaluation
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch (error) {
    console.warn(`⚠️ Failed to evaluate formula: ${formula}`, error);
    return 0;
  }
}

/**
 * Calculate bar measurements using canonical formulas
 */
export function calculateWithCanonicalFormulas(
  barType: string,
  direction: BarDirection,
  component: ConcreteComponent,
  diameter: number
): BarMeasurements | null {
  // Initialize canonical bars map
  initializeCanonicalBars();
  
  // Normalize bar type
  const normalizedBarType = normalizeBarTypeName(barType);
  
  // Find canonical formula
  const canonical = canonicalBarsMap.get(normalizedBarType);
  
  if (!canonical) {
    console.warn(`⚠️ No canonical formula found for: ${normalizedBarType}`);
    return null;
  }
  
  console.log(`📐 Using canonical formula for: ${normalizedBarType}`);
  console.log(`   Formula variations: ${canonical._canonical_metadata.formula_variations}`);
  console.log(`   Usage: ${canonical._canonical_metadata.formula_usage_percentage}`);
  
  // Create evaluation context
  const context = {
    component,
    direction,
    diameter,
    cover: component.cover
  };
  
  // Evaluate each formula
  const measurements: BarMeasurements = {
    a: evaluateFormula(canonical.formulas.a, context),
    b: evaluateFormula(canonical.formulas.b, context),
    c: evaluateFormula(canonical.formulas.c, context),
    d: evaluateFormula(canonical.formulas.d, context),
    e: evaluateFormula(canonical.formulas.e, context),
    f: evaluateFormula(canonical.formulas.f, context),
    lap: evaluateFormula(canonical.formulas.lap, context)
  };
  
  console.log(`   Calculated measurements:`, measurements);
  
  return measurements;
}

/**
 * Get canonical bar metadata
 */
export function getCanonicalBarMetadata(barType: string) {
  initializeCanonicalBars();
  const normalized = normalizeBarTypeName(barType);
  const canonical = canonicalBarsMap.get(normalized);
  return canonical?._canonical_metadata || null;
}

/**
 * Get all available canonical bar types
 */
export function getAllCanonicalBarTypes(): string[] {
  initializeCanonicalBars();
  return Array.from(canonicalBarsMap.keys()).sort();
}

/**
 * Check if a bar type has canonical formula
 */
export function hasCanonicalFormula(barType: string): boolean {
  initializeCanonicalBars();
  const normalized = normalizeBarTypeName(barType);
  return canonicalBarsMap.has(normalized);
}
