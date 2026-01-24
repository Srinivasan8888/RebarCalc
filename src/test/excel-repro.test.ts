
import { describe, test, expect } from 'vitest';
import { calculateComponentBarEntry } from '../lib/component-calculator';
import type { ComponentBarEntry } from '../types/component-types';

describe('Excel BBS Compatibility Tests', () => {

  test('Bar Count Calculation (ROUNDUP logic)', () => {
    // Scenario: Span 3000, Cover 20 (both sides), Spacing 150
    // Excel Formula: ROUNDUP((3000 - 2*20)/150, 0) + 1
    // (3000 - 40)/150 = 2960/150 = 19.7333...
    // ROUNDUP(19.7333) = 20
    // Total = 20 + 1 = 21 bars.
    
    // Previous logic (Math.floor) would give: floor(19.73) + 1 = 19 + 1 = 20 (WRONG)
    
    const relevantSpan = 3000;
    const cover = 20;
    const spacing = 150;
    
    // Minimal mock bar entry
    const mockBar: ComponentBarEntry = {
      id: 'test',
      barType: 'Main Bar',
      direction: 'X',
      diameter: 8,
      spacing: spacing,
      measurements: { a: 1000 } // arbitrary length
    };

    const result = calculateComponentBarEntry(mockBar, relevantSpan, cover, false);
    
    expect(result.noOfBars).toBe(21);
  });

  test('Cut Length Rounding (CEILING 5mm)', () => {
    // Scenario: Calculated length is 1232mm
    // Excel Rule: CEILING(1232, 5) = 1235
    
    // We mock a bar where the raw calculation would result in a non-multiple of 5.
    // Let's use a simple straight bar (Shape Code 00 / Straight) if possible, 
    // or just manually verify the rounding function if exposed. 
    // Since we test calculateComponentBarEntry, we need to manipulate inputs to get a specific raw length.
    
    // Total Length = a + b + ... - Deduction
    
    const mockBar: ComponentBarEntry = {
      id: 'test-rounding',
      barType: 'Straight Bar', // Assuming this uses 'a' only
      direction: 'X',
      diameter: 8,
      spacing: 150,
      measurements: { a: 1232 } 
    };
    
    // Pass relevantSpan=0 to ignore bar count for this test
    const result = calculateComponentBarEntry(mockBar, 0, 0, false);
    
    // If logic is correct, 1232 -> 1235
    expect(result.cuttingLength).toBe(1235);
    
    // Test exact multiple
    const mockBarExact: ComponentBarEntry = {
        ...mockBar,
        measurements: { a: 1230 }
    };
    const resultExact = calculateComponentBarEntry(mockBarExact, 0, 0, false);
    expect(resultExact.cuttingLength).toBe(1230);
  });

  test('Bend Deduction (2D per 90 deg)', () => {
    // Scenario: Shape with 2 bends (e.g. U-shape or Crank)
    // Application uses manual deduction or auto-deduction based on shape.
    // Let's use the 'manualNoOfDeductions' if available or specific shape logic.
    // Based on previous analysis, calculateComponentBarEntry uses calculateBentUpBar or similar.
    // Or it uses the total length minus deduction.
    
    // Let's test standard deduction logic by checking deduction amount field 
    // if we can trigger it. 
    // If we use 'Bent Up Bar' or similar that implies bends.
    // Or better, inject manual deduction.
    
    const diameter = 10;
    // 2 bends of 90 degrees.
    // Deduction = 2 * (2 * Dia) = 4 * 10 = 40mm.
    
    const mockBar: ComponentBarEntry = {
        id: 'test-deduction',
        barType: 'Main Bar',
        direction: 'X',
        diameter: diameter,
        spacing: 150,
        measurements: { a: 1000 },
        manualNoOfDeductions: 2
    };

    const result = calculateComponentBarEntry(mockBar, 0, 0, false);
    
    // Deduction Amount should be 2 * 2 * 10 = 40
    expect(result.deductionAmount).toBe(40);
    
    // Check if cutting length reflects this deduction (assuming straight length was 1000)
    // 1000 - 40 = 960
    expect(result.cuttingLength).toBe(960);
  });

});
