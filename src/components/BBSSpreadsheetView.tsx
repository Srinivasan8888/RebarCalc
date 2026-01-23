import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Info } from 'lucide-react';
import type { 
  ConcreteComponent, 
  ConcreteComponentType, 
  BBSMetadata, 
  ComponentBarEntry,
  BarMeasurements
} from '@/types/component-types';
import { 
  DEVELOPMENT_LENGTH_TABLES,
  COMPONENT_COVERS, 
  BAR_TYPES,
  FOOTING_TYPES
} from '@/lib/constants';

// ... (existing imports)


import { 
  calculateComponentBarEntryEnhanced, 
  calculateProjectTotal, 
  calculateBarMeasurementsAuto,
  calculateBarsPerMember,
  calculateCutLengthByBarType
} from '@/lib/enhanced-calculator';
import { TotalSteelWeight } from './TotalSteelWeight';
import { CalculationVerificationBadge } from './CalculationVerificationBadge';
import { ComponentFormulaTooltip } from './ComponentFormulaTooltip';

interface BBSSpreadsheetViewProps {
  components: ConcreteComponent[];
  metadata?: BBSMetadata;
  onComponentsChange: (components: ConcreteComponent[]) => void;
  onMetadataChange: (metadata: BBSMetadata) => void;
}

