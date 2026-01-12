import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarEntryTable } from './BarEntryTable';
import { ShapeDiagram } from './ShapeDiagram';
import { CSVImportDialog } from './CSVImportDialog';

import type { BarEntry, MemberType, ShapeCode, ProjectConfig } from '@/types';

interface MemberTypeTabsProps {
  beamBars: BarEntry[];
  columnBars: BarEntry[];
  slabBars: BarEntry[];
  projectConfig: ProjectConfig;
  onBeamBarsChange: (bars: BarEntry[]) => void;
  onColumnBarsChange: (bars: BarEntry[]) => void;
  onSlabBarsChange: (bars: BarEntry[]) => void;
}

export function MemberTypeTabs({
  beamBars,
  columnBars,
  slabBars,
  projectConfig,
  onBeamBarsChange,
  onColumnBarsChange,
  onSlabBarsChange,
}: MemberTypeTabsProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeCode>('S1');
  const [activeTab, setActiveTab] = useState<MemberType>('BEAM');

  const handleShapeSelect = (shapeCode: ShapeCode) => {
    setSelectedShape(shapeCode);
  };

  const handleCSVImport = (entries: BarEntry[]) => {
    // Group entries by member type and add to respective arrays
    const beamEntries = entries.filter(entry => entry.memberType === 'BEAM');
    const columnEntries = entries.filter(entry => entry.memberType === 'COLUMN');
    const slabEntries = entries.filter(entry => entry.memberType === 'SLAB');

    if (beamEntries.length > 0) {
      onBeamBarsChange([...beamBars, ...beamEntries]);
    }
    if (columnEntries.length > 0) {
      onColumnBarsChange([...columnBars, ...columnEntries]);
    }
    if (slabEntries.length > 0) {
      onSlabBarsChange([...slabBars, ...slabEntries]);
    }
  };

  const getTotalBars = () => beamBars.length + columnBars.length + slabBars.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bar Entry</h2>
          <p className="text-muted-foreground">
            Add and manage reinforcement bars by member type
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CSVImportDialog 
            onImport={handleCSVImport}
            trigger={
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            }
          />
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Bars</div>
            <div className="text-2xl font-bold">{getTotalBars()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main tabs and table */}
        <div className="lg:col-span-2">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as MemberType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="BEAM" className="relative">
                Beam
                {beamBars.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {beamBars.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="COLUMN" className="relative">
                Column
                {columnBars.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {columnBars.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="SLAB" className="relative">
                Slab
                {slabBars.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {slabBars.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="BEAM" className="mt-6">
              <BarEntryTable
                data={beamBars}
                memberType="BEAM"
                projectConfig={projectConfig}
                onDataChange={onBeamBarsChange}
                onShapeSelect={handleShapeSelect}
              />
            </TabsContent>

            <TabsContent value="COLUMN" className="mt-6">
              <BarEntryTable
                data={columnBars}
                memberType="COLUMN"
                projectConfig={projectConfig}
                onDataChange={onColumnBarsChange}
                onShapeSelect={handleShapeSelect}
              />
            </TabsContent>

            <TabsContent value="SLAB" className="mt-6">
              <BarEntryTable
                data={slabBars}
                memberType="SLAB"
                projectConfig={projectConfig}
                onDataChange={onSlabBarsChange}
                onShapeSelect={handleShapeSelect}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Shape diagram sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-4">Shape Reference</h3>
              <ShapeDiagram shapeCode={selectedShape} />
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Quick Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Click any cell to edit values</li>
                  <li>• Press Enter or Escape to finish editing</li>
                  <li>• Dimension columns show/hide based on shape</li>
                  <li>• Use spacing = 0 for individual bars</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}