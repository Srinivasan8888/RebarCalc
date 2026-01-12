// Core type definitions for RebarCalc BBS Calculator

// Bend deductions configuration
export interface BendDeductions {
  deg45: number;  // multiplier × diameter (default: 1)
  deg90: number;  // multiplier × diameter (default: 2)
  deg135: number; // multiplier × diameter (default: 3)
}

// Project configuration
export interface ProjectConfig {
  id: string;
  name: string;
  codeStandard: 'IS' | 'BS' | 'CUSTOM';
  codeProfileId?: string;         // Selected code profile ID
  defaultCover: number;           // mm
  defaultHookMultiplier: number;  // typically 9
  bendDeductions: BendDeductions;
  createdAt: Date;
  updatedAt: Date;
}

// Shape codes
export type ShapeCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

// Shape definition
export interface ShapeDefinition {
  code: ShapeCode;
  name: string;
  description: string;
  requiredDimensions: ('A' | 'B' | 'C' | 'D')[];
  bendAngles: number[];  // angles in degrees for deduction calculation
  hasHook: boolean;
  diagramSvg: string;    // SVG path for visual representation
}

// Bar dimensions
export interface BarDimensions {
  A: number;   // primary dimension (mm)
  B?: number;  // secondary dimension (mm)
  C?: number;  // tertiary dimension (mm)
  D?: number;  // quaternary dimension (mm)
}

// Member type
export type MemberType = 'BEAM' | 'COLUMN' | 'SLAB';


// Bar entry (user input)
export interface BarEntry {
  id: string;
  memberType: MemberType;
  shapeCode: ShapeCode;
  diameter: number;        // mm (8, 10, 12, 16, 20, 25, 32)
  dimensions: BarDimensions;
  spacing: number;         // mm (0 for individual bars)
  quantity: number;
  remarks?: string;
}

// Calculated result
export interface CalculatedBar extends BarEntry {
  cutLength: number;      // mm
  unitWeight: number;     // kg
  totalLength: number;    // mm (cutLength × quantity)
  totalWeight: number;    // kg
}

// Summary aggregations
export interface DiameterSummary {
  diameter: number;
  totalLength: number;    // m
  totalWeight: number;    // kg
  barCount: number;
}

export interface ShapeSummary {
  shapeCode: ShapeCode;
  shapeName: string;
  totalLength: number;    // m
  totalWeight: number;    // kg
  barCount: number;
}

export interface MemberSummary {
  memberType: MemberType;
  totalLength: number;    // m
  totalWeight: number;    // kg
  barCount: number;
}

// Member defaults configuration
export interface MemberDefaults {
  defaultCover: number;
  defaultSpacing: number;
  commonDiameters: number[];
}

// Code profile definitions
export interface CodeProfile {
  id: string;
  name: string;
  description: string;
  standard: string;          // "IS 456:2000", "BS 8110", "Custom"
  isEditable: boolean;
  
  // Default parameters
  defaultCover: number;
  defaultHookMultiplier: number;
  bendDeductions: BendDeductions;
  
  // Member-specific defaults
  memberDefaults: {
    [K in MemberType]: MemberDefaults;
  };
  
  // Code-specific rules
  minimumCover: {
    [K in MemberType]: number;
  };
  
  maximumSpacing: {
    [K in MemberType]: number;
  };
  
  // Development length factors (for future use)
  developmentLengthFactors?: {
    straight: number;
    hooked: number;
    compression: number;
  };
}

// Code profile service interface
export interface CodeProfileService {
  // Get available profiles
  getAvailableProfiles(): CodeProfile[];
  
  // Get specific profile
  getProfile(id: string): CodeProfile | null;
  
  // Create custom profile
  createCustomProfile(base: CodeProfile, overrides: Partial<CodeProfile>): CodeProfile;
  
  // Apply profile to project
  applyProfile(projectConfig: ProjectConfig, profile: CodeProfile): ProjectConfig;
  
  // Validate profile parameters
  validateProfile(profile: CodeProfile): ValidationResult;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
