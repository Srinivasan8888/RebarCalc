
import { describe, test, expect } from 'vitest';
import { calculateComponentBarEntry } from '../lib/component-calculator';
import type { ComponentBarEntry } from '../types/component-types';

describe('Excel BBS Compatibility Tests', () => {

  test('Bar Count Calculation (ROUNDUP logic)', () => {
    // Scenario: Span 3000, Spacing 150
    // Excel Formula: ROUNDUP(Span/Spacing, 0)
    // 3000/150 = 20
    // ROUNDUP(20) = 20 bars
    
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

    const result = calculateComponentBarEntry(mockBar, relevantSpan, cover, {
      developmentLengths: { 8: 400 },
      standardBarLength: 12000
    }, false);
    
    // Excel uses ROUNDUP(Span/Spacing, 0) which gives 20
    expect(result.noOfBars).toBe(20);
  });

  test('Cut Length Rounding (CEILING 5mm)', () => {
    // Test with a bar type that uses CEILING formula
    // "Bottom Bar (Y-Y)" uses CEILING(a+b+c+d+e+deduction, 5)
    
    const mockBar: ComponentBarEntry = {
      id: 'test-rounding',
      barType: 'Bottom Bar (Y-Y)', // This uses CEILING formula
      direction: 'Y',
      diameter: 8,
      spacing: 150,
      measurements: { 
        a: 1000,
        b: 100,
        c: 100,
        d: 0,
        e: 0
      },
      manualNoOfDeductions: 4 // 4 bends * 2 * 8 = 64
    };
    
    // CEILING(1000+100+100+0+0+64, 5) = CEILING(1264, 5) = 1265
    const result = calculateComponentBarEntry(mockBar, 0, 0, {
      developmentLengths: { 8: 400 },
      standardBarLength: 12000
    }, false);
    
    expect(result.cuttingLength).toBe(1265);
    
    // Test with "Bottom & Top Bar (X-X)" which uses STANDARD formula
    const mockBarStandard: ComponentBarEntry = {
      id: 'test-standard',
      barType: 'Bottom & Top Bar (X-X)',
      direction: 'X',
      diameter: 8,
      spacing: 150,
      measurements: { a: 1232 },
      manualNoOfDeductions: 2 // 2 * 2 * 8 = 32
    };
    
    // Standard: 1232 - 32 = 1200
    const resultStandard = calculateComponentBarEntry(mockBarStandard, 0, 0, {
      developmentLengths: { 8: 400 },
      standardBarLength: 12000
    }, false);
    
    expect(resultStandard.cuttingLength).toBe(1200);
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

    const result = calculateComponentBarEntry(mockBar, 0, 0, {
      developmentLengths: { 10: 500 },
      standardBarLength: 12000
    }, false);
    
    // Deduction Amount should be 2 * 2 * 10 = 40
    expect(result.deductionAmount).toBe(40);
    
    // Check if cutting length reflects this deduction (assuming straight length was 1000)
    // 1000 - 40 = 960
    expect(result.cuttingLength).toBe(960);
  });

});
