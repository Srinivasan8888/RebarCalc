import { useState } from 'react';
import { MemberTypeTabs } from './MemberTypeTabs';
import { DEFAULT_PROJECT_CONFIG } from '@/lib/constants';
import type { BarEntry } from '@/types';

export function BarEntryDemo() {
  const [beamBars, setBeamBars] = useState<BarEntry[]>([]);
  const [columnBars, setColumnBars] = useState<BarEntry[]>([]);
  const [slabBars, setSlabBars] = useState<BarEntry[]>([]);

  return (
    <div className="container mx-auto p-6">
      <MemberTypeTabs
        beamBars={beamBars}
        columnBars={columnBars}
        slabBars={slabBars}
        projectConfig={DEFAULT_PROJECT_CONFIG}
        onBeamBarsChange={setBeamBars}
        onColumnBarsChange={setColumnBars}
        onSlabBarsChange={setSlabBars}
      />
    </div>
  );
}