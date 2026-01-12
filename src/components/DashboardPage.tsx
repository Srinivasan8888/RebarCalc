import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectList, loadFromLocalStorage, type ProjectListItem } from '@/lib/local-storage';
import { PlusIcon, FolderIcon, BarChart3, Calculator, Clock } from 'lucide-react';
import type { ProjectConfig, BarEntry } from '@/types';

interface DashboardPageProps {
  onCreateProject: () => void;
  onOpenProject: (projectId: string, config: ProjectConfig, bars: BarEntry[]) => void;
}

interface ProjectStats {
  totalProjects: number;
  totalBars: number;
  recentProjects: Array<ProjectListItem & { barCount: number }>;
}

export function DashboardPage({ onCreateProject, onOpenProject }: DashboardPageProps) {
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    totalBars: 0,
    recentProjects: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const projectListResult = getProjectList();
      
      if (!projectListResult.success) {
        setError(projectListResult.error || 'Failed to load projects');
        return;
      }

      const projects = projectListResult.data || [];
      let totalBars = 0;
      const recentProjectsWithBars: Array<ProjectListItem & { barCount: number }> = [];

      // Load bar counts for each project
      for (const project of projects) {
        const projectData = loadFromLocalStorage(project.id);
        const barCount = projectData.success && projectData.data ? projectData.data.bars.length : 0;
        totalBars += barCount;
        
        recentProjectsWithBars.push({
          ...project,
          barCount,
        });
      }

      // Sort by last modified (most recent first) and take top 5
      const sortedProjects = recentProjectsWithBars
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
        .slice(0, 5);

      setStats({
        totalProjects: projects.length,
        totalBars,
        recentProjects: sortedProjects,
      });
    } catch (err) {
      setError('An unexpected error occurred while loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOpenProject = async (projectId: string) => {
    try {
      const result = loadFromLocalStorage(projectId);
      
      if (result.success && result.data) {
        onOpenProject(projectId, result.data.config, result.data.bars);
      } else {
        setError(result.error || 'Failed to open project');
      }
    } catch (err) {
      setError('An unexpected error occurred while opening the project');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
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
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            <Button onClick={loadDashboardData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to RebarCalc</h1>
        <p className="text-muted-foreground text-lg">
          Professional Bar Bending Schedule Calculator for Structural Engineers
        </p>
      </div>

      {/* Quick Create Button */}
      <div className="flex justify-center">
        <Button 
          onClick={onCreateProject} 
          size="lg"
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create New Project
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects === 0 ? 'No projects yet' : 'Active projects'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bars</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBars}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bars/Project</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalProjects > 0 ? Math.round(stats.totalBars / stats.totalProjects) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Average complexity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentProjects.length === 0 ? (
            <div className="text-center py-8">
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
          ) : (
            <div className="space-y-3">
              {stats.recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOpenProject(project.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{project.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {project.barCount} bars • Modified {formatDate(project.lastModified)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </div>
              ))}
              
              {stats.totalProjects > 5 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {stats.recentProjects.length} of {stats.totalProjects} projects
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}