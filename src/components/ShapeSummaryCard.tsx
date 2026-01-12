import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculatedBar } from '@/types';
import { summarizeByShape } from '@/lib/calculator';
import { SHAPE_DEFINITIONS } from '@/lib/constants';

interface ShapeSummaryCardProps {
  bars: CalculatedBar[];
}

// Shape icon component using SVG paths from constants
function ShapeIcon({ shapeCode }: { shapeCode: string }) {
  const shape = SHAPE_DEFINITIONS[shapeCode as keyof typeof SHAPE_DEFINITIONS];
  if (!shape) return null;

  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 200 100" 
      className="inline-block mr-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d={shape.diagramSvg} />
    </svg>
  );
}

export function ShapeSummaryCard({ bars }: ShapeSummaryCardProps) {
  const shapeSummary = summarizeByShape(bars);
  
  if (bars.length === 0) {
    return null;
  }

  // Calculate grand totals
  const grandTotalLength = shapeSummary.reduce((sum, item) => sum + item.totalLength, 0);
  const grandTotalWeight = shapeSummary.reduce((sum, item) => sum + item.totalWeight, 0);
  const grandTotalBars = shapeSummary.reduce((sum, item) => sum + item.barCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shape-wise Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shape</TableHead>
              <TableHead className="text-right">Bars</TableHead>
              <TableHead className="text-right">Total Length (m)</TableHead>
              <TableHead className="text-right">Total Weight (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shapeSummary.map((item) => (
              <TableRow key={item.shapeCode}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <ShapeIcon shapeCode={item.shapeCode} />
                    <span>{item.shapeCode} - {item.shapeName}</span>
                  </div>
                </TableCell>
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