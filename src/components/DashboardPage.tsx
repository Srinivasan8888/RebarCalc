import { useState } from 'react';
import { ProjectListView } from './ProjectListView';
import { loadFromLocalStorage } from '@/lib/local-storage';
import type { ProjectConfig, BarEntry } from '@/types';

interface DashboardPageProps {
  onCreateProject: () => void;
  onOpenProject: (projectId: string, config: ProjectConfig, bars: BarEntry[]) => void;
}

// The first screen is the project list; nothing summarises it from above.
export function DashboardPage({ onCreateProject, onOpenProject }: DashboardPageProps) {
  const [error, setError] = useState<string | null>(null);

  const open = (projectId: string) => {
    const result = loadFromLocalStorage(projectId);
    if (result.success && result.data) onOpenProject(projectId, result.data.config, result.data.bars);
    else setError(result.error || `Could not open project ${projectId}`);
  };

  return (
    <>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <ProjectListView onCreateProject={onCreateProject} onOpenProject={open} />
    </>
  );
}
