import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calculator, Settings } from 'lucide-react';
import type { ProjectConfig } from '@/types';

interface AppLayoutProps {
  children: ReactNode;
  currentProject?: {
    id: string;
    config: ProjectConfig;
  } | null;
  availableProjects?: Array<{
    id: string;
    name: string;
  }>;
  onBackToProjects?: () => void;
  onProjectChange?: (projectId: string) => void;
  onProjectSettings?: () => void;
}

export function AppLayout({
  children,
  currentProject,
  availableProjects = [],
  onBackToProjects,
  onProjectChange,
  onProjectSettings,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">RebarCalc</h1>
              </div>
              
              {currentProject && onBackToProjects && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToProjects}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Projects
                </Button>
              )}
            </div>

            {/* Center - Project selector (when in project view) */}
            {currentProject && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Project:</span>
                  {availableProjects.length > 1 && onProjectChange ? (
                    <Select
                      value={currentProject.id}
                      onValueChange={onProjectChange}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-medium">{currentProject.config.name}</span>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {currentProject.config.codeStandard} | 
                  Cover: {currentProject.config.defaultCover}mm
                </div>
              </div>
            )}

            {/* Right side - Project settings */}
            {currentProject && onProjectSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onProjectSettings}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}