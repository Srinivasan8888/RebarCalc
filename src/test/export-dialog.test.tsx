import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportDialog } from '@/components/ExportDialog';
import type { ProjectConfig, CalculatedBar } from '@/types';
import { ExcelExporter } from '@/lib/excel-exporter';

// Mock the ExcelExporter
vi.mock('@/lib/excel-exporter', () => ({
  ExcelExporter: {
    exportBBS: vi.fn(),
    exportAbstract: vi.fn(),
    downloadExcel: vi.fn(),
  },
}));

const mockProject: ProjectConfig = {
  id: 'test-project',
  name: 'Test Project',
  codeStandard: 'IS',
  defaultCover: 25,
  defaultHookMultiplier: 9,
  bendDeductions: {
    deg45: 1,
    deg90: 2,
    deg135: 3,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBars: CalculatedBar[] = [
  {
    id: 'bar-1',
    memberType: 'BEAM',
    shapeCode: 'S1',
    diameter: 12,
    dimensions: { A: 3000 },
    spacing: 150,
    quantity: 10,
    cutLength: 3000,
    unitWeight: 0.888,
    totalLength: 30000,
    totalWeight: 26.64,
  },
];

const mockSummaries = {
  diameter: [
    {
      diameter: 12,
      totalLength: 30,
      totalWeight: 26.64,
      barCount: 10,
    },
  ],
  shape: [
    {
      shapeCode: 'S1' as const,
      shapeName: 'Straight',
      totalLength: 30,
      totalWeight: 26.64,
      barCount: 10,
    },
  ],
  member: [
    {
      memberType: 'BEAM' as const,
      totalLength: 30,
      totalWeight: 26.64,
      barCount: 10,
    },
  ],
};

describe('ExportDialog', () => {
  it('renders export dialog with default trigger', () => {
    render(
      <ExportDialog
        project={mockProject}
        bars={mockBars}
        summaries={mockSummaries}
      />
    );

    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    render(
      <ExportDialog
        project={mockProject}
        bars={mockBars}
        summaries={mockSummaries}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });
  });

  it('shows project name in dialog description', async () => {
    render(
      <ExportDialog
        project={mockProject}
        bars={mockBars}
        summaries={mockSummaries}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(screen.getByText(/Test Project/)).toBeInTheDocument();
    });
  });

  it('shows data summary information', async () => {
    render(
      <ExportDialog
        project={mockProject}
        bars={mockBars}
        summaries={mockSummaries}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(screen.getByText('• 1 bar entries')).toBeInTheDocument();
      expect(screen.getByText('• 1 different diameters')).toBeInTheDocument();
      expect(screen.getByText('• 1 different shapes')).toBeInTheDocument();
      expect(screen.getByText('• 1 member types')).toBeInTheDocument();
    });
  });

  it('shows warning when no bars are available', async () => {
    render(
      <ExportDialog
        project={mockProject}
        bars={[]}
        summaries={{ diameter: [], shape: [], member: [] }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(screen.getByText(/No bar entries found/)).toBeInTheDocument();
    });
  });

  it('calls ExcelExporter.exportBBS when BBS export is selected', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    vi.mocked(ExcelExporter.exportBBS).mockResolvedValue(mockBlob);

    render(
      <ExportDialog
        project={mockProject}
        bars={mockBars}
        summaries={mockSummaries}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(screen.getByText('Export to Excel')).toBeInTheDocument();
    });

    // BBS should be selected by default
    const exportButton = screen.getByRole('button', { name: /Export BBS/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(ExcelExporter.exportBBS).toHaveBeenCalledWith(mockProject, mockBars);
    });
  });
});