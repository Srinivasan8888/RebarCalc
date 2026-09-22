/**
 * Component Calculator — auto-measurements and member counts per bar type.
 * SLAB logic is a direct port of the slab BBS workbook ("data/Sample Slab BBS.xlsx" + production rows).
 * BEAM logic is a direct port of the beam BBS workbook ("data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx").
 * COLUMN / FOOTING logic is engineering heuristics, not from a sheet.
 */

import type { 
  ConcreteComponent, 
  BarMeasurements,
  BarDirection,
  BBSMetadata,
  ConcreteGrade
} from '../types/component-types';

import { DEVELOPMENT_LENGTH_TABLES } from './constants';

const ZERO_SIDES = { left: 0, right: 0, top: 0, bottom: 0 };

/**
 * Main dispatcher for bar measurements based on bar type
 */
export function calculateBarMeasurementsAuto(
  barType: string,
  direction: BarDirection,
  component: ConcreteComponent,
  diameter: number,
  metadata?: BBSMetadata,
  section_span_override?: number,
  siblings: ConcreteComponent[] = [] // other components; the ones sharing component.runId form its continuous run
): BarMeasurements {
  const normalizedBarType = barType.trim().replace(/\(([XY])\s*-\s*[XY]\)/gi, '($1-$1)');
  const ld: Record<number, number> = metadata?.developmentLengths || DEVELOPMENT_LENGTH_TABLES[(metadata?.concreteGrade || 'M30') as ConcreteGrade];

  switch (component.componentType) {
    case 'SLAB': return calculateSlabBarMeasurements(normalizedBarType, direction, component, diameter, ld, section_span_override);
    case 'BEAM': return calculateBeamBarMeasurements(normalizedBarType, component, diameter, ld, metadata?.curtailOffset ?? 300, runOf(component, siblings));
    case 'COLUMN': return calculateColumnBarMeasurements(normalizedBarType, component, diameter, ld);
    case 'FOOTING': return calculateFootingBarMeasurements(normalizedBarType, direction, component, diameter, ld);
  }
  return { a: 0 };
}

// ============================================================================
// SLAB BAR CALCULATIONS — ported from the production BBS workbook.
// Cell key: C=spanX D=spanY F=depth $G$4=cover; beam rows: C=left/right D=top/bottom;
// top extensions: K+L = left+right, M+N = top+bottom.
// ============================================================================

const SIDES = ['left', 'right', 'top', 'bottom'] as const;
type Side = typeof SIDES[number];

/** "Top Main Bar (X-X) - Left & Right" → ['left','right']; no suffix → both sides of that direction */
function barSides(t: string, direction: BarDirection): Side[] {
  const suffix = t.split(' - ')[1] ?? '';
  const named = SIDES.filter(s => suffix.includes(s));
  if (named.length) return named;
  return direction === 'X' ? ['left', 'right'] : ['top', 'bottom'];
}

function calculateSlabBarMeasurements(
  barType: string,
  direction: BarDirection,
  component: ConcreteComponent,
  diameter: number,
  ld: Record<number, number>,
  section_span_override?: number
): BarMeasurements {
  const t = barType.toLowerCase();
  const cover = component.cover;
  const depth = component.depth || 0;
  const bw = component.beamWidths ?? ZERO_SIDES;
  const ext = component.topExtensions ?? ZERO_SIDES;

  const span = section_span_override || (direction === 'X' ? component.spanX : component.spanY);
  const perpSpan = section_span_override || (direction === 'X' ? component.spanY : component.spanX);
  const [start, end] = barSides('', direction); // beams the bar ends land on
  const [side] = barSides(t, direction);

  if (t === 'extra top') return { a: 2 * 12 * diameter };
  if (t === 'extra bottom') return { a: 2 * getDevelopmentLength(diameter, ld) };
  if (t === 'chair bar') return { a: depth - 2 * cover, b: 5 * diameter, c: 5 * diameter };

  // Top MainBar (X-X) - Left: a=C27 (extension of that side), b=C22-$G$4, d=$F$20-$G$4
  if (t.includes('top main')) {
    return { a: ext[side], b: bw[side] - cover, d: depth - cover };
  }

  // Bottom Bar Dist / Top Dist Bar: a=perpendicular span, b=C14-$G$4, c=D14-$G$4, d=e=F11-$G$4
  if (t.includes('dist')) {
    return { a: perpSpan, b: bw.right - cover, c: bw.bottom - cover, d: depth - cover, e: depth - cover };
  }

  // Full Span: a=C20, b=C22-$G$4, c=C23-$G$4; X-X d=e=$F$20-2*$G$4, Y-Y d=e=$F$54-$G$4 (as the workbook has it)
  if (t.includes('full span')) {
    const de = direction === 'X' ? depth - 2 * cover : depth - cover;
    return { a: span, b: bw[start] - cover, c: bw[end] - cover, d: de, e: de };
  }

  // Bottom & Top Bar (X-X): =+C47-$G$4, C49-$G$4, F47-$G$4, F47-$G$4
  // Bottom & Top Bar (Y-Y): =+D47, D49-$G$4, F47-$G$4, D50-$G$4
  if (/(bottom & top|top & bottom)/.test(t)) {
    return direction === 'X'
      ? { a: span - cover, b: bw[start] - cover, c: depth - cover, d: depth - cover }
      : { a: span, b: bw[start] - cover, c: depth - cover, d: bw[end] - cover };
  }

  // Top Bar (X-X): =+C643-$G$4, 2*(C645-$G$4), F643-$G$4, F643-$G$4
  if (t === 'top bar (x-x)') {
    return { a: span - cover, b: 2 * (bw[start] - cover), c: depth - cover, d: depth - cover };
  }

  // U-bar (rows 15/17): a=C11, b=2*(C13-$G$4), c=2*(C14-$G$4), d=e=F11-2*$G$4, f=K11+L11
  return {
    a: span,
    b: 2 * (bw[start] - cover),
    c: 2 * (bw[end] - cover),
    d: depth - 2 * cover,
    e: depth - 2 * cover,
    f: ext[start] + ext[end]
  };
}

