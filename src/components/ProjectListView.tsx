import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProjectList, loadFromLocalStorage, deleteFromLocalStorage, type ProjectListItem } from '@/lib/local-storage';
import { calculateAll } from '@/lib/calculator';
import { Plus, Trash2 } from 'lucide-react';

interface ProjectListViewProps {
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
}

interface ProjectRow extends ProjectListItem {
  mode: 'Manual' | 'Component';
  members: number;
  bars: number;
  weightKg: number;
}

// Reads every project once; the totals are the same numbers the project page shows.
// ponytail: O(projects) localStorage reads on load, fine until someone has hundreds of projects
function loadRows(): ProjectRow[] {
  const list = getProjectList().data ?? [];
  return list
    .map(item => {
      const loaded = loadFromLocalStorage(item.id).data;
      if (!loaded) return { ...item, mode: 'Manual' as const, members: 0, bars: 0, weightKg: 0 };
      const { config, bars } = loaded;
      if (config.calculationMode === 'COMPONENT') {
        const components = config.components ?? [];
        return {
          ...item, mode: 'Component' as const,
          members: components.length,
          bars: components.reduce((n, c) => n + c.bars.length, 0),
          weightKg: components.reduce((kg, c) => kg + c.bars.reduce((s, b) => s + (b.calculated?.totalWeight ?? 0), 0), 0)
        };
      }
      return {
        ...item, mode: 'Manual' as const,
        members: new Set(bars.map(b => b.memberType)).size,
        bars: bars.length,
        weightKg: calculateAll(bars, config).reduce((kg, b) => kg + b.totalWeight, 0)
      };
    })
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function ProjectListView({ onCreateProject, onOpenProject }: ProjectListViewProps) {
  // localStorage is synchronous, so the list is ready on first render; no loading state exists to skeleton.
  const [rows, setRows] = useState<ProjectRow[]>(loadRows);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRow | null>(null);

  const load = () => {
    try { setRows(loadRows()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not read saved projects'); setRows([]); }
  };

  const confirmDelete = () => {
    if (!projectToDelete) return;
    const result = deleteFromLocalStorage(projectToDelete.id);
    if (!result.success) setError(result.error || 'Could not delete project');
    setProjectToDelete(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button onClick={onCreateProject} className="h-11">
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground max-w-md mx-auto space-y-4">
          <p>A project holds one BBS: its members, bar rows and dia-wise steel. Add members by hand, or open the project and import a BBS workbook or a beam schedule.</p>
          <Button onClick={onCreateProject} className="h-11">
            <Plus className="h-4 w-4" /> New project
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead>Project</TableHead>
              <TableHead className="w-28">Mode</TableHead>
              <TableHead className="w-24 text-right">Members</TableHead>
              <TableHead className="w-20 text-right">Bars</TableHead>
              <TableHead className="w-32 text-right">Steel (kg)</TableHead>
              <TableHead className="w-32">Modified</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(p => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    tabIndex={0}
                    onClick={() => onOpenProject(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter') onOpenProject(p.id); }}
                  >
                    <TableCell className="h-12 font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.mode}</TableCell>
                    <TableCell className="num">{p.members}</TableCell>
                    <TableCell className="num">{p.bars}</TableCell>
                    <TableCell className="num">{p.weightKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.lastModified)}</TableCell>
                    <TableCell className="p-0 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${p.name}`}
                        onClick={e => { e.stopPropagation(); setProjectToDelete(p); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={projectToDelete !== null} onOpenChange={open => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {projectToDelete?.name}?</DialogTitle>
            <DialogDescription>
              {projectToDelete?.bars ?? 0} bar rows and {projectToDelete?.weightKg.toFixed(2)} kg of steel go with it. There is no undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setProjectToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="h-11" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
