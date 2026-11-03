import { useState } from 'react';
import { ProjectSetupForm } from './ProjectSetupForm';
import { ProjectListView } from './ProjectListView';
import { loadFromLocalStorage } from '@/lib/local-storage';
import { saveProject } from '@/lib/project-repository';
import type { ProjectConfig, BarEntry } from '@/types';

type ViewMode = 'list' | 'create' | 'edit';

interface ProjectManagerProps {
  onProjectSelected?: (projectId: string, config: ProjectConfig, bars: BarEntry[]) => void;
  initialMode?: ViewMode; // "New project" from the dashboard lands straight on the form
}

export function ProjectManager({ onProjectSelected, initialMode = 'list' }: ProjectManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<ProjectConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateProjectId = () => {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateProject = () => {
    setViewMode('create');
    setEditingProjectId(null);
    setEditingConfig(null);
    setError(null);
  };

  const handleOpenProject = async (projectId: string) => {
    try {
      const result = loadFromLocalStorage(projectId);
      
      if (result.success && result.data) {
        if (onProjectSelected) {
          onProjectSelected(projectId, result.data.config, result.data.bars);
        }
      } else {
        setError(result.error || 'Failed to open project');
      }
    } catch {
      setError('An unexpected error occurred while opening the project');
    }
  };

  const handleFormSubmit = async (formData: Omit<ProjectConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date();
      let projectConfig: ProjectConfig;
      let existingBars: BarEntry[] = [];

      if (viewMode === 'edit' && editingProjectId && editingConfig) {
        // Update existing project
        projectConfig = {
          ...editingConfig,
          ...formData,
          updatedAt: now,
        };

        // Load existing bars
        const result = loadFromLocalStorage(editingProjectId);
        if (result.success && result.data) {
          existingBars = result.data.bars;
        }
      } else {
        // Create new project
        projectConfig = {
          id: generateProjectId(),
          ...formData,
          createdAt: now,
          updatedAt: now,
        };
      }

      const saveResult = saveProject(projectConfig, existingBars).local;
      
      if (saveResult.success) {
        setViewMode('list');
        setEditingProjectId(null);
        setEditingConfig(null);
        setError(null);
      } else {
        setError(saveResult.error || 'Failed to save project');
      }
    } catch {
      setError('An unexpected error occurred while saving the project');
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingProjectId(null);
    setEditingConfig(null);
    setError(null);
  };

  return (
    <div>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {viewMode === 'list' && (
        <ProjectListView
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="flex justify-center">
          <ProjectSetupForm
            initialConfig={editingConfig || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            submitLabel={viewMode === 'edit' ? 'Update Project' : 'Create Project'}
          />
        </div>
      )}
    </div>
  );
}