import type { ProjectConfig, BarEntry } from '../types';

// Interface for serialized project data
export interface SerializedProject {
  config: SerializedProjectConfig;
  bars: BarEntry[];
  lastModified: string;  // ISO date string
}

// Project config with dates as strings for JSON serialization
interface SerializedProjectConfig {
  id: string;
  name: string;
  codeStandard: 'IS' | 'BS' | 'CUSTOM';
  codeProfileId?: string;  // Optional code profile ID
  defaultCover: number;
  defaultHookMultiplier: number;
  bendDeductions: {
    deg45: number;
    deg90: number;
    deg135: number;
  };
  createdAt: string;  // ISO date string
  updatedAt: string;  // ISO date string
}

/**
 * Serializes a project (config + bars) to JSON-compatible format
 * Converts Date objects to ISO strings for JSON serialization
 */
export function serializeProject(config: ProjectConfig, bars: BarEntry[]): SerializedProject {
  const serializedConfig: SerializedProjectConfig = {
    ...config,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };

  return {
    config: serializedConfig,
    bars: bars,
    lastModified: new Date().toISOString()
  };
}

/**
 * Deserializes a project from JSON format
 * Converts ISO date strings back to Date objects
 */
export function deserializeProject(serialized: SerializedProject): { config: ProjectConfig; bars: BarEntry[] } {
  const config: ProjectConfig = {
    ...serialized.config,
    createdAt: new Date(serialized.config.createdAt),
    updatedAt: new Date(serialized.config.updatedAt)
  };

  return {
    config,
    bars: serialized.bars
  };
}

/**
 * Validates that a serialized project has the required structure
 */
export function validateSerializedProject(data: any): data is SerializedProject {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check config structure
  const config = data.config;
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Check required config fields
  const requiredConfigFields = ['id', 'name', 'codeStandard', 'defaultCover', 'defaultHookMultiplier', 'bendDeductions', 'createdAt', 'updatedAt'];
  for (const field of requiredConfigFields) {
    if (!(field in config)) {
      return false;
    }
  }

  // Check bend deductions structure
  const bendDeductions = config.bendDeductions;
  if (!bendDeductions || typeof bendDeductions !== 'object') {
    return false;
  }
  
  const requiredBendFields = ['deg45', 'deg90', 'deg135'];
  for (const field of requiredBendFields) {
    if (!(field in bendDeductions) || typeof bendDeductions[field] !== 'number') {
      return false;
    }
  }

  // Check bars array
  if (!Array.isArray(data.bars)) {
    return false;
  }

  // Check lastModified
  if (!data.lastModified || typeof data.lastModified !== 'string') {
    return false;
  }

  // Validate date strings can be parsed
  try {
    new Date(config.createdAt);
    new Date(config.updatedAt);
    new Date(data.lastModified);
  } catch {
    return false;
  }

  return true;
}