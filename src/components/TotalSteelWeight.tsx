import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectSteelSummary } from '@/types/component-types';
import { Scale } from 'lucide-react';

interface TotalSteelWeightProps {
  summary?: ProjectSteelSummary;
  manualTotalWeight?: number; // Support for manual mode totals too if needed
}

export function TotalSteelWeight({ summary, manualTotalWeight }: TotalSteelWeightProps) {
  
  if (!summary && manualTotalWeight === undefined) return null;

  // Use summary if available, otherwise manual total
  const totalKg = summary ? summary.totalWeightKg : (manualTotalWeight || 0);
  const totalMT = totalKg / 1000;

  return (
    <Card className="border-2 border-primary/20 shadow-sm">
      <CardHeader className="pb-2 bg-muted/20">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span>Total Steel Weight</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            {totalKg.toFixed(2)} kg
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({totalMT.toFixed(3)} MT)
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      {summary && (
        <CardContent className="pt-4">
          <div className="text-sm font-medium text-muted-foreground mb-3">Breakdown by Diameter:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(summary.byDiameter).map(([diameter, data]) => {
              const dia = parseInt(diameter);
              if (data.weightKg <= 0.001) return null;
              
              return (
                <div key={dia} className="flex flex-col p-3 bg-muted/10 rounded-md border text-center">
                  <span className="font-bold text-lg">{dia}mm</span>
                  <span className="text-sm text-foreground/80">{data.weightKg.toFixed(2)} kg</span>
                  <span className="text-xs text-muted-foreground">{data.lengthM.toFixed(1)} m</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
