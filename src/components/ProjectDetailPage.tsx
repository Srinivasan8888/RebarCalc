import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MemberTypeTabs } from './MemberTypeTabs';
import { SummaryView } from './SummaryCards';
import { ExportDialog } from './ExportDialog';
import { ProjectSetupForm } from './ProjectSetupForm';
import { ProfileSwitchDialog } from './ProfileSwitchDialog';
import { calculateAll } from '@/lib/calculator';
import { summarizeByDiameter, summarizeByShape, summarizeByMember } from '@/lib/calculator';
import { saveProject, takeCloudCopy, keepLocalCopy, createShareLink, type SyncStatus } from '@/lib/project-repository';
import { Settings, Download, Save, AlertCircle, RefreshCw, Upload, Link2, Printer } from 'lucide-react';
import { PrintSheet } from './PrintSheet';
import { fmt } from '@/lib/utils';
import type { ProjectConfig, BarEntry, CalculatedBar } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';
import { MethodologyToggle } from './MethodologyToggle';
import { BBSSpreadsheetView } from './BBSSpreadsheetView';
import type { ConcreteComponent, BBSMetadata, ProjectDoubt } from '@/types/component-types';
import { parseBBSWorkbook } from '@/lib/excel-importer';
import { exportBBSWorkbook } from '@/lib/bbs-excel-exporter';
import { ExcelExporter } from '@/lib/excel-exporter';
import { recalculateComponents, findCalculationDrift } from '@/lib/component-calculator';

interface ProjectDetailPageProps {
  projectId: string;
  initialConfig: ProjectConfig;
  initialBars: BarEntry[];
  onConfigUpdate: (config: ProjectConfig) => void;
  onBarsUpdate: (bars: BarEntry[]) => void;
  readOnly?: boolean;   // opened from a share link: nothing is written anywhere
  signedIn?: boolean;
}

