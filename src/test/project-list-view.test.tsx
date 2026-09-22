import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProjectListView } from '../components/ProjectListView';
import { saveToLocalStorage } from '../lib/local-storage';
import type { ProjectConfig } from '../types';

beforeEach(() => localStorage.clear());

const config = (over: Partial<ProjectConfig>): ProjectConfig => ({
  id: 'p1', name: 'Tower A', codeStandard: 'IS', defaultCover: 25, defaultHookMultiplier: 9, bendDeductions: { deg45: 1, deg90: 2, deg135: 3 },
  calculationMode: 'COMPONENT', createdAt: new Date(), updatedAt: new Date(), ...over
} as ProjectConfig);

test('empty state teaches, then one row per project with steel total', async () => {
  const { unmount } = render(<ProjectListView onCreateProject={vi.fn()} onOpenProject={vi.fn()} />);
  await waitFor(() => expect(screen.getByText(/A project holds one BBS/)).toBeInTheDocument());
  unmount();

  saveToLocalStorage(config({
    components: [{ id: 'c', name: 'B1', componentType: 'BEAM', spanX: 1, spanY: 1, cover: 30, bars: [
      { id: 'b', barType: 'Stirrups - Full', direction: 'X', diameter: 8, spacing: 100, measurements: { a: 1 },
        calculated: { totalMeasurement: 0, noOfDeductions: 0, deductionAmount: 0, cuttingLength: 0, noOfBars: 0, totalLength: 0, unitWeight: 0, totalWeight: 1234.5 } }
    ] }]
  }), []);
  const onOpen = vi.fn();
  render(<ProjectListView onCreateProject={vi.fn()} onOpenProject={onOpen} />);
  const row = await screen.findByText('Tower A');
  expect(screen.getByText('1,234.50')).toBeInTheDocument();
  expect(screen.getByText('Component')).toBeInTheDocument();
  fireEvent.click(row);
  expect(onOpen).toHaveBeenCalledWith('p1');
});
