// @vitest-environment node
/**
 * Schedule → BBS rows. Round trip: the schedule entry for B4 must generate exactly the rows the
 * issued workbook carries for B4 (rows 66-72 of data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx). Then the real
 * "Geometry Required" sheet (23 beams scheduled without spans) is parsed.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildBeamFromSchedule, parseCallout } from '../lib/schedule-importer';
import { parseBBSWorkbook } from '../lib/excel-importer';
import { recalculateComponents } from '../lib/component-calculator';
import type { BBSMetadata } from '../types/component-types';

const metadata: BBSMetadata = {
  projectName: '', drawingNumber: '', itemDescription: '', concreteGrade: 'M30', steelGrade: 'Fe550',
  developmentLengths: { 8: 320, 10: 400, 12: 480, 16: 640, 20: 800, 25: 1000, 32: 1280 }, curtailOffset: 300
};
const cache = new Map<string, ReturnType<typeof parseBBSWorkbook>>();
const load = (file: string) => {
  if (!cache.has(file)) { const buf = readFileSync(file); cache.set(file, parseBBSWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))); }
  return cache.get(file)!;
};

test('parseCallout', () => {
  expect(parseCallout('2T20+1T16')).toEqual([{ n: 2, d: 20 }, { n: 1, d: 16 }]);
  expect(parseCallout('4T25 + 2T25')).toEqual([{ n: 4, d: 25 }, { n: 2, d: 25 }]);
  expect(parseCallout(undefined)).toEqual([]);
});

describe('B4 round trip against the issued BBS', () => {
  const schedule = {
    mark: 'B4', B: 200, D: 600, top: '2T12', bot: '2T16', exL: '2T16', exR: '2T16',
    stdia: '8T', sL: '100 C/C', sM: '125', sR: '100',
    leftSupport: 200, clearSpan: 3250, rightSupport: 200, element: 5
  };

  test('generated rows equal rows 67-72 of the workbook', async () => {
    const { component, doubts } = buildBeamFromSchedule(schedule, metadata);
    expect(doubts).toEqual([]);
    const [gen] = recalculateComponents([component], metadata);
    const issued = (await load('data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx')).components.find(c => c.name === 'B4')!;
    const [ref] = recalculateComponents([issued], metadata);

    const shape = (c: typeof gen) => c.bars.map(b => [b.barType, b.diameter, b.spacing, b.barsPerMember, b.calculated!.noOfBars, b.calculated!.cuttingLength, +b.calculated!.totalLength.toFixed(3)]);
    expect(shape(gen)).toEqual(shape(ref));
    expect(shape(gen)).toEqual([
      ['Span_Top - Layer 1', 12, 0, 1, 10, 4426, 44.26],
      ['Span_Bottom - Layer 1', 16, 0, 1, 10, 4818, 48.18],
      ['Top Extra - Layer 2 - Left & Right', 16, 0, 2, 20, 1580.5, 31.61],
      ['Stirrups - Left', 8, 100, 1, 60, 1430, 85.8],
      ['Stirrups - Middle', 8, 125, 1, 30, 1430, 42.9],
      ['Stirrups - Right', 8, 100, 1, 60, 1430, 85.8]
    ]);
  });

  test('bundled call-out becomes Layer 1 + Layer 2; uniform stirrups collapse to Full; curtail and side face', () => {
    const { component, doubts } = buildBeamFromSchedule({
      ...schedule, mark: 'B126X', D: 1400, top: '5T32', bot: '2T25', curt: '2T16', exL: undefined, exR: undefined,
      stdia: '10T', sL: '100', sM: '100', sR: '100', rem: 'CANTILEVER / 3T12 SIDEFACE'
    }, metadata);
    expect(component.bars.map(b => [b.barType, b.diameter, b.totalMembers])).toEqual([
      ['Span_Top - Layer 1', 32, 5], ['Span_Bottom - Layer 1', 25, 2], ['Span_Bottom _Curtail', 16, 2],
      ['Side Face Steel', 12, 3], ['Stirrups - Full', 10, undefined]
    ]);
    expect(doubts).toEqual([]);

    const bundled = buildBeamFromSchedule({ ...schedule, mark: 'B41', D: 750, bot: '2T25+2T25' }, metadata);
    expect(bundled.component.bars.slice(1, 3).map(b => [b.barType, b.diameter, b.totalMembers])).toEqual([
      ['Span_Bottom - Layer 1', 25, 2], ['Span_Bottom - Layer 2', 25, 2]
    ]);
    expect(bundled.doubts).toEqual([]); // 2T25+2T25 needs 175 > 124 mm: genuinely two layers, and 750 is not > 750
  });
});

describe('data/DRA_iHeart_19th_Floor_BBS_Doubts.xlsx ("Geometry Required" sheet)', () => {
  test('23 beams, steel generated, geometry raised as doubts', async () => {
    const { components, doubts } = await load('data/DRA_iHeart_19th_Floor_BBS_Doubts.xlsx');
    expect(components).toHaveLength(23);
    expect(components.map(c => c.name).slice(0, 4)).toEqual(['B31A', 'B32A', 'B48', 'B82A']);
    const b91a = components.find(c => c.name === 'B91A')!;
    expect(b91a).toMatchObject({ spanY: 200, depth: 600, spanX: 0, elementCount: 1 });
    expect(b91a.bars.map(b => [b.barType, b.diameter, b.totalMembers ?? b.spacing])).toEqual([
      ['Span_Top - Layer 1', 16, 2], ['Span_Bottom - Layer 1', 20, 2],
      ['Top Extra - Layer 2 - Left', 20, 2], ['Top Extra - Layer 2 - Right', 25, 2],
      ['Span_Bottom _Curtail', 20, 2],
      ['Stirrups - Left', 10, 100], ['Stirrups - Middle', 10, 150], ['Stirrups - Right', 10, 100]
    ]);
    const b160x = components.find(c => c.name === 'B160X')!;
    expect(b160x.bars.filter(b => b.barType.startsWith('Span_Top')).map(b => b.barType)).toEqual(['Span_Top - Layer 1', 'Span_Top - Layer 2']);
    expect(doubts.filter(d => d.includes('no clear span'))).toHaveLength(23);
  });
});