export function ProjectDetailPage({
  initialConfig,
  initialBars,
  onConfigUpdate,
  onBarsUpdate,
  readOnly = false,
  signedIn = false,
}: ProjectDetailPageProps) {
  const [config, setConfig] = useState<ProjectConfig>(initialConfig);
  const [allBars, setAllBars] = useState<BarEntry[]>(initialBars);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | 'idle'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Stored kg that recalculateComponents no longer reproduces (a formula changed since the save).
  const [drift, setDrift] = useState<string[]>(() =>
    initialConfig.calculationMode === 'COMPONENT' && initialConfig.components?.length
      ? findCalculationDrift(initialConfig.components, initialConfig.bbsMetadata) : []);

  // Separate bars by member type
  const beamBars = useMemo(() => allBars.filter(bar => bar.memberType === 'BEAM'), [allBars]);
  const columnBars = useMemo(() => allBars.filter(bar => bar.memberType === 'COLUMN'), [allBars]);
  const slabBars = useMemo(() => allBars.filter(bar => bar.memberType === 'SLAB'), [allBars]);

  // Calculate all bars with current config
  const calculatedBars: CalculatedBar[] = useMemo(() => {
    if (allBars.length === 0) return [];
    return calculateAll(allBars, config);
  }, [allBars, config]);

  // Generate summaries
  const summaries = useMemo(() => ({
    diameter: summarizeByDiameter(calculatedBars),
    shape: summarizeByShape(calculatedBars),
    member: summarizeByMember(calculatedBars),
  }), [calculatedBars]);

  // Auto-save functionality
  useEffect(() => {
    if (readOnly) return;
    const saveData = async () => {
      setSaveStatus('saving');
      
      try {
        const { local: result, sync } = saveProject(config, allBars);
        
        if (result.success) {
          setSaveStatus('saved');
          setLastSaved(new Date());
          sync.then(out => { setSyncStatus(out.status); setSyncError(out.error ?? null); });
          
          // Reset to idle after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
          console.error('Save failed:', result.error);
        }
      } catch (error) {
        setSaveStatus('error');
        console.error('Save error:', error);
      }
    };

    // Debounce saves - only save after 1 second of no changes
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [config, allBars, readOnly]);

  const resolveWithCloud = async () => {
    const r = await takeCloudCopy(config.id);
    if (!r.success || !r.data) { setSyncError(r.error ?? 'Could not take the cloud copy'); return; }
    setConfig(r.data.config); setAllBars(r.data.bars);
    onConfigUpdate(r.data.config); onBarsUpdate(r.data.bars);
    setSyncStatus('synced'); setSyncError(null);
  };
  const resolveWithLocal = async () => {
    const out = await keepLocalCopy(config, allBars);
    setSyncStatus(out.status); setSyncError(out.error ?? null);
  };
  const share = async () => {
    const r = await createShareLink(config.id);
    if (!r.success || !r.data) { alert(r.error ?? 'Could not create a share link'); return; }
    try { await navigator.clipboard.writeText(r.data); } catch { /* clipboard may be blocked; the prompt below still shows the link */ }
    window.prompt('Read-only link (copied to clipboard):', r.data);
  };

  const handleConfigUpdate = (newConfig: Omit<ProjectConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const updatedConfig: ProjectConfig = {
      ...config,
      ...newConfig,
      updatedAt: new Date(),
    };
    
    setConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
    setSettingsOpen(false);
  };

  const handleProfileSwitch = (newConfig: ProjectConfig) => {
    setConfig(newConfig);
    onConfigUpdate(newConfig);
  };

  const handleBeamBarsChange = (bars: BarEntry[]) => {
    const newAllBars = [
      ...bars,
      ...columnBars,
      ...slabBars,
    ];
    setAllBars(newAllBars);
    onBarsUpdate(newAllBars);
  };

  const handleColumnBarsChange = (bars: BarEntry[]) => {
    const newAllBars = [
      ...beamBars,
      ...bars,
      ...slabBars,
    ];
    setAllBars(newAllBars);
    onBarsUpdate(newAllBars);
  };

  const handleSlabBarsChange = (bars: BarEntry[]) => {
    const newAllBars = [
      ...beamBars,
      ...columnBars,
      ...bars,
    ];
    setAllBars(newAllBars);
    onBarsUpdate(newAllBars);
  };

  const handleModeChange = (mode: 'MANUAL' | 'COMPONENT') => {
    const updatedConfig = { ...config, calculationMode: mode };
    setConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  const handleComponentsChange = (components: ConcreteComponent[]) => {
    const updatedConfig = { ...config, components };
    setConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  const handleMetadataChange = (metadata: BBSMetadata) => {
    const updatedConfig = { ...config, bbsMetadata: metadata };
    setConfig(updatedConfig);
    onConfigUpdate(updatedConfig);
  };

  const handleImportExcel = async (file: File) => {
    if (config.components?.length && !confirm('Replace the existing components with the ones in this workbook?')) return;
    try {
      const { metadata, components, doubts } = await parseBBSWorkbook(await file.arrayBuffer(), config.bbsMetadata);
      const withDoubts: BBSMetadata = { ...metadata, doubts: doubts.map(text => ({ text })) };
      const updatedConfig: ProjectConfig = {
        ...config,
        calculationMode: 'COMPONENT',
        bbsMetadata: withDoubts,
        components: recalculateComponents(components, withDoubts)
      };
      setConfig(updatedConfig);
      onConfigUpdate(updatedConfig);
    } catch (err) {
      alert(`Could not import workbook: ${err instanceof Error ? err.message : err}`);
    }
  };

  // Doubts live on bbsMetadata so a reload, a sync or a share link still shows them. A ruling is text a person typed.
  const doubts: ProjectDoubt[] = config.bbsMetadata?.doubts ?? [];
  const openDoubts = doubts.filter(d => !d.ruling);
  const ruleOnDoubt = (index: number) => {
    const ruling = window.prompt(`Ruling for:\n${doubts[index].text}`, doubts[index].ruling ?? '');
    if (ruling === null || !config.bbsMetadata) return;
    const next = doubts.map((d, i) => i === index ? { ...d, ruling: ruling.trim() || undefined } : d);
    handleMetadataChange({ ...config.bbsMetadata, doubts: next });
  };

  // Print mounts every bar row once, only for the print dialog, then unmounts (the table itself never mounts them all).
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const id = requestAnimationFrame(() => window.print());
    return () => { cancelAnimationFrame(id); window.removeEventListener('afterprint', done); };
  }, [printing]);

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />;
      case 'saved':
        return <div className="h-4 w-4 rounded-full bg-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Save className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSaveStatusText = () => {
    if (readOnly) return 'Read-only copy';
    const cloud = syncStatus === 'synced' ? ', synced' : syncStatus === 'conflict' ? ', not synced' : syncStatus === 'error' ? ', sync failed' : '';
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return (lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved') + cloud;
      case 'error':
        return 'Save failed';
      default:
        return (lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave on') + cloud;
    }
  };

  const currentProfile = config.codeProfileId 
    ? codeProfileService.getProfile(config.codeProfileId)
    : null;
  const isComponent = config.calculationMode === 'COMPONENT';
  const members = config.components ?? [];
  const barRows = members.reduce((n, c) => n + c.bars.length, 0);
  const totalKg = members.reduce((n, c) => n + c.bars.reduce((m, b) => m + (b.calculated?.totalWeight ?? 0), 0), 0);

  return (
    <div className="space-y-6">
      {/* Project Header: name, what is in it, one row of actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{config.name}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {isComponent
              ? `${members.length} members · ${barRows} bar rows · ${fmt(totalKg, 2)} kg` + (openDoubts.length ? ` · ${openDoubts.length} open ${openDoubts.length === 1 ? 'doubt' : 'doubts'}` : '')
              : `${config.codeStandard} Standard` + (currentProfile ? ` · ${currentProfile.name}` : '') + ` · ${allBars.length} bars`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
            {getSaveStatusIcon()}
            <span>{getSaveStatusText()}</span>
          </div>

          {!readOnly && (
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4" /> Import BBS Excel
                <input type="file" accept=".xlsx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImportExcel(f); e.target.value = ''; }} />
              </label>
            </Button>
          )}

          {isComponent ? (
            <>
              <Button variant="outline" disabled={!config.bbsMetadata} onClick={async () => {
                const buf = await exportBBSWorkbook(members, config.bbsMetadata!);
                ExcelExporter.downloadExcel(new Blob([buf]), `${config.bbsMetadata!.projectName || config.name} BBS.xlsx`);
              }}>
                <Download className="h-4 w-4" /> Export BBS Excel
              </Button>
              <Button variant="outline" disabled={!members.length || printing} onClick={() => setPrinting(true)} title="One page per member for the bar bender">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </>
          ) : (
            <>
              <ProfileSwitchDialog currentConfig={config} bars={allBars} onProfileSwitch={handleProfileSwitch}
                trigger={<Button variant="outline"><RefreshCw className="h-4 w-4" /> Switch Profile</Button>} />
              <ExportDialog project={config} bars={calculatedBars} summaries={summaries}
                trigger={<Button variant="outline"><Download className="h-4 w-4" /> Export</Button>} />
            </>
          )}

          {signedIn && !readOnly && (
            <Button variant="outline" onClick={share} title="Read-only link for the client or site">
              <Link2 className="h-4 w-4" /> Share
            </Button>
          )}

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Project settings"><Settings className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Project settings</DialogTitle>
              </DialogHeader>
              <ProjectSetupForm initialConfig={config} onSubmit={handleConfigUpdate} onCancel={() => setSettingsOpen(false)} submitLabel="Save" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {printing && config.bbsMetadata && <PrintSheet components={members} metadata={config.bbsMetadata} />}

      {readOnly && (
        <section role="status" className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
          Shared read-only copy. Edits here are not saved anywhere. Export to keep a file.
        </section>
      )}

      {syncStatus === 'conflict' && (
        <section role="alert" className="rounded-md border border-warning/60 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium text-warning-foreground">The cloud holds a newer copy of this project. Nothing has been overwritten.</p>
          <p className="mt-1 text-muted-foreground">Use cloud copy sets this browser's version aside in the history. Keep mine replaces the cloud copy and keeps the old one in the history.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={resolveWithCloud}>Use cloud copy</Button>
            <Button size="sm" variant="outline" onClick={resolveWithLocal}>Keep mine</Button>
          </div>
        </section>
      )}
      {syncError && syncStatus !== 'conflict' && (
        <p role="alert" className="text-sm text-destructive">Cloud sync: {syncError}. The project is saved in this browser.</p>
      )}

      {drift.length > 0 && (
        <section role="alert" className="rounded-md border border-warning/60 bg-warning/10 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-warning-foreground">
              Stored kg for {drift.length} {drift.length === 1 ? 'bar differs' : 'bars differ'} from the current formulas. The table shows the stored values until you recalculate.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                const updated = { ...config, components: recalculateComponents(config.components || [], config.bbsMetadata) };
                setConfig(updated); onConfigUpdate(updated); setDrift([]);
              }}>Recalculate</Button>
              <Button size="sm" variant="ghost" onClick={() => setDrift([])}>Keep stored</Button>
            </div>
          </div>
          <ol className="mt-2 max-h-40 list-decimal space-y-0.5 overflow-y-auto pl-5">
            {drift.map((d, i) => <li key={i}>{d}</li>)}
          </ol>
        </section>
      )}

      {doubts.length > 0 && (
        <section role="status" className="rounded-md border border-warning/60 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium text-warning-foreground">
            {openDoubts.length
              ? `${openDoubts.length} open ${openDoubts.length === 1 ? 'doubt' : 'doubts'}. Settle these before steel is cut; a ruling stays with the project.`
              : `All ${doubts.length} doubts ruled on.`}
          </p>
          <ol className="mt-2 max-h-64 list-decimal space-y-1 overflow-y-auto pl-5">
            {doubts.map((d, i) => (
              <li key={i} className={d.ruling ? 'text-muted-foreground' : ''}>
                {d.text}
                {d.ruling && <span className="ml-2 font-medium text-foreground">Ruling: {d.ruling}</span>}
                {!readOnly && (
                  <Button variant="link" size="sm" className="h-auto px-2 py-0" onClick={() => ruleOnDoubt(i)}>
                    {d.ruling ? 'Edit ruling' : 'Rule'}
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Methodology Toggle */}
      <MethodologyToggle 
        mode={config.calculationMode || 'MANUAL'} 
        onModeChange={handleModeChange} 
      />

      {config.calculationMode === 'COMPONENT' ? (
        <BBSSpreadsheetView 
          components={config.components || []}
          metadata={config.bbsMetadata}
          onComponentsChange={handleComponentsChange}
          onMetadataChange={handleMetadataChange}
        />
      ) : (
      /* Main Content Tabs (Manual Mode) */
      <Tabs defaultValue="bars" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bars">Bar Entry</TabsTrigger>
          <TabsTrigger value="summary">Summary & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="bars" className="mt-6">
          <MemberTypeTabs
            beamBars={beamBars}
            columnBars={columnBars}
            slabBars={slabBars}
            projectConfig={config}
            onBeamBarsChange={handleBeamBarsChange}
            onColumnBarsChange={handleColumnBarsChange}
            onSlabBarsChange={handleSlabBarsChange}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Summary & Reports</h2>
                <p className="text-muted-foreground">
                  Aggregated totals and export options
                </p>
              </div>
              
              <ExportDialog
                project={config}
                bars={calculatedBars}
                summaries={summaries}
                trigger={
                  <Button className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export to Excel
                  </Button>
                }
              />
            </div>

            {/* Summary Content */}
            <SummaryView bars={calculatedBars} />
          </div>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}