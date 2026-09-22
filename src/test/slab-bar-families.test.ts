/**
 * Every slab bar family, checked against the canonical rows of the production BBS workbook
 * (the a..f, members and cut-length values recorded per bar type). Panel inputs are the ones
 * those rows were computed from: beams 160, cover 30, depth 125 throughout.
 */
import { describe, test, expect } from 'vitest';
import { calculateBarMeasurementsAuto, calculateBarsPerMember } from '../lib/enhanced-calculator';
import { calculateComponentBarEntry } from '../lib/component-calculator';
import { DEVELOPMENT_LENGTH_TABLES } from '../lib/constants';
import type { ConcreteComponent, BarDirection } from '../types/component-types';

const settings = { developmentLengths: DEVELOPMENT_LENGTH_TABLES.M30, standardBarLength: 12000 };
const beams = { left: 160, right: 160, top: 160, bottom: 160 };

function panel(spanX: number, spanY: number, ext: ConcreteComponent['topExtensions']): ConcreteComponent {
  return { id: 'p', name: 'p', componentType: 'SLAB', spanX, spanY, depth: 125, cover: 30, beamWidths: beams, topExtensions: ext, bars: [] };
}

function row(comp: ConcreteComponent, barType: string, spacing: number, barsPerMember = 1) {
  const direction: BarDirection = barType.includes('(Y-Y)') ? 'Y' : 'X';
  const measurements = calculateBarMeasurementsAuto(barType, direction, comp, 8);
  const members = calculateBarsPerMember(barType, direction, comp, spacing);
  const calc = calculateComponentBarEntry({ id: barType, barType, direction, diameter: 8, spacing, barsPerMember, measurements }, members, settings);
  return { measurements, members, calc };
}

describe('workbook block 20 — 3650×3650 panel, left/top extension 725', () => {
  const p = panel(3650, 3650, { left: 725, right: 725, top: 725, bottom: 725 });

  test('Bottom Bar (X-X) Full Span', () => {
    const r = row(p, 'Bottom Bar (X-X) Full Span', 275);
    expect(r.measurements).toEqual({ a: 3650, b: 130, c: 130, d: 65, e: 65 });
    expect(r.members).toBe(14);
    expect(r.calc).toMatchObject({ totalMeasurement: 4040, noOfDeductions: 2, cuttingLength: 4008 });
  });

  test('Top Main Bar (X-X) - Left', () => {
    const r = row(p, 'Top Main Bar (X-X) - Left', 275);
    expect(r.measurements).toEqual({ a: 725, b: 130, d: 95 });
    expect(r.members).toBe(14);
    expect(r.calc).toMatchObject({ totalMeasurement: 950, noOfDeductions: 2, cuttingLength: 985 });
  });

  test('Top Main Bar (Y-Y) - Top', () => {
    const r = row(p, 'Top Main Bar (Y-Y) - Top', 225);
    expect(r.measurements).toEqual({ a: 725, b: 130, d: 95 });
    expect(r.members).toBe(17);
    expect(r.calc.cuttingLength).toBe(985);
  });

  test('Top Dist Bar (X-X) - Left', () => {
    const r = row(p, 'Top Dist Bar (X-X) - Left', 325);
    expect(r.measurements).toEqual({ a: 3650, b: 130, c: 130, d: 95, e: 95 });
    expect(r.members).toBe(3);
    expect(r.calc).toMatchObject({ totalMeasurement: 4100, cuttingLength: 4135 });
  });
});

describe('workbook block 54 — 3500×3050 panel, left/right extension 725', () => {
  const p = panel(3500, 3050, { left: 725, right: 725, top: 0, bottom: 0 });

  test('Bottom Bar (Y-Y) Full Span uses depth − cover and CEILING', () => {
    const r = row(p, 'Bottom Bar (Y-Y) Full Span', 250);
    expect(r.measurements).toEqual({ a: 3050, b: 130, c: 130, d: 95, e: 95 });
    expect(r.members).toBe(14);
    expect(r.calc).toMatchObject({ totalMeasurement: 3500, noOfDeductions: 2, cuttingLength: 3535 });
  });

  test('Top Dist Bar (X-X) - Left & Right counts both extensions', () => {
    const r = row(p, 'Top Dist Bar (X-X) - Left & Right', 325);
    expect(r.measurements).toEqual({ a: 3050, b: 130, c: 130, d: 95, e: 95 });
    expect(r.members).toBe(5);
    expect(r.calc.cuttingLength).toBe(3535);
  });
});

describe('workbook block 563 — Top Main Bar (X-X) - Left & Right, extension 625, spanY 4400', () => {
  test('one bar per side ⇒ 2 bars/member', () => {
    const r = row(panel(3000, 4400, { left: 625, right: 625, top: 0, bottom: 0 }), 'Top Main Bar (X-X) - Left & Right', 200, 2);
    expect(r.measurements).toEqual({ a: 625, b: 130, d: 95 });
    expect(r.members).toBe(22);
    expect(r.calc).toMatchObject({ totalMeasurement: 850, cuttingLength: 885, noOfBars: 44 });
  });
});

describe('workbook block 47 — 975×1060 panel, Bottom & Top bars', () => {
  const p = panel(975, 1060, { left: 0, right: 0, top: 0, bottom: 0 });

  test('Bottom & Top Bar (X-X): a = span − cover, 2 bends, standard cut', () => {
    const r = row(p, 'Bottom & Top Bar (X-X)', 200, 2);
    expect(r.measurements).toEqual({ a: 945, b: 130, c: 95, d: 95 });
    expect(r.members).toBe(6);
    expect(r.calc).toMatchObject({ totalMeasurement: 1265, noOfDeductions: 2, cuttingLength: 1233, noOfBars: 12 });
  });

  test('Bottom & Top Bar (Y-Y): 4 bends, CEILING cut', () => {
    const r = row(p, 'Bottom & Top Bar (Y-Y)', 200, 2);
    expect(r.measurements).toEqual({ a: 1060, b: 130, c: 95, d: 130 });
    expect(r.members).toBe(5);
    expect(r.calc).toMatchObject({ totalMeasurement: 1415, noOfDeductions: 4, deductionAmount: 64, cuttingLength: 1480 });
  });
});

describe('workbook block 643 — Top Bar (X-X), 1050 span, dia 16', () => {
  test('a = span − cover, b = 2×(beam − cover)', () => {
    const p = panel(1050, 3000, { left: 0, right: 0, top: 0, bottom: 0 });
    const measurements = calculateBarMeasurementsAuto('Top Bar (X-X)', 'X', p, 16);
    expect(measurements).toEqual({ a: 1020, b: 260, c: 95, d: 95 });
    const calc = calculateComponentBarEntry({ id: 't', barType: 'Top Bar (X-X)', direction: 'X', diameter: 16, spacing: 200, measurements }, 2, settings);
    expect(calc).toMatchObject({ totalMeasurement: 1470, deductionAmount: 64, cuttingLength: 1406 });
  });
});
