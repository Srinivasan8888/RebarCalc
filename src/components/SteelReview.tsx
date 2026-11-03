import { useMemo } from 'react';
import type { ConcreteComponent, BBSMetadata, ProjectSteelSummary } from '@/types/component-types';
import { planCuts, concreteVolumeM3, is1786BatchTolerancePct, STOCK_LENGTH_MM } from '@/lib/steel-review';
import { fmt } from '@/lib/utils';

interface SteelReviewProps {
  components: ConcreteComponent[];
  summary: ProjectSteelSummary;
  metadata: BBSMetadata;
  onMetadataChange: (m: BBSMetadata) => void;
}

/**
 * Checks beside the TOTAL block. None of them feed back into the BBS:
 * issued vs BBS kg against IS 1786 batch tolerance, 12 m stock bars with waste, and kg per m³ of concrete.
 */
export function SteelReview({ components, summary, metadata, onMetadataChange }: SteelReviewProps) {
  const stock = metadata.standardBarLength || STOCK_LENGTH_MM;
  const plan = useMemo(() => planCuts(components, stock), [components, stock]);
  const volume = useMemo(() => concreteVolumeM3(components), [components]);
  const dias = Object.entries(summary.byDiameter).filter(([, d]) => d.weightKg > 0.001).sort(([a], [b]) => +a - +b);
  if (!dias.length) return null;

  const issued = metadata.issuedKg ?? {};
  const setIssued = (dia: number, v: string) => {
    const next = { ...issued };
    if (v === '') delete next[dia]; else next[dia] = parseFloat(v) || 0;
    onMetadataChange({ ...metadata, issuedKg: next });
  };
  const stockBars = Object.values(plan).reduce((n, p) => n + p.stockBars, 0);

  return (
    <section aria-label="Steel review" className="w-full overflow-hidden rounded-md border text-sm">
      <table className="w-full">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dia</th>
            <th className="num px-3 py-2 font-medium">BBS kg</th>
            <th className="num px-3 py-2 font-medium">Issued kg</th>
            <th className="num px-3 py-2 font-medium">Diff</th>
            <th className="px-3 py-2 text-left font-medium">IS 1786 batch</th>
            <th className="num px-3 py-2 font-medium">{stock / 1000} m bars</th>
            <th className="num px-3 py-2 font-medium">Waste</th>
          </tr>
        </thead>
        <tbody>
          {dias.map(([d, v]) => {
            const dia = +d;
            const tol = is1786BatchTolerancePct(dia);
            const got = issued[dia];
            const diffPct = got !== undefined && v.weightKg ? ((got - v.weightKg) / v.weightKg) * 100 : undefined;
            const verdict = diffPct === undefined ? '' : Math.abs(diffPct) <= tol ? 'within' : diffPct > 0 ? 'over' : 'short';
            const p = plan[dia];
            return (
              <tr key={d} className="border-t">
                <td className="px-3 py-1.5">{d} mm</td>
                <td className="num px-3 py-1.5">{fmt(v.weightKg, 2)}</td>
                <td className="px-1 py-1">
                  <input type="number" min="0" step="any" aria-label={`Issued kg ${d} mm`} value={got ?? ''} placeholder="–"
                    onChange={e => setIssued(dia, e.target.value)}
                    className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm num focus:outline-none focus:ring-2 focus:ring-ring/60" />
                </td>
                <td className="num px-3 py-1.5">{diffPct === undefined ? '' : `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1)}%`}</td>
                <td className="px-3 py-1.5 text-muted-foreground">±{tol}%{verdict && <span className={`ml-2 ${verdict === 'within' ? 'text-foreground' : 'font-medium text-destructive'}`}>{verdict}</span>}</td>
                <td className="num px-3 py-1.5">{p ? p.stockBars : ''}</td>
                <td className="num px-3 py-1.5">{p ? `${p.wastePct.toFixed(1)}%` : ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td colSpan={5} className="px-3 py-2 text-muted-foreground">
              {volume > 0 ? `${fmt(volume, 2)} m³ concrete · ${fmt(summary.totalWeightKg / volume, 1)} kg/m³ (beams and slabs with a depth)` : 'Set member depths for kg/m³'}
              <span className="ml-2">· first-fit cut plan, offcuts not reused</span>
            </td>
            <td className="num px-3 py-2 font-semibold">{stockBars}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
