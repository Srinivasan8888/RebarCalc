/**
 * Quick test of the updated formula engine
 */
import {
  RebarProject,
  calculateProject,
  getTotalProjectWeight
} from './formula-engine';

// Test with P4 F-shaped slab example
const testProject: RebarProject = {
  project_id: "test_p4",
  project_name: "P4 F-Shaped Slab Test",
  
  metadata: {
    concrete_grade: "M30",
    steel_grade: "550D",
    cover: 30,
    ld_values: {
      "8": 400,
      "10": 500,
      "12": 599
    }
  },
  
  members: [
    {
      member_id: "P4",
      member_type: "slab",
      span_x: 3150,
      span_y: 4700,
      slab_depth: 125,
      beam_width_left: 160,
      beam_width_right: 160,
      beam_depth_top: 160,
      beam_depth_bottom: 160,
      hook_length_x1: 130,
      hook_length_x2: 130,
      hook_length_y1: 130,
      hook_length_y2: 130
    }
  ],
  
  bar_types: [
    // Bottom Bar (X-X) Full Span
    {
      bar_type: "Bottom Bar (X-X) Full Span",
      spacing: 250,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "P4"
    },
    // Bottom Bar (Y-Y) Full Span
    {
      bar_type: "Bottom Bar (Y-Y) Full Span",
      spacing: 275,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "P4"
    },
    // Top Main Bar (X-X) - Right (section-specific)
    {
      bar_type: "Top Main Bar (X-X) - Right",
      spacing: 200,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      section_span_1: 625,  // Section override
      member_ref: "P4"
    },
    // Top Dist Bar (X-X) - Left & Right
    {
      bar_type: "Top Dist Bar (X-X) - Left & Right",
      spacing: 325,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      section_span_1: 1050,  // Section width
      member_ref: "P4"
    }
  ]
};

// Run calculation
console.log("Testing P4 F-Shaped Slab Calculations...\n");

try {
  const results = calculateProject(testProject);
  
  console.log("✓ Calculation successful!\n");
  console.log("Results:");
  console.log("========\n");
  
  results.forEach((calc, idx) => {
    console.log(`${idx + 1}. ${calc.bar_type}`);
    console.log(`   Dia: ${calc.dia}mm, Spacing: ${calc.spacing}mm`);
    console.log(`   Bend Count: ${calc.bend_count}`);
    console.log(`   Total Members: ${calc.total_members}`);
    console.log(`   Total Nos: ${calc.total_nos}`);
    console.log(`   MEAS_A: ${calc.meas_a}mm`);
    console.log(`   MEAS_B: ${calc.meas_b}mm`);
    console.log(`   MEAS_C: ${calc.meas_c}mm`);
    console.log(`   MEAS_D: ${calc.meas_d}mm`);
    console.log(`   MEAS_E: ${calc.meas_e}mm`);
    if (calc.meas_f) console.log(`   MEAS_F: ${calc.meas_f}mm`);
    console.log(`   Cut Length: ${calc.cut_length}mm`);
    console.log(`   Deduction: ${calc.deduction}mm`);
    console.log(`   Total Length: ${calc.total_length}mm`);
    console.log(`   Weight: ${calc.weight.toFixed(2)}kg`);
    console.log("");
  });
  
  const totalWeight = getTotalProjectWeight(results);
  console.log(`Total Project Weight: ${totalWeight.toFixed(2)}kg`);
  
} catch (error) {
  console.error("✗ Calculation failed:");
  console.error(error);
}
