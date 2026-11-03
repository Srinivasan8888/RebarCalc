import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintSheet } from '@/components/PrintSheet';
import { recalculateComponents } from '@/lib/component-calculator';
import type { ConcreteComponent, BBSMetadata } from '@/types/component-types';

// The sample slab's A1 panel (data/Sample Slab BBS.xlsx rows 15–18): the sheet the bar bender gets must show the same cut lengths.
const metadata: BBSMetadata = { projectName: 'Provident White Oaks', drawingNumber: 'ST-B-220', itemDescription: '20th floor slab', concreteGrade: 'M30', steelGrade: 'Fe550' };
const a1: ConcreteComponent = {
  id: 'a1', name: 'A1', description: '(B1 - BK)', componentType: 'SLAB', spanX: 3160, spanY: 1350, depth: 125, cover: 30,
  beamWidths: { left: 160, right: 160, top: 160, bottom: 160 }, topExtensions: { left: 850, right: 850, top: 500, bottom: 500 },
  bars: [{ id: 'b1', barType: 'Bottom Bar (X-X)', direction: 'X', diameter: 8, spacing: 275, measurements: { a: 3160, b: 260, c: 260, d: 65, e: 65 } }],
};

describe('PrintSheet', () => {
  it('prints one section per member with the table\'s cut length and the dia-wise total', () => {
    const components = recalculateComponents([a1], metadata);
    const cut = components[0].bars[0].calculated!.cuttingLength;
    const { container } = render(<PrintSheet components={components} metadata={metadata} />);
    expect(container.querySelectorAll('section')).toHaveLength(2); // A1 + Total steel
    expect(screen.getByText(String(cut))).toBeTruthy();
    expect(screen.getByText('Bottom Bar (X-X)')).toBeTruthy();
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getAllByText('T8').length).toBeGreaterThanOrEqual(2); // member row and the dia-wise total
    expect(container.querySelector('.print-sheet')).toBeTruthy();
  });
});
