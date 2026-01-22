// Constants for RebarCalc BBS Calculator

import type { ShapeCode, ShapeDefinition, MemberType, MemberDefaults, ProjectConfig } from '../types';

// Shape definitions with all 6 shapes (S1-S6)
export const SHAPE_DEFINITIONS: Record<ShapeCode, ShapeDefinition> = {
  S1: {
    code: 'S1',
    name: 'Straight',
    description: 'Straight bar with no bends',
    requiredDimensions: ['A'],
    bendAngles: [],
    hasHook: false,
    diagramSvg: 'M 10 50 L 190 50',
  },
  S2: {
    code: 'S2',
    name: 'U-Bar',
    description: 'U-shaped bar with two 90° bends',
    requiredDimensions: ['A', 'B'],
    bendAngles: [90, 90],
    hasHook: false,
    diagramSvg: 'M 10 20 L 10 80 L 190 80 L 190 20',
  },
  S3: {
    code: 'S3',
    name: 'Stirrup',
    description: 'Rectangular stirrup with hooks',
    requiredDimensions: ['A', 'B'],
    bendAngles: [90, 90, 90, 90, 135, 135],
    hasHook: true,
    diagramSvg: 'M 30 10 L 10 10 L 10 90 L 190 90 L 190 10 L 170 10 M 30 10 L 40 20 M 170 10 L 160 20',
  },
  S4: {
    code: 'S4',
    name: 'Cranked',
    description: 'Cranked bar with inclined portion',
    requiredDimensions: ['A', 'B', 'C'],
    bendAngles: [45, 45],
    hasHook: false,
    diagramSvg: 'M 10 70 L 60 70 L 100 30 L 140 30 L 190 30',
  },
  S5: {
    code: 'S5',
    name: 'L-Bar',
    description: 'L-shaped bar with one 90° bend',
    requiredDimensions: ['A', 'B'],
    bendAngles: [90],
    hasHook: false,
    diagramSvg: 'M 10 20 L 10 80 L 190 80',
  },
  S6: {
    code: 'S6',
    name: 'Hooked',
    description: 'Straight bar with hook at one end',
    requiredDimensions: ['A'],
    bendAngles: [180],
    hasHook: true,
    diagramSvg: 'M 10 50 L 170 50 Q 190 50 190 70 Q 190 90 170 90',
  },
};


// Default member configurations for BEAM, COLUMN, SLAB
export const MEMBER_DEFAULTS: Record<MemberType, MemberDefaults> = {
  BEAM: {
    defaultCover: 25,
    defaultSpacing: 150,
    commonDiameters: [8, 10, 12, 16, 20],
  },
  COLUMN: {
    defaultCover: 40,
    defaultSpacing: 150,
    commonDiameters: [12, 16, 20, 25, 32],
  },
  SLAB: {
    defaultCover: 20,
    defaultSpacing: 150,
    commonDiameters: [8, 10, 12],
  },
};

// Valid bar diameters (mm)
export const VALID_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32] as const;

// Code standards
export const CODE_STANDARDS = ['IS', 'BS', 'CUSTOM'] as const;

// Default project configuration for testing/fallback
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  id: 'default',
  name: 'Default Project',
  codeStandard: 'IS',
  defaultCover: 25,
  defaultHookMultiplier: 9,
  bendDeductions: {
    deg45: 1,
    deg90: 2,
    deg135: 3,
  },
  calculationMode: 'MANUAL',
  components: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================================================
// COMPONENT BASED METHODOLOGY CONSTANTS
// ============================================================================

// Development length table (Ld) per diameter for M30 concrete
// TODO: Expand for other grades based on standard formulas
export const DEVELOPMENT_LENGTH_M30: Record<number, number> = {
  8: 400,
  10: 500,
  12: 699,
  14: 798,
  16: 998,
  20: 1247,
  25: 1995,
  32: 2555,
};

// Weight per meter for each diameter (kg/m)
// Formula: D² / 162
export const WEIGHT_PER_METER: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.889,
  14: 1.21,
  16: 1.58,
  20: 2.47,
  25: 3.85,
  32: 6.31,
};

// Default covers by component type (IS code)
export const COMPONENT_COVERS: Record<string, number> = {
  SLAB: 20,
  BEAM: 25,
  COLUMN: 40,
  FOOTING: 50,
};

// Bar types/Descriptions for each component
export const BAR_TYPES = {
  SLAB: [
    'Bottom Bar (X-X)',
    'Bottom Bar Dist (X)',
    'Bottom Bar (Y-Y)', 
    'Bottom Bar Dist (Y)',
    'Top Bar (X-X)',
    'Top Bar Dist (X)',
    'Top Bar (Y-Y)',
    'Top Bar Dist (Y)',
    'Extra Top',
    'Extra Bottom',
  ],
  BEAM: [
    'Top Bar',
    'Bottom Bar',
    'Side Face Bar',
    'Stirrups',
    'Extra Bar',
  ],
  COLUMN: [
    'Main Bar',
    'Tie',
    'Master Tie',
  ],
  FOOTING: [
    'Bottom Main (L)',
    'Bottom Dist (B)',
    'Top Main (L)', 
    'Top Dist (B)',
    'Dowel Bars',
  ]
};

// Footing types (pile variants only for footings)
export const FOOTING_TYPES = ['ISOLATED', 'COMBINED', 'PILE_CYLINDER', 'PILE_CUBOID'];