// ============================================================================
// BEAM BAR CALCULATIONS (beam sheet: C=width D=depth J=clear span I/K=supports
//   $R$4=cover  W3:AC4=Ld by dia  $R$8=curtail offset; legs A..F = cols O..T)
// ============================================================================

/** Beams sharing component.runId, left→right; a beam outside any run is a run of one */
export function runOf(component: ConcreteComponent, siblings: ConcreteComponent[]): ConcreteComponent[] {
  if (!component.runId) return [component];
  const run = siblings.filter(c => c.runId === component.runId && c.id !== component.id).concat(component);
  return run.sort((a, b) => (a.runPosition ?? 0) - (b.runPosition ?? 0));
}

function calculateBeamBarMeasurements(
  barType: string,
  component: ConcreteComponent,
  diameter: number,
  ld: Record<number, number>,
  curtailOffset: number,
  run: ConcreteComponent[]
): BarMeasurements {
  const t = barType.toLowerCase();
  const width = component.spanY;
  const depth = component.depth || 0;
  const span = component.spanX;
  const cover = component.cover;
  const Ld = getDevelopmentLength(diameter, ld);
  const hook = 10 * diameter;
  const next = run[run.indexOf(component) + 1]; // right-hand neighbour in a continuous run

  // Stirrups: (C-2*$R$4), same, (D-2*$R$4), same, 75, 75
  if (t.includes('stirrup')) {
    return { a: width - 2 * cover, b: width - 2 * cover, c: depth - 2 * cover, d: depth - 2 * cover, e: 75, f: 75 };
  }
  // Span_Bottom _Curtail: b = J-(2*$R$8)
  if (t.includes('curtail')) {
    return { a: 0, b: span - 2 * curtailOffset };
  }
  // "B1 & B2-Top Extra - Layer 2 - Left & Right" over an intermediate support: J1/3, K1, J2/3 (row 22: =J15/3, =K15, =J16/3)
  if (t.includes('top extra') && t.includes('left & right') && next) {
    return { a: span / 3, b: component.beamWidths?.right ?? 0, c: next.spanX / 3 };
  }
  // Top Extra - Layer 2 - side at an end support: Ld, J/4, -, 10d
  if (t.includes('top extra')) {
    return { a: Ld, b: span / 4, d: hook };
  }
  // Full Span over a run: b = J1+K1+J2+K2+J3 (row 18: =J15+K15+J16+K16+J17)
  if (t.includes('full span') && run.length > 1) {
    const b = run.reduce((sum, c, i) => sum + c.spanX + (i < run.length - 1 ? c.beamWidths?.right ?? 0 : 0), 0);
    return { a: Ld, b, c: Ld, d: hook, e: hook };
  }
  // Span_Top / Span_Bottom / Full Span / Side Face Steel: Ld, J, Ld, 10d, 10d
  return { a: Ld, b: span, c: Ld, d: hook, e: hook };
}

// ============================================================================
// COLUMN BAR CALCULATIONS
// ============================================================================

