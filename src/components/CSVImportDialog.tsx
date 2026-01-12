import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import type { BarEntry } from '@/types';
import { parseCSV, getCSVTemplate, getCSVExample, type ParseError } from '@/lib/csv-parser';

interface CSVImportDialogProps {
  onImport: (entries: BarEntry[]) => void;
  trigger?: React.ReactNode;
}

export function CSVImportDialog({ onImport, trigger }: CSVImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [parseResult, setParseResult] = useState<{
    entries: BarEntry[];
    errors: ParseError[];
    valid: boolean;
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      handleParseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleParseCSV = (content: string) => {
    const result = parseCSV(content);
    setParseResult({
      entries: result.entries,
      errors: result.errors,
      valid: result.success
    });
    setStep('preview');
  };

  const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    setCsvContent(content);
    
    if (content.trim()) {
      handleParseCSV(content);
    } else {
      setParseResult(null);
      setStep('upload');
    }
  };

  const handleImport = () => {
    if (parseResult && parseResult.entries.length > 0) {
      onImport(parseResult.entries);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCsvContent('');
    setParseResult(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = getCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bar-entry-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExample = () => {
    const example = getCSVExample();
    const blob = new Blob([example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bar-entry-example.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Upload CSV File</h3>
            <p className="text-sm text-muted-foreground">
              Choose a CSV file or paste CSV data below
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <Button onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Or paste CSV data:</label>
        <textarea
          value={csvContent}
          onChange={handleTextAreaChange}
          placeholder="memberType,shapeCode,diameter,dimensionA,dimensionB,dimensionC,dimensionD,spacing,quantity,remarks&#10;BEAM,S1,12,3000,,,,,150,10,Main reinforcement"
          className="w-full h-32 p-3 border rounded-md text-sm font-mono"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={downloadTemplate} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" onClick={downloadExample} size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Download Example
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!parseResult) return null;

    const { entries, errors, valid } = parseResult;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {valid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">
              {valid ? 'CSV Valid' : 'CSV Contains Errors'}
            </span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {entries.length} valid rows
            </Badge>
            {errors.length > 0 && (
              <Badge variant="destructive">
                {errors.length} errors
              </Badge>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-destructive">Errors Found:</h4>
            <div className="max-h-32 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Column</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-24">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell className="font-mono text-xs">{error.column}</TableCell>
                      <TableCell className="text-sm">{error.message}</TableCell>
                      <TableCell className="font-mono text-xs">{error.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {entries.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Preview Valid Entries:</h4>
            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Shape</TableHead>
                    <TableHead>Diameter</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead>B</TableHead>
                    <TableHead>Spacing</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.slice(0, 10).map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.memberType}</TableCell>
                      <TableCell className="font-mono">{entry.shapeCode}</TableCell>
                      <TableCell>{entry.diameter}mm</TableCell>
                      <TableCell>{entry.dimensions.A}</TableCell>
                      <TableCell>{entry.dimensions.B || '-'}</TableCell>
                      <TableCell>{entry.spacing}</TableCell>
                      <TableCell>{entry.quantity}</TableCell>
                      <TableCell className="max-w-32 truncate">{entry.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {entries.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        ... and {entries.length - 10} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Bar Data from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to import bar entries. 
            {step === 'preview' && parseResult && (
              <span className="block mt-2">
                Found {parseResult.entries.length} valid entries
                {parseResult.errors.length > 0 && ` with ${parseResult.errors.length} errors`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === 'preview' && parseResult && parseResult.entries.length > 0 && (
              <Button onClick={handleImport}>
                Import {parseResult.entries.length} Bars
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}