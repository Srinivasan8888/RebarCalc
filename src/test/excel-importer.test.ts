// @vitest-environment node
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBBSWorkbook } from '../lib/excel-importer';
import { recalculateComponents } from '../lib/component-calculator';
import { calculateProjectTotal } from '../lib/enhanced-calculator';

const buf = readFileSync('data/Sample Slab BBS.xlsx');
const loaded = parseBBSWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)); // parsed once per file
const load = () => loaded;

describe('import data/Sample Slab BBS.xlsx', () => {
  test('metadata from the header block', async () => {
    const { metadata } = await load();
    expect(metadata).toMatchObject({
      projectName: 'Provident White Oaks - Bangalore',
      drawingNumber: 'ST-B-220-R0 & ST-B-320-R0',
      itemDescription: '20th Floor Slab Reinforcement',
      concreteGrade: 'M30',
      steelGrade: 'Fe550'
    });
    expect(metadata.developmentLengths).toEqual({ 8: 400, 10: 500, 12: 599, 16: 798, 20: 998, 25: 1247, 32: 1995 });
  });

  test('component A1 with beams, extensions and 4 bar rows', async () => {
    const { components } = await load();
    expect(components).toHaveLength(1);
    expect(components[0]).toMatchObject({
      name: 'A1 (B1 - BK)', componentType: 'SLAB', spanX: 3160, spanY: 1350, depth: 125, cover: 30,
      beamWidths: { left: 160, right: 160, top: 160, bottom: 160 },
      topExtensions: { left: 425, right: 425, top: 250, bottom: 250 }
    });
    const bars = components[0].bars;
    expect(bars.map(b => [b.barType, b.direction, b.spacing, b.diameter, b.manualNoOfDeductions])).toEqual([
      ['Bottom Bar (X-X)', 'X', 275, 8, 4],
      ['Bottom Bar Dist (X-X)', 'X', 325, 8, 2],
      ['Bottom Bar (Y-Y)', 'Y', 275, 8, 4],
      ['Bottom Bar Dist (Y-Y)', 'Y', 325, 8, 2]
    ]);
    expect(bars[0].measurements).toEqual({ a: 3160, b: 260, c: 260, d: 65, e: 65, f: 850, lap: undefined });
    expect(bars.every(b => b.totalMembers === undefined)).toBe(true); // our formula already matches col H
  });

  test('recalculated output equals the sheet', async () => {
    const { metadata, components } = await load();
    const [comp] = recalculateComponents(components, metadata);
    expect(comp.bars.map(b => [b.calculated!.noOfBars, b.calculated!.cuttingLength, b.calculated!.totalLength])).toEqual([
      [5, 4596, 22.98], [3, 1768, 5.304], [12, 2065, 24.78], [2, 3578, 7.156]
    ]);
    expect(calculateProjectTotal([comp]).totalWeightKg).toBeCloseTo(23.790617, 5);
  });
});
