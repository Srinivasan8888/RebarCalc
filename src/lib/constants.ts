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

// Development length factors (approx Ld/D) based on IS 456
const LD_FACTORS = {
  M20: 57,
  M25: 50, // Standard 49, rounded to 50
  M30: 50, // Excel uses ~50D (e.g. 12mm -> 599)
  M35: 41,
  M40: 36, 
};

// Generate table helper
const generateLdTable = (factor: number) => {
  const table: Record<number, number> = {};
  VALID_DIAMETERS.forEach(d => {
    table[d] = Math.ceil(d * factor);
  });
  return table;
};

export const DEVELOPMENT_LENGTH_TABLES = {
  M20: generateLdTable(LD_FACTORS.M20),
  M25: generateLdTable(LD_FACTORS.M25),
  M30: { // Specific values from Excel reference where available
    8: 400,
    10: 500,
    12: 599, // Excel value
    16: 798, // Excel value
    20: 998, // Excel value
    25: 1247, // Excel value
    32: 1995, // Excel calc
    6: 300 // inferred
  }, // Fallback to factor if not listed
  M35: generateLdTable(LD_FACTORS.M35),
  M40: generateLdTable(LD_FACTORS.M40),
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
    'Bottom Bar (Y-Y)',
    'Bottom Bar (X-X) Full Span',
    'Bottom Bar (Y-Y) Full Span',
    'Bottom Bar Dist (X-X)',
    'Bottom Bar Dist (Y-Y)',
    'Top Main Bar (X-X) - Left',
    'Top Main Bar (X-X) - Right',
    'Top Main Bar (X-X) - Left & Right',
    'Top Main Bar (Y-Y) - Top',
    'Top Main Bar (Y-Y) - Bottom',
    'Top Main Bar (Y-Y) - Top & Bottom',
    'Top Dist Bar (X-X) - Left',
    'Top Dist Bar (X-X) - Right',
    'Top Dist Bar (X-X) - Left & Right',
    'Top Dist Bar (Y-Y) - Top',
    'Top Dist Bar (Y-Y) - Bottom',
    'Top Dist Bar (Y-Y) - Top & Bottom',
    'Top Bar (X-X)',
    'Top Bar (Y-Y)',
    'Top Bar (X-X) Full Span',
    'Top Bar (Y-Y) Full Span',
    'Bottom & Top Bar (X-X)',
    'Bottom & Top Bar (Y-Y)',
    'Extra Top',
    'Extra Bottom',
    'Chair Bar',
  ],
  BEAM: [
    'Span_Top - Layer 1',
    'Span_Top - Layer 2',
    'Span_Bottom - Layer 1',
    'Span_Bottom - Layer 2',
    'Span_Bottom _Curtail',
    'Top Extra - Layer 2 - Left',
    'Top Extra - Layer 2 - Right',
    'Top Extra - Layer 2 - Left & Right',
    'Side Face Steel',
    'Stirrups - Full',
    'Stirrups - Left',
    'Stirrups - Middle',
    'Stirrups - Right',
    'Stirrups - L & R',
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

// Default Development Lengths (Ld) for M30 Concrete (shim for logic verification)
export const DEFAULT_DEVELOPMENT_LENGTHS = DEVELOPMENT_LENGTH_TABLES.M30;

// Default Standard Bar Length (12 meters)
export const DEFAULT_STANDARD_BAR_LENGTH = 12000;