/**
 * End-to-end check against "data/Sample Slab BBS.xlsx" (sheet "Slab 20th Floor", rows 15-18).
 * Every expected number below is the cached value from that file.
 */
import { describe, test, expect } from 'vitest';
import { calculateBarMeasurementsAuto, calculateBarsPerMember, calculateProjectTotal } from '../lib/enhanced-calculator';
import { calculateComponentBarEntry } from '../lib/component-calculator';
import { DEVELOPMENT_LENGTH_TABLES } from '../lib/constants';
import type { ConcreteComponent, ComponentBarEntry, BarDirection } from '../types/component-types';

const slab: ConcreteComponent = {
  id: 'A1', name: 'A1 (B1 - BK)', componentType: 'SLAB',
  spanX: 3160, spanY: 1350, depth: 125, cover: 30,
  beamWidths: { left: 160, right: 160, top: 160, bottom: 160 },
  topExtensions: { left: 425, right: 425, top: 250, bottom: 250 },
  bars: []
};
const settings = { developmentLengths: DEVELOPMENT_LENGTH_TABLES.M30, standardBarLength: 12000 };

function row(barType: string, direction: BarDirection, spacing: number) {
  const bar: ComponentBarEntry = {
    id: barType, barType, direction, diameter: 8, spacing, barsPerMember: 1,
    measurements: calculateBarMeasurementsAuto(barType, direction, slab, 8)
  };
  const members = calculateBarsPerMember(barType, direction, slab, spacing);
  return { bar, members, calc: calculateComponentBarEntry(bar, members, settings) };
}

describe('data/Sample Slab BBS.xlsx', () => {
  test('row 15: Bottom Bar (X-X)', () => {
    const { bar, members, calc } = row('Bottom Bar (X-X)', 'X', 275);
    expect(bar.measurements).toEqual({ a: 3160, b: 260, c: 260, d: 65, e: 65, f: 850 });
    expect(members).toBe(5);
    expect(calc).toMatchObject({ totalMeasurement: 4660, noOfDeductions: 4, deductionAmount: 64, cuttingLength: 4596, noOfBars: 5, totalLength: 22.98 });
  });

  test('row 16: Bottom Bar Dist (X-X)', () => {
    const { bar, members, calc } = row('Bottom Bar Dist (X-X)', 'X', 325);
    expect(bar.measurements).toEqual({ a: 1350, b: 130, c: 130, d: 95, e: 95 });
    expect(members).toBe(3);
    expect(calc).toMatchObject({ totalMeasurement: 1800, noOfDeductions: 2, deductionAmount: 32, cuttingLength: 1768, noOfBars: 3, totalLength: 5.304 });
  });

  test('row 17: Bottom Bar (Y-Y) uses CEILING(...,5)', () => {
    const { bar, members, calc } = row('Bottom Bar (Y-Y)', 'Y', 275);
    expect(bar.measurements).toEqual({ a: 1350, b: 260, c: 260, d: 65, e: 65, f: 500 });
    expect(members).toBe(12);
    expect(calc).toMatchObject({ totalMeasurement: 2500, noOfDeductions: 4, deductionAmount: 64, cuttingLength: 2065, noOfBars: 12, totalLength: 24.78 });
  });

  test('row 18: Bottom Bar Dist (Y-Y)', () => {
    const { bar, members, calc } = row('Bottom Bar Dist (Y-Y)', 'Y', 325);
    expect(bar.measurements).toEqual({ a: 3160, b: 130, c: 130, d: 95, e: 95 });
    expect(members).toBe(2);
    expect(calc).toMatchObject({ totalMeasurement: 3610, noOfDeductions: 2, deductionAmount: 32, cuttingLength: 3578, noOfBars: 2, totalLength: 7.156 });
  });

  test('W21 / C24: total 8mm weight', () => {
    const bars = [
      row('Bottom Bar (X-X)', 'X', 275), row('Bottom Bar Dist (X-X)', 'X', 325),
      row('Bottom Bar (Y-Y)', 'Y', 275), row('Bottom Bar Dist (Y-Y)', 'Y', 325)
    ].map(r => ({ ...r.bar, calculated: r.calc }));
    const total = calculateProjectTotal([{ ...slab, bars }]);
    expect(total.totalWeightKg).toBeCloseTo(23.790617, 5);
    expect(total.totalWeightMT).toBeCloseTo(0.023790617, 8);
  });
});
