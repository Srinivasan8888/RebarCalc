import type { ConcreteComponent, BBSMetadata } from '@/types/component-types';
import { calculateProjectTotal } from '@/lib/enhanced-calculator';
import { fmt } from '@/lib/utils';

const LEGS = ['a', 'b', 'c', 'd', 'e', 'f', 'lap'] as const;
const mm = (n?: number) => n ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : '';

/**
 * Bar-bender sheet: one member per page, the same numbers as the table, nothing editable.
 * Mounted only while printing (see ProjectDetailPage); index.css hides everything else under @media print.
 */
export function PrintSheet({ components, metadata }: { components: ConcreteComponent[]; metadata: BBSMetadata }) {
  const total = calculateProjectTotal(components);
  const dias = Object.entries(total.byDiameter).filter(([, d]) => d.weightKg > 0.001).sort(([a], [b]) => +a - +b);
  return (
    <div className="print-sheet hidden text-[11px] leading-tight text-black print:block">
      {components.map((c, i) => {
        const kg = c.bars.reduce((s, b) => s + (b.calculated?.totalWeight ?? 0), 0);
        const size = c.componentType === 'BEAM'
          ? `clear span ${c.spanX} · ${c.spanY} × ${c.depth ?? '–'} · ${c.elementCount || 1} nos`
          : `${c.spanX} × ${c.spanY} × ${c.depth ?? '–'}`;
        return (
          <section key={c.id} className="break-after-page break-inside-avoid pb-4">
            <header className="mb-2 flex items-baseline justify-between border-b border-black pb-1">
              <span>{metadata.projectName} · {metadata.itemDescription} · {metadata.drawingNumber} · {metadata.concreteGrade} {metadata.steelGrade}</span>
              <span>{i + 1} / {components.length}</span>
            </header>
            <h2 className="text-base font-bold">{c.name} <span className="font-normal">{c.componentType.toLowerCase()} · {size} · cover {c.cover}</span></h2>
            <table className="mt-1 w-full border-collapse tabular-nums [&_td]:border [&_td]:border-black [&_td]:px-1 [&_th]:border [&_th]:border-black [&_th]:px-1 [&_th]:text-left">
              <thead>
                <tr>
                  <th>Bar</th><th>Dia</th><th className="text-right">Spacing</th><th className="text-right">Nos</th>
                  {LEGS.map(l => <th key={l} className="text-right">{l}</th>)}
                  <th className="text-right">Bends</th><th className="text-right">Cut (mm)</th><th className="text-right">kg</th>
                </tr>
              </thead>
              <tbody>
                {c.bars.map(b => {
                  const r = b.calculated;
                  return (
                    <tr key={b.id}>
                      <td>{b.barType}</td>
                      <td>T{b.diameter}</td>
                      <td className="text-right">{b.spacing || ''}</td>
                      <td className="text-right">{r?.noOfBars ?? ''}</td>
                      {LEGS.map(l => <td key={l} className="text-right">{mm(b.measurements[l])}</td>)}
                      <td className="text-right">{r?.noOfDeductions ?? ''}</td>
                      <td className="text-right font-bold">{r ? mm(r.cuttingLength) : ''}</td>
                      <td className="text-right">{r ? fmt(r.totalWeight, 2) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={13} className="text-right font-bold">Member total</td><td className="text-right font-bold">{fmt(kg, 2)}</td></tr></tfoot>
            </table>
          </section>
        );
      })}
      <section className="break-inside-avoid">
        <h2 className="text-base font-bold">Total steel</h2>
        <table className="mt-1 border-collapse tabular-nums [&_td]:border [&_td]:border-black [&_td]:px-2 [&_th]:border [&_th]:border-black [&_th]:px-2">
          <thead><tr><th>Dia</th><th>Length (m)</th><th>kg</th></tr></thead>
          <tbody>{dias.map(([d, v]) => <tr key={d}><td>T{d}</td><td className="text-right">{fmt(v.lengthM, 2)}</td><td className="text-right">{fmt(v.weightKg, 2)}</td></tr>)}</tbody>
          <tfoot><tr><td className="font-bold">Total</td><td /><td className="text-right font-bold">{fmt(total.totalWeightKg, 2)} kg</td></tr></tfoot>
        </table>
      </section>
    </div>
  );
}
