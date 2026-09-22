// @vitest-environment node
/**
 * Export → import round trip on both reference workbooks: what comes back must be what went in.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBBSWorkbook } from '../lib/excel-importer';
import { exportBBSWorkbook } from '../lib/bbs-excel-exporter';
import { recalculateComponents } from '../lib/component-calculator';
import { calculateProjectTotal } from '../lib/enhanced-calculator';
import type { ConcreteComponent } from '../types/component-types';

const toArrayBuffer = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const load = async (file: string) => parseBBSWorkbook(toArrayBuffer(readFileSync(file)));

const shape = (comps: ConcreteComponent[]) => comps.map(c => ({
  name: c.name, type: c.componentType, spanX: c.spanX, spanY: c.spanY, depth: c.depth, cover: c.cover,
  beamWidths: c.beamWidths, topExtensions: c.topExtensions, elementCount: c.elementCount, runId: c.runId, runPosition: c.runPosition,
  bars: c.bars.map(b => ({ barType: b.barType, diameter: b.diameter, spacing: b.spacing, barsPerMember: b.barsPerMember,
    measurements: b.measurements, totalMembers: b.totalMembers, bends: b.manualNoOfDeductions }))
}));

async function roundTrip(file: string) {
  const { metadata, components } = await load(file);
  const calculated = recalculateComponents(components, metadata);
  const buf = new Uint8Array(await exportBBSWorkbook(calculated, metadata));
  const back = await parseBBSWorkbook(toArrayBuffer(buf));
  return { metadata, calculated, back };
}

describe('export → import round trip', () => {
  test('data/Sample Slab BBS.xlsx', async () => {
    const { metadata, calculated, back } = await roundTrip('data/Sample Slab BBS.xlsx');
    expect(back.metadata).toEqual(metadata);
    expect(shape(back.components)).toEqual(shape(calculated));
    expect(calculateProjectTotal(recalculateComponents(back.components, back.metadata)).totalWeightKg).toBeCloseTo(23.790617, 4);
  });

  test('data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx — all 369 beams', async () => {
    const { metadata, calculated, back } = await roundTrip('data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx');
    expect(back.metadata).toEqual(metadata);
    expect(back.components).toHaveLength(369);
    expect(shape(back.components)).toEqual(shape(calculated));
    expect(calculateProjectTotal(recalculateComponents(back.components, back.metadata)).totalWeightKg).toBeCloseTo(34227.2066779835, 4);
  }, 60000);
});
