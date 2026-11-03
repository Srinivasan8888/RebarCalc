import { describe, it, expect } from 'vitest';
import { planCuts, concreteVolumeM3, is1786BatchTolerancePct } from '@/lib/steel-review';
import type { ConcreteComponent } from '@/types/component-types';

const member = (bars: { dia: number; cut: number; nos: number }[], over: Partial<ConcreteComponent> = {}): ConcreteComponent => ({
  id: 'm', name: 'B1', componentType: 'BEAM', spanX: 3350, spanY: 200, depth: 600, cover: 30, elementCount: 2,
  bars: bars.map((b, i) => ({
    id: String(i), barType: 't', direction: 'NONE', diameter: b.dia, spacing: 0, measurements: { a: b.cut },
    calculated: { totalMeasurement: b.cut, noOfDeductions: 0, deductionAmount: 0, cuttingLength: b.cut, noOfBars: b.nos, totalLength: 0, unitWeight: 0, totalWeight: 0 },
  })),
  ...over,
});

describe('steel review', () => {
  it('packs cut lengths into stock bars, first fit decreasing', () => {
    const plan = planCuts([member([{ dia: 8, cut: 7000, nos: 2 }, { dia: 8, cut: 5000, nos: 2 }])]);
    expect(plan[8]).toMatchObject({ pieces: 4, stockBars: 2, usedMm: 24000, wastePct: 0, longestMm: 7000 });
  });

  it('reports waste and keeps diameters apart', () => {
    const plan = planCuts([member([{ dia: 12, cut: 9000, nos: 1 }, { dia: 12, cut: 4000, nos: 2 }, { dia: 16, cut: 13000, nos: 1 }])]);
    expect(plan[12].stockBars).toBe(2);
    expect(plan[12].wastePct).toBeCloseTo(((24000 - 17000) / 24000) * 100, 6);
    expect(plan[16]).toMatchObject({ stockBars: 2, usedMm: 13000 }); // longer than stock: its own bars, no waste counted
  });

  it('sizes concrete from beams × nos and slabs', () => {
    const beam = member([]);
    const slab = member([], { componentType: 'SLAB', spanX: 3160, spanY: 1350, depth: 125 });
    expect(concreteVolumeM3([beam, slab])).toBeCloseTo((3350 * 200 * 600 * 2 + 3160 * 1350 * 125) / 1e9, 9);
  });

  it('IS 1786 Table 1 batch tolerance by diameter', () => {
    expect([8, 10, 12, 16, 20, 25].map(is1786BatchTolerancePct)).toEqual([7, 7, 5, 5, 3, 3]);
  });
});
