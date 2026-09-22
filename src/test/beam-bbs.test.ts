// @vitest-environment node
/**
 * Beam BBS: formulas checked against "data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx" (DRA iHeart 19th floor beams),
 * then the whole workbook imported and its grand totals reproduced.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBBSWorkbook } from '../lib/excel-importer';
import { recalculateComponents } from '../lib/component-calculator';
import { calculateBarMeasurementsAuto, calculateBarsPerMember, calculateProjectTotal } from '../lib/enhanced-calculator';
import type { ConcreteComponent, BBSMetadata } from '../types/component-types';

const ld40D = { 8: 320, 10: 400, 12: 480, 16: 640, 20: 800, 25: 1000, 32: 1280 };
const metadata: BBSMetadata = {
  projectName: '', drawingNumber: '', itemDescription: '', concreteGrade: 'M30', steelGrade: 'Fe550',
  developmentLengths: ld40D, curtailOffset: 300
};
// Row 66: B4, 200×600, clear span 3250, supports 200, 5 elements
const B4: ConcreteComponent = {
  id: 'B4', name: 'B4', componentType: 'BEAM', spanX: 3250, spanY: 200, depth: 600, cover: 30,
  beamWidths: { left: 200, right: 200, top: 0, bottom: 0 }, elementCount: 5, bars: []
};

describe('beam formulas (rows 67-72 of the workbook)', () => {
  test('Span_Top - Layer 1, dia 12: Ld, J, Ld, 10d, 10d', () => {
    expect(calculateBarMeasurementsAuto('Span_Top - Layer 1', 'X', B4, 12, metadata)).toEqual({ a: 480, b: 3250, c: 480, d: 120, e: 120 });
  });
  test('Top Extra - Layer 2 - Left & Right, dia 16: Ld, J/4, -, 10d', () => {
    expect(calculateBarMeasurementsAuto('Top Extra - Layer 2 - Left & Right', 'X', B4, 16, metadata)).toEqual({ a: 640, b: 812.5, d: 160 });
  });
  test('Stirrups, dia 8: C-2c, C-2c, D-2c, D-2c, 75, 75 and zone counts', () => {
    expect(calculateBarMeasurementsAuto('Stirrups - Left', 'X', B4, 8, metadata)).toEqual({ a: 140, b: 140, c: 540, d: 540, e: 75, f: 75 });
    expect(calculateBarsPerMember('Stirrups - Left', 'X', B4, 100)).toBe(12);   // TRUNC(2*600/100)
    expect(calculateBarsPerMember('Stirrups - Middle', 'X', B4, 125)).toBe(6);  // TRUNC((3250-2400)/125)
    expect(calculateBarsPerMember('Stirrups - Full', 'X', B4, 150)).toBe(21);   // TRUNC(3250/150)
  });
  test('Span_Bottom _Curtail: b = J - 2*300', () => {
    expect(calculateBarMeasurementsAuto('Span_Bottom _Curtail', 'X', B4, 12, metadata)).toEqual({ a: 0, b: 2650 });
  });
  test('element count multiplies every bar: Stirrups - Left ⇒ 5 × 12 = 60 bars, 85.8 m', () => {
    const [comp] = recalculateComponents([{ ...B4, bars: [
      { id: 's', barType: 'Stirrups - Left', direction: 'X', diameter: 8, spacing: 100, barsPerMember: 1,
        measurements: calculateBarMeasurementsAuto('Stirrups - Left', 'X', B4, 8, metadata) }
    ] }], metadata);
    expect(comp.bars[0].calculated).toMatchObject({ noOfDeductions: 5, deductionAmount: 80, cuttingLength: 1430, noOfBars: 60, totalLength: 85.8 });
  });
});

describe('import data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx', () => {
  const buf = readFileSync('data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx');
  const loaded = parseBBSWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)); // parsed once per file
  const load = () => loaded;

  test('metadata: grade from U4, 40D Ld table, curtail offset R8', async () => {
    const { metadata } = await load();
    expect(metadata).toMatchObject({ projectName: 'DRA iHeart', itemDescription: 'BBS for 19th Floor Beams (Roof of 18th Floor)', concreteGrade: 'M30', steelGrade: 'Fe550', curtailOffset: 300 });
    expect(metadata.developmentLengths).toEqual(ld40D);
  });

  test('369 beams; continuous group B1-B3 keeps group bars on B1 and per-beam stirrups on each', async () => {
    const { components } = await load();
    expect(components).toHaveLength(369);
    const [b1, b2, b3] = components;
    expect(b1).toMatchObject({ name: 'B1', spanX: 3350, spanY: 200, depth: 600, cover: 30, elementCount: 1, beamWidths: { left: 200, right: 200 } });
    expect(b1.bars.map(b => b.barType)).toEqual([
      'Full Span_Bottom - Layer 1', 'Full Span_Bottom - Layer 2', 'Full Span_Top - Layer 1',
      'Top Extra - Layer 2 - Left', 'Top Extra - Layer 2 - Left & Right', 'Stirrups - L & R', 'Stirrups - Middle'
    ]);
    expect(b2.bars.map(b => b.barType)).toEqual(['Top Extra - Layer 2 - Left & Right', 'Stirrups - L & R', 'Stirrups - Middle']);
    expect(b3.bars.map(b => b.barType)).toEqual(['Top Extra - Layer 2 - Right', 'Stirrups - L & R', 'Stirrups - Middle']);
    expect(b1.bars[0].measurements).toEqual({ a: 640, b: 10340, c: 640, d: 160, e: 160, f: undefined });
    expect(b1.bars[0].totalMembers).toBe(2);               // typed rods per layer
    expect(b1.bars[5].totalMembers).toBeUndefined();       // stirrup count matches our TRUNC formula
  });

  test('recalculated rows equal the sheet (V18, V25, V67, V70)', async () => {
    const { metadata, components } = await load();
    const calc = recalculateComponents(components, metadata);
    const v = (comp: number, bar: number) => calc[comp].bars[bar].calculated!.totalLength;
    expect(v(0, 0)).toBeCloseTo(23.752, 6);  // Full Span_Bottom - Layer 1
    expect(v(0, 5)).toBeCloseTo(34.32, 6);   // B1_Stirrups - L & R
    const b4 = calc.findIndex(c => c.name === 'B4');
    expect(v(b4, 0)).toBeCloseTo(44.26, 6);  // Span_Top - Layer 1 × 5 elements
    expect(v(b4, 3)).toBeCloseTo(85.8, 6);   // Stirrups - Left × 5 elements
  });

  test('run B1-B3: Full Span and intermediate extra tops regenerate from run geometry (rows 18, 22, 23)', async () => {
    const { metadata, components } = await load();
    const [b1, b2, b3] = components;
    expect([b1, b2, b3].map(c => [c.runId, c.runPosition])).toEqual([['1', 1], ['1', 2], ['1', 3]]);
    expect(components.find(c => c.name === 'B4')!.runId).toBeUndefined(); // B4 stands alone
    const auto = (comp: ConcreteComponent, barType: string, dia: number) =>
      calculateBarMeasurementsAuto(barType, 'X', comp, dia, metadata, undefined, components);
    expect(auto(b1, 'Full Span_Bottom - Layer 1', 16)).toEqual({ a: 640, b: 10340, c: 640, d: 160, e: 160 });
    const near = (m: object) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toFixed(3)]));
    expect(near(auto(b1, 'Top Extra - Layer 2 - Left & Right', 16))).toEqual({ a: 1116.667, b: 200, c: 1083.333 });
    expect(near(auto(b2, 'Top Extra - Layer 2 - Left & Right', 12))).toEqual({ a: 1083.333, b: 200, c: 1113.333 });
    expect(auto(b3, 'Top Extra - Layer 2 - Right', 16)).toEqual({ a: 640, b: 835, d: 160 }); // last beam: end-support rule
    expect(b1.bars[4].manualNoOfDeductions).toBe(0); // intermediate extra top: 0 bends, from col L
  });

  test('grand total equals AD2651 / W2651', async () => {
    const { metadata, components } = await load();
    const total = calculateProjectTotal(recalculateComponents(components, metadata));
    expect(total.totalWeightKg).toBeCloseTo(34227.2066779835, 4);
    expect(total.byDiameter[8].weightKg).toBeCloseTo(5234.99061728395, 4);
    expect(total.byDiameter[32].weightKg).toBeCloseTo(378.842074074074, 4);
  });
});