export function BBSSpreadsheetView({
  components,
  metadata,
  onComponentsChange,
  onMetadataChange
}: BBSSpreadsheetViewProps) {
  
  // Initialize metadata if missing
  useEffect(() => {
    if (!metadata) {
      onMetadataChange({
        projectName: '',
        drawingNumber: '',
        itemDescription: '',
        concreteGrade: 'M30',
        steelGrade: 'Fe500'
      });
    }
  }, []);

  const handleMetadataChange = (field: keyof BBSMetadata, value: string) => {
    if (metadata) {
      onMetadataChange({ ...metadata, [field]: value });
    }
  };

  const addComponent = () => {
    const newComponent: ConcreteComponent = {
      id: crypto.randomUUID(),
      name: `C${components.length + 1}`,
      componentType: 'SLAB', // Default
      spanX: 3000,
      spanY: 3000,
      cover: 20,
      bars: []
    };
    onComponentsChange([...components, newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<ConcreteComponent>) => {
    const updated = components.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    // Re-calculate bars if relevant fields changed
    recalculateAll(updated);
  };

  const removeComponent = (id: string) => {
    onComponentsChange(components.filter(c => c.id !== id));
  };

  const addBarEntry = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    // Auto-calculate measurements using enhanced calculator
    let initialMeasurements: BarMeasurements = { a: component.spanX };
    
    // Determine default direction based on bar type
    const defaultBarType = BAR_TYPES[component.componentType]?.[0] || 'Main Bar';
    const defaultDirection: BarDirection = defaultBarType.includes('(Y-Y)') ? 'Y' : 'X';
    
    if (component.componentType === 'SLAB' && component.beamWidths && component.topExtensions) {
       // Use enhanced calculator for auto-measurements
       initialMeasurements = calculateBarMeasurementsAuto(
         defaultBarType,
         defaultDirection,
         component,
         8, // Default diameter
         metadata?.concreteGrade || 'M30'
       );
    }

    const newBar: ComponentBarEntry = {
      id: crypto.randomUUID(),
      barType: defaultBarType,
      direction: defaultDirection,
      diameter: 8,
      spacing: 150,
      barsPerMember: 1,
      measurements: initialMeasurements
    };

    const updatedComponents = components.map(c => {
      if (c.id === componentId) {
        return { ...c, bars: [...c.bars, newBar] };
      }
      return c;
    });

    recalculateAll(updatedComponents);
  };

  const updateBarEntry = (componentId: string, barId: string, updates: Partial<ComponentBarEntry>) => {
    const component = components.find(c => c.id === componentId);
    let finalUpdates = { ...updates };

    // Find target bar to check its type
    const targetBar = component?.bars.find(b => b.id === barId);
    
    // Auto-set direction based on bar type
    if (updates.barType) {
      if (updates.barType.includes('(Y-Y)')) {
        finalUpdates.direction = 'Y';
      } else if (updates.barType.includes('(X-X)')) {
        finalUpdates.direction = 'X';
      }
    }
    
    // If direction or bar type changed, auto-recalculate measurements using enhanced calculator
    if ((updates.direction || updates.barType) && 
        component?.componentType === 'SLAB' && 
        component.beamWidths && 
        component.topExtensions &&
        targetBar
    ) {
       const newDirection = finalUpdates.direction || targetBar.direction;
       const newBarType = updates.barType || targetBar.barType;
       const diameter = updates.diameter || targetBar.diameter;
       
       const newMeasurements = calculateBarMeasurementsAuto(
         newBarType,
         newDirection,
         component,
         diameter,
         metadata?.concreteGrade || 'M30'
       );
       
       finalUpdates = { ...finalUpdates, measurements: newMeasurements };
    }

    const updatedComponents = components.map(c => {
      if (c.id === componentId) {
        const updatedBars = c.bars.map(b => 
          b.id === barId ? { ...b, ...finalUpdates } : b
        );
        return { ...c, bars: updatedBars };
      }
      return c;
    });
    recalculateAll(updatedComponents);
  };
  
  const updateBarMeasurements = (componentId: string, barId: string, field: keyof BarMeasurements, value: number) => {
     const updatedComponents = components.map(c => {
      if (c.id === componentId) {
        const updatedBars = c.bars.map(b => {
          if (b.id === barId) {
             return { 
               ...b, 
               measurements: { ...b.measurements, [field]: value } 
             };
          }
          return b;
        });
        return { ...c, bars: updatedBars };
      }
      return c;
    });
    recalculateAll(updatedComponents);
  }

  const removeBarEntry = (componentId: string, barId: string) => {
    const updatedComponents = components.map(c => {
      if (c.id === componentId) {
        return { ...c, bars: c.bars.filter(b => b.id !== barId) };
      }
      return c;
    });
    recalculateAll(updatedComponents);
  };

  // Main calculation trigger
  const recalculateAll = (comps: ConcreteComponent[]) => {
    const calculated = comps.map(comp => {
      const bars = comp.bars.map(bar => {
        return {
          ...bar,
          calculated: calculateComponentBarEntryEnhanced(
            bar, 
            comp,
            metadata?.concreteGrade || 'M30'
          )
        };
      });
      return { ...comp, bars };
    });
    onComponentsChange(calculated);
  };
  
  const projectSummary = calculateProjectTotal(components);

  if (!metadata) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Project Header & Metadata */}
      <Card className="bg-muted/10">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Project Name</label>
              <Input 
                value={metadata.projectName} 
                onChange={e => handleMetadataChange('projectName', e.target.value)}
                placeholder="Enter Project Name"
                className="font-medium"
              />
            </div>
            
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Item Description</label>
                <Input 
                  value={metadata.itemDescription} 
                  onChange={e => handleMetadataChange('itemDescription', e.target.value)}
                  placeholder="e.g. 20th Floor Slab"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Dwg No</label>
                <Input 
                  value={metadata.drawingNumber} 
                  onChange={e => handleMetadataChange('drawingNumber', e.target.value)}
                  placeholder="Reference Dwg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-xs font-semibold uppercase text-muted-foreground">Concrete Grade</label>
                 <Select 
                   value={metadata.concreteGrade} 
                   onValueChange={(v: any) => handleMetadataChange('concreteGrade', v)}
                 >
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="M20">M20</SelectItem>
                     <SelectItem value="M25">M25</SelectItem>
                     <SelectItem value="M30">M30</SelectItem>
                     <SelectItem value="M35">M35</SelectItem>
                     <SelectItem value="M40">M40</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-semibold uppercase text-muted-foreground">Steel Grade</label>
                 <Select 
                   value={metadata.steelGrade} 
                   onValueChange={(v: any) => handleMetadataChange('steelGrade', v)}
                 >
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Fe415">Fe415</SelectItem>
                     <SelectItem value="Fe500">Fe500</SelectItem>
                     <SelectItem value="Fe550">Fe550</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
            </div>

            {/* Reference Table - Visual Only */}
            <div className="bg-card border rounded p-2 text-xs">
              <div className="flex justify-between items-center mb-1 font-semibold text-muted-foreground">
                <span>Ld for {metadata.concreteGrade}</span>
                <span>(Development Length Reference)</span>
              </div>
              <div className="flex justify-between gap-2 overflow-x-auto">
                {Object.entries(DEVELOPMENT_LENGTH_TABLES[metadata.concreteGrade as keyof typeof DEVELOPMENT_LENGTH_TABLES] || DEVELOPMENT_LENGTH_TABLES.M30)
                  .map(([dia, val]) => (
                   <div key={dia} className="flex flex-col items-center min-w-[30px]">
                     <span className="font-bold">{dia}</span>
                     <span>{val}</span>
                   </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Main Spreadsheet Table */}
      <div className="border rounded-md overflow-x-auto bg-background">
        <Table className="w-full min-w-[1800px]">
          <TableHeader>
             <TableRow className="bg-muted/50 hover:bg-muted/50">
               <TableHead className="w-[50px]">S.No</TableHead>
               <TableHead className="w-[200px]">Bar Type / Component</TableHead>
               <TableHead className="w-[120px] text-center">Span (X/Y)</TableHead>
               <TableHead className="w-[80px] text-center">Spc (mm)</TableHead>
               <TableHead className="w-[60px] text-center">Dia</TableHead>
               <TableHead className="w-[80px] text-center">No. of bars Reqd per member</TableHead>
               <TableHead className="w-[80px] text-center">Total no. of members Reqd</TableHead>
               <TableHead className="w-[80px] text-center">Total nos.</TableHead>
               <TableHead className="w-[500px] text-center border-l border-r">
                  <ComponentFormulaTooltip bar={{ barType: 'Bottom Bar (X-X)', direction: 'X', diameter: 8, spacing: 150, measurements: { a: 0 } } as any}>
                    <div className="cursor-help">
                      Measurements of Bar (mm)
                      <div className="grid grid-cols-10 text-xs font-normal mt-1 text-muted-foreground">
                        <span>a</span>
                        <span>b</span>
                        <span>c</span>
                        <span>d</span>
                        <span>e</span>
                        <span>f</span>
                        <span>Lap</span>
                        <span>Total</span>
                        <span>Bends</span>
                        <span>Deduction</span>
                      </div>
                    </div>
                  </ComponentFormulaTooltip>
               </TableHead>
               <TableHead className="w-[80px] text-center">Cut Length</TableHead>
               <TableHead className="w-[80px] text-center">Total Length (m)</TableHead>
               <TableHead className="w-[60px] text-center">Bends</TableHead>
               <TableHead className="w-[50px]"></TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component, cIndex) => (
              <React.Fragment key={component.id}>
                {/* Component Header Row */}
                <TableRow className="bg-muted/20 pointer-events-none group">
                   <TableCell className="font-bold text-center align-top pt-4">{cIndex + 1}</TableCell>
                   <TableCell className="align-top pt-4 pointer-events-auto" colSpan={11}>
                     <div className="flex flex-col gap-4 mb-4">
                       <div className="flex items-center gap-2">
                         <Select 
                           value={component.componentType}
                           onValueChange={(v: ConcreteComponentType) => updateComponent(component.id, { 
                             componentType: v, 
                             cover: COMPONENT_COVERS[v] || 25 
                           })}
                         >
                           <SelectTrigger className="w-[120px] h-8 bg-background">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="SLAB">Slab</SelectItem>
                             <SelectItem value="BEAM">Beam</SelectItem>
                             <SelectItem value="COLUMN">Column</SelectItem>
                             <SelectItem value="FOOTING">Footing</SelectItem>
                           </SelectContent>
                         </Select>
                         
                         <Input 
                           value={component.name} 
                           onChange={e => updateComponent(component.id, { name: e.target.value })}
                           className="w-[120px] h-8 font-bold bg-background" 
                           placeholder="Name (e.g. S1)"
                         />
                         
                         {component.componentType === 'FOOTING' && (
                            <Select 
                              value={component.footingType || 'ISOLATED'}
                              onValueChange={(v: any) => updateComponent(component.id, { footingType: v })}
                            >
                              <SelectTrigger className="w-[140px] h-8 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FOOTING_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                         )}
                         
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => removeComponent(component.id)}
                           className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                       
                       <div className="flex gap-4 text-sm bg-background p-2 rounded border w-fit">
                          <div className="flex items-center gap-2">
                             <span className="text-muted-foreground">Span X:</span>
                             <Input 
                               type="number" 
                               value={component.spanX || ''}
                               onChange={e => updateComponent(component.id, { spanX: parseFloat(e.target.value) || 0 })}
                               className="w-[80px] h-7 px-2"
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-muted-foreground">Span Y:</span>
                             <Input 
                               type="number" 
                               value={component.spanY || ''}
                               onChange={e => updateComponent(component.id, { spanY: parseFloat(e.target.value) || 0 })}
                               className="w-[80px] h-7 px-2"
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-muted-foreground">Depth:</span>
                             <Input 
                               type="number" 
                               value={component.depth || ''}
                               onChange={e => updateComponent(component.id, { depth: parseFloat(e.target.value) || 0 })}
                               className="w-[60px] h-7 px-2"
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-muted-foreground">Cover:</span>
                             <Input 
                               type="number" 
                               value={component.cover || ''}
                               onChange={e => updateComponent(component.id, { cover: parseFloat(e.target.value) || 0 })}
                               className="w-[60px] h-7 px-2"
                             />
                          </div>
                       </div>
                       
                       {/* Row 2: U-Bar Inputs (Only for SLAB) */}
                       {component.componentType === 'SLAB' && (
                         <div className="flex flex-col gap-2 mt-2 p-2 bg-muted/10 rounded border text-xs">
                            <div className="font-semibold text-muted-foreground mb-1">U-Bar Dimensions (Left / Right / Top / Bottom)</div>
                            
                            <div className="flex gap-4 items-center">
                               <span className="w-20 text-muted-foreground">Beam Widths:</span>
                               <Input 
                                 placeholder="L"
                                 type="number" 
                                 value={component.beamWidths?.left || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, left: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="R"
                                 type="number" 
                                 value={component.beamWidths?.right || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, right: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="T"
                                 type="number" 
                                 value={component.beamWidths?.top || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, top: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="B"
                                 type="number" 
                                 value={component.beamWidths?.bottom || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, bottom: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                            </div>

                            <div className="flex gap-4 items-center">
                               <span className="w-20 text-muted-foreground">Top Ext's:</span>
                               <Input 
                                 placeholder="L"
                                 type="number" 
                                 value={component.topExtensions?.left || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   topExtensions: { ...component.topExtensions || { left:0, right:0, top:0, bottom:0 }, left: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="R"
                                 type="number" 
                                 value={component.topExtensions?.right || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   topExtensions: { ...component.topExtensions || { left:0, right:0, top:0, bottom:0 }, right: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="T"
                                 type="number" 
                                 value={component.topExtensions?.top || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   topExtensions: { ...component.topExtensions || { left:0, right:0, top:0, bottom:0 }, top: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                               <Input 
                                 placeholder="B"
                                 type="number" 
                                 value={component.topExtensions?.bottom || ''}
                                 onChange={e => updateComponent(component.id, { 
                                   topExtensions: { ...component.topExtensions || { left:0, right:0, top:0, bottom:0 }, bottom: parseFloat(e.target.value) || 0 }
                                 })}
                                 className="w-16 h-6 px-1"
                               />
                            </div>
                            
                             
                             <details className="mt-2 text-[10px] text-muted-foreground">
                               <summary className="cursor-pointer hover:text-foreground flex items-center gap-1 w-fit mb-1 select-none">
                                 <Info className="h-3 w-3" /> <span className="underline decoration-dotted">Show Calculation Logic</span>
                               </summary>
                               <div className="p-2 rounded border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                                 <div><span className="font-mono">a</span> = Span</div>
                                 <div className="col-span-2"><span className="font-mono">b, d</span> = Beam Width - Cover (Start/End)</div>
                                 <div className="col-span-2"><span className="font-mono">c</span> = Depth - 2 × Cover (Vertical)</div>
                                 <div className="col-span-2"><span className="font-mono">e, f</span> = Top Extensions (Left/Right)</div>
                               </div>
                             </details>
                          </div>
                        )}
                     </div>
                   </TableCell>
                </TableRow>
                
                {/* Bar Entries */}
                {component.bars.map((bar) => (
                  <TableRow key={bar.id} className="hover:bg-muted/5 border-b-0">
                    <TableCell></TableCell>
                    <TableCell>
                       <div className="space-y-1">
                          <Select 
                             value={bar.barType} 
                             onValueChange={v => updateBarEntry(component.id, bar.id, { barType: v })}
                          >
                             <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent hover:bg-muted/50 p-0 px-2 justify-start font-medium">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               {BAR_TYPES[component.componentType]?.map(t => (
                                 <SelectItem key={t} value={t}>{t}</SelectItem>
                               ))}
                               <SelectItem value="Custom">Custom</SelectItem>
                             </SelectContent>
                          </Select>
                          <div className="flex gap-2 px-2">
                             <div 
                               className={`text-[10px] px-1 rounded cursor-pointer ${bar.direction === 'X' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                               onClick={() => updateBarEntry(component.id, bar.id, { direction: 'X' })}
                             >X-Dir</div>
                             <div 
                               className={`text-[10px] px-1 rounded cursor-pointer ${bar.direction === 'Y' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                               onClick={() => updateBarEntry(component.id, bar.id, { direction: 'Y' })}
                             >Y-Dir</div>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                        {/* Show relevant span based on direction (opposite span governs quantity) */}
                        {bar.direction === 'X' ? `Y: ${component.spanY}` : `X: ${component.spanX}`}
                    </TableCell>
                    <TableCell>
                       <Input 
                         type="number" 
                         value={bar.spacing || ''} 
                         onChange={e => updateBarEntry(component.id, bar.id, { spacing: parseInt(e.target.value) || 0 })}
                         className="h-8 text-center border-0 bg-transparent hover:bg-muted/50"
                       />
                    </TableCell>
                    <TableCell>
                       <Select 
                         value={bar.diameter.toString()}
                         onValueChange={v => updateBarEntry(component.id, bar.id, { diameter: parseInt(v) })}
                       >
                         <SelectTrigger className="h-8 border-0 shadow-none bg-transparent hover:bg-muted/50 justify-center">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {[8, 10, 12, 16, 20, 25, 32].map(d => (
                             <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </TableCell>
                    
                    {/* No. of bars Reqd per member (input field, default 1) */}
                    <TableCell>
                       <Input 
                         type="number" 
                         value={bar.barsPerMember || 1} 
                         onChange={e => updateBarEntry(component.id, bar.id, { barsPerMember: parseInt(e.target.value) || 1 })}
                         className="h-8 text-center border-0 bg-transparent hover:bg-muted/50"
                         placeholder="1"
                       />
                    </TableCell>
                    
                    {/* Total no. of members Reqd (calculated based on bar type) */}
                    <TableCell className="text-center">
                       {(() => {
                         const totalMembers = calculateBarsPerMember(bar.barType, bar.direction, component, bar.spacing);
                         return (
                           <span 
                             className="font-mono text-primary font-medium cursor-help hover:bg-muted/20 px-1 py-0.5 rounded"
                             title={`Total Members Calculation:
Bar Type: ${bar.barType}
${bar.barType.toLowerCase().includes('bottom bar (x-x)') ? `Formula: ROUNDUP(Span Y / Spacing, 0)
Span Y: ${component.spanY}mm
Spacing: ${bar.spacing}mm
Result: ROUNDUP(${component.spanY} / ${bar.spacing}) = ${totalMembers}` :
bar.barType.toLowerCase().includes('bottom bar dist (x-x)') ? `Formula: ROUNDUP((Top Ext Left + Top Ext Right) / Spacing, 0)
Top Ext Left: ${component.topExtensions?.left || 0}mm
Top Ext Right: ${component.topExtensions?.right || 0}mm
Spacing: ${bar.spacing}mm
Result: ROUNDUP((${component.topExtensions?.left || 0} + ${component.topExtensions?.right || 0}) / ${bar.spacing}) = ${totalMembers}` :
bar.barType.toLowerCase().includes('bottom bar (y-y)') ? `Formula: ROUNDUP(Span X / Spacing, 0)
Span X: ${component.spanX}mm
Spacing: ${bar.spacing}mm
Result: ROUNDUP(${component.spanX} / ${bar.spacing}) = ${totalMembers}` :
bar.barType.toLowerCase().includes('bottom bar dist (y-y)') ? `Formula: ROUNDUP((Top Ext Top + Top Ext Bottom) / Spacing, 0)
Top Ext Top: ${component.topExtensions?.top || 0}mm
Top Ext Bottom: ${component.topExtensions?.bottom || 0}mm
Spacing: ${bar.spacing}mm
Result: ROUNDUP((${component.topExtensions?.top || 0} + ${component.topExtensions?.bottom || 0}) / ${bar.spacing}) = ${totalMembers}` :
`Formula: Based on bar type and direction
Result: ${totalMembers}`}`}
                           >
                             {totalMembers}
                           </span>
                         );
                       })()}
                    </TableCell>
                    
                    {/* Total nos. (barsPerMember × calculated totalMembers) */}
                    <TableCell className="text-center">
                       {(() => {
                         const totalMembers = calculateBarsPerMember(bar.barType, bar.direction, component, bar.spacing);
                         const totalNos = (bar.barsPerMember || 1) * totalMembers;
                         return (
                           <span 
                             className="font-mono font-bold text-primary cursor-help hover:bg-muted/20 px-1 py-0.5 rounded"
                             title={`Total Nos Calculation:
Formula: Bars per Member × Total Members
Bars per Member: ${bar.barsPerMember || 1}
Total Members: ${totalMembers}
Result: ${bar.barsPerMember || 1} × ${totalMembers} = ${totalNos}`}
                           >
                             {totalNos}
                           </span>
                         );
                       })()}
                    </TableCell>
                    
                    {/* Measurements Inputs a-f + lap + calculated fields */}
                    <TableCell className="border-l border-r p-0">
                       <div className="grid grid-cols-10 h-full">
                         {/* Input fields: a, b, c, d, e, f, lap */}
                         {['a','b','c','d','e','f','lap'].map((key) => (
                           <input
                             key={key}
                             type="number"
                             placeholder="-"
                             className="w-full h-full min-h-[40px] text-center border-r bg-transparent focus:bg-background focus:outline-none focus:ring-1 focus:ring-inset text-xs"
                             value={bar.measurements[key as keyof BarMeasurements] || ''}
                             onChange={e => updateBarMeasurements(component.id, bar.id, key as keyof BarMeasurements, parseFloat(e.target.value) || 0)}
                           />
                         ))}
                         
                         {/* Calculated field: Total (a+b+c+d+e+f, excluding lap) */}
                         <div 
                           className="w-full h-full min-h-[40px] flex items-center justify-center border-r bg-muted/20 text-xs font-mono font-medium text-primary cursor-help hover:bg-muted/30"
                           title={`Total Measurement:
Formula: a + b + c + d + e + f (excludes lap)
a: ${bar.measurements.a || 0}mm
b: ${bar.measurements.b || 0}mm
c: ${bar.measurements.c || 0}mm
d: ${bar.measurements.d || 0}mm
e: ${bar.measurements.e || 0}mm
f: ${bar.measurements.f || 0}mm
Total: ${(bar.measurements.a || 0) + (bar.measurements.b || 0) + (bar.measurements.c || 0) + (bar.measurements.d || 0) + (bar.measurements.e || 0) + (bar.measurements.f || 0)}mm`}
                         >
                           {(() => {
                             const total = (bar.measurements.a || 0) + (bar.measurements.b || 0) + 
                                          (bar.measurements.c || 0) + (bar.measurements.d || 0) + 
                                          (bar.measurements.e || 0) + (bar.measurements.f || 0);
                             return total > 0 ? total : '-';
                           })()}
                         </div>
                         
                         {/* Calculated field: No of Bends */}
                         <div 
                           className="w-full h-full min-h-[40px] flex items-center justify-center border-r bg-muted/20 text-xs font-mono font-medium text-primary cursor-help hover:bg-muted/30"
                           title={`Number of Bends:
Bar Type: ${bar.barType}
Auto-detected: ${bar.calculated ? bar.calculated.noOfDeductions : 0} bends
Based on bar shape and segments`}
                         >
                           {bar.calculated ? bar.calculated.noOfDeductions : '-'}
                         </div>
                         
                         {/* Calculated field: Deduction (No of Bends * Dia * 2) */}
                         <div 
                           className="w-full h-full min-h-[40px] flex items-center justify-center bg-muted/20 text-xs font-mono font-medium text-primary cursor-help hover:bg-muted/30"
                           title={`Deduction Calculation:
Formula: No of Bends × Diameter × 2
No of Bends: ${bar.calculated ? bar.calculated.noOfDeductions : 0}
Diameter: ${bar.diameter}mm
Result: ${bar.calculated ? bar.calculated.noOfDeductions : 0} × ${bar.diameter} × 2 = ${bar.calculated ? bar.calculated.deductionAmount : 0}mm`}
                         >
                           {bar.calculated ? bar.calculated.deductionAmount : '-'}
                         </div>
                       </div>
                    </TableCell>
                    
                    {/* Cut Length (Bar type specific formula) */}
                    <TableCell className="text-center">
                      {(() => {
                        const deduction = bar.calculated ? bar.calculated.deductionAmount : 0;
                        const cutLength = calculateCutLengthByBarType(bar.barType, bar.measurements, deduction);
                        
                        return cutLength > 0 ? (
                          <span 
                            className="font-mono font-medium cursor-help hover:bg-muted/20 px-1 py-0.5 rounded"
                            title={bar.barType.toLowerCase().includes('bottom bar (y-y)') 
                              ? `Cut Length Calculation (Special Formula):
Bar Type: ${bar.barType}
Formula: CEILING((a+b+c+d+e+deduction) / 5) × 5
a+b+c+d+e: ${(bar.measurements.a || 0) + (bar.measurements.b || 0) + (bar.measurements.c || 0) + (bar.measurements.d || 0) + (bar.measurements.e || 0)}mm (excludes f)
Deduction: ${deduction}mm (added, not subtracted)
Before rounding: ${(bar.measurements.a || 0) + (bar.measurements.b || 0) + (bar.measurements.c || 0) + (bar.measurements.d || 0) + (bar.measurements.e || 0) + deduction}mm
Result: ${cutLength}mm (rounded up to 5mm)`
                              : `Cut Length Calculation (Standard Formula):
Bar Type: ${bar.barType}
Formula: Total - Deduction
Total: ${(bar.measurements.a || 0) + (bar.measurements.b || 0) + (bar.measurements.c || 0) + (bar.measurements.d || 0) + (bar.measurements.e || 0) + (bar.measurements.f || 0)}mm
Deduction: ${deduction}mm
Result: ${(bar.measurements.a || 0) + (bar.measurements.b || 0) + (bar.measurements.c || 0) + (bar.measurements.d || 0) + (bar.measurements.e || 0) + (bar.measurements.f || 0)} - ${deduction} = ${cutLength}mm`}
                          >
                            {cutLength}mm
                          </span>
                        ) : '-';
                      })()}
                    </TableCell>
                    
                    {/* Total Length (Cut Length × Total nos / 1000) */}
                    <TableCell className="text-center">
                      {(() => {
                        const deduction = bar.calculated ? bar.calculated.deductionAmount : 0;
                        const cutLength = calculateCutLengthByBarType(bar.barType, bar.measurements, deduction);
                        const totalMembers = calculateBarsPerMember(bar.barType, bar.direction, component, bar.spacing);
                        const totalNos = (bar.barsPerMember || 1) * totalMembers;
                        const totalLength = (cutLength * totalNos) / 1000;
                        
                        return totalLength > 0 ? (
                          <span 
                            className="font-mono font-medium cursor-help hover:bg-muted/20 px-1 py-0.5 rounded"
                            title={`Total Length Calculation:
Formula: (Cut Length × Total Nos) / 1000
Cut Length: ${cutLength}mm
Total Nos: ${totalNos}
Result: (${cutLength} × ${totalNos}) / 1000 = ${totalLength.toFixed(2)}m`}
                          >
                            {totalLength.toFixed(2)}m
                          </span>
                        ) : '-';
                      })()}
                    </TableCell>
                    
                    {/* Bends Input (with auto-calculation) */}
                    <TableCell>
                       <Input 
                         type="number"
                         min="0"
                         className="h-8 w-full text-center border-0 bg-transparent hover:bg-muted/50 p-0"
                         value={bar.manualNoOfDeductions || (bar.calculated ? bar.calculated.noOfDeductions : '')}
                         onChange={e => updateBarEntry(component.id, bar.id, { manualNoOfDeductions: parseInt(e.target.value) || 0 })}
                         placeholder={bar.calculated ? bar.calculated.noOfDeductions.toString() : "Auto"}
                       />
                    </TableCell>

                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBarEntry(component.id, bar.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Add Bar Button Row */}
                <TableRow className="border-b-4 border-double">
                   <TableCell></TableCell>
                   <TableCell colSpan={11}>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="text-xs text-muted-foreground hover:text-primary"
                       onClick={() => addBarEntry(component.id)}
                     >
                       <Plus className="h-3 w-3 mr-1" /> Add Bar Row
                     </Button>
                   </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        
        {components.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
             <p>No components added yet.</p>
             <Button onClick={addComponent} className="mt-4">
               <Plus className="h-4 w-4 mr-2" /> Add First Component
             </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
         <Button onClick={addComponent} variant="outline">
           <Plus className="h-4 w-4 mr-2" /> Add Component
         </Button>
      </div>
      
      {/* 3. Summary Footer */}
      <TotalSteelWeight summary={projectSummary} />
    </div>
  );
}
