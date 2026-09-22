import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BBSSpreadsheetView } from '../components/BBSSpreadsheetView';
import { calculateBarMeasurementsAuto, calculateBarsPerMember } from '../lib/enhanced-calculator';
import { calculateComponentBarEntry } from '../lib/component-calculator';
import { DEVELOPMENT_LENGTH_TABLES } from '../lib/constants';
import type { ConcreteComponent, ComponentBarEntry } from '../types/component-types';

const settings = { developmentLengths: DEVELOPMENT_LENGTH_TABLES.M30, standardBarLength: 12000 };

test('table shows the Excel row 15 numbers from bar.calculated', () => {
  const slab: ConcreteComponent = {
    id: 'A1', name: 'A1', componentType: 'SLAB', spanX: 3160, spanY: 1350, depth: 125, cover: 30,
    beamWidths: { left: 160, right: 160, top: 160, bottom: 160 },
    topExtensions: { left: 425, right: 425, top: 250, bottom: 250 }, bars: []
  };
  const bar: ComponentBarEntry = {
    id: 'b', barType: 'Bottom Bar (X-X)', direction: 'X', diameter: 8, spacing: 275, barsPerMember: 1,
    measurements: calculateBarMeasurementsAuto('Bottom Bar (X-X)', 'X', slab, 8)
  };
  bar.calculated = calculateComponentBarEntry(bar, calculateBarsPerMember(bar.barType, 'X', slab, 275), settings);

  render(
    <BBSSpreadsheetView
      components={[{ ...slab, bars: [bar] }]}
      metadata={{ projectName: '', drawingNumber: '', itemDescription: '', concreteGrade: 'M30', steelGrade: 'Fe500' }}
      onComponentsChange={vi.fn()}
      onMetadataChange={vi.fn()}
    />
  );

  expect(screen.getByText('4596')).toBeInTheDocument();   // T15
  expect(screen.getByText('22.980')).toBeInTheDocument(); // U15
  expect(screen.getByText('4660')).toBeInTheDocument();    // Q15
});

test('369 imported beams render as summary rows: only the expanded one has bar rows', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseBBSWorkbook } = await import('../lib/excel-importer');
  const { recalculateComponents } = await import('../lib/component-calculator');
  const buf = readFileSync('data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx');
  // jsdom realm: a sliced ArrayBuffer fails jszip's instanceof check; the Node Buffer is detected by Buffer.isBuffer
  const { metadata, components } = await parseBBSWorkbook(buf as unknown as ArrayBuffer);
  const calc = recalculateComponents(components, metadata);

  const t0 = performance.now();
  const { container } = render(
    <BBSSpreadsheetView components={calc} metadata={metadata} onComponentsChange={vi.fn()} onMetadataChange={vi.fn()} />
  );
  const ms = performance.now() - t0;
  const nodes = container.querySelectorAll('*').length;
  const bbs = container.querySelector('table')!; // first table is the BBS; the totals block is its own table
  expect(bbs.querySelectorAll('tbody tr')).toHaveLength(369);  // one summary row per beam, no bar rows
  expect(nodes).toBeLessThan(369 * 20);                               // ponytail: was ~40k nodes with every bar row mounted
  expect(ms).toBeLessThan(5000);

  fireEvent.click(screen.getByText('B4'));
  expect(screen.getAllByText('Span_Top - Layer 1', { selector: 'option' }).length).toBeGreaterThan(0); // B4's rows now mounted
  expect(bbs.querySelectorAll('tbody tr').length).toBeLessThan(369 + 12);
});
