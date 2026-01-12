// Manual verification of BBS formulas against industry standards
// This script verifies key calculations match expected values

import { 
  calculateS1, calculateS2, calculateS3, calculateS4, calculateS5, calculateS6,
  calculateWeight, calculateBendDeduction, calculateHookLength 
} from './src/lib/calculator.js';

// Standard IS code configuration
const standardConfig = {
  id: 'test',
  name: 'Test Project',
  codeStandard: 'IS',
  defaultCover: 25,
  defaultHookMultiplier: 9,
  bendDeductions: {
    deg45: 1,
    deg90: 2,
    deg135: 3,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

console.log('=== BBS Formula Verification ===\n');

// Test 1: Weight calculation (industry standard)
console.log('1. Weight Calculation:');
const weight12mm_2m = calculateWeight(12, 2000);
const expected12mm_2m = (12 * 12 / 162) * 2; // (144/162) * 2 = 1.778 kg
console.log(`12mm bar, 2000mm length: ${weight12mm_2m.toFixed(3)} kg (expected: ${expected12mm_2m.toFixed(3)} kg)`);

const weight16mm_3m = calculateWeight(16, 3000);
const expected16mm_3m = (16 * 16 / 162) * 3; // (256/162) * 3 = 4.741 kg
console.log(`16mm bar, 3000mm length: ${weight16mm_3m.toFixed(3)} kg (expected: ${expected16mm_3m.toFixed(3)} kg)`);

// Test 2: Bend deductions
console.log('\n2. Bend Deductions:');
console.log(`10mm bar, 90° bend: ${calculateBendDeduction(90, 10, standardConfig)}mm (expected: 20mm)`);
console.log(`12mm bar, 45° bend: ${calculateBendDeduction(45, 12, standardConfig)}mm (expected: 12mm)`);
console.log(`16mm bar, 135° bend: ${calculateBendDeduction(135, 16, standardConfig)}mm (expected: 48mm)`);

// Test 3: Hook lengths
console.log('\n3. Hook Lengths:');
console.log(`10mm bar hook: ${calculateHookLength(10, 9)}mm (expected: 90mm)`);
console.log(`12mm bar hook: ${calculateHookLength(12, 9)}mm (expected: 108mm)`);

// Test 4: Shape calculations
console.log('\n4. Shape Calculations:');

// S1 - Straight
const s1Result = calculateS1({ A: 3000 }, standardConfig, 12);
console.log(`S1 (Straight) A=3000mm: ${s1Result}mm (expected: 3000mm)`);

// S2 - U-bar
const s2Result = calculateS2({ A: 2000, B: 300 }, standardConfig, 12);
const s2Expected = 2000 + 2*300 - 2*24; // A + 2B - 2*(2*12) = 2000 + 600 - 48 = 2552
console.log(`S2 (U-bar) A=2000, B=300, 12mm: ${s2Result}mm (expected: ${s2Expected}mm)`);

// S3 - Stirrup (most complex)
const s3Result = calculateS3({ A: 200, B: 300 }, standardConfig, 10);
const s3Expected = 2*(200+300) + 2*90 - 4*20 - 2*30; // 2(A+B) + 2*hook - 4*90° - 2*135°
// = 1000 + 180 - 80 - 60 = 1040
console.log(`S3 (Stirrup) A=200, B=300, 10mm: ${s3Result}mm (expected: ${s3Expected}mm)`);

// S4 - Cranked
const s4Result = calculateS4({ A: 1000, B: 400, C: 300 }, standardConfig, 12);
const inclined = Math.sqrt(400*400 + 300*300); // = 500
const s4Expected = 1000 + inclined + 300 - 2*12; // A + inclined + C - 2*45°
// = 1000 + 500 + 300 - 24 = 1776
console.log(`S4 (Cranked) A=1000, B=400, C=300, 12mm: ${s4Result}mm (expected: ${s4Expected}mm)`);

// S5 - L-bar
const s5Result = calculateS5({ A: 1500, B: 800 }, standardConfig, 16);
const s5Expected = 1500 + 800 - 32; // A + B - 90°
console.log(`S5 (L-bar) A=1500, B=800, 16mm: ${s5Result}mm (expected: ${s5Expected}mm)`);

// S6 - Hooked
const s6Result = calculateS6({ A: 2500 }, standardConfig, 12);
const s6Expected = 2500 + 108 - 24; // A + hook - 180°
console.log(`S6 (Hooked) A=2500, 12mm: ${s6Result}mm (expected: ${s6Expected}mm)`);

console.log('\n=== Verification Complete ===');