import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CalculatedBar, MemberType } from '@/types';
import { summarizeByMember } from '@/lib/calculator';

interface MemberSummaryCardProps {
  bars: CalculatedBar[];
}

// Helper function to format member type display names
function formatMemberType(memberType: MemberType): string {
  switch (memberType) {
    case 'BEAM':
      return 'Beam';
    case 'COLUMN':
      return 'Column';
    case 'SLAB':
      return 'Slab';
    default:
      return memberType;
  }
}

export function MemberSummaryCard({ bars }: MemberSummaryCardProps) {
  const memberSummary = summarizeByMember(bars);
  
  if (bars.length === 0) {
    return null;
  }

  // Calculate grand totals
  const grandTotalLength = memberSummary.reduce((sum, item) => sum + item.totalLength, 0);
  const grandTotalWeight = memberSummary.reduce((sum, item) => sum + item.totalWeight, 0);
  const grandTotalBars = memberSummary.reduce((sum, item) => sum + item.barCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member-wise Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member Type</TableHead>
              <TableHead className="text-right">Bars</TableHead>
              <TableHead className="text-right">Total Length (m)</TableHead>
              <TableHead className="text-right">Total Weight (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberSummary.map((item) => (
              <TableRow key={item.memberType}>
                <TableCell className="font-medium">
                  {formatMemberType(item.memberType)}
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