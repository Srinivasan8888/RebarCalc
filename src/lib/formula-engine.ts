/**
 * Rebar Calculation Data Model and Engine
 * 
 * This module provides TypeScript interfaces and calculation functions
 * for rebar bar bending schedule (BBS) calculations.
 */

// ============================================
// PRIMARY INPUTS
// ============================================

export interface ProjectMetadata {
  concrete_grade: string;        // e.g., "M30"
  steel_grade: string;           // e.g., "550D"
  cover: number;                 // mm
  ld_values: Record<string, number>; // Development length by diameter
}

export interface MemberDimensions {
  // Unique identifier for this member/slab/beam
  member_id: string;
  member_type?: 'slab' | 'beam' | 'column' | 'footing';  // Optional type identifier
  
  // Basic dimensions (slabs)
  span_x?: number;                // mm
  span_y?: number;                // mm
  slab_depth?: number;            // mm
  
  // Projections (optional)
  projection_x1?: number;        // mm
  projection_x2?: number;        // mm
  projection_y1?: number;        // mm
  projection_y2?: number;        // mm
  
  // Openings (optional)
  opening_x?: number;            // mm
  opening_y?: number;            // mm
  
  // Hook/bend dimensions
  hook_length_x1?: number;       // mm
  hook_length_x2?: number;       // mm
  hook_length_y1?: number;       // mm
  hook_length_y2?: number;       // mm
  additional_hook_y?: number;    // mm
  
  // ✅ NEW: Beam-specific dimensions
  beam_length?: number;          // Total beam length (mm)
  beam_span?: number;            // Clear span (mm)
  beam_depth?: number;           // Overall depth (mm)
  
  // Beam width variations (left/right)
  beam_width_left?: number;      // Left side width (mm)
  beam_width_right?: number;     // Right side width (mm)
  
  // Beam depth variations (top/bottom)
  beam_depth_top?: number;       // Top depth (mm)
  beam_depth_bottom?: number;    // Bottom depth (mm)
  
  // Top bar extensions (for beams)
  top_extension_1?: number;      // First extension (mm)
  top_extension_2?: number;      // Second extension (mm)
  top_extension_3?: number;      // Third extension (mm)
  top_extension_4?: number;      // Fourth extension (mm)
  
  // Support dimensions
  support_width_left?: number;   // Left support width (mm)
  support_width_right?: number;  // Right support width (mm)
}

export interface BarTypeInput {
  bar_type: string;              // e.g., "Bottom Bar (X-X)"
  spacing: number;               // mm
  dia: number;                   // mm (diameter)
  no_bars: number;               // bars per member
  member_ref: string;            // Reference to MemberDimensions.member_id
  bend_count: number;            // Number of bends (R value) - REQUIRED, typically 2 or 4
  cover_pattern?: CoverDeductionPattern; // Optional override for cover deduction
  
  // Section-specific dimensions (from Excel Span1/Span2 columns)
  section_span_1?: number;       // Span1: Section-specific override or base dimension
  section_span_2?: number;       // Span2: Extension or alternate section dimension
}

// ============================================
// INTERMEDIATE CALCULATIONS
// ============================================

export interface IntermediateValues {
  // Projections
  total_projection_x?: number;   // K11 + L11
  total_projection_y?: number;   // M11 + N11
  
  // Adjusted spans
  adjusted_span_x?: number;      // span_x - opening_x
  adjusted_span_y?: number;      // span_y - opening_y
  
  // Bar count
  total_members: number;         // ROUNDUP(span/spacing, 0)
  
  // Measurement components
  meas_a: number;                // Main span
  meas_b: number;                // Hook/bend 1
  meas_c: number;                // Hook/bend 2
  meas_d: number;                // Depth dimension 1
  meas_e: number;                // Depth dimension 2
  meas_f?: number;               // Additional length (optional)
}

// ============================================
// FINAL OUTPUTS
// ============================================

export interface BarCalculationOutput {
  bar_type: string;
  dia: number;
  spacing: number;
  no_bars: number;
  bend_count: number;            // Number of bends
  
  // Intermediate (but important for display)
  total_members: number;
  total_nos: number;             // total_members × no_bars
  
  // Measurements
  meas_a: number;
  meas_b: number;
  meas_c: number;
  meas_d: number;
  meas_e: number;
  meas_f?: number;
  
