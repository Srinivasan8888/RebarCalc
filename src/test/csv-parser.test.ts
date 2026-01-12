// Basic tests for CSV Parser functionality

import { describe, it, expect } from 'vitest';
import { parseCSV, exportToCSV, validateCSV, getCSVTemplate, getCSVExample } from '../lib/csv-parser';
import type { BarEntry } from '../types';

describe('CSV Parser', () => {
  const validCSVContent = `memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks
BEAM,S1,12,3000,,,,150,10,Main reinforcement
BEAM,S2,10,2800,300,,,200,8,Stirrup bars
COLUMN,S3,16,400,400,,,150,12,Column ties`;

  const sampleBarEntry: BarEntry = {
    id: 'test-1',
    memberType: 'BEAM',
    shapeCode: 'S1',
    diameter: 12,
    dimensions: { A: 3000 },
    spacing: 150,
    quantity: 10,
    remarks: 'Main reinforcement'
  };

  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const result = parseCSV(validCSVContent);
      
      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      
      const firstEntry = result.entries[0];
      expect(firstEntry.memberType).toBe('BEAM');
      expect(firstEntry.shapeCode).toBe('S1');
      expect(firstEntry.diameter).toBe(12);
      expect(firstEntry.dimensions.A).toBe(3000);
      expect(firstEntry.spacing).toBe(150);
      expect(firstEntry.quantity).toBe(10);
      expect(firstEntry.remarks).toBe('Main reinforcement');
    });

    it('should handle empty CSV content', () => {
      const result = parseCSV('');
      
      expect(result.success).toBe(false);
      expect(result.entries).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('CSV content is empty');
    });

    it('should handle missing required columns', () => {
      const invalidCSV = 'memberType,diameter\nBEAM,12';
      const result = parseCSV(invalidCSV);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Missing required column'))).toBe(true);
    });

    it('should handle invalid data values', () => {
      const invalidCSV = `memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks
BEAM,S1,invalid,3000,,,,150,10,Main reinforcement`;
      
      const result = parseCSV(invalidCSV);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Invalid number'))).toBe(true);
    });
  });

  describe('exportToCSV', () => {
    it('should export bar entries to CSV format', () => {
      const entries = [sampleBarEntry];
      const csvOutput = exportToCSV(entries);
      
      expect(csvOutput).toContain('memberType,shapeCode,diameter');
      expect(csvOutput).toContain('BEAM,S1,12,3000');
      expect(csvOutput).toContain('Main reinforcement');
    });

    it('should handle empty entries array', () => {
      const csvOutput = exportToCSV([]);
      
      expect(csvOutput).toBe('memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks\n');
    });

    it('should handle entries with optional dimensions', () => {
      const entryWithOptionalDims: BarEntry = {
        ...sampleBarEntry,
        shapeCode: 'S2',
        dimensions: { A: 3000, B: 300 }
      };
      
      const csvOutput = exportToCSV([entryWithOptionalDims]);
      
      expect(csvOutput).toContain('BEAM,S2,12,3000,300,,,150,10');
    });
  });

  describe('validateCSV', () => {
    it('should validate CSV and return statistics', () => {
      const result = validateCSV(validCSVContent);
      
      expect(result.valid).toBe(true);
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.invalidRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should count invalid rows correctly', () => {
      const mixedCSV = `memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks
BEAM,S1,12,3000,,,,150,10,Valid row
BEAM,S1,invalid,3000,,,,150,10,Invalid row
BEAM,S1,16,3000,,,,150,10,Another valid row`;
      
      const result = validateCSV(mixedCSV);
      
      expect(result.valid).toBe(false);
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('CSV round-trip integration', () => {
    it('should maintain data integrity in parse → export → parse cycle', () => {
      // Create test data with various shapes and member types
      const testEntries: BarEntry[] = [
        {
          id: 'test-1',
          memberType: 'BEAM',
          shapeCode: 'S1',
          diameter: 12,
          dimensions: { A: 3000 },
          spacing: 150,
          quantity: 10,
          remarks: 'Main reinforcement'
        },
        {
          id: 'test-2',
          memberType: 'BEAM',
          shapeCode: 'S2',
          diameter: 10,
          dimensions: { A: 2800, B: 300 },
          spacing: 200,
          quantity: 8
        },
        {
          id: 'test-3',
          memberType: 'COLUMN',
          shapeCode: 'S3',
          diameter: 16,
          dimensions: { A: 400, B: 400 },
          spacing: 150,
          quantity: 12,
          remarks: 'Column ties'
        }
      ];

      // Export to CSV
      const csvContent = exportToCSV(testEntries);
      expect(csvContent).toBeTruthy();
      expect(csvContent).toContain('memberType,shapeCode,diameter');

      // Parse back from CSV
      const parseResult = parseCSV(csvContent);
      expect(parseResult.success).toBe(true);
      expect(parseResult.entries).toHaveLength(testEntries.length);
      expect(parseResult.errors).toHaveLength(0);

      // Verify data integrity (excluding generated IDs)
      for (let i = 0; i < testEntries.length; i++) {
        const original = testEntries[i];
        const parsed = parseResult.entries[i];

        expect(parsed.memberType).toBe(original.memberType);
        expect(parsed.shapeCode).toBe(original.shapeCode);
        expect(parsed.diameter).toBe(original.diameter);
        expect(parsed.dimensions.A).toBe(original.dimensions.A);
        expect(parsed.dimensions.B).toBe(original.dimensions.B);
        expect(parsed.dimensions.C).toBe(original.dimensions.C);
        expect(parsed.dimensions.D).toBe(original.dimensions.D);
        expect(parsed.spacing).toBe(original.spacing);
        expect(parsed.quantity).toBe(original.quantity);
        expect(parsed.remarks).toBe(original.remarks);
      }
    });

    it('should handle mixed valid and invalid data correctly', () => {
      const mixedCSV = `memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks
BEAM,S1,12,3000,,,,150,10,Valid entry
BEAM,S1,invalid,3000,,,,150,10,Invalid diameter
BEAM,S2,10,2800,300,,,200,8,Valid entry
INVALID_MEMBER,S1,12,3000,,,,150,10,Invalid member type
BEAM,S1,16,3000,,,,150,10,Another valid entry`;

      const result = validateCSV(mixedCSV);
      
      expect(result.valid).toBe(false);
      expect(result.totalRows).toBe(5);
      expect(result.validRows).toBe(3); // Should have 3 valid entries
      expect(result.invalidRows).toBe(2); // Should have 2 invalid entries
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Verify that parsing still extracts valid entries
      const parseResult = parseCSV(mixedCSV);
      expect(parseResult.success).toBe(false); // Overall failure due to errors
      expect(parseResult.entries).toHaveLength(3); // But valid entries are still parsed
    });
  });

  describe('utility functions', () => {
    it('should provide CSV template', () => {
      const template = getCSVTemplate();
      
      expect(template).toBe('memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks\n');
    });

    it('should provide CSV example', () => {
      const example = getCSVExample();
      
      expect(example).toContain('memberType,shapeCode,diameter');
      expect(example).toContain('BEAM,S1,12');
      expect(example).toContain('COLUMN,S3,16');
    });
  });
});