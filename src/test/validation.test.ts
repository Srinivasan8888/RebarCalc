// Tests for validation functions

import { describe, it, expect } from 'vitest';
import { validateProjectConfig, validateBarEntry } from '../lib/validation';
import type { ProjectConfig, BarEntry } from '../types';

describe('Project Config Validation', () => {
  it('should validate a complete valid project config', () => {
    const validConfig: Partial<ProjectConfig> = {
      name: 'Test Project',
      codeStandard: 'IS',
      defaultCover: 25,
      defaultHookMultiplier: 9,
      bendDeductions: {
        deg45: 1,
        deg90: 2,
        deg135: 3
      }
    };

    const result = validateProjectConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject config with missing name', () => {
    const invalidConfig: Partial<ProjectConfig> = {
      codeStandard: 'IS',
      defaultCover: 25,
      defaultHookMultiplier: 9,
      bendDeductions: {
        deg45: 1,
        deg90: 2,
        deg135: 3
      }
    };

    const result = validateProjectConfig(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Project name is required',
      value: undefined
    });
  });

  it('should reject config with invalid code standard', () => {
    const invalidConfig: Partial<ProjectConfig> = {
      name: 'Test Project',
      codeStandard: 'INVALID' as any,
      defaultCover: 25,
      defaultHookMultiplier: 9,
      bendDeductions: {
        deg45: 1,
        deg90: 2,
        deg135: 3
      }
    };

    const result = validateProjectConfig(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'codeStandard',
      message: 'Code standard must be IS, BS, or CUSTOM',
      value: 'INVALID'
    });
  });

  it('should reject config with incomplete bend deductions', () => {
    const invalidConfig: Partial<ProjectConfig> = {
      name: 'Test Project',
      codeStandard: 'IS',
      defaultCover: 25,
      defaultHookMultiplier: 9,
      bendDeductions: {
        deg45: 1,
        deg90: 2
        // missing deg135
      } as any
    };

    const result = validateProjectConfig(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'bendDeductions.deg135',
      message: '135° bend deduction is required',
      value: undefined
    });
  });
});

describe('Bar Entry Validation', () => {
  it('should validate a complete valid bar entry', () => {
    const validBarEntry: Partial<BarEntry> = {
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: {
        A: 1000
      },
      spacing: 150,
      quantity: 10
    };

    const result = validateBarEntry(validBarEntry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject bar entry with invalid diameter', () => {
    const invalidBarEntry: Partial<BarEntry> = {
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 15, // invalid diameter
      dimensions: {
        A: 1000
      },
      spacing: 150,
      quantity: 10
    };

    const result = validateBarEntry(invalidBarEntry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'diameter',
      message: 'Invalid diameter: 15. Must be one of: 6, 8, 10, 12, 16, 20, 25, 32',
      value: 15
    });
  });

  it('should reject bar entry with missing required dimensions', () => {
    const invalidBarEntry: Partial<BarEntry> = {
      memberType: 'BEAM',
      shapeCode: 'S2', // requires A and B
      diameter: 12,
      dimensions: {
        A: 1000
        // missing B
      },
      spacing: 150,
      quantity: 10
    };

    const result = validateBarEntry(invalidBarEntry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'dimensions.B',
      message: 'Dimension B is required for U-Bar',
      value: undefined
    });
  });

  it('should reject bar entry with negative spacing', () => {
    const invalidBarEntry: Partial<BarEntry> = {
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: {
        A: 1000
      },
      spacing: -50, // negative spacing
      quantity: 10
    };

    const result = validateBarEntry(invalidBarEntry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'spacing',
      message: 'Spacing cannot be negative',
      value: -50
    });
  });

  it('should reject bar entry with zero quantity', () => {
    const invalidBarEntry: Partial<BarEntry> = {
      memberType: 'BEAM',
      shapeCode: 'S1',
      diameter: 12,
      dimensions: {
        A: 1000
      },
      spacing: 150,
      quantity: 0 // zero quantity
    };

    const result = validateBarEntry(invalidBarEntry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'quantity',
      message: 'Quantity must be a positive number',
      value: 0
    });
  });
});