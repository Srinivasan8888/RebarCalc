// Concrete component types matching BBS spreadsheet format
export const COMPONENT_TYPES_VERSION = '1.0.0'; // Runtime export to ensure module resolution

export type ConcreteComponentType = 'BEAM' | 'COLUMN' | 'SLAB' | 'FOOTING';

// Footing subtypes (pile variants)
export type FootingType = 'ISOLATED' | 'COMBINED' | 'PILE_CYLINDER' | 'PILE_CUBOID';

// Grade of steel and concrete
export type ConcreteGrade = 'M20' | 'M25' | 'M30' | 'M35' | 'M40';
export type SteelGrade = 'Fe415' | 'Fe500' | 'Fe550';

// Development length table (Ld values based on grade)
// Key is diameter (number), Value is Ld (number)
export interface DevelopmentLengthTable {
  [diameter: number]: number;
}

// Project Metadata (User Input)
export interface BBSMetadata {
  projectName: string;
  drawingNumber: string;
  itemDescription: string;         // e.g., "20th Floor Slab Reinforcement"
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;
}

// Component definition (like "A1 (B1 - 3H)" in the image)
export interface ConcreteComponent {
  id: string;
  name: string;                    // e.g., "A1", "FB1", "C1"
  description?: string;            // e.g., "(B1 - 3H)"
  componentType: ConcreteComponentType;
  footingType?: FootingType;       // Only for FOOTING
  
  // Span dimensions
  spanX: number;                   // mm - Span in X direction
  spanY: number;                   // mm - Span in Y direction
  depth?: number;                  // mm - Depth/Height
  
  // Cover settings
  cover: number;                   // mm

  // New fields for Slab U-Bar Automation
  beamWidths?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  
  topExtensions?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  
  // Reinforcement bars (child entries)
  bars: ComponentBarEntry[];
}

// Direction of bars
export type BarDirection = 'X' | 'Y' | 'BOTH' | 'NONE';

// Bar measurements following BBS standard (columns a through f + Lap)
export interface BarMeasurements {
  a: number;                       // mm - first segment
  b?: number;                      // mm - second segment
  c?: number;                      // mm - third segment
  d?: number;                      // mm - fourth segment
  e?: number;                      // mm - fifth segment
  f?: number;                      // mm - sixth segment
  lap?: number;                    // mm - lap length
}

// Calculated result for each bar entry
export interface CalculatedBarResult {
  totalMeasurement: number;        // Sum of a+b+c+d+e+f+lap
  noOfDeductions: number;          // Number of bends to deduct
  deductionAmount: number;         // mm - Amount to deduct
  cuttingLength: number;           // mm - totalMeasurement - deductionAmount
  noOfBars: number;                // Quantity
  totalLength: number;             // m - cutting length × quantity
  unitWeight: number;              // kg per meter (based on diameter)
  totalWeight: number;             // kg - total weight for this entry
}

// Bar entry within a component (like "Bottom Bar X-X" in image)
export interface ComponentBarEntry {
  id: string;
  barType: string;                 // "Bottom Bar (X-X)", "Top Bar", etc.
  direction: BarDirection;
  
  // Bar properties
  diameter: number;                // mm
  spacing: number;                 // mm (c/c)
  
  // Measurements (a, b, c, d, e, f, Lap as per BBS format)
  measurements: BarMeasurements;
  
  // Deduction override (optional, if user wants to specify bends manually)
  manualNoOfDeductions?: number;
  
  // Quantity override (optional, if user wants to override auto-calc)
  manualNoOfBars?: number;
  
  // Calculated results (populated by calculator)
  calculated?: CalculatedBarResult;
}

// Summary for entire component
export interface ComponentSummary {
  componentId: string;
  componentName: string;
  totalBars: number;
  totalLengthM: number;
  totalWeightKg: number;
}

// Grand total for project
export interface ProjectSteelSummary {
  byDiameter: { [diameter: number]: { lengthM: number; weightKg: number } };
  totalWeightKg: number;
  totalWeightMT: number;           // Metric tonnes
}
