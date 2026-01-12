// Export all summary card components
export { DiameterSummaryCard } from './DiameterSummaryCard';
export { ShapeSummaryCard } from './ShapeSummaryCard';
export { MemberSummaryCard } from './MemberSummaryCard';
export { BarSummaryCards } from './BarSummaryCards';

// Combined summary view component
import type { CalculatedBar } from '@/types';
import { DiameterSummaryCard } from './DiameterSummaryCard';
import { ShapeSummaryCard } from './ShapeSummaryCard';
import { MemberSummaryCard } from './MemberSummaryCard';
import { BarSummaryCards } from './BarSummaryCards';

interface SummaryViewProps {
  bars: CalculatedBar[];
}

export function SummaryView({ bars }: SummaryViewProps) {
  if (bars.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No bars to summarize. Add some bar entries to see the summary.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grand totals cards */}
      <BarSummaryCards bars={bars} />
      
      {/* Detailed summary tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <DiameterSummaryCard bars={bars} />
        <ShapeSummaryCard bars={bars} />
        <MemberSummaryCard bars={bars} />
      </div>
    </div>
  );
}