function calculateColumnBarMeasurements(
  barType: string,
  component: ConcreteComponent,
  diameter: number,
  ld: Record<number, number>
): BarMeasurements {
  const width = component.spanX;
  const depth = component.spanY;
  const height = component.depth || 3000;

  switch (barType.toLowerCase()) {
    case 'main bar':
      // Column height + lap lengths at top and bottom
      return { a: height + 2 * getLapLength(diameter, ld) };
    case 'tie':
    case 'master tie':
      // Tie perimeter: 2(W-2C) + 2(D-2C) + 2×Hook
      return { a: 2 * (width - 2 * component.cover) + 2 * (depth - 2 * component.cover) + 2 * 10 * diameter };
  }
  return { a: height };
}

// ============================================================================
// FOOTING BAR CALCULATIONS
// ============================================================================

function calculateFootingBarMeasurements(
  barType: string,
  direction: BarDirection,
  component: ConcreteComponent,
  diameter: number,
  ld: Record<number, number>
): BarMeasurements {
  const span = direction === 'X' ? component.spanX : component.spanY;
  const developmentLength = getDevelopmentLength(diameter, ld);
  const footLength = 10 * diameter;

  switch (barType.toLowerCase()) {
    case 'bottom main (l)':
    case 'top main (l)':
      return { a: span + 2 * developmentLength };
    case 'bottom dist (b)':
    case 'top dist (b)':
      return { a: span, b: footLength, c: footLength };
    case 'dowel bars':
      return { a: 40 * diameter };
  }
  return { a: span };
}

// ============================================================================
// TOTAL MEMBERS (Excel column H: "Total no. of members Reqd")
// ============================================================================

export function calculateBarsPerMember(
  barType: string,
  direction: BarDirection,
  component: ConcreteComponent,
  spacing: number,
  _section_span_1?: number, // Bar length override (affects measurements only)
  section_span_2?: number   // Distribution span override
): number {
  if (!spacing) return 0;
  const t = barType.toLowerCase();
  const perpSpan = section_span_2 || (direction === 'X' ? component.spanY : component.spanX);

  if (component.componentType === 'SLAB') {
    // Dist bars: ROUNDUP((K11+L11)/spacing) — cover only the top extensions of their side(s)
    if (t.includes('dist')) {
      const ext = component.topExtensions ?? ZERO_SIDES;
      const extensions = barSides(t, direction).reduce((sum, s) => sum + ext[s], 0);
      return Math.ceil((section_span_2 || extensions) / spacing);
    }
    if (t === 'extra top' || t === 'extra bottom') {
      return Math.ceil(Math.min(component.spanX, component.spanY) / (spacing * 2));
    }
    if (t === 'chair bar') {
      return Math.ceil(Math.max(component.spanX, component.spanY) / spacing);
    }
    // Everything else: ROUNDUP(D11/spacing) for X-X, ROUNDUP(C11/spacing) for Y-Y — perpendicular span
    return Math.ceil(perpSpan / spacing);
  }

  if (component.componentType === 'BEAM') {
    const depth = component.depth || 0;
    // Stirrups col H: Left/Right/L&R = TRUNC(2D/sp), Middle = TRUNC((J-4D)/sp), Full = TRUNC(J/sp)
    if (t.includes('stirrup')) {
      if (t.includes('middle')) return Math.trunc((component.spanX - 4 * depth) / spacing);
      if (t.includes('full')) return Math.trunc(component.spanX / spacing);
      return Math.trunc((2 * depth) / spacing);
    }
    return 1; // main bars: rods per layer is typed (bar.totalMembers)
  }

  if (component.componentType === 'COLUMN') {
    if (t === 'main bar') {
      const perimeter = 2 * (component.spanX + component.spanY);
      return Math.max(4, Math.ceil(perimeter / spacing)); // Minimum 4 bars
    }
    return Math.ceil((component.depth || 3000) / spacing); // Ties along column height
  }

  if (component.componentType === 'FOOTING') {
    if (t === 'dowel bars') {
      return Math.max(4, Math.ceil((component.spanX * component.spanY) / 10000)); // 1 bar per 100cm²
    }
    if (t.includes('(l)')) return Math.ceil(component.spanY / spacing); // Across width
    if (t.includes('(b)')) return Math.ceil(component.spanX / spacing); // Across length
  }

  return Math.ceil(perpSpan / spacing);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDevelopmentLength(diameter: number, ld: Record<number, number>): number {
  return ld[diameter] || (50 * diameter); // Fallback to 50D
}

function getLapLength(diameter: number, ld: Record<number, number>): number {
  // Lap length is typically 1.3 × Development length for tension
  return Math.ceil(1.3 * getDevelopmentLength(diameter, ld));
}

/**
 * Calculate totals for entire project grouped by diameter
 */
export function calculateProjectTotal(
  components: ConcreteComponent[]
): { byDiameter: { [diameter: number]: { lengthM: number; weightKg: number } }; totalWeightKg: number; totalWeightMT: number } {
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
