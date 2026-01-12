// Validation functions for RebarCalc BBS Calculator

import type { ProjectConfig, BarEntry } from '../types';
import { SHAPE_DEFINITIONS, VALID_DIAMETERS, CODE_STANDARDS } from './constants';

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate project configuration
 * Requirements: 1.4 - Validate required fields and bendDeductions completeness
 */
export function validateProjectConfig(config: Partial<ProjectConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!config.name || config.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Project name is required',
      value: config.name
    });
  }

  if (!config.codeStandard) {
    errors.push({
      field: 'codeStandard',
      message: 'Code standard is required',
      value: config.codeStandard
    });
  } else if (!CODE_STANDARDS.includes(config.codeStandard as any)) {
    errors.push({
      field: 'codeStandard',
      message: 'Code standard must be IS, BS, or CUSTOM',
      value: config.codeStandard
    });
  }

  if (config.defaultCover === undefined || config.defaultCover === null) {
    errors.push({
      field: 'defaultCover',
      message: 'Default cover is required',
      value: config.defaultCover
    });
  } else if (typeof config.defaultCover !== 'number' || config.defaultCover <= 0) {
    errors.push({
      field: 'defaultCover',
      message: 'Default cover must be a positive number',
      value: config.defaultCover
    });
  }

  if (config.defaultHookMultiplier === undefined || config.defaultHookMultiplier === null) {
    errors.push({
      field: 'defaultHookMultiplier',
      message: 'Default hook multiplier is required',
      value: config.defaultHookMultiplier
    });
  } else if (typeof config.defaultHookMultiplier !== 'number' || config.defaultHookMultiplier <= 0) {
    errors.push({
      field: 'defaultHookMultiplier',
      message: 'Default hook multiplier must be a positive number',
      value: config.defaultHookMultiplier
    });
  }

  // Validate bendDeductions object completeness
  if (!config.bendDeductions) {
    errors.push({
      field: 'bendDeductions',
      message: 'Bend deductions configuration is required',
      value: config.bendDeductions
    });
  } else {
    const bendDeductions = config.bendDeductions;
    
    if (bendDeductions.deg45 === undefined || bendDeductions.deg45 === null) {
      errors.push({
        field: 'bendDeductions.deg45',
        message: '45° bend deduction is required',
        value: bendDeductions.deg45
      });
    } else if (typeof bendDeductions.deg45 !== 'number' || bendDeductions.deg45 < 0) {
      errors.push({
        field: 'bendDeductions.deg45',
        message: '45° bend deduction must be a non-negative number',
        value: bendDeductions.deg45
      });
    }

    if (bendDeductions.deg90 === undefined || bendDeductions.deg90 === null) {
      errors.push({
        field: 'bendDeductions.deg90',
        message: '90° bend deduction is required',
        value: bendDeductions.deg90
      });
    } else if (typeof bendDeductions.deg90 !== 'number' || bendDeductions.deg90 < 0) {
      errors.push({
        field: 'bendDeductions.deg90',
        message: '90° bend deduction must be a non-negative number',
        value: bendDeductions.deg90
      });
    }

    if (bendDeductions.deg135 === undefined || bendDeductions.deg135 === null) {
      errors.push({
        field: 'bendDeductions.deg135',
        message: '135° bend deduction is required',
        value: bendDeductions.deg135
      });
    } else if (typeof bendDeductions.deg135 !== 'number' || bendDeductions.deg135 < 0) {
      errors.push({
        field: 'bendDeductions.deg135',
        message: '135° bend deduction must be a non-negative number',
        value: bendDeductions.deg135
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bar entry
 * Requirements: 2.1 - Validate required fields, dimensions, diameter, quantity, spacing
 */
export function validateBarEntry(barEntry: Partial<BarEntry>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!barEntry.memberType) {
    errors.push({
      field: 'memberType',
      message: 'Member type is required',
      value: barEntry.memberType
    });
  } else if (!['BEAM', 'COLUMN', 'SLAB'].includes(barEntry.memberType)) {
    errors.push({
      field: 'memberType',
      message: 'Member type must be BEAM, COLUMN, or SLAB',
      value: barEntry.memberType
    });
  }

  if (!barEntry.shapeCode) {
    errors.push({
      field: 'shapeCode',
      message: 'Shape code is required',
      value: barEntry.shapeCode
    });
  } else if (!SHAPE_DEFINITIONS[barEntry.shapeCode]) {
    errors.push({
      field: 'shapeCode',
      message: 'Invalid shape code',
      value: barEntry.shapeCode
    });
  }

  // Validate diameter is in allowed list
  if (barEntry.diameter === undefined || barEntry.diameter === null) {
    errors.push({
      field: 'diameter',
      message: 'Diameter is required',
      value: barEntry.diameter
    });
  } else if (!VALID_DIAMETERS.includes(barEntry.diameter as any)) {
    errors.push({
      field: 'diameter',
      message: `Invalid diameter: ${barEntry.diameter}. Must be one of: ${VALID_DIAMETERS.join(', ')}`,
      value: barEntry.diameter
    });
  }

  // Validate quantity > 0
  if (barEntry.quantity === undefined || barEntry.quantity === null) {
    errors.push({
      field: 'quantity',
      message: 'Quantity is required',
      value: barEntry.quantity
    });
  } else if (typeof barEntry.quantity !== 'number' || barEntry.quantity <= 0) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be a positive number',
      value: barEntry.quantity
    });
  }

  // Validate spacing >= 0
  if (barEntry.spacing === undefined || barEntry.spacing === null) {
    errors.push({
      field: 'spacing',
      message: 'Spacing is required',
      value: barEntry.spacing
    });
  } else if (typeof barEntry.spacing !== 'number' || barEntry.spacing < 0) {
    errors.push({
      field: 'spacing',
      message: 'Spacing cannot be negative',
      value: barEntry.spacing
    });
  }

  // Validate required dimensions based on shape's requiredDimensions
  if (barEntry.shapeCode && SHAPE_DEFINITIONS[barEntry.shapeCode]) {
    const shapeDefinition = SHAPE_DEFINITIONS[barEntry.shapeCode];
    const dimensions = barEntry.dimensions || {} as Record<string, number | undefined>;

    for (const requiredDim of shapeDefinition.requiredDimensions) {
      const dimValue = dimensions[requiredDim];
      if (dimValue === undefined || dimValue === null) {
        errors.push({
          field: `dimensions.${requiredDim}`,
          message: `Dimension ${requiredDim} is required for ${shapeDefinition.name}`,
          value: dimValue
        });
      } else if (typeof dimValue !== 'number' || dimValue <= 0) {
        errors.push({
          field: `dimensions.${requiredDim}`,
          message: `Dimension ${requiredDim} must be a positive number`,
          value: dimValue
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate multiple bar entries
 */
export function validateBarEntries(barEntries: Partial<BarEntry>[]): ValidationResult {
  const allErrors: ValidationError[] = [];

  barEntries.forEach((barEntry, index) => {
    const result = validateBarEntry(barEntry);
    if (!result.valid) {
      // Add entry index to error messages for better identification
      const indexedErrors = result.errors.map(error => ({
        ...error,
        field: `entry[${index}].${error.field}`,
        message: `Entry ${index + 1}: ${error.message}`
      }));
      allErrors.push(...indexedErrors);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}