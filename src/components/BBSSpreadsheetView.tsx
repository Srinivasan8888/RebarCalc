import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
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
import { fmt } from '@/lib/utils';

const CELL = 'h-9 w-full min-w-0 rounded-sm bg-transparent px-1.5 text-sm num placeholder:text-muted-foreground/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/60';
const SELECT = 'h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60';
const ZERO = { left: 0, right: 0, top: 0, bottom: 0 };
const SIDES = ['left', 'right', 'top', 'bottom'] as const;

/** Labelled dimension input for the member toolbar */
function Dim({ label, value, onChange, width = 'w-20' }: { label: string; value?: number; onChange: (n: number) => void; width?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <input type="number" value={value || ''} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`h-9 ${width} rounded-md border border-input bg-background px-2 text-sm text-foreground num focus:outline-none focus:ring-2 focus:ring-ring/60`} />
    </label>
  );
}

const showMm = (n?: number) => n === undefined ? '' : Number.isInteger(n) ? String(n) : n.toFixed(1);

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
  // ponytail: a 369-beam import was ~40k DOM nodes and froze the tab , collapse beats virtualisation here.
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

  if (!metadata) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const ld: Record<number, number> = metadata.developmentLengths
    ?? DEVELOPMENT_LENGTH_TABLES[metadata.concreteGrade as keyof typeof DEVELOPMENT_LENGTH_TABLES]
    ?? DEVELOPMENT_LENGTH_TABLES.M30;
  const label = 'flex flex-col gap-1 text-xs text-muted-foreground';

  return (
    <div className="space-y-5">
      {/* Sheet header: rows 1–4 of the workbook */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-[2fr_1.5fr_1fr_0.7fr_0.7fr]">
        <label className={label}>Project
          <Input value={metadata.projectName} onChange={e => handleMetadataChange('projectName', e.target.value)} placeholder="Project name" className="font-medium" />
        </label>
        <label className={label}>Item
          <Input value={metadata.itemDescription} onChange={e => handleMetadataChange('itemDescription', e.target.value)} placeholder="20th Floor Slab Reinforcement" />
        </label>
        <label className={label}>Dwg No
          <Input value={metadata.drawingNumber} onChange={e => handleMetadataChange('drawingNumber', e.target.value)} placeholder="ST-B-220-R0" />
        </label>
        <span className={label}>Concrete
          <Select value={metadata.concreteGrade} onValueChange={(v: string) => handleMetadataChange('concreteGrade', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['M20', 'M25', 'M30', 'M35', 'M40'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </span>
        <span className={label}>Steel
          <Select value={metadata.steelGrade} onValueChange={(v: string) => handleMetadataChange('steelGrade', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['Fe415', 'Fe500', 'Fe550'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </span>
        <p className="col-span-full text-xs text-muted-foreground tabular-nums">
          Ld {metadata.concreteGrade}: {Object.entries(ld).map(([d, v]) => `${d} → ${v}`).join(' · ')}
          {metadata.curtailOffset ? ` · curtail ${metadata.curtailOffset}` : ''}
        </p>
      </section>

      {/* The BBS, in the sheet's column order */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1880px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/70">
            <TableRow className="hover:bg-transparent [&>th]:h-10 [&>th]:px-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead className="w-60">Member · Bar type</TableHead>
              <TableHead className="w-24 text-right">Span</TableHead>
              <TableHead className="w-20 text-right">Dia</TableHead>
              <TableHead className="w-20 text-right">Spacing</TableHead>
              <TableHead className="w-16 text-right">Bars/mbr</TableHead>
              <TableHead className="w-20 text-right">Members</TableHead>
              <TableHead className="w-20 text-right">Total nos</TableHead>
              {['a', 'b', 'c', 'd', 'e', 'f', 'Lap'].map(k => <TableHead key={k} className="w-16 text-right">{k}</TableHead>)}
              <TableHead className="w-20 text-right">Total</TableHead>
              <TableHead className="w-14 text-right">Bends</TableHead>
              <TableHead className="w-16 text-right">Ded.</TableHead>
              <TableHead className="w-20 text-right">Cut (mm)</TableHead>
              <TableHead className="w-24 text-right">Length (m)</TableHead>
              <TableHead className="w-24 text-right">kg</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component, cIndex) => {
              const open = isOpen(component);
              const kg = component.bars.reduce((sum, b) => sum + (b.calculated?.totalWeight ?? 0), 0);
              const isBeam = component.componentType === 'BEAM';
              const run = component.runId ? `Run ${component.runId} · ${component.runPosition}/${components.filter(c => c.runId === component.runId).length}` : '';
              const sides = (key: 'beamWidths' | 'topExtensions', text: string) => (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {text}
                  {SIDES.map(side => (
                    <input key={side} type="number" placeholder={side[0].toUpperCase()} value={component[key]?.[side] || ''} aria-label={`${text} ${side}`}
                      onChange={e => updateComponent(component.id, { [key]: { ...(component[key] || ZERO), [side]: parseFloat(e.target.value) || 0 } })}
                      className="h-9 w-14 rounded-md border border-input bg-background px-1.5 text-sm text-foreground num focus:outline-none focus:ring-2 focus:ring-ring/60" />
                  ))}
                </span>
              );

              return (
                <React.Fragment key={component.id}>
                  {/* Member row: collapsed summary, or the toolbar when open */}
                  <TableRow
                    className={open ? 'bg-muted/30 hover:bg-muted/30' : 'cursor-pointer hover:bg-muted/40'}
                    onClick={open ? undefined : () => setExpandedId(component.id)}
                  >
                    <TableCell className="num font-medium text-muted-foreground">{cIndex + 1}</TableCell>
                    {open ? (
                      <TableCell colSpan={21} className="py-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <Button variant="ghost" size="icon-sm" onClick={() => setExpandedId(null)} aria-label="Collapse member"
                            className={components.length > 1 ? '' : 'invisible'}>
                            <ChevronDown />
                          </Button>
                          <select value={component.componentType} aria-label="Member type" className={`${SELECT} w-28`}
                            onChange={e => updateComponent(component.id, { componentType: e.target.value as ConcreteComponentType, cover: COMPONENT_COVERS[e.target.value] || 25 })}>
                            <option value="SLAB">Slab</option>
                            <option value="BEAM">Beam</option>
                            <option value="COLUMN">Column</option>
                            <option value="FOOTING">Footing</option>
                          </select>
                          <Input value={component.name} onChange={e => updateComponent(component.id, { name: e.target.value })}
                            placeholder="Mark (B1, S3)" aria-label="Member name" className="h-9 w-36 font-semibold" />
                          {component.componentType === 'FOOTING' && (
                            <select value={component.footingType || 'ISOLATED'} aria-label="Footing type" className={SELECT}
                              onChange={e => updateComponent(component.id, { footingType: e.target.value as ConcreteComponent['footingType'] })}>
                              {FOOTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          )}
                          <Dim label={isBeam ? 'Clear span' : 'Span X'} value={component.spanX} onChange={n => updateComponent(component.id, { spanX: n })} />
                          <Dim label={isBeam ? 'Width' : 'Span Y'} value={component.spanY} onChange={n => updateComponent(component.id, { spanY: n })} />
                          <Dim label="Depth" value={component.depth} onChange={n => updateComponent(component.id, { depth: n })} width="w-16" />
                          <Dim label="Cover" value={component.cover} onChange={n => updateComponent(component.id, { cover: n })} width="w-16" />
                          {isBeam && (
                            <>
                              <Dim label="Support L" value={component.beamWidths?.left} width="w-16"
                                onChange={n => updateComponent(component.id, { beamWidths: { ...(component.beamWidths || ZERO), left: n } })} />
                              <Dim label="Support R" value={component.beamWidths?.right} width="w-16"
                                onChange={n => updateComponent(component.id, { beamWidths: { ...(component.beamWidths || ZERO), right: n } })} />
                              <Dim label="Nos" value={component.elementCount || 1} width="w-14"
                                onChange={n => updateComponent(component.id, { elementCount: n || 1 })} />
                              {run && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{run}</span>}
                            </>
                          )}
                          {component.componentType === 'SLAB' && (
                            <>
                              {sides('beamWidths', 'Beam widths')}
                              {sides('topExtensions', 'Top ext')}
                            </>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => removeComponent(component.id)} aria-label="Delete member"
                            className="ml-auto text-muted-foreground hover:text-destructive">
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="font-semibold">
                          {component.name} <span className="ml-1 font-normal text-muted-foreground">{component.componentType.toLowerCase()}</span>
                        </TableCell>
                        <TableCell colSpan={18} className="text-muted-foreground">
                          {component.spanX} × {component.spanY} × {component.depth ?? '–'}
                          {run && <span className="ml-3 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{run}</span>}
                          <span className="ml-3">{component.bars.length} bars</span>
                        </TableCell>
                        <TableCell className="num">{fmt(kg, 2)}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </>
                    )}
                  </TableRow>

                  {/* Bar rows */}
                  {open && component.bars.map(bar => {
                    const c = bar.calculated;
                    return (
                      <TableRow key={bar.id} className="hover:bg-muted/20 [&>td]:px-1 [&>td]:py-1">
                        <TableCell />
                        <TableCell className="px-2!">
                          <select value={bar.barType} aria-label="Bar type" className="h-9 w-full rounded-sm bg-transparent px-1 text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/60"
                            onChange={e => updateBarEntry(component.id, bar.id, { barType: e.target.value })}>
                            {!BAR_TYPES[component.componentType]?.includes(bar.barType) && bar.barType !== 'Custom' && <option value={bar.barType}>{bar.barType}</option>}
                            {BAR_TYPES[component.componentType]?.map(t => <option key={t} value={t}>{t}</option>)}
                            <option value="Custom">Custom</option>
                          </select>
                          {!isBeam && (
                            <div className="mt-1 flex gap-1 px-1" role="group" aria-label="Direction">
                              {(['X', 'Y'] as const).map(d => (
                                <button key={d} type="button" aria-pressed={bar.direction === d}
                                  onClick={() => updateBarEntry(component.id, bar.id, { direction: d })}
                                  className={`h-6 rounded border px-1.5 text-[11px] ${bar.direction === d ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                                  {d}-dir
                                </button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="num text-xs text-muted-foreground">{bar.direction === 'X' ? component.spanY : component.spanX}</div>
                          <div className="mt-0.5 grid grid-cols-2 gap-0.5">
                            <input type="number" placeholder="Len" aria-label="Length span override" value={bar.section_span_1 || ''} className={`${CELL} h-7 text-xs`}
                              onChange={e => updateBarEntry(component.id, bar.id, { section_span_1: parseFloat(e.target.value) || undefined })} />
                            <input type="number" placeholder="Dist" aria-label="Distribution span override" value={bar.section_span_2 || ''} className={`${CELL} h-7 text-xs`}
                              onChange={e => updateBarEntry(component.id, bar.id, { section_span_2: parseFloat(e.target.value) || undefined })} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <select value={bar.diameter || 8} aria-label="Diameter" className={`${CELL} text-right`}
                            onChange={e => updateBarEntry(component.id, bar.id, { diameter: parseInt(e.target.value) })}>
                            {[8, 10, 12, 16, 20, 25, 32].map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <input type="number" aria-label="Spacing" value={bar.spacing || ''} className={CELL}
                            onChange={e => updateBarEntry(component.id, bar.id, { spacing: parseInt(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <input type="number" aria-label="Bars per member" value={bar.barsPerMember || 1} className={CELL}
                            onChange={e => updateBarEntry(component.id, bar.id, { barsPerMember: parseInt(e.target.value) || 1 })} />
                        </TableCell>
                        <TableCell>
                          <input type="number" min="0" aria-label="Members" title="Excel col H. Clear to use the formula."
                            value={bar.totalMembers ?? (c ? c.noOfBars / (bar.barsPerMember || 1) / (component.elementCount || 1) : '')}
                            className={`${CELL} ${bar.totalMembers !== undefined ? 'text-foreground' : 'text-primary'}`}
                            onChange={e => updateBarEntry(component.id, bar.id, { totalMembers: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell className="num font-medium">{c ? c.noOfBars : ''}</TableCell>
                        {(['a', 'b', 'c', 'd', 'e', 'f', 'lap'] as const).map(key => (
                          <TableCell key={key}>
                            <input type="number" placeholder="–" aria-label={`Leg ${key}`} value={bar.measurements[key] || ''} className={CELL}
                              onChange={e => updateBarMeasurements(component.id, bar.id, key, parseFloat(e.target.value) || 0)} />
                          </TableCell>
                        ))}
                        <TableCell className="num">{c ? showMm(c.totalMeasurement) : ''}</TableCell>
                        <TableCell>
                          <input type="number" min="0" aria-label="Bends" placeholder={c ? String(c.noOfDeductions) : ''}
                            value={bar.manualNoOfDeductions ?? ''} className={`${CELL} placeholder:text-primary`}
                            onChange={e => updateBarEntry(component.id, bar.id, { manualNoOfDeductions: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell className="num">{c ? c.deductionAmount : ''}</TableCell>
                        <TableCell className="num font-medium">{c ? showMm(c.cuttingLength) : ''}</TableCell>
                        <TableCell className="num">{c ? c.totalLength.toFixed(3) : ''}</TableCell>
                        <TableCell className="num">{c ? fmt(c.totalWeight, 2) : ''}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" onClick={() => removeBarEntry(component.id, bar.id)} aria-label="Delete bar"
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {open && (
                    <TableRow className="border-b-2 hover:bg-transparent">
                      <TableCell />
                      <TableCell colSpan={21}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => addBarEntry(component.id)}>
                          <Plus /> Add bar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {components.length === 0 && (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No members yet.</p>
            <p className="mx-auto mt-1 max-w-md">Add a slab panel or beam and enter its bars, or use Import BBS Excel above to load an issued BBS or a beam schedule.</p>
            <Button className="mt-4" onClick={addComponent}><Plus /> Add member</Button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-6">
        <Button variant="outline" onClick={addComponent}><Plus /> Add member</Button>
        <TotalSteelWeight summary={projectSummary} />
      </div>
    </div>
  );
}
