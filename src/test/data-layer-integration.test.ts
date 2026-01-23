import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateAll } from '../lib/calculator';
import { summarizeByDiameter, summarizeByShape, summarizeByMember } from '../lib/calculator';
import { serializeProject, deserializeProject } from '../lib/json-serializer';
import { exportProjectAsJSON, importProjectFromJSON } from '../lib/local-storage';
import { ExcelExporter } from '../lib/excel-exporter';
import type { ProjectConfig, BarEntry } from '../types';

// Mock localStorage for this test
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Data Layer Integration', () => {
  const mockConfig: ProjectConfig = {
    id: 'integration-test',
    name: 'Data Layer Integration Test',
    codeStandard: 'IS',
    defaultCover: 25,
    defaultHookMultiplier: 9,
    bendDeductions: {
      deg45: 1,
      deg90: 2,
      deg135: 3
    },
    calculationMode: 'COMPONENT', createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-02T15:30:00Z')
  };

  const mockBars: BarEntry[] = [
    {
      id: 'bar-1',
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: { A: 1000 },
      spacing: 150,
      quantity: 10,
      remarks: 'Main bars'
    },
    {
      id: 'bar-2',
      memberType: 'COLUMN',
      shapeCode: 'S2',
      diameter: 16,
      dimensions: { A: 800, B: 200 },
      spacing: 0,
      quantity: 4,
      remarks: 'Column bars'
    },
    {
      id: 'bar-3',
      memberType: 'SLAB',
      shapeCode: 'S3',
      diameter: 10,
      dimensions: { A: 300, B: 400 },
      spacing: 200,
      quantity: 20,
      remarks: 'Slab stirrups'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete data processing workflow', async () => {
    // Step 1: Calculate bars
    const calculatedBars = calculateAll(mockBars, mockConfig);
    expect(calculatedBars).toHaveLength(3);
    expect(calculatedBars[0].cutLength).toBeGreaterThan(0);
    expect(calculatedBars[0].totalWeight).toBeGreaterThan(0);

    // Step 2: Generate summaries
    const diameterSummary = summarizeByDiameter(calculatedBars);
    const shapeSummary = summarizeByShape(calculatedBars);
    const memberSummary = summarizeByMember(calculatedBars);

    expect(diameterSummary).toHaveLength(3); // 10mm, 12mm, 16mm
    expect(shapeSummary).toHaveLength(3); // S1, S2, S3
    expect(memberSummary).toHaveLength(3); // BEAM, COLUMN, SLAB

    // Step 3: Test JSON serialization round-trip
    const serialized = serializeProject(mockConfig, mockBars);
    const { config: deserializedConfig, bars: deserializedBars } = deserializeProject(serialized);

    expect(deserializedConfig.name).toBe(mockConfig.name);
    expect(deserializedBars).toHaveLength(mockBars.length);
    expect(deserializedBars[0].memberType).toBe('BEAM');

    // Step 4: Test JSON export/import
    const exportResult = exportProjectAsJSON(mockConfig, mockBars);
    expect(exportResult.success).toBe(true);

    const importResult = importProjectFromJSON(exportResult.data!);
    expect(importResult.success).toBe(true);
    expect(importResult.data?.config.name).toBe(mockConfig.name);
    expect(importResult.data?.bars).toHaveLength(mockBars.length);

    // Step 5: Test Excel export
    const bbsBlob = await ExcelExporter.exportBBS(mockConfig, calculatedBars);
    expect(bbsBlob).toBeInstanceOf(Blob);
    expect(bbsBlob.size).toBeGreaterThan(1000);

    const abstractBlob = await ExcelExporter.exportAbstract(mockConfig, {
      diameter: diameterSummary,
      shape: shapeSummary,
      member: memberSummary
    });
    expect(abstractBlob).toBeInstanceOf(Blob);
    expect(abstractBlob.size).toBeGreaterThan(1000);
  });

  it('should maintain data integrity through complete workflow', async () => {
    // Calculate original data
    const originalCalculated = calculateAll(mockBars, mockConfig);
    const originalTotalWeight = originalCalculated.reduce((sum, bar) => sum + bar.totalWeight, 0);

    // Export and import
    const exportResult = exportProjectAsJSON(mockConfig, mockBars);
    const importResult = importProjectFromJSON(exportResult.data!);
    
    // Recalculate imported data
    const importedCalculated = calculateAll(importResult.data!.bars, importResult.data!.config);
    const importedTotalWeight = importedCalculated.reduce((sum, bar) => sum + bar.totalWeight, 0);

    // Verify weights match (within floating point precision)
    expect(Math.abs(originalTotalWeight - importedTotalWeight)).toBeLessThan(0.01);

    // Verify bar counts match
    expect(importedCalculated).toHaveLength(originalCalculated.length);

    // Verify individual bar calculations match
    for (let i = 0; i < originalCalculated.length; i++) {
      expect(Math.abs(originalCalculated[i].cutLength - importedCalculated[i].cutLength)).toBeLessThan(0.01);
      expect(Math.abs(originalCalculated[i].totalWeight - importedCalculated[i].totalWeight)).toBeLessThan(0.01);
    }
  });

  it('should handle edge cases in data processing', async () => {
    // Test with empty bars array
    const emptyCalculated = calculateAll([], mockConfig);
    expect(emptyCalculated).toHaveLength(0);

    const emptyDiameterSummary = summarizeByDiameter(emptyCalculated);
    expect(emptyDiameterSummary).toHaveLength(0);

    // Test Excel export with empty data
    const emptyBBSBlob = await ExcelExporter.exportBBS(mockConfig, emptyCalculated);
    expect(emptyBBSBlob).toBeInstanceOf(Blob);
    expect(emptyBBSBlob.size).toBeGreaterThan(0);

    // Test JSON export/import with empty bars
    const emptyExportResult = exportProjectAsJSON(mockConfig, []);
    expect(emptyExportResult.success).toBe(true);

    const emptyImportResult = importProjectFromJSON(emptyExportResult.data!);
    expect(emptyImportResult.success).toBe(true);
    expect(emptyImportResult.data?.bars).toHaveLength(0);
  });
});
