/**
 * Test to verify the members calculation fix
 */
import {
  calculateProject,
  type RebarProject
} from './formula-engine';

// Test with user's exact dimensions
const testProject: RebarProject = {
  project_id: "test_fix",
  project_name: "Members Calculation Fix Test",
  
  metadata: {
    concrete_grade: "M30",
    steel_grade: "550D",
    cover: 30,
    ld_values: { "8": 400 }
  },
  
  members: [
    {
      member_id: "slab_1",
      member_type: "slab",
      span_x: 3050,
      span_y: 3650,
      slab_depth: 125,
      hook_length_x1: 160,
      hook_length_x2: 160,
      hook_length_y1: 160,
      hook_length_y2: 160
    }
  ],
  
  bar_types: [
    {
      bar_type: "Bottom Bar (X-X) Full Span",
      spacing: 275,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "slab_1"
    }
  ]
};

console.log("Testing Members Calculation Fix...\n");
console.log("Slab: 3050mm (X) × 3650mm (Y) × 125mm");
console.log("Bottom Bar (X-X) Full Span, 275mm spacing, 8mm dia\n");

const results = calculateProject(testProject);
const calc = results[0];

console.log("Results:");
console.log("========");
console.log(`Total Members: ${calc.total_members}`);
console.log(`Expected: 12 (ROUNDUP(3050 / 275))`);
console.log(`Match: ${calc.total_members === 12 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log(`MEAS_A: ${calc.meas_a}mm (expected: 3050mm)`);
console.log(`MEAS_B: ${calc.meas_b}mm (expected: 130mm)`);
console.log(`MEAS_C: ${calc.meas_c}mm (expected: 130mm)`);
console.log(`MEAS_D: ${calc.meas_d}mm (expected: 95mm)`);
console.log(`MEAS_E: ${calc.meas_e}mm (expected: 95mm)`);
console.log(`Cut Length: ${calc.cut_length}mm (expected: 3500mm)`);
console.log(`Deduction: ${calc.deduction}mm (expected: 32mm)`);
console.log(`Total Length: ${calc.total_length / 1000}m (expected: 41.616m)`);

// Verify all values
const allCorrect = 
  calc.total_members === 12 &&
  calc.meas_a === 3050 &&
  calc.meas_b === 130 &&
  calc.meas_c === 130 &&
  calc.meas_d === 95 &&
  calc.meas_e === 95 &&
  calc.cut_length === 3500 &&
  calc.deduction === 32 &&
  Math.abs(calc.total_length - 41616) < 1;

console.log(`\n${allCorrect ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
