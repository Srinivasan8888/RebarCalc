import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileSelector } from '@/components/ProfileSelector';
import type { ProjectConfig, BendDeductions, CodeProfile } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';

interface ProjectSetupFormProps {
  initialConfig?: Partial<ProjectConfig>;
  onSubmit: (config: Omit<ProjectConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ProjectSetupForm({ 
  initialConfig, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Create Project' 
}: ProjectSetupFormProps) {
  const [selectedProfile, setSelectedProfile] = useState<CodeProfile | null>(
    initialConfig?.codeProfileId ? codeProfileService.getProfile(initialConfig.codeProfileId) : null
  );
  
  const [formData, setFormData] = useState({
    name: initialConfig?.name || '',
    codeStandard: initialConfig?.codeStandard || 'IS' as const,
    codeProfileId: initialConfig?.codeProfileId || '',
    defaultCover: initialConfig?.defaultCover || 25,
    defaultHookMultiplier: initialConfig?.defaultHookMultiplier || 9,
    bendDeductions: {
      deg45: initialConfig?.bendDeductions?.deg45 || 1,
      deg90: initialConfig?.bendDeductions?.deg90 || 2,
      deg135: initialConfig?.bendDeductions?.deg135 || 3,
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (formData.defaultCover <= 0) {
      newErrors.defaultCover = 'Default cover must be positive';
    }

    if (formData.defaultHookMultiplier <= 0) {
      newErrors.defaultHookMultiplier = 'Hook multiplier must be positive';
    }

    if (formData.bendDeductions.deg45 <= 0) {
      newErrors.deg45 = 'Bend deduction must be positive';
    }

    if (formData.bendDeductions.deg90 <= 0) {
      newErrors.deg90 = 'Bend deduction must be positive';
    }

    if (formData.bendDeductions.deg135 <= 0) {
      newErrors.deg135 = 'Bend deduction must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSelect = (profile: CodeProfile) => {
    setSelectedProfile(profile);
    
    // Apply profile parameters to form data
    setFormData(prev => ({
      ...prev,
      codeProfileId: profile.id,
      codeStandard: mapProfileToCodeStandard(profile.id),
      defaultCover: profile.defaultCover,
      defaultHookMultiplier: profile.defaultHookMultiplier,
      bendDeductions: { ...profile.bendDeductions }
    }));
    
    // Clear any existing errors since we're applying valid profile values
    setErrors({});
  };

  const mapProfileToCodeStandard = (profileId: string): 'IS' | 'BS' | 'CUSTOM' => {
    switch (profileId) {
      case 'IS456':
        return 'IS';
      case 'BS8110':
        return 'BS';
      default:
        return 'CUSTOM';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      codeStandard: formData.codeStandard,
      codeProfileId: formData.codeProfileId,
      defaultCover: formData.defaultCover,
      defaultHookMultiplier: formData.defaultHookMultiplier,
      bendDeductions: formData.bendDeductions,
      calculationMode: 'COMPONENT',
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleBendDeductionChange = (angle: keyof BendDeductions, value: number) => {
    setFormData(prev => ({
      ...prev,
      bendDeductions: {
        ...prev.bendDeductions,
        [angle]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[angle]) {
      setErrors(prev => ({
        ...prev,
        [angle]: ''
      }));
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Project Configuration</CardTitle>
        <CardDescription>
          Set up your project with code standards and calculation defaults
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Project Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter project name"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Code Profile Selection */}
          <div className="space-y-2">
            <ProfileSelector
              selectedProfileId={formData.codeProfileId}
              onProfileSelect={handleProfileSelect}
              showDetails={true}
            />
          </div>

          {/* Manual Parameter Override Section */}
          {selectedProfile && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Parameter Overrides</h3>
                <p className="text-xs text-muted-foreground">
                  Modify individual parameters if needed
                </p>
              </div>

              {/* Default Cover */}
              <div className="space-y-2">
                <label htmlFor="defaultCover" className="text-sm font-medium">
                  Default Cover (mm) *
                </label>
                <Input
                  id="defaultCover"
                  type="number"
                  min="1"
                  value={formData.defaultCover}
                  onChange={(e) => handleInputChange('defaultCover', parseInt(e.target.value) || 0)}
                  placeholder="25"
                  aria-invalid={!!errors.defaultCover}
                />
                {errors.defaultCover && (
                  <p className="text-sm text-destructive">{errors.defaultCover}</p>
                )}
              </div>

              {/* Default Hook Multiplier */}
              <div className="space-y-2">
                <label htmlFor="defaultHookMultiplier" className="text-sm font-medium">
                  Default Hook Multiplier *
                </label>
                <Input
                  id="defaultHookMultiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value={formData.defaultHookMultiplier}
                  onChange={(e) => handleInputChange('defaultHookMultiplier', parseFloat(e.target.value) || 0)}
                  placeholder="9"
                  aria-invalid={!!errors.defaultHookMultiplier}
                />
                {errors.defaultHookMultiplier && (
                  <p className="text-sm text-destructive">{errors.defaultHookMultiplier}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Hook length = multiplier × diameter
                </p>
              </div>

              {/* Bend Deductions */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Bend Deductions (multiplier × diameter)</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Length reduction applied at each bend based on angle
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 45° Bend */}
                  <div className="space-y-2">
                    <label htmlFor="deg45" className="text-sm font-medium">
                      45° Bend *
                    </label>
                    <Input
                      id="deg45"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.bendDeductions.deg45}
                      onChange={(e) => handleBendDeductionChange('deg45', parseFloat(e.target.value) || 0)}
                      placeholder="1"
                      aria-invalid={!!errors.deg45}
                    />
                    {errors.deg45 && (
                      <p className="text-sm text-destructive">{errors.deg45}</p>
                    )}
                  </div>

                  {/* 90° Bend */}
                  <div className="space-y-2">
                    <label htmlFor="deg90" className="text-sm font-medium">
                      90° Bend *
                    </label>
                    <Input
                      id="deg90"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.bendDeductions.deg90}
                      onChange={(e) => handleBendDeductionChange('deg90', parseFloat(e.target.value) || 0)}
                      placeholder="2"
                      aria-invalid={!!errors.deg90}
                    />
                    {errors.deg90 && (
                      <p className="text-sm text-destructive">{errors.deg90}</p>
                    )}
                  </div>

                  {/* 135° Bend */}
                  <div className="space-y-2">
                    <label htmlFor="deg135" className="text-sm font-medium">
                      135° Bend *
                    </label>
                    <Input
                      id="deg135"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.bendDeductions.deg135}
                      onChange={(e) => handleBendDeductionChange('deg135', parseFloat(e.target.value) || 0)}
                      placeholder="3"
                      aria-invalid={!!errors.deg135}
                    />
                    {errors.deg135 && (
                      <p className="text-sm text-destructive">{errors.deg135}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Code Standard (for projects without profile) */}
          {!selectedProfile && (
            <div className="space-y-2">
              <label htmlFor="codeStandard" className="text-sm font-medium">
                Code Standard (Legacy)
              </label>
              <Select
                value={formData.codeStandard}
                onValueChange={(value: 'IS' | 'BS' | 'CUSTOM') => 
                  handleInputChange('codeStandard', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select code standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IS">IS (Indian Standard)</SelectItem>
                  <SelectItem value="BS">BS (British Standard)</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Please select a code profile above for better parameter management
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {submitLabel}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}