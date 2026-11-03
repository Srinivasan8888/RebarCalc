import { useEffect, useState } from 'react'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './components/DashboardPage'
import { ProjectDetailPage } from './components/ProjectDetailPage'
import { ProjectManager } from './components/ProjectManager'
import { getProjectList, loadFromLocalStorage } from './lib/local-storage'
import { useSession } from './lib/supabase'
import { syncAll, loadSharedProject, type SyncReport } from './lib/project-repository'
import type { ProjectConfig, BarEntry } from './types'

type AppView = 'dashboard' | 'projects' | 'project-detail';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  // Initialize System Theme
  useState(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    // Apply initially
    applyTheme(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  });

  const [currentProject, setCurrentProject] = useState<{
    id: string;
    config: ProjectConfig;
    bars: BarEntry[];
    readOnly?: boolean;
  } | null>(null);

  // Cloud: after sign-in pull newer copies down and push unsynced ones up, then re-read the list.
  const session = useSession();
  const [syncTick, setSyncTick] = useState(0);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    syncAll().then((r: SyncReport) => {
      setSyncTick(t => t + 1);
      const parts = [r.pulled.length && `${r.pulled.length} pulled`, r.pushed.length && `${r.pushed.length} pushed`,
        r.conflicts.length && `${r.conflicts.length} in conflict (open the project to resolve)`, ...r.errors].filter(Boolean);
      setSyncNote(parts.length ? `Sync: ${parts.join(', ')}` : null);
    });
  }, [userId]);

  // ?share=<token> opens a read-only copy that is never written to this browser.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('share');
    if (!token) return;
    loadSharedProject(token).then(r => {
      if (r.success && r.data) { setCurrentProject({ id: r.data.config.id, ...r.data, readOnly: true }); setCurrentView('project-detail'); }
      else setSyncNote(r.error ?? 'Could not open the shared project');
    });
  }, []);

  const handleProjectSelected = (projectId: string, config: ProjectConfig, bars: BarEntry[]) => {
    setCurrentProject({ id: projectId, config, bars });
    setCurrentView('project-detail');
  };

  const handleBackToProjects = () => {
    setCurrentView('dashboard'); // the dashboard is the project list
    setCurrentProject(null);
  };

  const handleCreateProject = () => {
    setCurrentView('projects');
  };

  const handleConfigUpdate = (config: ProjectConfig) => {
    if (currentProject) {
      setCurrentProject({
        ...currentProject,
        config,
      });
    }
  };

  const handleBarsUpdate = (bars: BarEntry[]) => {
    if (currentProject) {
      setCurrentProject({
        ...currentProject,
        bars,
      });
    }
  };

  // Get available projects for header selector
  const availableProjects = (() => {
    const result = getProjectList();
    return result.success ? (result.data || []).map(p => ({ id: p.id, name: p.name })) : [];
  })();

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            {syncNote && <p className="mb-4 text-sm text-muted-foreground" role="status">{syncNote}</p>}
            <DashboardPage
              key={syncTick}
              onCreateProject={handleCreateProject}
              onOpenProject={handleProjectSelected}
            />
          </>
        );
      
      case 'projects':
        return (
          <ProjectManager onProjectSelected={handleProjectSelected} initialMode="create" />
        );
      
      case 'project-detail':
        if (!currentProject) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <ProjectDetailPage
            key={currentProject.id}
            projectId={currentProject.id}
            initialConfig={currentProject.config}
            initialBars={currentProject.bars}
            readOnly={currentProject.readOnly}
            signedIn={!!session}
            onConfigUpdate={handleConfigUpdate}
            onBarsUpdate={handleBarsUpdate}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <AppLayout
      currentProject={currentProject}
      availableProjects={availableProjects}
      onBackToProjects={currentView === 'project-detail' ? handleBackToProjects : undefined}
      onProjectChange={id => { const r = loadFromLocalStorage(id); if (r.success && r.data) handleProjectSelected(id, r.data.config, r.data.bars); }}
    >
      {renderContent()}
    </AppLayout>
  )
}

export default App
