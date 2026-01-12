import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject, validateSerializedProject } from '../lib/json-serializer';
import type { ProjectConfig, BarEntry } from '../types';

describe('JSON Serializer', () => {
  const mockConfig: ProjectConfig = {
    id: 'test-project-1',
    name: 'Test Project',
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
      remarks: 'Test bar'
    },
    {
      id: 'bar-2',
      memberType: 'COLUMN',
      shapeCode: 'S2',
      diameter: 16,
      dimensions: { A: 800, B: 200 },
      spacing: 0,
      quantity: 4
    }
  ];

  it('should serialize project correctly', () => {
    const serialized = serializeProject(mockConfig, mockBars);
    
    expect(serialized.config.id).toBe(mockConfig.id);
    expect(serialized.config.name).toBe(mockConfig.name);
    expect(serialized.config.codeStandard).toBe(mockConfig.codeStandard);
    expect(serialized.config.createdAt).toBe('2024-01-01T10:00:00.000Z');
    expect(serialized.config.updatedAt).toBe('2024-01-02T15:30:00.000Z');
    expect(serialized.bars).toEqual(mockBars);
    expect(typeof serialized.lastModified).toBe('string');
  });

  it('should deserialize project correctly', () => {
    const serialized = serializeProject(mockConfig, mockBars);
    const { config, bars } = deserializeProject(serialized);
    
    expect(config.id).toBe(mockConfig.id);
    expect(config.name).toBe(mockConfig.name);
    expect(config.codeStandard).toBe(mockConfig.codeStandard);
    expect(config.createdAt).toEqual(mockConfig.createdAt);
    expect(config.updatedAt).toEqual(mockConfig.updatedAt);
    expect(config.bendDeductions).toEqual(mockConfig.bendDeductions);
    expect(bars).toEqual(mockBars);
  });

  it('should validate correct serialized project', () => {
    const serialized = serializeProject(mockConfig, mockBars);
    expect(validateSerializedProject(serialized)).toBe(true);
  });

  it('should reject invalid serialized project', () => {
    expect(validateSerializedProject(null)).toBe(false);
    expect(validateSerializedProject({})).toBe(false);
    expect(validateSerializedProject({ config: {} })).toBe(false);
    expect(validateSerializedProject({ config: mockConfig.id, bars: [] })).toBe(false);
  });

  it('should handle round-trip serialization', () => {
    const serialized = serializeProject(mockConfig, mockBars);
    const { config, bars } = deserializeProject(serialized);
    const reSerialized = serializeProject(config, bars);
    
    expect(reSerialized.config.id).toBe(serialized.config.id);
    expect(reSerialized.config.name).toBe(serialized.config.name);
    expect(reSerialized.bars).toEqual(serialized.bars);
  });
});