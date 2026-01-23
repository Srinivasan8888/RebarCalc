import { describe, it, expect } from 'vitest';
import { calculateBar } from '@/lib/calculator';
import { DEFAULT_PROJECT_CONFIG } from '@/lib/constants';
import type { BarEntry } from '@/types';

describe('BarEntryTable Calculations', () => {
  it('should calculate cut length and weights correctly for a straight bar', () => {
    const barEntry: BarEntry = {
      id: 'test-1',
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: { A: 3000 },
      spacing: 150,
      quantity: 10,
      remarks: 'Test bar'
    };

    const calculated = calculateBar(barEntry, DEFAULT_PROJECT_CONFIG);

    expect(calculated.cutLength).toBe(3000); // S1 = A
    expect(calculated.unitWeight).toBeCloseTo(2.67, 2); // (12²/162) × 3 = 2.67 kg
    expect(calculated.totalLength).toBe(30000); // 3000 × 10
    expect(calculated.totalWeight).toBeCloseTo(26.67, 2); // 2.67 × 10
  });

  it('should calculate cut length correctly for U-bar with bend deductions', () => {
    const barEntry: BarEntry = {
      id: 'test-2',
      memberType: 'BEAM',
      shapeCode: 'S2',
      diameter: 16,
      dimensions: { A: 2000, B: 300 },
      spacing: 200,
      quantity: 5,
    };

    const calculated = calculateBar(barEntry, DEFAULT_PROJECT_CONFIG);

    // S2 = A + 2×B - 2×(90° bend deduction)
    // = 2000 + 2×300 - 2×(2×16) = 2000 + 600 - 64 = 2536
    expect(calculated.cutLength).toBe(2536);
    expect(calculated.totalLength).toBe(12680); // 2536 × 5
  });

  it('should recalculate when project config changes', () => {
    const barEntry: BarEntry = {
      id: 'test-3',
      memberType: 'COLUMN',
      shapeCode: 'S5',
      diameter: 20,
      dimensions: { A: 1500, B: 400 },
      spacing: 0,
      quantity: 1,
    };

    // Calculate with default config (90° bend = 2×diameter)
    const calculated1 = calculateBar(barEntry, DEFAULT_PROJECT_CONFIG);
    const expectedCutLength1 = 1500 + 400 - (2 * 20); // 1900 - 40 = 1860
    expect(calculated1.cutLength).toBe(expectedCutLength1);

    // Calculate with modified config (90° bend = 3×diameter)
    const modifiedConfig = {
      ...DEFAULT_PROJECT_CONFIG,
      bendDeductions: {
        ...DEFAULT_PROJECT_CONFIG.bendDeductions,
        deg90: 3,
      }
    };

    const calculated2 = calculateBar(barEntry, modifiedConfig);
    const expectedCutLength2 = 1500 + 400 - (3 * 20); // 1900 - 60 = 1840
    expect(calculated2.cutLength).toBe(expectedCutLength2);
    expect(calculated2.cutLength).not.toBe(calculated1.cutLength);
  });
});
