/**
 * Write Component-mode projects back out in the house layouts `excel-importer.ts` reads:
 * slabs in the "Sample Slab BBS.xlsx" layout, beams in the DRA beam-sheet layout.
 * Every derived cell is a live formula with its cached result, so Excel recalculates and
 * `parseBBSWorkbook` (which reads cached results) round-trips.
 */
import * as ExcelJS from 'exceljs';
import type { BBSMetadata, ConcreteComponent, ComponentBarEntry } from '../types/component-types';

const DIAS = [8, 10, 12, 16, 20, 25, 32];
const f = (formula: string, result: number | string) => ({ formula, result });
const col = (n: number) => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const round = (n: number) => Math.round(n * 1e6) / 1e6;

// Excel col H / rods per layer, before the element count and bars-per-member multipliers
const members = (bar: ComponentBarEntry, comp: ConcreteComponent) =>
  bar.totalMembers ?? (bar.calculated ? bar.calculated.noOfBars / (bar.barsPerMember || 1) / (comp.elementCount || 1) : 1);

// ---------------------------------------------------------------------------
// SLAB — "Sample Slab BBS.xlsx"
// ---------------------------------------------------------------------------
function writeSlabSheet(ws: ExcelJS.Worksheet, comps: ConcreteComponent[], meta: BBSMetadata) {
  const ld = meta.developmentLengths ?? {};
  ws.getCell('A1').value = `PROJECT :- ${meta.projectName}`;
  ws.getCell('A2').value = `Dwg No :- ${meta.drawingNumber}`;
  ws.getCell('A3').value = `Item :- ${meta.itemDescription}`;
  ws.getCell('E2').value = 'Dia of Bar';
  ws.getCell('E3').value = `Ld for ${meta.concreteGrade}`;
  DIAS.forEach((d, i) => { ws.getCell(2, 6 + i).value = d; ws.getCell(3, 6 + i).value = ld[d] ?? 50 * d; });
  ws.getCell('A4').value = 'Concrete'; ws.getCell('B4').value = meta.concreteGrade;
  ws.getCell('C4').value = 'Grade of Steel - '; ws.getCell('D4').value = meta.steelGrade.replace('Fe', '') + 'D';
  ws.getCell('E4').value = 'Slab'; ws.getCell('F4').value = 'Cover'; ws.getCell('G4').value = comps[0]?.cover ?? 30; ws.getCell('H4').value = 'mm';

  const heads = ['S.No', 'Bar Type', 'Span (X)', 'Span (Y)', 'Spacing (MM)', 'Dia. (MM)', 'No. of bars Reqd \n per member', 'Total no. of members Reqd', 'Total nos.'];
  heads.forEach((h, i) => { ws.getCell(5, i + 1).value = h; ws.getCell(6, i + 1).value = h; });
  for (let c = 10; c <= 19; c++) ws.getCell(5, c).value = 'Measurements of the Bar (MM)';
  ['a', 'b', 'c', 'd', 'e', 'f', 'Lap', 'Total', 'No of Bends', 'Deduction'].forEach((h, i) => { ws.getCell(6, 10 + i).value = h; });
  ws.getCell('T5').value = 'Cutlength'; ws.getCell('T6').value = 'Cutlength';
  ws.getCell('U5').value = 'Total length (m)'; ws.getCell('U6').value = 'Total length (m)';
  DIAS.forEach((d, i) => { ws.getCell(6, 23 + i).value = `${d} mm`; ws.getCell(10, 23 + i).value = f(`${d}*${d}/162`, d * d / 162); });

  let r = 11;
  const firstBar = 15;
  comps.forEach((comp, i) => {
    const bw = comp.beamWidths ?? { left: 0, right: 0, top: 0, bottom: 0 };
    const ext = comp.topExtensions ?? { left: 0, right: 0, top: 0, bottom: 0 };
    const head = ws.getRow(r);
    head.getCell('A').value = i + 1; head.getCell('B').value = comp.name;
    head.getCell('C').value = comp.spanX; head.getCell('D').value = comp.spanY; head.getCell('F').value = comp.depth ?? 0;
    head.getCell('K').value = ext.left; head.getCell('L').value = ext.right; head.getCell('M').value = ext.top; head.getCell('N').value = ext.bottom;
    ws.getRow(r + 1).getCell('C').value = 'Left/Right'; ws.getRow(r + 1).getCell('D').value = 'Top/Bottom';
    ws.getRow(r + 2).getCell('C').value = bw.left; ws.getRow(r + 2).getCell('D').value = bw.top;
    ws.getRow(r + 3).getCell('C').value = bw.right; ws.getRow(r + 3).getCell('D').value = bw.bottom;
    r += 4;
    for (const bar of comp.bars) {
      const row = ws.getRow(r);
      const c = bar.calculated;
      const m = bar.measurements;
      const H = members(bar, comp);
      row.getCell('B').value = bar.barType;
      row.getCell('E').value = bar.spacing; row.getCell('F').value = bar.diameter;
      row.getCell('G').value = bar.barsPerMember || 1;
      row.getCell('H').value = H;
      row.getCell('I').value = f(`+G${r}*H${r}`, H * (bar.barsPerMember || 1));
      [m.a, m.b, m.c, m.d, m.e, m.f, m.lap].forEach((v, k) => { if (v) row.getCell(10 + k).value = v; });
      const total = c?.totalMeasurement ?? [m.a, m.b, m.c, m.d, m.e, m.f, m.lap].reduce<number>((s, v) => s + (v || 0), 0);
      row.getCell('Q').value = f(`SUM(J${r}:P${r})`, total);
      const bends = bar.manualNoOfDeductions ?? c?.noOfDeductions ?? 0;
      row.getCell('R').value = bends;
      row.getCell('S').value = f(`+R${r}*F${r}*2`, bends * bar.diameter * 2);
      // same rule as getCutLengthV2: top main/dist and Y-Y main bars use CEILING(...,5)
      const t = bar.barType.toLowerCase();
      const ceil = /top main|top dist/.test(t) || (/\(y-y\)/.test(t) && !t.includes('dist'));
      const cut = c?.cuttingLength ?? 0;
      row.getCell('T').value = f(ceil ? `CEILING(J${r}+K${r}+L${r}+M${r}+N${r}+S${r},5)` : `+Q${r}-S${r}`, cut);
      const len = c?.totalLength ?? 0;
      row.getCell('U').value = f(`+T${r}*I${r}/1000`, round(len));
      DIAS.forEach((d, k) => {
        const cc = col(23 + k);
        row.getCell(23 + k).value = f(`IF(F${r}=${d},U${r}*$${cc}$10,"")`, bar.diameter === d ? round(len * d * d / 162) : '');
      });
      r++;
    }
    r++;
  });
  const last = r - 2;
  const totals = DIAS.map((d) => comps.flatMap(c => c.bars).filter(b => b.diameter === d).reduce((s, b) => s + (b.calculated?.totalWeight ?? 0), 0));
  ws.getRow(r).getCell('V').value = 'Total';
  DIAS.forEach((_, k) => { const cc = col(23 + k); ws.getRow(r).getCell(23 + k).value = f(`SUM(${cc}${firstBar}:${cc}${last})`, round(totals[k])); });
  ws.getRow(r + 1).getCell('B').value = 'Total Weight of Re-bars in Dia wise:';
  ws.getRow(r + 2).getCell('B').value = 'Description';
  DIAS.forEach((d, k) => { ws.getRow(r + 2).getCell(3 + k).value = `${d}mm`; });
  ws.getRow(r + 2).getCell('J').value = 'Total';
  ws.getRow(r + 3).getCell('B').value = 'Total in MT';
  DIAS.forEach((_, k) => { ws.getRow(r + 3).getCell(3 + k).value = f(`${col(23 + k)}${r}/1000`, round(totals[k] / 1000)); });
  ws.getRow(r + 3).getCell('J').value = f(`+SUM(C${r + 3}:I${r + 3})`, round(totals.reduce((s, v) => s + v, 0) / 1000));
}

