import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ProjectConfig, CalculatedBar } from '@/types';
import { ExcelExporter, type ExportSummaries } from '@/lib/excel-exporter';

export type ExportType = 'BBS' | 'ABSTRACT';

interface ExportDialogProps {
  project: ProjectConfig;
  bars: CalculatedBar[];
  summaries: ExportSummaries;
  trigger?: React.ReactNode;
}

export function ExportDialog({ project, bars, summaries, trigger }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('BBS');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleExport = async () => {
    if (!project || bars.length === 0) {
      setExportStatus({
        type: 'error',
        message: 'No data available to export. Please add some bar entries first.'
      });
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      let blob: Blob;
      let filename: string;

      if (exportType === 'BBS') {
        blob = await ExcelExporter.exportBBS(project, bars);
        filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_BBS_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        blob = await ExcelExporter.exportAbstract(project, summaries);
        filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Abstract_${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      // Trigger download
      ExcelExporter.downloadExcel(blob, filename);

      setExportStatus({
        type: 'success',
        message: `${exportType} export completed successfully! File downloaded as ${filename}`
      });

      // Auto-close dialog after successful export
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setExportType('BBS');
    setIsExporting(false);
    setExportStatus(null);
  };

  const getExportDescription = (type: ExportType) => {
    switch (type) {
      case 'BBS':
        return 'Complete Bar Bending Schedule with all bar details, cut lengths, weights, and shape diagrams';
      case 'ABSTRACT':
        return 'Summary report with diameter-wise, shape-wise, and member-wise totals';
      default:
        return '';
    }
  };

  const getExportIcon = (type: ExportType) => {
    switch (type) {
      case 'BBS':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'ABSTRACT':
        return <FileText className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const canExport = bars.length > 0 && !isExporting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            Choose the type of report to export for project "{project?.name || 'Untitled'}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Export Type</label>
            <Select value={exportType} onValueChange={(value) => setExportType(value as ExportType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BBS">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Bar Bending Schedule (BBS)</span>
                  </div>
                </SelectItem>
                <SelectItem value="ABSTRACT">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Abstract Summary</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Description */}
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex items-start gap-2">
              {getExportIcon(exportType)}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {exportType === 'BBS' ? 'Bar Bending Schedule' : 'Abstract Summary'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getExportDescription(exportType)}
                </p>
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className="text-sm text-muted-foreground">
            <p>Data to export:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• {bars.length} bar entries</li>
              <li>• {summaries.diameter.length} different diameters</li>
              <li>• {summaries.shape.length} different shapes</li>
              <li>• {summaries.member.length} member types</li>
            </ul>
          </div>

          {/* Status Messages */}
          {exportStatus && (
            <div className={`flex items-start gap-2 p-3 rounded-md ${
              exportStatus.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {exportStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-sm">{exportStatus.message}</p>
            </div>
          )}

          {/* Warning for empty data */}
          {bars.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                No bar entries found. Please add some bars before exporting.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!canExport}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                {getExportIcon(exportType)}
                <span className="ml-2">Export {exportType}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}