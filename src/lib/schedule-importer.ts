/**
 * Beam schedule → BBS rows, DRA house rules (see dra-bbs skill, references/beam-rules.md).
 *
 * A schedule row gives section and call-outs ("2T16", "2T20+1T16", "8T", "100/125/100").
 * Geometry (clear span, supports, element count) comes from extra columns when present;
 * without it the beam is still created with span 0 and a doubt, so it can be filled in the app.
 *
 * Column headings are matched by fragment, the way the schedule workbooks drift between floors.
 */
import * as ExcelJS from 'exceljs';
import type { ConcreteComponent, ComponentBarEntry, BBSMetadata } from '../types/component-types';
import { calculateBarMeasurementsAuto } from './enhanced-calculator';

export interface ScheduleRow {
  mark: string;
  B: number; D: number;
  bot?: string; curt?: string; top?: string; exL?: string; exR?: string;
  stdia?: string; sL?: string; sM?: string; sR?: string; rem?: string;
  leftSupport?: number; clearSpan?: number; rightSupport?: number; element?: number;
}

/** "2T20+1T16" → [{n:2,d:20},{n:1,d:16}] */
export function parseCallout(txt?: string): { n: number; d: number }[] {
  return (txt ?? '').split('+').flatMap(p => {
    const m = p.match(/(\d+)\s*[Tt]\s*(\d+)/);
    return m ? [{ n: +m[1], d: +m[2] }] : [];
  });
}

const leadingNumber = (txt?: string | number) => {
  const m = String(txt ?? '').match(/\d+/);
  return m ? +m[0] : 0;
};

const BAR_SPACING = 25; // clear gap between bars in one layer, mm

/** Bars of one call-out fit in a single layer of a web this wide? (Σn·d + gaps ≤ B − 2·cover − 2·stirrup) */
function fitsOneLayer(groups: { n: number; d: number }[], width: number, cover: number, stirrupDia: number): boolean {
  const bars = groups.reduce((s, g) => s + g.n, 0);
  const need = groups.reduce((s, g) => s + g.n * g.d, 0) + BAR_SPACING * (bars - 1);
  return need <= width - 2 * cover - 2 * stirrupDia;
}

