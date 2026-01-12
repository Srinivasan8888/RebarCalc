// Excel export functionality for RebarCalc BBS Calculator

import * as ExcelJS from 'exceljs';
import type { 
  ProjectConfig, 
  CalculatedBar, 
  DiameterSummary, 
  ShapeSummary, 
  MemberSummary 
} from '../types';
import { SHAPE_DEFINITIONS } from './constants';

export interface ExportSummaries {
  diameter: DiameterSummary[];
  shape: ShapeSummary[];
  member: MemberSummary[];
}

export class ExcelExporter {
  /**
   * Export full BBS with all details
   */
  static async exportBBS(
    project: ProjectConfig,
    bars: CalculatedBar[]
  ): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'RebarCalc';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create BBS worksheet
    const worksheet = workbook.addWorksheet('Bar Bending Schedule');
    
    // Add project header
    this.addProjectHeader(worksheet, project);
    
    // Add bar schedule table
    this.addBBSTable(worksheet, bars);
    
    // Add shape diagrams reference
    this.addShapeDiagrams(worksheet);
    
    // Convert to blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Export abstract summary only
   */
  static async exportAbstract(
    project: ProjectConfig,
    summaries: ExportSummaries
  ): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'RebarCalc';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create summary worksheets
    this.addDiameterSummarySheet(workbook, project, summaries.diameter);
    this.addShapeSummarySheet(workbook, project, summaries.shape);
    this.addMemberSummarySheet(workbook, project, summaries.member);
    
