// CSV Parser for RebarCalc BBS Calculator

import type { BarEntry, MemberType, ShapeCode } from '../types';
import { validateBarEntry } from './validation';

// CSV parsing interfaces
export interface ParseError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface ParseResult {
  success: boolean;
  entries: BarEntry[];
  errors: ParseError[];
}

// Expected CSV column headers
const CSV_HEADERS = [
  'memberType',
  'shapeCode', 
  'diameter',
  'dimensionA',
  'dimensionB',
  'dimensionC', 
  'dimensionD',
  'spacing',
  'quantity',
  'remarks'
] as const;

/**
 * Parse CSV string to array of BarEntry objects
 * Requirements: 2.3 - Parse CSV string, map columns to BarEntry fields, handle missing optional dimensions
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: ParseError[] = [];
  const entries: BarEntry[] = [];

  if (!csvContent || csvContent.trim() === '') {
    return {
      success: false,
      entries: [],
      errors: [{ row: 0, column: '', message: 'CSV content is empty', value: '' }]
    };
  }

  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    return {
      success: false,
      entries: [],
      errors: [{ row: 0, column: '', message: 'CSV content is empty', value: '' }]
    };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  // Validate headers
  const headerValidation = validateHeaders(headers);
  if (!headerValidation.valid) {
    return {
      success: false,
      entries: [],
      errors: headerValidation.errors
    };
  }

  // Create column mapping
  const columnMap = createColumnMapping(headers);

  // Parse data rows - Requirements: 2.4 - Track row numbers, report specific errors, skip invalid rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // Skip empty lines

    const rowNumber = i + 1;
    const values = parseCSVLine(line);
    
    try {
      const barEntry = parseRowToBarEntry(values, columnMap, rowNumber);
      if (barEntry) {
        // Validate the parsed bar entry
        const validationResult = validateBarEntry(barEntry);
        if (validationResult.valid) {
          entries.push(barEntry);
        } else {
          // Convert validation errors to parse errors with row numbers
          const rowErrors = validationResult.errors.map(error => ({
            row: rowNumber,
            column: error.field,
            message: error.message,
            value: error.value?.toString() || ''
          }));
          errors.push(...rowErrors);
        }
      }
    } catch (error) {
      if (error instanceof ParseRowError) {
        errors.push(...error.errors);
      } else {
        errors.push({
          row: rowNumber,
          column: '',
          message: `Unexpected error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          value: line
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    entries,
    errors
  };
}

/**
 * Parse a single CSV line, handling quoted values and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Validate CSV headers
 */
