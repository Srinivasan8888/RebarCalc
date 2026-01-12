import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileSelector } from '@/components/ProfileSelector';
import { AlertTriangle, ArrowRight, Calculator } from 'lucide-react';
import type { ProjectConfig, BarEntry, CodeProfile } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';
import { calculateAll } from '@/lib/calculator';

interface ProfileSwitchDialogProps {
  currentConfig: ProjectConfig;
  bars: BarEntry[];
  onProfileSwitch: (newConfig: ProjectConfig) => void;
  trigger: React.ReactNode;
}

interface CalculationComparison {
  barId: string;
  currentCutLength: number;
  newCutLength: number;
  difference: number;
  percentChange: number;
}

export function ProfileSwitchDialog({
  currentConfig,
  bars,
  onProfileSwitch,
  trigger
}: ProfileSwitchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CodeProfile | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const currentProfile = currentConfig.codeProfileId 
    ? codeProfileService.getProfile(currentConfig.codeProfileId)
    : null;

  // Calculate current results
  const currentCalculatedBars = useMemo(() => {
    return calculateAll(bars, currentConfig);
  }, [bars, currentConfig]);

  // Calculate new results with selected profile
  const newCalculatedBars = useMemo(() => {
    if (!selectedProfile) return [];
    
    const newConfig = codeProfileService.applyProfile(currentConfig, selectedProfile);
    return calculateAll(bars, newConfig);
  }, [bars, currentConfig, selectedProfile]);

  // Generate comparison data
  const comparison = useMemo((): CalculationComparison[] => {
    if (!selectedProfile || newCalculatedBars.length === 0) return [];

    return currentCalculatedBars.map((currentBar, index) => {
      const newBar = newCalculatedBars[index];
      const difference = newBar.cutLength - currentBar.cutLength;
      const percentChange = currentBar.cutLength > 0 
        ? (difference / currentBar.cutLength) * 100 
        : 0;

      return {
        barId: currentBar.id,
        currentCutLength: currentBar.cutLength,
        newCutLength: newBar.cutLength,
        difference,
        percentChange
      };
    });
  }, [currentCalculatedBars, newCalculatedBars, selectedProfile]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (comparison.length === 0) return null;

    const totalCurrentLength = currentCalculatedBars.reduce((sum, bar) => sum + bar.totalLength, 0);
    const totalNewLength = newCalculatedBars.reduce((sum, bar) => sum + bar.totalLength, 0);
    const totalCurrentWeight = currentCalculatedBars.reduce((sum, bar) => sum + bar.totalWeight, 0);
    const totalNewWeight = newCalculatedBars.reduce((sum, bar) => sum + bar.totalWeight, 0);

    const lengthDifference = totalNewLength - totalCurrentLength;
    const weightDifference = totalNewWeight - totalCurrentWeight;
    const lengthPercentChange = totalCurrentLength > 0 ? (lengthDifference / totalCurrentLength) * 100 : 0;
    const weightPercentChange = totalCurrentWeight > 0 ? (weightDifference / totalCurrentWeight) * 100 : 0;

    const barsWithChanges = comparison.filter(c => Math.abs(c.difference) > 0.1).length;

    return {
      totalCurrentLength: totalCurrentLength / 1000, // Convert to meters
      totalNewLength: totalNewLength / 1000,
      totalCurrentWeight,
      totalNewWeight,
      lengthDifference: lengthDifference / 1000,
      weightDifference,
      lengthPercentChange,
      weightPercentChange,
      barsWithChanges,
      totalBars: comparison.length
    };
  }, [comparison, currentCalculatedBars, newCalculatedBars]);

  const handleProfileSelect = (profile: CodeProfile) => {
    setSelectedProfile(profile);
    setShowComparison(true);
  };

  const handleConfirmSwitch = () => {
    if (!selectedProfile) return;

    const newConfig = codeProfileService.applyProfile(currentConfig, selectedProfile);
    onProfileSwitch(newConfig);
    setIsOpen(false);
    setSelectedProfile(null);
    setShowComparison(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedProfile(null);
    setShowComparison(false);
  };

  const formatChange = (value: number, unit: string = 'mm') => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${unit}`;
  };

  const getChangeColor = (value: number) => {
    if (Math.abs(value) < 0.1) return 'text-muted-foreground';
    return value > 0 ? 'text-orange-600' : 'text-green-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Switch Code Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Profile Info */}
          {currentProfile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{currentProfile.name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {currentProfile.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Selection */}
          <div>
            <ProfileSelector
              selectedProfileId={selectedProfile?.id}
              onProfileSelect={handleProfileSelect}
              showDetails={!showComparison}
            />
          </div>

          {/* Impact Preview */}
          {showComparison && selectedProfile && summaryStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Impact Preview
                </CardTitle>
                <CardDescription>
                  Changes that will occur when switching to {selectedProfile.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Length</div>
                    <div className="font-medium">
                      {summaryStats.totalCurrentLength.toFixed(1)}m
                      <ArrowRight className="inline h-4 w-4 mx-1" />
                      {summaryStats.totalNewLength.toFixed(1)}m
                    </div>
                    <div className={`text-xs ${getChangeColor(summaryStats.lengthDifference)}`}>
                      {formatChange(summaryStats.lengthDifference, 'm')} 
                      ({formatChange(summaryStats.lengthPercentChange, '%')})
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Weight</div>
                    <div className="font-medium">
                      {summaryStats.totalCurrentWeight.toFixed(1)}kg
                      <ArrowRight className="inline h-4 w-4 mx-1" />
                      {summaryStats.totalNewWeight.toFixed(1)}kg
                    </div>
                    <div className={`text-xs ${getChangeColor(summaryStats.weightDifference)}`}>
                      {formatChange(summaryStats.weightDifference, 'kg')} 
                      ({formatChange(summaryStats.weightPercentChange, '%')})
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Bars Changed</div>
                    <div className="font-medium">
                      {summaryStats.barsWithChanges} / {summaryStats.totalBars}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((summaryStats.barsWithChanges / summaryStats.totalBars) * 100).toFixed(0)}% affected
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Profile</div>
                    <div className="font-medium text-xs">
                      {currentProfile?.name || 'None'}
                      <ArrowRight className="inline h-4 w-4 mx-1" />
                      {selectedProfile.name}
                    </div>
                  </div>
                </div>

                {/* Detailed Changes (show only significant changes) */}
                {comparison.filter(c => Math.abs(c.difference) > 0.1).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Significant Changes (&gt;0.1mm)</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {comparison
                        .filter(c => Math.abs(c.difference) > 0.1)
                        .slice(0, 10) // Show only first 10 for performance
                        .map((change) => (
                          <div key={change.barId} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                            <span className="font-mono">{change.barId}</span>
                            <div className="flex items-center gap-2">
                              <span>{change.currentCutLength.toFixed(1)}mm</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{change.newCutLength.toFixed(1)}mm</span>
                              <span className={`font-medium ${getChangeColor(change.difference)}`}>
                                ({formatChange(change.difference)})
                              </span>
                            </div>
                          </div>
                        ))}
                      {comparison.filter(c => Math.abs(c.difference) > 0.1).length > 10 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          ... and {comparison.filter(c => Math.abs(c.difference) > 0.1).length - 10} more changes
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning if no changes */}
                {summaryStats.barsWithChanges === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      No significant changes detected. The selected profile has similar parameters to your current configuration.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleConfirmSwitch}
              disabled={!selectedProfile}
              className="flex-1"
            >
              {selectedProfile ? `Switch to ${selectedProfile.name}` : 'Select Profile'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}