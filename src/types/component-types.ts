// Concrete component types matching BBS spreadsheet format
export type ConcreteComponentType = 'BEAM' | 'COLUMN' | 'SLAB' | 'FOOTING';

// Footing subtypes (pile variants)
export type FootingType = 'ISOLATED' | 'COMBINED' | 'PILE_CYLINDER' | 'PILE_CUBOID';

// Grade of steel and concrete
export type ConcreteGrade = 'M20' | 'M25' | 'M30' | 'M35' | 'M40';
export type SteelGrade = 'Fe415' | 'Fe500' | 'Fe550';

// Project Metadata (User Input)
export interface BBSMetadata {
  projectName: string;
  drawingNumber: string;
  itemDescription: string;         // e.g., "20th Floor Slab Reinforcement"
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;
  developmentLengths?: Record<number, number>; // Ld per diameter (slab sheet F2:L3, beam sheet W3:AC4)
  standardBarLength?: number;      // Standard bar length in mm
  curtailOffset?: number;          // Beam sheet R8 "Bottom curtainment spacing" (mm)
  issuedKg?: Record<number, number>; // steel issued to site per dia, reconciled against BBS kg (IS 1786 tolerance)
  doubts?: ProjectDoubt[];         // every assumption the app made; kept with the project until someone rules on it
}

/** A doubt is never resolved silently: it stays listed until a person writes the ruling. */
export interface ProjectDoubt {
  text: string;
  ruling?: string;
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

  // Beam sheet col F "Element": identical members sharing this entry (multiplies every bar count)
  elementCount?: number;

  // Continuous run (beam sheet: one S.No over B1,B2,B3 sharing a Full Span bar); position 1..n left→right
  runId?: string;
  runPosition?: number;

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
  
  // BBS Quantity fields
  barsPerMember?: number;          // No. of bars required per member
  totalMembers?: number;           // Total no. of members required
  
  // Section-specific dimensions (for composite/L-shaped slabs)
  section_span_1?: number;         // mm - Section-specific override or base dimension
  section_span_2?: number;         // mm - Extension or alternate section dimension
  
  // Measurements (a, b, c, d, e, f, Lap as per BBS format)
  measurements: BarMeasurements;
  
  // Deduction override (optional, if user wants to specify bends manually)
  manualNoOfDeductions?: number;
  
  // Quantity override (optional, if user wants to override auto-calc)
  manualNoOfBars?: number;
  
  // Calculated results (populated by calculator)
  calculated?: CalculatedBarResult;
}

// Grand total for project
export interface ProjectSteelSummary {
  byDiameter: { [diameter: number]: { lengthM: number; weightKg: number } };
  totalWeightKg: number;
  totalWeightMT: number;           // Metric tonnes
}
