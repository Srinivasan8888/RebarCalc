import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { BarEntry, ShapeCode, MemberType, ProjectConfig, CalculatedBar } from '@/types';
import { SHAPE_DEFINITIONS, MEMBER_DEFAULTS } from '@/lib/constants';
import { calculateBar } from '@/lib/calculator';
import { ShapeIcon } from './ShapeDiagram';
import { BarSummaryCards } from './BarSummaryCards';

interface BarEntryTableProps {
  data: BarEntry[];
  memberType: MemberType;
  projectConfig: ProjectConfig;
  onDataChange: (data: BarEntry[]) => void;
  onShapeSelect?: (shapeCode: ShapeCode) => void;
}

const columnHelper = createColumnHelper<CalculatedBar>();

export function BarEntryTable({ 
  data, 
  memberType, 
  projectConfig,
  onDataChange, 
  onShapeSelect 
}: BarEntryTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate results for all bars
  const calculatedData: CalculatedBar[] = useMemo(() => {
    if (data.length === 0) return [];
    
    setIsCalculating(true);
    const startTime = Date.now();
    
    const result = data.map(bar => calculateBar(bar, projectConfig));
    
    const calculationTime = Date.now() - startTime;
    
    // Show loading indicator for operations exceeding 200ms
    if (calculationTime > 200) {
      // Keep loading state for a brief moment to show the indicator
      setTimeout(() => setIsCalculating(false), 100);
    } else {
      setIsCalculating(false);
    }
    
    return result;
  }, [data, projectConfig]);

  // Get common diameters for this member type
  const commonDiameters = MEMBER_DEFAULTS[memberType].commonDiameters;

  // Helper function to update a specific bar entry
  const updateBarEntry = (rowIndex: number, field: keyof BarEntry, value: any) => {
    const newData = [...data];
    if (field === 'dimensions') {
      newData[rowIndex] = {
        ...newData[rowIndex],
        dimensions: { ...newData[rowIndex].dimensions, ...value }
      };
    } else {
      newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    }
    onDataChange(newData);
  };

  // Helper function to add a new bar entry
  const addBarEntry = () => {
    const newEntry: BarEntry = {
      id: `bar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberType,
      shapeCode: 'S1',
      diameter: commonDiameters[0],
      dimensions: { A: 0 },
      spacing: MEMBER_DEFAULTS[memberType].defaultSpacing,
      quantity: 1,
      remarks: '',
    };
    onDataChange([...data, newEntry]);
  };

  // Helper function to remove a bar entry
  const removeBarEntry = (rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex);
    onDataChange(newData);
  };

  // Create editable cell component
  const EditableCell = ({ 
    getValue,
    row, 
    column
  }: {
    getValue: () => any;
    row: any;
    column: any;
  }) => {
    const value = getValue();
    const cellId = `${row.index}-${column.id}`;
    const isEditing = editingCell === cellId;

    const handleClick = () => {
      setEditingCell(cellId);
    };

    const handleBlur = () => {
      setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setEditingCell(null);
      }
    };

    if (column.id === 'shapeCode') {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => {
            updateBarEntry(row.index, 'shapeCode', newValue);
            if (onShapeSelect) {
              onShapeSelect(newValue as ShapeCode);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SHAPE_DEFINITIONS).map((shape) => (
              <SelectItem key={shape.code} value={shape.code}>
                <div className="flex items-center gap-2">
                  <ShapeIcon shapeCode={shape.code} />
                  <span className="font-mono text-xs">{shape.code}</span>
                  <span>{shape.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.id === 'diameter') {
      return (
        <Select
          value={value.toString()}
          onValueChange={(newValue) => {
            updateBarEntry(row.index, 'diameter', parseInt(newValue));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {commonDiameters.map((diameter) => (
              <SelectItem key={diameter} value={diameter.toString()}>
                {diameter}mm
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.id.startsWith('dimension_')) {
      const dimensionKey = column.id.replace('dimension_', '').toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const currentShape = SHAPE_DEFINITIONS[row.original.shapeCode as ShapeCode];
      
      if (!currentShape.requiredDimensions.includes(dimensionKey)) {
        return <div className="text-muted-foreground text-center">-</div>;
      }

      return isEditing ? (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => {
            const newValue = e.target.value ? parseInt(e.target.value) : undefined;
            updateBarEntry(row.index, 'dimensions', { [dimensionKey]: newValue });
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full"
        />
      ) : (
        <div
          onClick={handleClick}
          className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
        >
          {value || 0}
        </div>
      );
    }

    if (column.id === 'spacing' || column.id === 'quantity') {
      return isEditing ? (
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 0;
            updateBarEntry(row.index, column.id, newValue);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full"
        />
      ) : (
        <div
          onClick={handleClick}
          className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
        >
          {value}
        </div>
      );
    }

    if (column.id === 'remarks') {
      return isEditing ? (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => {
            updateBarEntry(row.index, 'remarks', e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full"
        />
      ) : (
        <div
          onClick={handleClick}
          className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
        >
          {value || 'Click to add remarks'}
        </div>
      );
    }

    return <div>{value}</div>;
  };

  // Define columns
  const columns = useMemo<ColumnDef<CalculatedBar, any>[]>(() => [
    columnHelper.accessor('shapeCode', {
      header: 'Shape',
      cell: EditableCell,
      size: 120,
    }),
    columnHelper.accessor('diameter', {
      header: 'Diameter (mm)',
      cell: EditableCell,
      size: 120,
    }),
    columnHelper.accessor('dimensions.A', {
      id: 'dimension_a',
      header: 'A (mm)',
      cell: EditableCell,
      size: 100,
    }),
    columnHelper.accessor('dimensions.B', {
      id: 'dimension_b',
      header: 'B (mm)',
      cell: EditableCell,
      size: 100,
    }),
    columnHelper.accessor('dimensions.C', {
      id: 'dimension_c',
      header: 'C (mm)',
      cell: EditableCell,
      size: 100,
    }),
    columnHelper.accessor('dimensions.D', {
      id: 'dimension_d',
      header: 'D (mm)',
      cell: EditableCell,
      size: 100,
    }),
    columnHelper.accessor('spacing', {
      header: 'Spacing (mm)',
      cell: EditableCell,
      size: 120,
    }),
    columnHelper.accessor('quantity', {
      header: 'Quantity',
      cell: EditableCell,
      size: 100,
    }),
    // Calculated columns (read-only)
    columnHelper.accessor('cutLength', {
      header: 'Cut Length (mm)',
      cell: ({ getValue }) => (
        <div className="text-right font-mono bg-muted/30 px-2 py-1 rounded">
          {Math.round(getValue())}
        </div>
      ),
      size: 130,
    }),
    columnHelper.accessor('unitWeight', {
      header: 'Unit Weight (kg)',
      cell: ({ getValue }) => (
        <div className="text-right font-mono bg-muted/30 px-2 py-1 rounded">
          {getValue().toFixed(3)}
        </div>
      ),
      size: 130,
    }),
    columnHelper.accessor('totalWeight', {
      header: 'Total Weight (kg)',
      cell: ({ getValue }) => (
        <div className="text-right font-mono bg-muted/30 px-2 py-1 rounded">
          {getValue().toFixed(2)}
        </div>
      ),
      size: 140,
    }),
    columnHelper.accessor('remarks', {
      header: 'Remarks',
      cell: EditableCell,
      size: 200,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeBarEntry(row.index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
      size: 80,
    }),
  ], [data, memberType, editingCell, commonDiameters]);

  const table = useReactTable({
    data: calculatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {memberType} Bars ({data.length})
          </h3>
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating...
            </div>
          )}
        </div>
        <Button onClick={addBarEntry} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Bar
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No bars added yet. Click "Add Bar" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Real-time summary cards */}
      <BarSummaryCards bars={calculatedData} />
    </div>
  );
}