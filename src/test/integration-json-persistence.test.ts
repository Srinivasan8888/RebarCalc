import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from '../lib/json-serializer';
import { exportProjectAsJSON, importProjectFromJSON } from '../lib/local-storage';
import type { ProjectConfig, BarEntry } from '../types';

describe('JSON Persistence Integration', () => {
  const mockConfig: ProjectConfig = {
    id: 'integration-test-1',
    name: 'Integration Test Project',
    codeStandard: 'IS',
    defaultCover: 25,
    defaultHookMultiplier: 9,
    bendDeductions: {
      deg45: 1,
      deg90: 2,
      deg135: 3
    },
    createdAt: new Date('2024-01-01T10:00:00Z'),
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
      remarks: 'Main reinforcement'
    },
    {
      id: 'bar-2',
      memberType: 'COLUMN',
      shapeCode: 'S3',
      diameter: 16,
      dimensions: { A: 300, B: 400 },
      spacing: 200,
      quantity: 8,
      remarks: 'Stirrups'
    }
  ];

  it('should handle complete round-trip: serialize -> export -> import -> deserialize', () => {
    // Step 1: Serialize project
    const serialized = serializeProject(mockConfig, mockBars);
    expect(serialized.config.name).toBe('Integration Test Project');
    expect(serialized.bars).toHaveLength(2);

    // Step 2: Export as JSON string
    const exportResult = exportProjectAsJSON(mockConfig, mockBars);
    expect(exportResult.success).toBe(true);
    expect(exportResult.data).toBeDefined();

    // Step 3: Import from JSON string
    const importResult = importProjectFromJSON(exportResult.data!);
    expect(importResult.success).toBe(true);
    expect(importResult.data).toBeDefined();

    // Step 4: Verify data integrity
    const { config: importedConfig, bars: importedBars } = importResult.data!;
    
    expect(importedConfig.id).toBe(mockConfig.id);
    expect(importedConfig.name).toBe(mockConfig.name);
    expect(importedConfig.codeStandard).toBe(mockConfig.codeStandard);
    expect(importedConfig.defaultCover).toBe(mockConfig.defaultCover);
    expect(importedConfig.defaultHookMultiplier).toBe(mockConfig.defaultHookMultiplier);
    expect(importedConfig.bendDeductions).toEqual(mockConfig.bendDeductions);
    expect(importedConfig.createdAt).toEqual(mockConfig.createdAt);
    expect(importedConfig.updatedAt).toEqual(mockConfig.updatedAt);
    
    expect(importedBars).toHaveLength(2);
    expect(importedBars[0].memberType).toBe('BEAM');
    expect(importedBars[0].shapeCode).toBe('S1');
    expect(importedBars[0].diameter).toBe(12);
    expect(importedBars[0].dimensions).toEqual({ A: 1000 });
    expect(importedBars[0].quantity).toBe(10);
    expect(importedBars[0].remarks).toBe('Main reinforcement');
    
    expect(importedBars[1].memberType).toBe('COLUMN');
    expect(importedBars[1].shapeCode).toBe('S3');
    expect(importedBars[1].diameter).toBe(16);
    expect(importedBars[1].dimensions).toEqual({ A: 300, B: 400 });
    expect(importedBars[1].quantity).toBe(8);
    expect(importedBars[1].remarks).toBe('Stirrups');
  });

  it('should preserve Date objects through serialization cycle', () => {
    const originalDate = new Date('2024-03-15T14:30:00.123Z');
    const configWithSpecificDate: ProjectConfig = {
      ...mockConfig,
      createdAt: originalDate,
      updatedAt: originalDate
    };

    const serialized = serializeProject(configWithSpecificDate, mockBars);
    const { config } = deserializeProject(serialized);

    expect(config.createdAt).toEqual(originalDate);
    expect(config.updatedAt).toEqual(originalDate);
    expect(config.createdAt.getTime()).toBe(originalDate.getTime());
    expect(config.updatedAt.getTime()).toBe(originalDate.getTime());
  });
});