  // Final outputs
  cut_length: number;            // SUM(meas_a...meas_f)
  deduction: number;             // bend_count × dia × 2
  total_length: number;          // total_nos × cut_length
  weight: number;                // (dia² / 162) × cut_length × total_nos / 1000
}

// ============================================
// COMPLETE PROJECT
// ============================================

export interface RebarProject {
  project_id: string;
  project_name: string;
  metadata: ProjectMetadata;
  members: MemberDimensions[];
  bar_types: BarTypeInput[];
  
  // Computed results (cached)
  calculations?: BarCalculationOutput[];
}

// ============================================
// COVER DEDUCTION PATTERNS
// ============================================

export enum CoverDeductionPattern {
  FULL_U_SHAPE = 'FULL_U_SHAPE',         // 4 bends: 2× cover on depth, doubled hooks
  SIMPLE_L_SHAPE = 'SIMPLE_L_SHAPE',     // 2 bends: 1× cover on all
  COMBINED_BARS = 'COMBINED_BARS',       // Cover on main span too
  FULL_SPAN = 'FULL_SPAN'                // Uses development length
}

export interface CoverDeductionInfo {
  meas_a_deduction: number;    // 0, 1, or 2 (multiplier for cover)
  meas_b_deduction: number;
  meas_b_doubled: boolean;     // true if formula is 2*(dim-cover)
  meas_c_deduction: number;
  meas_c_doubled: boolean;
  meas_d_deduction: number;    // 1 or 2
  meas_e_deduction: number;
  meas_f_deduction: number;    // Usually 0
}

// ============================================
// FORMULA PATTERNS
// ============================================

