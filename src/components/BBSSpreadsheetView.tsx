import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Info, ChevronRight, ChevronDown } from 'lucide-react';
import type { 
  ConcreteComponent, 
  ConcreteComponentType, 
  BBSMetadata, 
  ComponentBarEntry,
  BarMeasurements,
  BarDirection
} from '@/types/component-types';
import { 
  DEVELOPMENT_LENGTH_TABLES,
  COMPONENT_COVERS, 
  BAR_TYPES,
  FOOTING_TYPES
} from '@/lib/constants';

// ... (existing imports)


import { recalculateComponents } from '@/lib/component-calculator';
import { calculateProjectTotal, calculateBarMeasurementsAuto } from '@/lib/enhanced-calculator';
import { TotalSteelWeight } from './TotalSteelWeight';
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

  // Only one component renders its card and bar rows at a time; the rest are one summary row each.
  // ponytail: a 369-beam import was ~40k DOM nodes and froze the tab — collapse beats virtualisation here.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isOpen = (c: ConcreteComponent) => components.length === 1 || expandedId === c.id;

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
      depth: 125,
      cover: 30,
      bars: []
    };
    onComponentsChange([...components, newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<ConcreteComponent>) => {
    const updated = components.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    
    // If dimensions changed, recalculate all bar measurements for this component
    const dimensionFields = ['spanX', 'spanY', 'depth', 'cover', 'beamWidths', 'topExtensions'];
    const dimensionsChanged = Object.keys(updates).some(key => dimensionFields.includes(key));
    
    if (dimensionsChanged) {
      const component = updated.find(c => c.id === id);
      if (component && (component.componentType === 'BEAM' || (component.componentType === 'SLAB' && component.beamWidths && component.topExtensions))) {
        // Recalculate measurements for this component and, for a beam in a continuous run, its run mates
        const recalculated = updated.map(c => {
          if (c.id === id || (component.runId && c.runId === component.runId)) {
            const updatedBars = c.bars.map(bar => {
              const newMeasurements = calculateBarMeasurementsAuto(
                bar.barType,
                bar.direction,
                c,
                bar.diameter,
                metadata,
                bar.section_span_1, // Pass existing section span override
                updated
              );
              return { ...bar, measurements: newMeasurements };
            });
            return { ...c, bars: updatedBars };
          }
          return c;
        });
        recalculateAll(recalculated);
        return;
      }
    }
    
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
    
    if (component.componentType === 'BEAM' || (component.componentType === 'SLAB' && component.beamWidths && component.topExtensions)) {
       // Use enhanced calculator for auto-measurements
       initialMeasurements = calculateBarMeasurementsAuto(
         defaultBarType,
         defaultDirection,
         component,
         8, // Default diameter
         metadata
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
    
    // Auto-set direction based on bar type; "Top Main Bar ... - Left & Right" is one bar per side (Excel col G = 2)
    if (updates.barType) {
      if (updates.barType.includes('(Y-Y)')) {
        finalUpdates.direction = 'Y';
      } else if (updates.barType.includes('(X-X)')) {
        finalUpdates.direction = 'X';
      }
      finalUpdates.barsPerMember = /top main.*&/i.test(updates.barType) ? 2 : 1;
    }
    
    // If direction, bar type, OR section spans changed, auto-recalculate measurements
    if ((updates.direction || updates.barType || updates.section_span_1 !== undefined || updates.section_span_2 !== undefined) && 
        (component?.componentType === 'BEAM' || (component?.componentType === 'SLAB' && component.beamWidths && component.topExtensions)) &&
        targetBar
    ) {
       const newDirection = finalUpdates.direction || targetBar.direction;
       const newBarType = updates.barType || targetBar.barType;
       const diameter = updates.diameter || targetBar.diameter;
       // Use new section spans if provided
       const newSectionSpan1 = updates.section_span_1 !== undefined ? updates.section_span_1 : targetBar.section_span_1;
       // const newSectionSpan2 = updates.section_span_2 !== undefined ? updates.section_span_2 : targetBar.section_span_2; // Currently unused
       
       const newMeasurements = calculateBarMeasurementsAuto(
         newBarType,
         newDirection,
         component,
         diameter,
         metadata,
         newSectionSpan1,
         components
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

  const recalculateAll = (comps: ConcreteComponent[]) => onComponentsChange(recalculateComponents(comps, metadata));

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
               {/* Fixed Headers - Removed Redundant 'Bar Type & Direction', 'Member Span' */}
               
               <TableHead className="w-[80px] text-center">Spacing (mm)</TableHead>
               <TableHead className="w-[80px] text-center">Dia (mm)</TableHead>
               <TableHead className="w-[80px] text-center">Bars/Memb</TableHead>
               <TableHead className="w-[80px] text-center">Total Members</TableHead>
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
                {!isOpen(component) ? (
                <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedId(component.id)}>
                   <TableCell className="font-bold text-center">{cIndex + 1}</TableCell>
                   <TableCell colSpan={13}>
                     <div className="flex items-center gap-4 text-sm">
                       <ChevronRight className="h-4 w-4 text-muted-foreground" />
                       <span className="font-bold w-24">{component.name}</span>
                       <span className="text-muted-foreground w-16">{component.componentType}</span>
                       <span className="font-mono text-xs">{component.spanX} × {component.spanY} × {component.depth ?? '-'}</span>
                       {component.runId && <span className="px-1 rounded bg-blue-100 text-blue-700 text-xs">Run {component.runId} · {component.runPosition}</span>}
                       <span className="ml-auto text-muted-foreground">{component.bars.length} bars</span>
                       <span className="font-mono w-24 text-right">{component.bars.reduce((kg, b) => kg + (b.calculated?.totalWeight ?? 0), 0).toFixed(1)} kg</span>
                     </div>
                   </TableCell>
                </TableRow>
                ) : (<>
                {/* Component Header Row */}
                <TableRow className="bg-muted/20 pointer-events-none group">
                   <TableCell className="font-bold text-center align-top pt-4">{cIndex + 1}</TableCell>
                   <TableCell className="align-top pt-4 pointer-events-auto" colSpan={13}> {/* Adjusted colSpan */}
                     <div className="flex flex-col gap-4 mb-4">
                       <div className="flex items-center gap-2">
                         {components.length > 1 && (
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(null)} title="Collapse">
                             <ChevronDown className="h-4 w-4" />
                           </Button>
                         )}
                         <select
                           value={component.componentType}
                           onChange={e => updateComponent(component.id, { componentType: e.target.value as ConcreteComponentType, cover: COMPONENT_COVERS[e.target.value] || 25 })}
                           className="w-[120px] h-8 rounded border bg-background px-2 text-sm"
                         >
                           <option value="SLAB">Slab</option>
                           <option value="BEAM">Beam</option>
                           <option value="COLUMN">Column</option>
                           <option value="FOOTING">Footing</option>
                         </select>
                         
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
                             <span className="text-muted-foreground">{component.componentType === 'BEAM' ? 'Clear span:' : 'Span X:'}</span>
                             <Input 
                               type="number" 
                               value={component.spanX || ''}
                               onChange={e => updateComponent(component.id, { spanX: parseFloat(e.target.value) || 0 })}
                               className="w-[80px] h-7 px-2"
                             />
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-muted-foreground">{component.componentType === 'BEAM' ? 'Width:' : 'Span Y:'}</span>
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
                       
                       {component.componentType === 'BEAM' && (
                         <div className="flex gap-4 items-center text-xs p-2 bg-muted/10 rounded border w-fit">
                            <span className="text-muted-foreground">Supports L / R:</span>
                            <Input type="number" placeholder="L" value={component.beamWidths?.left || ''} className="w-16 h-6 px-1"
                              onChange={e => updateComponent(component.id, { beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, left: parseFloat(e.target.value) || 0 } })} />
                            <Input type="number" placeholder="R" value={component.beamWidths?.right || ''} className="w-16 h-6 px-1"
                              onChange={e => updateComponent(component.id, { beamWidths: { ...component.beamWidths || { left:0, right:0, top:0, bottom:0 }, right: parseFloat(e.target.value) || 0 } })} />
                            {component.runId && (
                              <span className="ml-2 px-1 rounded bg-blue-100 text-blue-700" title="Continuous run: Full Span bars span every beam in it">
                                Run {component.runId} · {component.runPosition}/{components.filter(c => c.runId === component.runId).length}
                              </span>
                            )}
                            <span className="text-muted-foreground ml-2" title="Identical beams sharing this entry (Excel col F)">Nos:</span>
                            <Input type="number" min="1" value={component.elementCount || 1} className="w-14 h-6 px-1"
                              onChange={e => updateComponent(component.id, { elementCount: parseInt(e.target.value) || 1 })} />
                         </div>
                       )}

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
                          <select
                             value={bar.barType}
                             onChange={e => updateBarEntry(component.id, bar.id, { barType: e.target.value })}
                             className="h-8 w-full text-xs bg-transparent hover:bg-muted/50 px-2 font-medium rounded"
                          >
                             {!BAR_TYPES[component.componentType]?.includes(bar.barType) && bar.barType !== 'Custom' && <option value={bar.barType}>{bar.barType}</option>}
                             {BAR_TYPES[component.componentType]?.map(t => <option key={t} value={t}>{t}</option>)}
                             <option value="Custom">Custom</option>
                          </select>
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
                    <TableCell className="text-center text-xs">
                        {/* Show relevant span based on direction (opposite span governs quantity) */}
                        <div className="flex flex-col gap-1">
                          <div className="text-muted-foreground">
                            {bar.direction === 'X' ? `Y: ${component.spanY}` : `X: ${component.spanX}`}
                          </div>
                          {/* Section Span override */}
                          {/* Section Span 1 (Length) */}
                           <Input 
                             type="number"
                             placeholder="Len"
                             value={bar.section_span_1 || ''}
                             onChange={e => updateBarEntry(component.id, bar.id, { section_span_1: parseFloat(e.target.value) || undefined })}
                             className="h-6 text-xs text-center border bg-background/50 hover:bg-background"
                             title="Override Length Span (calculations a,b,c...)"
                           />
                           {/* Section Span 2 (Dist) */}
                           <Input 
                             type="number"
                             placeholder="Dist"
                             value={bar.section_span_2 || ''}
                             onChange={e => updateBarEntry(component.id, bar.id, { section_span_2: parseFloat(e.target.value) || undefined })}
                             className="h-6 text-xs text-center border bg-background/50 hover:bg-background"
                             title="Override Distribution Span (calculates Total Members)"
                           />
                         </div>
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
                       <select
                         value={bar.diameter || 8}
                         onChange={e => updateBarEntry(component.id, bar.id, { diameter: parseInt(e.target.value) })}
                         className="h-8 w-full text-center bg-transparent hover:bg-muted/50 rounded"
                       >
                         {[8, 10, 12, 16, 20, 25, 32].map(d => <option key={d} value={d}>{d} mm</option>)}
                       </select>
                    </TableCell>
                    <TableCell>
                       <Input 
                         type="number" 
                         value={bar.barsPerMember || 1} 
                         onChange={e => updateBarEntry(component.id, bar.id, { barsPerMember: parseInt(e.target.value) || 1 })}
                         className="h-8 text-center border-0 bg-transparent hover:bg-muted/50 w-full"
                       />
                    </TableCell>
                    
                    {/* Removed Duplicate Dia and Bars/Memb Cells */}
                    
                    {/* Total no. of members Reqd (Excel col H) — typed value overrides the formula */}
                    <TableCell className="text-center">
                       <Input
                         type="number"
                         min="0"
                         className="h-8 text-center border-0 bg-transparent hover:bg-muted/50 font-mono text-primary"
                         value={bar.totalMembers ?? (bar.calculated ? bar.calculated.noOfBars / (bar.barsPerMember || 1) / (component.elementCount || 1) : '')}
                         onChange={e => updateBarEntry(component.id, bar.id, { totalMembers: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 })}
                         title="Members (Excel col H). Clear to use the formula."
                       />
                    </TableCell>
                    
                    {/* Total nos. (Excel col I) */}
                    <TableCell className="text-center font-mono font-bold text-primary">
                       {bar.calculated ? bar.calculated.noOfBars : '-'}
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
                         
                         {/* Calculated field: Total (Excel col Q = SUM(a..lap)) */}
                         <div className="w-full h-full min-h-[40px] flex items-center justify-center border-r bg-muted/20 text-xs font-mono font-medium text-primary">
                           {bar.calculated ? bar.calculated.totalMeasurement : '-'}
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
                    
                    {/* Cut Length (Excel col T) */}
                    <TableCell className="text-center font-mono font-medium">
                      {bar.calculated ? `${bar.calculated.cuttingLength}mm` : '-'}
                    </TableCell>
                    
                    {/* Total Length (Excel col U) */}
                    <TableCell className="text-center font-mono font-medium">
                      {bar.calculated ? `${bar.calculated.totalLength.toFixed(3)}m` : '-'}
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
                </>)}
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