function validateHeaders(headers: string[]): { valid: boolean; errors: ParseError[] } {
  const errors: ParseError[] = [];
  
  // Check for required headers
  const requiredHeaders = ['memberType', 'shapeCode', 'diameter', 'dimensionA', 'spacing', 'quantity'];
  
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push({
        row: 1,
        column: required,
        message: `Missing required column: ${required}`,
        value: ''
      });
    }
  }

  // Check for unknown headers
  for (const header of headers) {
    if (!CSV_HEADERS.includes(header as any)) {
      errors.push({
        row: 1,
        column: header,
        message: `Unknown column: ${header}. Expected columns: ${CSV_HEADERS.join(', ')}`,
        value: header
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create mapping from header names to column indices
 */
function createColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  headers.forEach((header, index) => {
    mapping[header] = index;
  });
  return mapping;
}

/**
 * Custom error class for row parsing errors
 */
class ParseRowError extends Error {
  public errors: ParseError[];
  
  constructor(errors: ParseError[]) {
    super('Row parsing failed');
    this.errors = errors;
  }
}

/**
 * Parse a single row of values into a BarEntry
 */
function parseRowToBarEntry(
  values: string[], 
  columnMap: Record<string, number>, 
  rowNumber: number
): BarEntry | null {
  const errors: ParseError[] = [];
  
  // Helper function to get column value
  const getColumnValue = (columnName: string): string => {
    const index = columnMap[columnName];
    return index !== undefined && index < values.length ? values[index] : '';
  };

  // Helper function to parse number with validation
  const parseNumber = (columnName: string, required: boolean = true): number | undefined => {
    const value = getColumnValue(columnName).trim();
    
    if (value === '') {
      if (required) {
        errors.push({
          row: rowNumber,
          column: columnName,
          message: `${columnName} is required`,
          value: ''
        });
      }
      return undefined;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      errors.push({
        row: rowNumber,
        column: columnName,
        message: `Invalid number: ${value}`,
        value
      });
      return undefined;
    }

    return parsed;
  };

  // Parse memberType
  const memberTypeValue = getColumnValue('memberType').trim().toUpperCase();
  if (!memberTypeValue) {
    errors.push({
      row: rowNumber,
      column: 'memberType',
      message: 'memberType is required',
      value: ''
    });
  }
  const memberType = memberTypeValue as MemberType;

  // Parse shapeCode
  const shapeCodeValue = getColumnValue('shapeCode').trim().toUpperCase();
  if (!shapeCodeValue) {
    errors.push({
      row: rowNumber,
      column: 'shapeCode',
      message: 'shapeCode is required',
      value: ''
    });
  }
  const shapeCode = shapeCodeValue as ShapeCode;

  // Parse required numeric fields
  const diameter = parseNumber('diameter');
  const spacing = parseNumber('spacing');
  const quantity = parseNumber('quantity');

  // Parse dimensions (A is required, B, C, D are optional)
  const dimensionA = parseNumber('dimensionA');
  const dimensionB = parseNumber('dimensionB', false);
  const dimensionC = parseNumber('dimensionC', false);
  const dimensionD = parseNumber('dimensionD', false);

  // Parse optional remarks
  const remarks = getColumnValue('remarks').trim() || undefined;

  // If there were parsing errors, throw them
  if (errors.length > 0) {
    throw new ParseRowError(errors);
  }

  // Create BarEntry object
  const barEntry: BarEntry = {
    id: `csv-${rowNumber}-${Date.now()}`, // Generate temporary ID
    memberType: memberType!,
    shapeCode: shapeCode!,
    diameter: diameter!,
    dimensions: {
      A: dimensionA!,
      ...(dimensionB !== undefined && { B: dimensionB }),
      ...(dimensionC !== undefined && { C: dimensionC }),
      ...(dimensionD !== undefined && { D: dimensionD })
    },
    spacing: spacing!,
    quantity: quantity!,
    ...(remarks && { remarks })
  };

  return barEntry;
}

/**
 * Export BarEntry array to CSV string
 * Requirements: 2.3 - Convert BarEntry array to CSV string, include all fields in consistent column order
 */
export function exportToCSV(entries: BarEntry[]): string {
  if (entries.length === 0) {
    return CSV_HEADERS.join(',') + '\n';
  }

  // Create header row
  const headerRow = CSV_HEADERS.join(',');
  
  // Create data rows
  const dataRows = entries.map(entry => {
    const row = [
      entry.memberType,
      entry.shapeCode,
      entry.diameter.toString(),
      entry.dimensions.A.toString(),
      entry.dimensions.B?.toString() || '',
      entry.dimensions.C?.toString() || '',
      entry.dimensions.D?.toString() || '',
      entry.spacing.toString(),
      entry.quantity.toString(),
      entry.remarks || ''
    ];
    
    // Escape values that contain commas or quotes
    return row.map(value => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Validate CSV content and return detailed error report
 * Requirements: 2.4 - Track row numbers, report specific column and value for each error, skip invalid rows
 */
export function validateCSV(csvContent: string): {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ParseError[];
} {
  const parseResult = parseCSV(csvContent);
  
  // Count total rows (excluding header)
  const lines = csvContent.trim().split('\n');
  const totalRows = Math.max(0, lines.length - 1); // Exclude header row
  
  return {
    valid: parseResult.success,
    totalRows,
    validRows: parseResult.entries.length,
    invalidRows: totalRows - parseResult.entries.length,
    errors: parseResult.errors
  };
}

/**
 * Get CSV template with headers
 */
export function getCSVTemplate(): string {
  return CSV_HEADERS.join(',') + '\n';
}

/**
 * Get example CSV data for reference
 */
export function getCSVExample(): string {
  const headers = CSV_HEADERS.join(',');
  const exampleRows = [
    'BEAM,S1,12,3000,,,,,150,10,Main reinforcement',
    'BEAM,S2,10,2800,300,,,,200,8,Stirrup bars',
    'COLUMN,S3,16,400,400,,,,150,12,Column ties',
    'SLAB,S5,8,2000,250,,,,200,15,Distribution bars'
  ];
  
  return [headers, ...exampleRows].join('\n');
}