import type { ProjectSteelSummary } from '@/types/component-types';
import { fmt } from '@/lib/utils';

interface TotalSteelWeightProps {
  summary?: ProjectSteelSummary;
  manualTotalWeight?: number; // Manual mode has no dia breakdown
}

/** The sheet's "TOTAL in Kg / MT" block: one row per diameter, a total row. */
export function TotalSteelWeight({ summary, manualTotalWeight }: TotalSteelWeightProps) {
  if (!summary && manualTotalWeight === undefined) return null;

  const totalKg = summary ? summary.totalWeightKg : (manualTotalWeight || 0);
  const rows = summary
    ? Object.entries(summary.byDiameter).filter(([, d]) => d.weightKg > 0.001).sort(([a], [b]) => +a - +b)
    : [];

  return (
    <section aria-label="Steel totals" className="w-full max-w-md overflow-hidden rounded-md border text-sm">
      <table className="w-full">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Dia</th>
            <th className="num px-3 py-2 font-medium">Length (m)</th>
            <th className="num px-3 py-2 font-medium">Weight (kg)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([dia, d]) => (
            <tr key={dia} className="border-t">
              <td className="px-3 py-1.5">{dia} mm</td>
              <td className="num px-3 py-1.5">{fmt(d.lengthM, 2)}</td>
              <td className="num px-3 py-1.5">{fmt(d.weightKg, 2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40 font-semibold">
            <td className="px-3 py-2">Total</td>
            <td />
            <td className="num px-3 py-2">
              {fmt(totalKg, 2)} kg
              <span className="ml-2 font-normal text-muted-foreground">{(totalKg / 1000).toFixed(3)} MT</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
