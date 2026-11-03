import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import type { ProjectConfig } from '@/types';
import { AccountMenu } from './AccountMenu';

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

// Same mark as public/favicon.svg
const Mark = () => (
  <svg viewBox="0 0 32 32" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 10h20" />
    <path d="M6 22h14a4 4 0 0 0 0-8" />
  </svg>
);

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
      <header className="h-14 border-b bg-card">
        <div className="flex h-full items-center justify-between px-6">
          <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            <span className="flex items-center gap-2 pr-3 text-[15px] font-semibold text-primary">
              <Mark />
              <span className="text-foreground">RebarCalc</span>
            </span>
            {currentProject && (
              <>
                {onBackToProjects ? (
                  <button
                    type="button"
                    onClick={onBackToProjects}
                    className="-my-3 rounded-md px-2 py-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    Projects
                  </button>
                ) : (
                  <span className="px-2 text-muted-foreground">Projects</span>
                )}
                <span className="text-muted-foreground" aria-hidden="true">/</span>
                <span className="px-2 font-medium" aria-current="page">{currentProject.config.name}</span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
          <AccountMenu />
          {currentProject && (
            <div className="flex items-center gap-2">
              {availableProjects.length > 1 && onProjectChange && (
                <Select value={currentProject.id} onValueChange={onProjectChange}>
                  <SelectTrigger className="w-[200px]" aria-label="Switch project">
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
              )}
              {onProjectSettings && (
                <Button variant="ghost" size="icon" onClick={onProjectSettings} aria-label="Project settings">
                  <Settings />
                </Button>
              )}
            </div>
          )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-none px-6 py-5">
        {children}
      </main>
    </div>
  );
}
