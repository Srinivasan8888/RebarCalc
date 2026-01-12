import { useState } from 'react';
import { ProjectSetupForm } from './ProjectSetupForm';
import { ProjectListView } from './ProjectListView';
import { saveToLocalStorage, loadFromLocalStorage } from '@/lib/local-storage';
import type { ProjectConfig, BarEntry } from '@/types';

type ViewMode = 'list' | 'create' | 'edit';

interface ProjectManagerProps {
  onProjectSelected?: (projectId: string, config: ProjectConfig, bars: BarEntry[]) => void;
}

export function ProjectManager({ onProjectSelected }: ProjectManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
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

  const handleEditProject = async (projectId: string) => {
    try {
      const result = loadFromLocalStorage(projectId);
      
      if (result.success && result.data) {
        setEditingProjectId(projectId);
        setEditingConfig(result.data.config);
        setViewMode('edit');
        setError(null);
      } else {
        setError(result.error || 'Failed to load project for editing');
      }
    } catch (err) {
      setError('An unexpected error occurred while loading the project');
    }
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
    } catch (err) {
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

      const saveResult = saveToLocalStorage(projectConfig, existingBars);
      
      if (saveResult.success) {
        setViewMode('list');
        setEditingProjectId(null);
        setEditingConfig(null);
        setError(null);
      } else {
        setError(saveResult.error || 'Failed to save project');
      }
    } catch (err) {
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
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {viewMode === 'list' && (
        <ProjectListView
          onCreateProject={handleCreateProject}
          onEditProject={handleEditProject}
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