// ---------------------------------------------------------------------------
// BEAM — DRA beam sheet
// ---------------------------------------------------------------------------
function writeBeamSheet(ws: ExcelJS.Worksheet, comps: ConcreteComponent[], meta: BBSMetadata) {
  const ld = meta.developmentLengths ?? {};
  const cover = comps[0]?.cover ?? 30;
  ws.getCell('B2').value = `Project Name : ${meta.projectName}`;
  ws.getCell('B3').value = meta.itemDescription;
  const consts: [string, number, string][] = [['Beam Bottom', 30, 'mm'], ['Beam Top', 30, 'mm'], ['Beam Side ( for B below 230mm)', cover, 'mm'],
    ['Beam Side ( for B equal or above 230mm)', cover, 'mm'], ['Beam Simply Supported', 40, 'mm'], ['Ld', 50, 'D'], ['Spacer Bar dia', 25, 'mm'],
    ['Bottom curtainment spacng', meta.curtailOffset ?? 300, 'mm']];
  consts.forEach(([l, v, u], i) => { ws.getCell(i + 1, 15).value = l; ws.getCell(i + 1, 18).value = v; ws.getCell(i + 1, 19).value = u; });
  ws.getCell('U3').value = 'Grade / Dia of Bar';
  ws.getCell('U4').value = `${meta.concreteGrade} (Fe ${meta.steelGrade.replace('Fe', '')})`;
  DIAS.forEach((d, i) => { ws.getCell(3, 23 + i).value = d; ws.getCell(4, 23 + i).value = ld[d] ?? 40 * d; });

  Object.entries({ A10: 'S.No', B10: 'Description of work', C10: 'Shape of Bar', D10: 'Dia of Rod', E10: 'Spacing', F10: 'Nos', I10: 'Measurements',
    L10: 'Bend Deduction', O10: 'Cutting Length', V10: 'Total Length in m', W10: "Reinforcement Qty ( Dia wise 'kg\")", AD10: 'TOTAL', AE10: 'Concrete m3',
    F11: 'Element', G11: 'No of Bars', H11: 'No of Rod Per Length' }).forEach(([k, v]) => { ws.getCell(k).value = v; });
  ['L', 'B', 'D', 'No Bends', '2d', 'Total', 'A', 'B', 'C', 'D', 'E', 'F', 'Total'].forEach((h, i) => { ws.getCell(12, 9 + i).value = h; });
  DIAS.forEach((d, i) => { ws.getCell(11, 23 + i).value = d; ws.getCell(12, 23 + i).value = f(`${col(23 + i)}11*${col(23 + i)}11/162`, d * d / 162); });
  ws.getCell('B14').value = meta.itemDescription;

  // Continuous runs (shared runId) become one S.No entry: mark rows first, then each beam's bars, later beams' rows prefixed "Mark_"
  const groups: ConcreteComponent[][] = [];
  comps.forEach(c => {
    const g = groups[groups.length - 1];
    if (c.runId && g?.[0].runId === c.runId) g.push(c); else groups.push([c]);
  });

  let r = 15;
  const firstBar = 16;
  groups.forEach((group, i) => {
    const el = group[0].elementCount || 1;
    const firstBarRow = r + group.length;
    group.forEach((comp, k) => {
      const row = ws.getRow(r);
      const bw = comp.beamWidths ?? { left: 0, right: 0, top: 0, bottom: 0 };
      if (k === 0) row.getCell('A').value = i + 1;
      row.getCell('B').value = comp.name;
      row.getCell('C').value = comp.spanY; row.getCell('D').value = comp.depth ?? 0;
      row.getCell('I').value = bw.left; row.getCell('J').value = comp.spanX; row.getCell('K').value = bw.right;
      row.getCell('L').value = f(`I${r}/2+J${r}+K${r}/2`, bw.left / 2 + comp.spanX + bw.right / 2);
      row.getCell('AE').value = f(`F${firstBarRow}*(C${r}*D${r}*J${r})/(10^9)`, round(el * comp.spanY * (comp.depth ?? 0) * comp.spanX / 1e9));
      r++;
    });
    group.forEach((comp, k) => {
      for (const bar of comp.bars) {
        const b = ws.getRow(r);
        const c = bar.calculated;
        const m = bar.measurements;
        const H = members(bar, comp);
        const G = bar.barsPerMember || 1;
        b.getCell('B').value = k === 0 ? bar.barType : `${comp.name}_${bar.barType}`;
        if (bar.barType.toLowerCase().includes('stirrup')) b.getCell('C').value = ' ';
        b.getCell('D').value = bar.diameter;
        if (bar.spacing) b.getCell('E').value = bar.spacing;
        b.getCell('F').value = el; b.getCell('G').value = G; b.getCell('H').value = H;
        const bends = bar.manualNoOfDeductions ?? c?.noOfDeductions ?? 0;
        b.getCell('L').value = bends;
        b.getCell('M').value = f(`2*D${r}`, 2 * bar.diameter);
        b.getCell('N').value = f(`L${r}*M${r}`, bends * 2 * bar.diameter);
        [m.a, m.b, m.c, m.d, m.e, m.f].forEach((v, j) => { if (v) b.getCell(15 + j).value = v; });
        const total = c?.totalMeasurement ?? [m.a, m.b, m.c, m.d, m.e, m.f].reduce<number>((s, v) => s + (v || 0), 0);
        b.getCell('U').value = f(`SUM(O${r}:T${r})`, total);
        const len = c?.totalLength ?? 0;
        b.getCell('V').value = f(`((U${r}-N${r})*F${r}*H${r}*G${r})/1000`, round(len));
        DIAS.forEach((d, j) => {
          const cc = col(23 + j);
          b.getCell(23 + j).value = f(`IF($D${r}=${cc}$11,$V${r}*${cc}$12,0)`, bar.diameter === d ? round(len * d * d / 162) : 0);
        });
        b.getCell('AD').value = f(`SUM(W${r}:AC${r})`, round(c?.totalWeight ?? 0));
        r++;
      }
    });
    r++;
  });
  const last = r - 2;
  const bars = comps.flatMap(c => c.bars);
  const totals = DIAS.map(d => bars.filter(b => b.diameter === d).reduce((s, b) => s + (b.calculated?.totalWeight ?? 0), 0));
  const grand = totals.reduce((s, v) => s + v, 0);
  ws.getRow(r).getCell('B').value = 'TOTAL in Kg';
  ws.getRow(r + 1).getCell('B').value = 'TOTAL in MT';
  [...totals, grand].forEach((v, k) => {
    const cc = col(23 + k);
    ws.getRow(r).getCell(23 + k).value = f(`SUM(${cc}${firstBar}:${cc}${last})`, round(v));
    ws.getRow(r + 1).getCell(23 + k).value = f(`${cc}${r}/1000`, round(v / 1000));
  });
  const concrete = comps.reduce((s, c) => s + (c.elementCount || 1) * c.spanY * (c.depth ?? 0) * c.spanX / 1e9, 0);
  ws.getRow(r).getCell('AE').value = f(`SUM(AE${firstBar}:AE${last})`, round(concrete));
}

/** Slabs and beams go to separate sheets; the importer picks the layout up from each sheet's header. */
export async function exportBBSWorkbook(components: ConcreteComponent[], metadata: BBSMetadata): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RebarCalc';
  const beams = components.filter(c => c.componentType === 'BEAM');
  const slabs = components.filter(c => c.componentType !== 'BEAM');
  // ponytail: the importer reads one layout per workbook (sniffs B10 of the first sheet), so a mixed project exports beams first and slabs behind them
  if (beams.length) writeBeamSheet(wb.addWorksheet('Beam'), beams, metadata);
  if (slabs.length) writeSlabSheet(wb.addWorksheet('Slab'), slabs, metadata);
  return wb.xlsx.writeBuffer();
}
