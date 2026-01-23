import { useState } from 'react'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './components/DashboardPage'
import { ProjectDetailPage } from './components/ProjectDetailPage'
import { ProjectManager } from './components/ProjectManager'
import { getProjectList } from './lib/local-storage'
import type { ProjectConfig, BarEntry } from './types'
import './App.css'

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
  } | null>(null);

  const handleProjectSelected = (projectId: string, config: ProjectConfig, bars: BarEntry[]) => {
    setCurrentProject({ id: projectId, config, bars });
    setCurrentView('project-detail');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
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
          <DashboardPage
            onCreateProject={handleCreateProject}
            onOpenProject={handleProjectSelected}
          />
        );
      
      case 'projects':
        return (
          <ProjectManager onProjectSelected={handleProjectSelected} />
        );
      
      case 'project-detail':
        if (!currentProject) {
          setCurrentView('dashboard');
          return null;
        }
        return (
          <ProjectDetailPage
            projectId={currentProject.id}
            initialConfig={currentProject.config}
            initialBars={currentProject.bars}
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
    >
      {renderContent()}
    </AppLayout>
  )
}

export default App
