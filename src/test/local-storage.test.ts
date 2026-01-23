import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveToLocalStorage, 
  loadFromLocalStorage, 
  exportProjectAsJSON,
  importProjectFromJSON
} from '../lib/local-storage';
import type { ProjectConfig, BarEntry } from '../types';

// Mock localStorage
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

describe('Local Storage Service', () => {
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
      quantity: 10
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save project to localStorage successfully', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const result = saveToLocalStorage(mockConfig, mockBars);
    
    expect(result.success).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'bbs_project_test-project-1',
      expect.stringContaining('"name":"Test Project"')
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'bbs_project_list',
      expect.any(String)
    );
  });

  it('should handle localStorage unavailable gracefully', () => {
    // Mock localStorage to be unavailable by making setItem fail on the test key
    localStorageMock.setItem.mockImplementation((key) => {
      if (key === '__localStorage_test__') {
        throw new Error('localStorage not available');
      }
    });
    
    const result = saveToLocalStorage(mockConfig, mockBars);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Local storage is not available');
  });

  it('should handle quota exceeded error', () => {
    // Mock localStorage to be available for the test but fail on actual storage
    localStorageMock.setItem.mockImplementation((key) => {
      if (key === '__localStorage_test__') {
        return; // Allow the availability check to pass
      }
      throw new Error('QuotaExceededError');
    });
    
    const result = saveToLocalStorage(mockConfig, mockBars);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage quota exceeded');
  });

  it('should load project from localStorage successfully', () => {
    // Mock localStorage to be available
    localStorageMock.setItem.mockImplementation(() => {});
    
    const serializedData = {
      config: {
        ...mockConfig,
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString()
      },
      bars: mockBars,
      lastModified: new Date().toISOString()
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(serializedData));
    
    const result = loadFromLocalStorage('test-project-1');
    
    expect(result.success).toBe(true);
    expect(result.data?.config.name).toBe('Test Project');
    expect(result.data?.bars).toEqual(mockBars);
  });

  it('should handle project not found', () => {
    // Mock localStorage to be available
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue(null);
    
    const result = loadFromLocalStorage('non-existent');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Project not found');
  });

  it('should export project as JSON', () => {
    const result = exportProjectAsJSON(mockConfig, mockBars);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('string');
    
    const parsed = JSON.parse(result.data!);
    expect(parsed.config.name).toBe('Test Project');
    expect(parsed.bars).toEqual(mockBars);
  });

  it('should import project from JSON', () => {
    const serializedData = {
      config: {
        ...mockConfig,
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString()
      },
      bars: mockBars,
      lastModified: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(serializedData);
    const result = importProjectFromJSON(jsonString);
    
    expect(result.success).toBe(true);
    expect(result.data?.config.name).toBe('Test Project');
    expect(result.data?.bars).toEqual(mockBars);
  });

  it('should handle invalid JSON import', () => {
    const result = importProjectFromJSON('invalid json');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to import project');
  });
});
