import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculatedBar } from '@/types';
import { summarizeByDiameter } from '@/lib/calculator';

interface DiameterSummaryCardProps {
  bars: CalculatedBar[];
}

export function DiameterSummaryCard({ bars }: DiameterSummaryCardProps) {
  const diameterSummary = summarizeByDiameter(bars);
  
  if (bars.length === 0) {
    return null;
  }

  // Calculate grand totals
  const grandTotalLength = diameterSummary.reduce((sum, item) => sum + item.totalLength, 0);
  const grandTotalWeight = diameterSummary.reduce((sum, item) => sum + item.totalWeight, 0);
  const grandTotalBars = diameterSummary.reduce((sum, item) => sum + item.barCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diameter-wise Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Diameter (mm)</TableHead>
              <TableHead className="text-right">Bars</TableHead>
              <TableHead className="text-right">Total Length (m)</TableHead>
              <TableHead className="text-right">Total Weight (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diameterSummary.map((item) => (
              <TableRow key={item.diameter}>
                <TableCell className="font-medium">Ø{item.diameter}</TableCell>
                <TableCell className="text-right">{item.barCount}</TableCell>
                <TableCell className="text-right">{item.totalLength.toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.totalWeight.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Grand Total</TableCell>
              <TableCell className="text-right font-bold">{grandTotalBars}</TableCell>
              <TableCell className="text-right font-bold">{grandTotalLength.toFixed(2)}</TableCell>
              <TableCell className="text-right font-bold">{grandTotalWeight.toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}