    // Convert to blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Add project header to worksheet
   */
  private static addProjectHeader(worksheet: ExcelJS.Worksheet, project: ProjectConfig): void {
    // Project title
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BAR BENDING SCHEDULE';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Project details
    worksheet.mergeCells('A3:C3');
    worksheet.getCell('A3').value = `Project: ${project.name}`;
    worksheet.getCell('A3').font = { bold: true };
    
    worksheet.mergeCells('D3:F3');
    worksheet.getCell('D3').value = `Code Standard: ${project.codeStandard}`;
    worksheet.getCell('D3').font = { bold: true };
    
    worksheet.mergeCells('G3:I3');
    worksheet.getCell('G3').value = `Date: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('G3').font = { bold: true };
    
    // Add some spacing
    worksheet.getRow(4).height = 10;
  }

  /**
   * Add BBS table with all calculated fields
   */
  private static addBBSTable(worksheet: ExcelJS.Worksheet, bars: CalculatedBar[]): void {
    const startRow = 5;
    
    // Headers
    const headers = [
      'S.No.',
      'Member',
      'Shape',
      'Diameter (mm)',
      'A (mm)',
      'B (mm)',
      'C (mm)',
      'D (mm)',
      'Cut Length (mm)',
      'Quantity',
      'Total Length (m)',
      'Unit Weight (kg/m)',
      'Total Weight (kg)',
      'Remarks'
    ];
    
    // Add headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Add data rows
    bars.forEach((bar, index) => {
      const row = startRow + 1 + index;
      const shapeDefinition = SHAPE_DEFINITIONS[bar.shapeCode];
      
      // Data values
      const values = [
        index + 1,                                    // S.No.
        bar.memberType,                               // Member
        `${bar.shapeCode} - ${shapeDefinition.name}`, // Shape
        bar.diameter,                                 // Diameter
        bar.dimensions.A,                             // A
        bar.dimensions.B || '',                       // B
        bar.dimensions.C || '',                       // C
        bar.dimensions.D || '',                       // D
        Math.round(bar.cutLength),                    // Cut Length
        bar.quantity,                                 // Quantity
        Math.round(bar.totalLength / 1000 * 100) / 100, // Total Length in meters
        Math.round(bar.unitWeight * 1000) / 1000,     // Unit Weight
        Math.round(bar.totalWeight * 100) / 100,      // Total Weight
        bar.remarks || ''                             // Remarks
      ];
      
      // Add values to cells
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Align numbers to right
        if (typeof value === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });
    
    // Add totals row
    const totalRow = startRow + 1 + bars.length;
    worksheet.mergeCells(totalRow, 1, totalRow, 10);
    const totalLabelCell = worksheet.getCell(totalRow, 1);
    totalLabelCell.value = 'TOTAL';
    totalLabelCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Total length
    const totalLengthCell = worksheet.getCell(totalRow, 11);
    const totalLength = bars.reduce((sum, bar) => sum + bar.totalLength, 0);
    totalLengthCell.value = Math.round(totalLength / 1000 * 100) / 100;
    totalLengthCell.font = { bold: true };
    totalLengthCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLengthCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Skip unit weight column (12)
    worksheet.getCell(totalRow, 12).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Total weight
    const totalWeightCell = worksheet.getCell(totalRow, 13);
    const totalWeight = bars.reduce((sum, bar) => sum + bar.totalWeight, 0);
    totalWeightCell.value = Math.round(totalWeight * 100) / 100;
    totalWeightCell.font = { bold: true };
    totalWeightCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalWeightCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Add borders to total row
    for (let col = 1; col <= 14; col++) {
      const cell = worksheet.getCell(totalRow, col);
      cell.border = {
        top: { style: 'thick' },
        left: { style: 'thin' },
        bottom: { style: 'thick' },
        right: { style: 'thin' }
      };
    }
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 30);
      }
    });
  }

  /**
   * Add shape diagrams reference
   */
  private static addShapeDiagrams(worksheet: ExcelJS.Worksheet): void {
    const startRow = worksheet.rowCount + 3;
    
    // Title
    worksheet.mergeCells(startRow, 1, startRow, 6);
    const titleCell = worksheet.getCell(startRow, 1);
    titleCell.value = 'SHAPE CODES REFERENCE';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Shape reference table
    const shapeHeaders = ['Code', 'Name', 'Description', 'Required Dimensions'];
    shapeHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(startRow + 2, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add shape data
    Object.values(SHAPE_DEFINITIONS).forEach((shape, index) => {
      const row = startRow + 3 + index;
      const values = [
        shape.code,
        shape.name,
        shape.description,
        shape.requiredDimensions.join(', ')
      ];
      
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      });
    });
  }

  /**
   * Add diameter-wise summary sheet
   */
  private static addDiameterSummarySheet(
    workbook: ExcelJS.Workbook, 
    project: ProjectConfig, 
    summary: DiameterSummary[]
  ): void {
    const worksheet = workbook.addWorksheet('Diameter Summary');
    
    // Project header
    this.addProjectHeader(worksheet, project);
    
    // Summary table
    const startRow = 5;
    const headers = ['Diameter (mm)', 'Bar Count', 'Total Length (m)', 'Total Weight (kg)'];
    
    // Add headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Add data
    summary.forEach((item, index) => {
      const row = startRow + 1 + index;
      const values = [
        item.diameter,
        item.barCount,
        Math.round(item.totalLength * 100) / 100,
        Math.round(item.totalWeight * 100) / 100
      ];
      
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      });
    });
    
    // Add totals
    this.addSummaryTotals(worksheet, startRow + 1 + summary.length, summary);
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 25);
      }
    });
  }

  /**
   * Add shape-wise summary sheet
   */
  private static addShapeSummarySheet(
    workbook: ExcelJS.Workbook, 
    project: ProjectConfig, 
    summary: ShapeSummary[]
  ): void {
    const worksheet = workbook.addWorksheet('Shape Summary');
    
    // Project header
    this.addProjectHeader(worksheet, project);
    
    // Summary table
    const startRow = 5;
    const headers = ['Shape Code', 'Shape Name', 'Bar Count', 'Total Length (m)', 'Total Weight (kg)'];
    
    // Add headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Add data
    summary.forEach((item, index) => {
      const row = startRow + 1 + index;
      const values = [
        item.shapeCode,
        item.shapeName,
        item.barCount,
        Math.round(item.totalLength * 100) / 100,
        Math.round(item.totalWeight * 100) / 100
      ];
      
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (typeof value === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });
    
    // Add totals
    this.addSummaryTotals(worksheet, startRow + 1 + summary.length, summary);
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 25);
      }
    });
  }

  /**
   * Add member-wise summary sheet
   */
  private static addMemberSummarySheet(
    workbook: ExcelJS.Workbook, 
    project: ProjectConfig, 
    summary: MemberSummary[]
  ): void {
    const worksheet = workbook.addWorksheet('Member Summary');
    
    // Project header
    this.addProjectHeader(worksheet, project);
    
    // Summary table
    const startRow = 5;
    const headers = ['Member Type', 'Bar Count', 'Total Length (m)', 'Total Weight (kg)'];
    
    // Add headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Add data
    summary.forEach((item, index) => {
      const row = startRow + 1 + index;
      const values = [
        item.memberType,
        item.barCount,
        Math.round(item.totalLength * 100) / 100,
        Math.round(item.totalWeight * 100) / 100
      ];
      
      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (typeof value === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });
    
    // Add totals
    this.addSummaryTotals(worksheet, startRow + 1 + summary.length, summary);
    
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 15), 25);
      }
    });
  }

  /**
   * Add totals row to summary sheets
   */
  private static addSummaryTotals(
    worksheet: ExcelJS.Worksheet, 
    totalRow: number, 
    summary: (DiameterSummary | ShapeSummary | MemberSummary)[]
  ): void {
    // Calculate totals
    const totalBars = summary.reduce((sum, item) => sum + item.barCount, 0);
    const totalLength = summary.reduce((sum, item) => sum + item.totalLength, 0);
    const totalWeight = summary.reduce((sum, item) => sum + item.totalWeight, 0);
    
    // Determine column positions based on summary type
    const isShapeSummary = summary.length > 0 && 'shapeName' in summary[0];
    const labelColSpan = isShapeSummary ? 2 : 1;
    const barCountCol = labelColSpan + 1;
    const lengthCol = barCountCol + 1;
    const weightCol = lengthCol + 1;
    
    // Total label
    worksheet.mergeCells(totalRow, 1, totalRow, labelColSpan);
    const totalLabelCell = worksheet.getCell(totalRow, 1);
    totalLabelCell.value = 'TOTAL';
    totalLabelCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Total bars
    const totalBarsCell = worksheet.getCell(totalRow, barCountCol);
    totalBarsCell.value = totalBars;
    totalBarsCell.font = { bold: true };
    totalBarsCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalBarsCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Total length
    const totalLengthCell = worksheet.getCell(totalRow, lengthCol);
    totalLengthCell.value = Math.round(totalLength * 100) / 100;
    totalLengthCell.font = { bold: true };
    totalLengthCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalLengthCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Total weight
    const totalWeightCell = worksheet.getCell(totalRow, weightCol);
    totalWeightCell.value = Math.round(totalWeight * 100) / 100;
    totalWeightCell.font = { bold: true };
    totalWeightCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalWeightCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' }
    };
    
    // Add borders to total row
    for (let col = 1; col <= weightCol; col++) {
      const cell = worksheet.getCell(totalRow, col);
      cell.border = {
        top: { style: 'thick' },
        left: { style: 'thin' },
        bottom: { style: 'thick' },
        right: { style: 'thin' }
      };
    }
  }

  /**
   * Trigger download of Excel file
   */
  static downloadExcel(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}