import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProjectList, deleteFromLocalStorage, type ProjectListItem } from '@/lib/local-storage';
import { PlusIcon, EditIcon, TrashIcon, FolderIcon } from 'lucide-react';

interface ProjectListViewProps {
  onCreateProject: () => void;
  onEditProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
}

export function ProjectListView({ onCreateProject, onEditProject, onOpenProject }: ProjectListViewProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = getProjectList();
      
      if (result.success) {
        setProjects(result.data || []);
      } else {
        setError(result.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('An unexpected error occurred while loading projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDeleteProject = async (project: ProjectListItem) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      const result = deleteFromLocalStorage(projectToDelete.id);
      
      if (result.success) {
        // Reload projects list
        await loadProjects();
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
      } else {
        setError(result.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting the project');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadProjects} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your Bar Bending Schedule projects
          </p>
        </div>
        <Button onClick={onCreateProject} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first Bar Bending Schedule project to get started
              </p>
              <Button onClick={onCreateProject} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium truncate">
                        {project.name}
                      </h3>
                      {/* Note: We don't have codeStandard in ProjectListItem, so we'll skip this for now */}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last modified: {formatDate(project.lastModified)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenProject(project.id)}
                      className="flex items-center gap-2"
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditProject(project.id)}
                      className="flex items-center gap-2"
                    >
                      <EditIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProject(project)}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}