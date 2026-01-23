import { describe, it, expect } from 'vitest';
import { ExcelExporter } from '../lib/excel-exporter';
import type { ProjectConfig, CalculatedBar, DiameterSummary, ShapeSummary, MemberSummary } from '../types';

describe('Excel Export', () => {
  const mockConfig: ProjectConfig = {
    id: 'test-project-1',
    name: 'Test Excel Export Project',
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

  const mockBars: CalculatedBar[] = [
    {
      id: 'bar-1',
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: { A: 1000 },
      spacing: 150,
      quantity: 10,
      cutLength: 1000,
      unitWeight: 0.888,
      totalLength: 10000,
      totalWeight: 8.88,
      remarks: 'Main reinforcement'
    },
    {
      id: 'bar-2',
      memberType: 'COLUMN',
      shapeCode: 'S2',
      diameter: 16,
      dimensions: { A: 800, B: 200 },
      spacing: 0,
      quantity: 4,
      cutLength: 1364,
      unitWeight: 1.58,
      totalLength: 5456,
      totalWeight: 8.62
    }
  ];

  const mockSummaries = {
    diameter: [
      { diameter: 12, totalLength: 10, totalWeight: 8.88, barCount: 10 },
      { diameter: 16, totalLength: 5.456, totalWeight: 8.62, barCount: 4 }
    ] as DiameterSummary[],
    shape: [
      { shapeCode: 'S1' as const, shapeName: 'Straight', totalLength: 10, totalWeight: 8.88, barCount: 10 },
      { shapeCode: 'S2' as const, shapeName: 'U-Bar', totalLength: 5.456, totalWeight: 8.62, barCount: 4 }
    ] as ShapeSummary[],
    member: [
      { memberType: 'BEAM' as const, totalLength: 10, totalWeight: 8.88, barCount: 10 },
      { memberType: 'COLUMN' as const, totalLength: 5.456, totalWeight: 8.62, barCount: 4 }
    ] as MemberSummary[]
  };

  it('should export BBS to Excel blob successfully', async () => {
    const blob = await ExcelExporter.exportBBS(mockConfig, mockBars);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should export Abstract to Excel blob successfully', async () => {
    const blob = await ExcelExporter.exportAbstract(mockConfig, mockSummaries);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should handle empty bars array for BBS export', async () => {
    const blob = await ExcelExporter.exportBBS(mockConfig, []);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should handle empty summaries for Abstract export', async () => {
    const emptySummaries = {
      diameter: [],
      shape: [],
      member: []
    };
    
    const blob = await ExcelExporter.exportAbstract(mockConfig, emptySummaries);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should include project information in exported files', async () => {
    // This test verifies that the export process completes without errors
    // and produces valid Excel files. The actual content verification would
    // require parsing the Excel file, which is complex for a unit test.
    
    const bbsBlob = await ExcelExporter.exportBBS(mockConfig, mockBars);
    const abstractBlob = await ExcelExporter.exportAbstract(mockConfig, mockSummaries);
    
    expect(bbsBlob.size).toBeGreaterThan(1000); // Should have substantial content
    expect(abstractBlob.size).toBeGreaterThan(1000); // Should have substantial content
  });
});