export enum FormulaPattern {
  BASIC_X_X = 'BASIC_X_X',                    // Bottom Bar (X-X)
  BASIC_Y_Y = 'BASIC_Y_Y',                    // Bottom Bar (Y-Y)
  DISTRIBUTED_X_X = 'DISTRIBUTED_X_X',        // Bottom Bar Dist (X-X)
  DISTRIBUTED_Y_Y = 'DISTRIBUTED_Y_Y',        // Bottom Bar Dist (Y-Y)
  BOTH_BARS_X_X = 'BOTH_BARS_X_X',           // Bottom & Top Bar (X-X)
  BOTH_BARS_Y_Y = 'BOTH_BARS_Y_Y',           // Bottom & Top Bar (Y-Y)
  FULL_SPAN_X_X = 'FULL_SPAN_X_X',           // Bottom Bar (X-X) Full Span
  FULL_SPAN_Y_Y = 'FULL_SPAN_Y_Y',           // Bottom Bar (Y-Y) Full Span
  WITH_OPENING_X_X = 'WITH_OPENING_X_X',     // With opening in X
  WITH_OPENING_Y_Y = 'WITH_OPENING_Y_Y',     // With opening in Y
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Determine the cover deduction pattern based on bar type and bend count
 */
export function detectCoverPattern(barType: string, bendCount: number): CoverDeductionPattern {
  const normalized = barType.toLowerCase();
  
  // Combined top & bottom bars
  if (normalized.includes('bottom & top') || normalized.includes('bottom \u0026 top')) {
    return CoverDeductionPattern.COMBINED_BARS;
  }
  
  // Full span bars
  if (normalized.includes('full span')) {
    return CoverDeductionPattern.FULL_SPAN;
  }
  
  // Based on bend count
  if (bendCount === 4) {
    return CoverDeductionPattern.FULL_U_SHAPE;
  } else if (bendCount === 2) {
    return CoverDeductionPattern.SIMPLE_L_SHAPE;
  }
  
  // Default
  return CoverDeductionPattern.SIMPLE_L_SHAPE;
}

/**
 * Get cover deduction information for a pattern
 */
export function getCoverDeductionInfo(pattern: CoverDeductionPattern): CoverDeductionInfo {
  switch (pattern) {
    case CoverDeductionPattern.FULL_U_SHAPE:
      return {
        meas_a_deduction: 0,
        meas_b_deduction: 1,
        meas_b_doubled: true,   // 2*(dim-cover)
        meas_c_deduction: 1,
        meas_c_doubled: true,   // 2*(dim-cover)
        meas_d_deduction: 2,    // dim-(2*cover)
        meas_e_deduction: 2,    // dim-(2*cover)
        meas_f_deduction: 0
      };
      
    case CoverDeductionPattern.SIMPLE_L_SHAPE:
      return {
        meas_a_deduction: 0,
        meas_b_deduction: 1,
        meas_b_doubled: false,  // dim-cover
        meas_c_deduction: 1,
        meas_c_doubled: false,
        meas_d_deduction: 1,    // dim-cover
        meas_e_deduction: 1,
        meas_f_deduction: 0
      };
      
    case CoverDeductionPattern.COMBINED_BARS:
      return {
        meas_a_deduction: 1,    // Main span has cover!
        meas_b_deduction: 1,
        meas_b_doubled: false,
        meas_c_deduction: 1,
        meas_c_doubled: false,
        meas_d_deduction: 1,
        meas_e_deduction: 1,
        meas_f_deduction: 0
      };
      
    case CoverDeductionPattern.FULL_SPAN:
      return {
        meas_a_deduction: 0,
        meas_b_deduction: 1,
        meas_b_doubled: false,
        meas_c_deduction: 1,
        meas_c_doubled: false,
        meas_d_deduction: 1,
        meas_e_deduction: 1,    // Fixed: should deduct cover like SIMPLE_L_SHAPE
        meas_f_deduction: 0
      };
      
    default:
      return {
        meas_a_deduction: 0,
        meas_b_deduction: 1,
        meas_b_doubled: false,
        meas_c_deduction: 1,
        meas_c_doubled: false,
        meas_d_deduction: 1,
        meas_e_deduction: 1,
        meas_f_deduction: 0
      };
  }
}

/**
 * Determine the formula pattern based on bar type name
 */
export function detectFormulaPattern(barType: string): FormulaPattern {
  const normalized = barType.toLowerCase();
  
  if (normalized.includes('dist') && normalized.includes('x-x')) {
    return FormulaPattern.DISTRIBUTED_X_X;
  }
  if (normalized.includes('dist') && normalized.includes('y-y')) {
    return FormulaPattern.DISTRIBUTED_Y_Y;
  }
  if (normalized.includes('bottom & top') && normalized.includes('x-x')) {
    return FormulaPattern.BOTH_BARS_X_X;
  }
  if (normalized.includes('bottom & top') && normalized.includes('y-y')) {
    return FormulaPattern.BOTH_BARS_Y_Y;
  }
  if (normalized.includes('full span') && normalized.includes('x-x')) {
    return FormulaPattern.FULL_SPAN_X_X;
  }
  if (normalized.includes('full span') && normalized.includes('y-y')) {
    return FormulaPattern.FULL_SPAN_Y_Y;
  }
  if (normalized.includes('x-x')) {
    return FormulaPattern.BASIC_X_X;
  }
  if (normalized.includes('y-y')) {
    return FormulaPattern.BASIC_Y_Y;
  }
  
  return FormulaPattern.BASIC_X_X; // Default
}

/**
 * Calculate total number of members (bars) required
 */
export function calculateTotalMembers(
  member: MemberDimensions,
  barType: BarTypeInput,
  pattern: FormulaPattern
): number {
  const { span_x, span_y, projection_x1, projection_x2, projection_y1, projection_y2 } = member;
  
  // Determine the span to use for member calculation
  let span = 0;
  
  // For distribution bars with section width
  if (barType.section_span_1 && barType.bar_type.toLowerCase().includes('dist')) {
    // Distribution bars span the perpendicular direction
    const isXDirection = pattern.toString().includes('X_X');
    span = isXDirection ? (span_y || 0) : (span_x || 0);
  }
  // For section-specific bars, use the appropriate dimension
  else if (barType.section_span_1 || barType.section_span_2) {
    // This needs more analysis - for now, use main span
    // TODO: Refine based on specific bar type patterns
    const isXDirection = pattern.toString().includes('X_X');
    span = isXDirection ? (span_y || 0) : (span_x || 0);
  }
  // Default calculation based on pattern
  else {
    switch (pattern) {
      case FormulaPattern.BASIC_X_X:
        // X-X bars run in X direction, so members are spaced along X (perpendicular)
        span = span_x || 0;
        break;
      case FormulaPattern.BASIC_Y_Y:
        // Y-Y bars run in Y direction, so members are spaced along Y (perpendicular)
        span = span_y || 0;
        break;
      case FormulaPattern.DISTRIBUTED_X_X:
        span = ((projection_x1 || 0) + (projection_x2 || 0)) || (span_y || 0);
        break;
      case FormulaPattern.DISTRIBUTED_Y_Y:
        span = ((projection_y1 || 0) + (projection_y2 || 0)) || (span_x || 0);
        break;
      case FormulaPattern.BOTH_BARS_X_X:
        span = span_x || 0;
        break;
      case FormulaPattern.BOTH_BARS_Y_Y:
        span = span_y || 0;
        break;
      case FormulaPattern.FULL_SPAN_X_X:
      case FormulaPattern.WITH_OPENING_X_X:
        // X-X bars: members spaced along X direction
        span = (span_x || 0) - (member.opening_x || 0);
        break;
      case FormulaPattern.FULL_SPAN_Y_Y:
      case FormulaPattern.WITH_OPENING_Y_Y:
        // Y-Y bars: members spaced along Y direction
        span = (span_y || 0) - (member.opening_y || 0);
        break;
      default:
        span = span_x || span_y || 0;
    }
  }
  
  return Math.ceil(span / barType.spacing);
}

/**
 * Calculate MEAS values based on formula pattern and cover deduction
 */
export function calculateMeasurements(
  member: MemberDimensions,
  barType: BarTypeInput,
  cover: number,
  pattern: FormulaPattern
): Omit<IntermediateValues, 'total_members' | 'total_projection_x' | 'total_projection_y' | 'adjusted_span_x' | 'adjusted_span_y'> {
  const { span_x, span_y, slab_depth, projection_x1, projection_x2, projection_y1, projection_y2 } = member;
  const { hook_length_x1, hook_length_x2, hook_length_y1, hook_length_y2 } = member;
  
  // Determine cover deduction pattern
  const coverPattern = barType.cover_pattern || detectCoverPattern(barType.bar_type, barType.bend_count);
  const coverInfo = getCoverDeductionInfo(coverPattern);
  
  // Determine which direction we're working in
  const isXDirection = pattern.toString().includes('X_X');
  
  // MEAS_A: Main span with section-specific override support
  let meas_a = 0;
  
  // Priority 1: Section-specific dimensions (Span1/Span2 from Excel)
  if (barType.section_span_1 && !barType.section_span_2) {
    // Simple override (e.g., "Right" section: 625mm)
    meas_a = barType.section_span_1;
  } else if (barType.section_span_2 && !barType.section_span_1) {
    // Alternate dimension (e.g., "Top & Bottom": 950mm)
    meas_a = barType.section_span_2;
  } else if (barType.section_span_1 && barType.section_span_2) {
    // Complex calculation (e.g., "P4 to Q6")
    // For now, use section_span_1 as base (needs refinement based on bar type)
    meas_a = barType.section_span_1;
  } else if (barType.bar_type.toLowerCase().includes('dist')) {
    // Distribution bars use perpendicular span
    meas_a = isXDirection ? (span_y || 0) : (span_x || 0);
  } else {
    // Default to main span
    meas_a = isXDirection ? (span_x || 0) : (span_y || 0);
  }
  
  // Apply cover deduction to MEAS_A
  meas_a -= (coverInfo.meas_a_deduction * cover);
  
  // MEAS_B: Hook/bend length 1
  let meas_b = (isXDirection ? hook_length_x1 : hook_length_y1) || 0;
  meas_b -= (coverInfo.meas_b_deduction * cover);
  if (coverInfo.meas_b_doubled) {
    meas_b *= 2;
  }
  
  // MEAS_C: Hook/bend length 2 (or section_span_1 for complex bars)
  let meas_c = 0;
  if (barType.section_span_1 && barType.section_span_2) {
    // For complex bars like "P4 to Q6", MEAS_C uses section_span_1
    meas_c = barType.section_span_1;
  } else {
    meas_c = (isXDirection ? hook_length_x2 : hook_length_y2) || 0;
    meas_c -= (coverInfo.meas_c_deduction * cover);
    if (coverInfo.meas_c_doubled) {
      meas_c *= 2;
    }
  }
  
  // MEAS_D: Depth dimension 1
  const depth = slab_depth || member.beam_depth || 0;
  let meas_d = depth - (coverInfo.meas_d_deduction * cover);
  
  // MEAS_E: Depth dimension 2 (or development length for full span)
  let meas_e = depth - (coverInfo.meas_e_deduction * cover);
  
  // MEAS_F: Additional length (projections)
  let meas_f: number | undefined;
  if (pattern === FormulaPattern.BASIC_X_X || pattern === FormulaPattern.BASIC_Y_Y) {
    if (isXDirection) {
      meas_f = (projection_x1 || 0) + (projection_x2 || 0);
    } else {
      meas_f = (projection_y1 || 0) + (projection_y2 || 0);
    }
  }
  
  return { meas_a, meas_b, meas_c, meas_d, meas_e, meas_f };
}

/**
 * Calculate intermediate values for a bar type
 */
export function calculateIntermediates(
  member: MemberDimensions,
  barType: BarTypeInput,
  cover: number
): IntermediateValues {
  const pattern = detectFormulaPattern(barType.bar_type);
  
  // Calculate projections
  const total_projection_x = (member.projection_x1 || 0) + (member.projection_x2 || 0);
  const total_projection_y = (member.projection_y1 || 0) + (member.projection_y2 || 0);
  
  // Calculate adjusted spans
  const adjusted_span_x = (member.span_x || 0) - (member.opening_x || 0);
  const adjusted_span_y = (member.span_y || 0) - (member.opening_y || 0);
  
  // Calculate total members
  const total_members = calculateTotalMembers(member, barType, pattern);
  
  // Calculate measurements
  const measurements = calculateMeasurements(member, barType, cover, pattern);
  
  return {
    total_projection_x,
    total_projection_y,
    adjusted_span_x,
    adjusted_span_y,
    total_members,
    ...measurements
  };
}

/**
 * Calculate complete output for a single bar type
 */
export function calculateBarOutput(
  member: MemberDimensions,
  barType: BarTypeInput,
  cover: number
): BarCalculationOutput {
  // Detect pattern
  const pattern = detectFormulaPattern(barType.bar_type);
  
  // Calculate intermediate values
  const total_members = calculateTotalMembers(member, barType, pattern);
  const total_nos = total_members * barType.no_bars;
  
  const measurements = calculateMeasurements(member, barType, cover, pattern);
  const { meas_a, meas_b, meas_c, meas_d, meas_e, meas_f } = measurements;
  
  // Calculate cut length
  const cut_length = meas_a + meas_b + meas_c + meas_d + meas_e + (meas_f || 0);
  
  // Calculate deduction
  const deduction = (barType.bend_count || 0) * barType.dia * 2;
  
  // Calculate final length (cut_length - deduction)
  const final_length = cut_length - deduction;
  
  // Calculate total length (uses final length, not cut length!)
  const total_length = total_nos * final_length;
  
  // Calculate weight (dia² / 162 × final_length × nos / 1000)
  const weight = (barType.dia ** 2 / 162) * final_length * total_nos / 1000;
  
  return {
    bar_type: barType.bar_type,
    dia: barType.dia,
    spacing: barType.spacing,
    no_bars: barType.no_bars,
    bend_count: barType.bend_count,
    total_members,
    total_nos,
    meas_a,
    meas_b,
    meas_c,
    meas_d,
    meas_e,
    meas_f,
    cut_length,
    deduction,
    total_length,
    weight
  };
}

/**
 * Calculate all bar types for a project
 */
export function calculateProject(project: RebarProject): BarCalculationOutput[] {
  const { metadata, members, bar_types } = project;
  const cover = metadata.cover;
  
  return bar_types.map(barType => {
    const member = members.find(m => m.member_id === barType.member_ref);
    if (!member) {
      throw new Error(`Member ${barType.member_ref} not found for bar type ${barType.bar_type}`);
    }
    
    return calculateBarOutput(member, barType, cover);
  });
}

/**
 * Get summary by diameter
 */
export function getSummaryByDiameter(calculations: BarCalculationOutput[]): Record<number, { total_weight: number; total_length: number; count: number }> {
  const summary: Record<number, { total_weight: number; total_length: number; count: number }> = {};
  
  for (const calc of calculations) {
    if (!summary[calc.dia]) {
      summary[calc.dia] = { total_weight: 0, total_length: 0, count: 0 };
    }
    
    summary[calc.dia].total_weight += calc.weight;
    summary[calc.dia].total_length += calc.total_length;
    summary[calc.dia].count += calc.total_nos;
  }
  
  return summary;
}

/**
 * Get total project weight
 */
export function getTotalProjectWeight(calculations: BarCalculationOutput[]): number {
  return calculations.reduce((sum, calc) => sum + calc.weight, 0);
}
