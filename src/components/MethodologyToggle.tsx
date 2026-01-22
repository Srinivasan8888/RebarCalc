import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, LayoutGrid } from 'lucide-react';

interface MethodologyToggleProps {
  mode: 'MANUAL' | 'COMPONENT';
  onModeChange: (mode: 'MANUAL' | 'COMPONENT') => void;
}

export function MethodologyToggle({ mode, onModeChange }: MethodologyToggleProps) {
  return (
    <div className="flex items-center space-x-1 bg-muted/30 p-1 rounded-lg border">
      <Button
        variant={mode === 'MANUAL' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('MANUAL')}
        className="flex items-center gap-2 flex-1"
      >
        <Table className="h-4 w-4" />
        <span>Manual Bar Entry</span>
      </Button>
      
      <Button
        variant={mode === 'COMPONENT' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('COMPONENT')}
        className="flex items-center gap-2 flex-1"
      >
        <LayoutGrid className="h-4 w-4" />
        <span>Component Based (BBS)</span>
      </Button>
    </div>
  );
}
