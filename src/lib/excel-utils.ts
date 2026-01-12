// Utility functions for Excel export

import { ExcelExporter, type ExportSummaries } from './excel-exporter';
import type { ProjectConfig, CalculatedBar } from '../types';

/**
 * Export BBS to Excel and trigger download
 */
export async function exportBBSToExcel(
  project: ProjectConfig,
  bars: CalculatedBar[]
): Promise<void> {
  try {
    const blob = await ExcelExporter.exportBBS(project, bars);
    const filename = `${project.name}_BBS_${new Date().toISOString().split('T')[0]}.xlsx`;
    ExcelExporter.downloadExcel(blob, filename);
  } catch (error) {
    console.error('Failed to export BBS to Excel:', error);
    throw new Error('Failed to export BBS to Excel');
  }
}

/**
 * Export Abstract summary to Excel and trigger download
 */
export async function exportAbstractToExcel(
  project: ProjectConfig,
  summaries: ExportSummaries
): Promise<void> {
  try {
    const blob = await ExcelExporter.exportAbstract(project, summaries);
    const filename = `${project.name}_Abstract_${new Date().toISOString().split('T')[0]}.xlsx`;
    ExcelExporter.downloadExcel(blob, filename);
  } catch (error) {
    console.error('Failed to export Abstract to Excel:', error);
    throw new Error('Failed to export Abstract to Excel');
  }
}