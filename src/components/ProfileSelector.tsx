import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Settings } from 'lucide-react';
import type { CodeProfile } from '@/types';
import { codeProfileService } from '@/services/code-profile-service';

interface ProfileSelectorProps {
  selectedProfileId?: string;
  onProfileSelect: (profile: CodeProfile) => void;
  onCustomProfileEdit?: (profile: CodeProfile) => void;
  showDetails?: boolean;
  className?: string;
}

export function ProfileSelector({
  selectedProfileId,
  onProfileSelect,
  onCustomProfileEdit,
  showDetails = true,
  className = ''
}: ProfileSelectorProps) {
  const [selectedProfile, setSelectedProfile] = useState<CodeProfile | null>(
    selectedProfileId ? codeProfileService.getProfile(selectedProfileId) : null
  );

  const availableProfiles = codeProfileService.getAvailableProfiles();

  const handleProfileChange = (profileId: string) => {
    const profile = codeProfileService.getProfile(profileId);
    if (profile) {
      setSelectedProfile(profile);
      onProfileSelect(profile);
    }
  };

  const handleCustomEdit = () => {
    if (selectedProfile && onCustomProfileEdit) {
      onCustomProfileEdit(selectedProfile);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Profile Selection Dropdown */}
      <div className="space-y-2">
        <label htmlFor="profile-select" className="text-sm font-medium">
          Code Profile
        </label>
        <Select
          value={selectedProfile?.id || ''}
          onValueChange={handleProfileChange}
        >
          <SelectTrigger id="profile-select">
            <SelectValue placeholder="Select a code profile" />
          </SelectTrigger>
          <SelectContent>
            {availableProfiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                <div className="flex items-center gap-2">
                  <span>{profile.name}</span>
                  {profile.isEditable && (
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Profile Details Card */}
      {selectedProfile && showDetails && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {selectedProfile.name}
                  {selectedProfile.isEditable && (
                    <Badge variant="outline" className="text-xs">
                      Editable
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {selectedProfile.description}
                </CardDescription>
              </div>
              {selectedProfile.isEditable && onCustomProfileEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomEdit}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Parameters Preview */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Info className="h-4 w-4" />
                Key Parameters
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Default Cover</span>
                  <div className="font-medium">{selectedProfile.defaultCover}mm</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Hook Multiplier</span>
                  <div className="font-medium">{selectedProfile.defaultHookMultiplier}×</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">90° Bend</span>
                  <div className="font-medium">{selectedProfile.bendDeductions.deg90}× dia</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">135° Bend</span>
                  <div className="font-medium">{selectedProfile.bendDeductions.deg135}× dia</div>
                </div>
              </div>
            </div>

            {/* Member-Specific Defaults */}
            <div>
              <h4 className="text-sm font-medium mb-2">Member Defaults</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                {Object.entries(selectedProfile.memberDefaults).map(([memberType, defaults]) => (
                  <div key={memberType} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">{memberType}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cover:</span>
                        <span>{defaults.defaultCover}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spacing:</span>
                        <span>{defaults.defaultSpacing}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diameters:</span>
                        <span>{defaults.commonDiameters.join(', ')}mm</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Standard Information */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Standard:</span>
                <Badge variant="secondary">{selectedProfile.standard}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}