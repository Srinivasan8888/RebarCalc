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
import { saveToLocalStorage } from '@/lib/local-storage';
import { Settings, Download, Save, AlertCircle, RefreshCw } from 'lucide-react';
import type { ProjectConfig, BarEntry, CalculatedBar } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';

interface ProjectDetailPageProps {
  projectId: string;
  initialConfig: ProjectConfig;
  initialBars: BarEntry[];
  onConfigUpdate: (config: ProjectConfig) => void;
  onBarsUpdate: (bars: BarEntry[]) => void;
}

export function ProjectDetailPage({
  initialConfig,
  initialBars,
  onConfigUpdate,
  onBarsUpdate,
}: ProjectDetailPageProps) {
  const [config, setConfig] = useState<ProjectConfig>(initialConfig);
  const [allBars, setAllBars] = useState<BarEntry[]>(initialBars);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
    const saveData = async () => {
      setSaveStatus('saving');
      
      try {
        const result = saveToLocalStorage(config, allBars);
        
        if (result.success) {
          setSaveStatus('saved');
          setLastSaved(new Date());
          
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
  }, [config, allBars]);

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
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return 'Auto-save enabled';
    }
  };

  const currentProfile = config.codeProfileId 
    ? codeProfileService.getProfile(config.codeProfileId)
    : null;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{config.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{config.codeStandard} Standard</span>
            {currentProfile && (
              <>
                <span>•</span>
                <span>{currentProfile.name}</span>
              </>
            )}
            <span>•</span>
            <span>{allBars.length} bars total</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getSaveStatusIcon()}
            <span>{getSaveStatusText()}</span>
          </div>

          {/* Profile Switch Button */}
          <ProfileSwitchDialog
            currentConfig={config}
            bars={allBars}
            onProfileSwitch={handleProfileSwitch}
            trigger={
              <Button variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Switch Profile
              </Button>
            }
          />

          {/* Export Button */}
          <ExportDialog
            project={config}
            bars={calculatedBars}
            summaries={summaries}
            trigger={
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            }
          />

          {/* Settings Button */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Project Settings</DialogTitle>
              </DialogHeader>
              <ProjectSetupForm
                initialConfig={config}
                onSubmit={handleConfigUpdate}
                onCancel={() => setSettingsOpen(false)}
                submitLabel="Update Settings"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Tabs */}
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
    </div>
  );
}