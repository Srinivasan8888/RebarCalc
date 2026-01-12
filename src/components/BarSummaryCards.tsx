import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CalculatedBar } from '@/types';
import { calculateGrandTotals } from '@/lib/calculator';

interface BarSummaryCardsProps {
  bars: CalculatedBar[];
}

export function BarSummaryCards({ bars }: BarSummaryCardsProps) {
  const totals = calculateGrandTotals(bars);

  if (bars.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Bars</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.barCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Length</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.totalLengthM.toFixed(1)} m</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.totalWeightKg.toFixed(2)} kg</div>
          <div className="text-sm text-muted-foreground">
            ({totals.totalWeightMT.toFixed(3)} MT)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}