export function buildBeamFromSchedule(row: ScheduleRow, metadata: BBSMetadata, cover = 30): { component: ConcreteComponent; doubts: string[] } {
  const doubts: string[] = [];
  const stirrupDia = leadingNumber(row.stdia) || 8;
  const beam: ConcreteComponent = {
    id: crypto.randomUUID(),
    name: row.mark,
    componentType: 'BEAM',
    spanX: row.clearSpan ?? 0,
    spanY: row.B,
    depth: row.D,
    cover,
    beamWidths: { left: row.leftSupport ?? 0, right: row.rightSupport ?? 0, top: 0, bottom: 0 },
    elementCount: row.element || 1,
    bars: []
  };
  if (!row.clearSpan) doubts.push(`${row.mark}: no clear span / supports — every length is 0 until they are filled in.`);
  if (!row.element) doubts.push(`${row.mark}: element count blank — 1 assumed.`);
  if (!row.stdia) doubts.push(`${row.mark}: no stirrup diameter scheduled — 8 assumed.`);

  const add = (barType: string, d: number, rods: number, barsPerMember = 1, spacing = 0) => {
    const bar: ComponentBarEntry = {
      id: crypto.randomUUID(), barType, direction: 'X', diameter: d, spacing, barsPerMember,
      measurements: calculateBarMeasurementsAuto(barType, 'X', beam, d, metadata)
    };
    if (!barType.includes('Stirrup')) bar.totalMembers = rods; // rods per layer is typed, not derived
    beam.bars.push(bar);
  };

  // Through bars — a bundled call-out becomes stacked layers (the congestion check decides whether that is a doubt)
  const through = (label: string, callout?: string) => {
    const groups = parseCallout(callout);
    if (groups.length > 1 && fitsOneLayer(groups, row.B, cover, stirrupDia)) {
      doubts.push(`${row.mark}: ${label.toLowerCase()} ${callout} would fit one layer; taken off as two layers.`);
    }
    groups.forEach((g, i) => add(`${label} - Layer ${i + 1}`, g.d, g.n));
  };
  through('Span_Top', row.top);
  through('Span_Bottom', row.bot);

  // Extra top: end supports get span/4; identical call-outs both ends collapse to one row with G=2
  const exL = parseCallout(row.exL), exR = parseCallout(row.exR);
  const extra = (side: string, groups: { n: number; d: number }[], g: number, callout?: string) => {
    if (!groups.length) return;
    if (groups.length > 1) doubts.push(`${row.mark}: extra top ${callout} bundles two diameters; only ${groups[0].n}T${groups[0].d} taken off.`);
    add(`Top Extra - Layer 2 - ${side}`, groups[0].d, groups[0].n, g);
  };
  if (exL.length && exR.length && row.exL === row.exR) extra('Left & Right', exL, 2, row.exL);
  else { extra('Left', exL, 1, row.exL); extra('Right', exR, 1, row.exR); }

  const curt = parseCallout(row.curt);
  if (curt.length) add('Span_Bottom _Curtail', curt[0].d, curt[0].n);

  // Side-face steel lives in the Remark column: "CANTILEVER / 3T12 SIDEFACE"
  const side = (row.rem ?? '').match(/(\d+)\s*[Tt]\s*(\d+)\s*SIDE\s*FACE/i);
  if (side) add('Side Face Steel', +side[2], +side[1]);
  else if (row.D > 750) doubts.push(`${row.mark}: ${row.D} deep with no side-face steel noted — IS 456 cl.26.5.1.3 wants it above 750.`);

  // Stirrups: one Full row when all three zones agree, else Left / Middle / Right
  const sL = leadingNumber(row.sL), sM = leadingNumber(row.sM), sR = leadingNumber(row.sR);
  if (sL && sL === sM && sM === sR) add('Stirrups - Full', stirrupDia, 0, 1, sL);
  else {
    if (sL) add('Stirrups - Left', stirrupDia, 0, 1, sL);
    if (sM) add('Stirrups - Middle', stirrupDia, 0, 1, sM);
    if (sR) add('Stirrups - Right', stirrupDia, 0, 1, sR);
    if (!sL || !sM || !sR) doubts.push(`${row.mark}: stirrup zoning incomplete (${row.sL ?? '-'}/${row.sM ?? '-'}/${row.sR ?? '-'}).`);
  }
  if (!row.top && !row.bot) doubts.push(`${row.mark}: neither top nor bottom steel scheduled.`);

  return { component: beam, doubts };
}

// ---------------------------------------------------------------------------
// Workbook parsing — headings matched by fragment
// ---------------------------------------------------------------------------

const text = (c: ExcelJS.Cell) => {
  const v = c.value;
  if (v == null) return '';
  if (typeof v === 'object') return 'richText' in v ? v.richText.map(t => t.text).join('') : 'result' in v ? String(v.result ?? '') : '';
  return String(v).trim();
};

/** Returns the schedule sheet's header row and a heading → column map, or null if this workbook has none. */
export function findScheduleHeader(ws: ExcelJS.Worksheet): { row: number; cols: Record<string, number> } | null {
  for (let r = 1; r <= Math.min(ws.rowCount, 40); r++) {
    const cols: Record<string, number> = {};
    ws.getRow(r).eachCell((c, i) => { const t = text(c).toLowerCase(); if (t) cols[t] = i; });
    const heads = Object.keys(cols);
    if (heads.some(h => /^beam( no)?\b/.test(h)) && heads.some(h => h.startsWith('bottom')) && heads.some(h => h.startsWith('top'))) {
      return { row: r, cols };
    }
  }
  return null;
}

function pick(cols: Record<string, number>, ...fragments: (string | RegExp)[]): number | undefined {
  return Object.entries(cols).find(([h]) => fragments.every(f => typeof f === 'string' ? h.includes(f) : f.test(h)))?.[1];
}
const LEFT = /\bl(eft)?\b/, MID = /\bm(id|iddle)?\b/, RIGHT = /\br(ight)?\b/;

