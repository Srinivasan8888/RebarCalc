import type { CodeProfile, CodeProfileService, ProjectConfig, ValidationResult } from '../types';
import { CODE_PROFILES } from '../lib/code-profiles';

export class CodeProfileServiceImpl implements CodeProfileService {
  
  /**
   * Get all available code profiles
   */
  getAvailableProfiles(): CodeProfile[] {
    return Object.values(CODE_PROFILES);
  }
  
  /**
   * Get a specific profile by ID
   */
  getProfile(id: string): CodeProfile | null {
    return CODE_PROFILES[id] || null;
  }
  
  /**
   * Create a custom profile based on an existing profile with overrides
   */
  createCustomProfile(base: CodeProfile, overrides: Partial<CodeProfile>): CodeProfile {
    const customProfile: CodeProfile = {
      ...base,
      ...overrides,
      id: overrides.id || `custom_${Date.now()}`,
      isEditable: true,
      standard: 'Custom'
    };
    
    // Validate the custom profile
    const validation = this.validateProfile(customProfile);
    if (!validation.valid) {
      throw new Error(`Invalid custom profile: ${validation.errors.join(', ')}`);
    }
    
    return customProfile;
  }
  
  /**
   * Apply a code profile to a project configuration
   */
  applyProfile(projectConfig: ProjectConfig, profile: CodeProfile): ProjectConfig {
    return {
      ...projectConfig,
      codeProfileId: profile.id,
      defaultCover: profile.defaultCover,
      defaultHookMultiplier: profile.defaultHookMultiplier,
      bendDeductions: { ...profile.bendDeductions },
      codeStandard: this.mapProfileToCodeStandard(profile.id),
      updatedAt: new Date()
    };
  }
  
  /**
   * Validate profile parameters
   */
  validateProfile(profile: CodeProfile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate basic parameters
    if (profile.defaultCover < 10 || profile.defaultCover > 100) {
      errors.push('Default cover must be between 10mm and 100mm');
    }
    
    if (profile.defaultHookMultiplier < 4 || profile.defaultHookMultiplier > 15) {
      errors.push('Hook multiplier must be between 4 and 15');
    }
    
    // Validate bend deductions
    if (profile.bendDeductions.deg45 < 0 || profile.bendDeductions.deg45 > 5) {
      errors.push('45° bend deduction must be between 0 and 5');
    }
    
    if (profile.bendDeductions.deg90 < 0 || profile.bendDeductions.deg90 > 5) {
      errors.push('90° bend deduction must be between 0 and 5');
    }
    
    if (profile.bendDeductions.deg135 < 0 || profile.bendDeductions.deg135 > 5) {
      errors.push('135° bend deduction must be between 0 and 5');
    }
    
    // Validate member defaults
    for (const memberType of ['BEAM', 'COLUMN', 'SLAB'] as const) {
      const memberDefault = profile.memberDefaults[memberType];
      const minCover = profile.minimumCover[memberType];
      const maxSpacing = profile.maximumSpacing[memberType];
      
      if (memberDefault.defaultCover < minCover) {
        errors.push(`${memberType} default cover (${memberDefault.defaultCover}mm) is less than minimum (${minCover}mm)`);
      }
      
      if (memberDefault.defaultSpacing > maxSpacing) {
        warnings.push(`${memberType} default spacing (${memberDefault.defaultSpacing}mm) exceeds maximum (${maxSpacing}mm)`);
      }
      
      if (memberDefault.commonDiameters.length === 0) {
        errors.push(`${memberType} must have at least one common diameter`);
      }
      
      // Check for valid diameter values
      const validDiameters = [6, 8, 10, 12, 16, 20, 25, 32];
      for (const dia of memberDefault.commonDiameters) {
        if (!validDiameters.includes(dia)) {
          errors.push(`${memberType} has invalid diameter: ${dia}mm`);
        }
      }
    }
    
    // Validate minimum covers
    if (profile.minimumCover.BEAM < 15 || profile.minimumCover.BEAM > 75) {
      errors.push('Beam minimum cover must be between 15mm and 75mm');
    }
    
    if (profile.minimumCover.COLUMN < 20 || profile.minimumCover.COLUMN > 100) {
      errors.push('Column minimum cover must be between 20mm and 100mm');
    }
    
    if (profile.minimumCover.SLAB < 10 || profile.minimumCover.SLAB > 50) {
      errors.push('Slab minimum cover must be between 10mm and 50mm');
    }
    
    // Validate maximum spacing
    if (profile.maximumSpacing.BEAM < 100 || profile.maximumSpacing.BEAM > 500) {
      warnings.push('Beam maximum spacing should be between 100mm and 500mm');
    }
    
    if (profile.maximumSpacing.COLUMN < 100 || profile.maximumSpacing.COLUMN > 500) {
      warnings.push('Column maximum spacing should be between 100mm and 500mm');
    }
    
    if (profile.maximumSpacing.SLAB < 100 || profile.maximumSpacing.SLAB > 500) {
      warnings.push('Slab maximum spacing should be between 100mm and 500mm');
    }
    
    // Validate development length factors if present
    if (profile.developmentLengthFactors) {
      const factors = profile.developmentLengthFactors;
      
      if (factors.straight < 0.5 || factors.straight > 2.0) {
        errors.push('Straight development length factor must be between 0.5 and 2.0');
      }
      
      if (factors.hooked < 0.3 || factors.hooked > 1.5) {
        errors.push('Hooked development length factor must be between 0.3 and 1.5');
      }
      
      if (factors.compression < 0.5 || factors.compression > 1.5) {
        errors.push('Compression development length factor must be between 0.5 and 1.5');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Map profile ID to legacy code standard format
   */
  private mapProfileToCodeStandard(profileId: string): 'IS' | 'BS' | 'CUSTOM' {
    switch (profileId) {
      case 'IS456':
        return 'IS';
      case 'BS8110':
        return 'BS';
      default:
        return 'CUSTOM';
    }
  }
}

// Export singleton instance
export const codeProfileService = new CodeProfileServiceImpl();