export function parseBeamSchedule(ws: ExcelJS.Worksheet): ScheduleRow[] {
  const header = findScheduleHeader(ws);
  if (!header) return [];
  const { cols } = header;
  const c = {
    mark: pick(cols, 'beam'), B: pick(cols, 'b (mm'), D: pick(cols, 'd (mm'),
    bot: pick(cols, 'bottom'), curt: pick(cols, 'curtail'), top: pick(cols, 'top'),
    exL: pick(cols, 'extra top', LEFT), exR: pick(cols, 'extra top', RIGHT),
    stdia: pick(cols, 'stirrup', 'dia'), sL: pick(cols, 'stirrups', LEFT), sM: pick(cols, 'stirrups', MID), sR: pick(cols, 'stirrups', RIGHT),
    rem: pick(cols, 'remark'), left: pick(cols, 'left support'), span: pick(cols, 'clear span'), right: pick(cols, 'right support'), element: pick(cols, 'element')
  };
  // "top" must not resolve to "extra top …"; "bottom" not to "btm curtail"
  if (c.top !== undefined && Object.entries(cols).find(([, i]) => i === c.top)![0].includes('extra')) c.top = pick(cols, 'top steel') ?? Object.entries(cols).find(([h]) => h === 'top')?.[1];

  const rows: ScheduleRow[] = [];
  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cell = (i?: number) => (i ? text(row.getCell(i)) : '');
    const mark = cell(c.mark);
    if (!/^[A-Za-z]{1,4}\d*[A-Za-z]*$/.test(mark)) continue;
    // "150/150/150" in one column, or three columns
    const zones = cell(c.sL).includes('/') ? cell(c.sL).split('/') : [cell(c.sL), cell(c.sM), cell(c.sR)];
    rows.push({
      mark, B: leadingNumber(cell(c.B)), D: leadingNumber(cell(c.D)),
      bot: cell(c.bot) || undefined, curt: cell(c.curt) || undefined, top: cell(c.top) || undefined,
      exL: cell(c.exL) || undefined, exR: cell(c.exR) || undefined,
      stdia: cell(c.stdia) || undefined, sL: zones[0] || undefined, sM: zones[1] || undefined, sR: zones[2] || undefined,
      rem: cell(c.rem) || undefined,
      leftSupport: leadingNumber(cell(c.left)) || undefined, clearSpan: leadingNumber(cell(c.span)) || undefined,
      rightSupport: leadingNumber(cell(c.right)) || undefined, element: leadingNumber(cell(c.element)) || undefined
    });
  }
  return rows;
}

const LD_40D: Record<number, number> = { 8: 320, 10: 400, 12: 480, 16: 640, 20: 800, 25: 1000, 32: 1280 };

export function importBeamSchedule(ws: ExcelJS.Worksheet, existing?: BBSMetadata): { metadata: BBSMetadata; components: ConcreteComponent[]; doubts: string[] } {
  const metadata: BBSMetadata = {
    projectName: '', drawingNumber: '', itemDescription: '', concreteGrade: 'M30', steelGrade: 'Fe550',
    ...existing,
    developmentLengths: existing?.developmentLengths ?? LD_40D,
    curtailOffset: existing?.curtailOffset ?? 300
  };
  const doubts: string[] = [];
  if (!existing?.developmentLengths) doubts.push('Ld table: 40D (DRA house table) assumed — the sheet header convention says 50D. Confirm.');
  const rows = parseBeamSchedule(ws);
  if (!rows.length) throw new Error(`No beam rows under the schedule header on sheet "${ws.name}"`);
  const seen = new Map<string, string>();
  const components = rows.map(row => {
    const key = row.mark.toUpperCase();
    if (seen.has(key)) doubts.push(`${row.mark}: mark scheduled more than once (also as ${seen.get(key)}).`);
    seen.set(key, row.mark);
    if (row.mark !== key) doubts.push(`${row.mark}: mixed-case mark — matches against a BBS silently miss it.`);
    if (!row.B || !row.D) doubts.push(`${row.mark}: section not a number (B=${row.B}, D=${row.D}).`);
    const built = buildBeamFromSchedule(row, metadata);
    doubts.push(...built.doubts);
    return built.component;
  });
  return { metadata, components, doubts };
}
