/**
 * Test BBS Calculation with Real Data
 * Testing the Bottom Bar Dist (X-X) calculation to verify 1800mm result
 */

import type { ConcreteComponent, /* ComponentBarEntry, */ BBSMetadata } from '../types/component-types';
import { generateBBSTable, formatBBSTableConsole } from './bbs-table-formatter';
import { /* calculateComponentBarEntryEnhanced, */ calculateBarMeasurementsAuto } from './enhanced-calculator';

// ============================================================================
// TEST DATA FROM USER'S SCREENSHOT
// ============================================================================

/**
 * Test component based on user's screenshot data:
 * - Span X: 3160mm
 * - Span Y: 1350mm  
 * - Depth: 125mm
 * - Cover: 30mm
 * - Beam Widths: 160mm all sides
 * - Top Extensions: 425mm all sides
 */
const testComponent: ConcreteComponent = {
  id: 'C1',
  name: 'C1',
  componentType: 'SLAB',
  spanX: 3160,
  spanY: 1350,
  depth: 125,
  cover: 30,
  beamWidths: {
    left: 160,
    right: 160,
    top: 160,
    bottom: 160
  },
  topExtensions: {
    left: 425,
    right: 425,
    top: 425,
    bottom: 425
  },
  bars: [
    // Test the problematic Bottom Bar Dist (X-X)
    {
      id: '1',
      barType: 'Bottom Bar Dist (X-X)',
      direction: 'X',
      diameter: 8,
      spacing: 150, // From screenshot
      measurements: { a: 0 }, // Will be auto-calculated
      manualNoOfBars: 18 // From screenshot
    },
    // Add Bottom Bar (X-X) for comparison
    {
      id: '2', 
      barType: 'Bottom Bar (X-X)',
      direction: 'X',
      diameter: 8,
      spacing: 275,
      measurements: { a: 0 } // Will be auto-calculated
    }
  ]
};

const testMetadata: BBSMetadata = {
  projectName: 'Provident White Oaks - Bangalore',
  drawingNumber: 'ST-B-327-R0',
  itemDescription: 'Terrace Slab Reinforcement',
  concreteGrade: 'M30',
  steelGrade: 'Fe500'
};

// ============================================================================
// DETAILED CALCULATION TEST
// ============================================================================

export function testBottomBarDistCalculation() {
  console.log('\n🧪 TESTING BOTTOM BAR DIST (X-X) CALCULATION');
  console.log('='.repeat(60));
  
  // Test auto-calculation of measurements
  const measurements = calculateBarMeasurementsAuto(
    'Bottom Bar Dist (X-X)',
    'X',
    testComponent,
    8, // diameter
    'M30'
  );
  
  console.log('\n📐 AUTO-CALCULATED MEASUREMENTS:');
  console.log(`a (Perpendicular Span): ${measurements.a}mm`);
  console.log(`b (Top Beam - Cover): ${measurements.b || 0}mm`);
  console.log(`c (Bottom Beam - Cover): ${measurements.c || 0}mm`);
  console.log(`d (Foot Length): ${measurements.d || 0}mm`);
  console.log(`e (Foot Length): ${measurements.e || 0}mm`);
  console.log(`f: ${measurements.f || 0}mm`);
  console.log(`lap: ${measurements.lap || 0}mm`);
  
  // Manual calculation breakdown
  console.log('\n🔢 MANUAL CALCULATION BREAKDOWN:');
  console.log(`Span Y (perpendicular): ${testComponent.spanY}mm`);
  console.log(`Top Beam Width: ${testComponent.beamWidths?.top}mm`);
  console.log(`Bottom Beam Width: ${testComponent.beamWidths?.bottom}mm`);
  console.log(`Cover: ${testComponent.cover}mm`);
  console.log(`Diameter: 8mm`);
  console.log(`Foot Length (10×Dia): ${10 * 8} = 80mm`);
  
  const expectedA = testComponent.spanY; // 1350
  const expectedB = Math.max(0, (testComponent.beamWidths?.top || 0) - testComponent.cover); // 160-30=130
  const expectedC = Math.max(0, (testComponent.beamWidths?.bottom || 0) - testComponent.cover); // 160-30=130
  const expectedD = 10 * 8; // 80
  const expectedE = 10 * 8; // 80
  
  console.log(`\nExpected: a=${expectedA}, b=${expectedB}, c=${expectedC}, d=${expectedD}, e=${expectedE}`);
  console.log(`Actual:   a=${measurements.a}, b=${measurements.b}, c=${measurements.c}, d=${measurements.d}, e=${measurements.e}`);
  
  const expectedTotal = expectedA + expectedB + expectedC + expectedD + expectedE;
  const actualTotal = measurements.a + (measurements.b || 0) + (measurements.c || 0) + (measurements.d || 0) + (measurements.e || 0);
  
  console.log(`\nExpected Total: ${expectedTotal}mm`);
  console.log(`Actual Total: ${actualTotal}mm`);
  console.log(`Target: 1800mm`);
  console.log(`Difference: ${Math.abs(actualTotal - 1800)}mm`);
  
  return { measurements, expectedTotal, actualTotal };
}

// ============================================================================
// FULL BBS TABLE TEST
// ============================================================================

export function testFullBBSTable() {
  console.log('\n📊 GENERATING FULL BBS TABLE');
  console.log('='.repeat(60));
  
  // Update the test component with auto-calculated measurements
  const updatedBars = testComponent.bars.map(bar => {
    const autoMeasurements = calculateBarMeasurementsAuto(
      bar.barType,
      bar.direction,
      testComponent,
      bar.diameter,
      'M30'
    );
    
    return {
      ...bar,
      measurements: autoMeasurements
    };
  });
  
  const updatedComponent = {
    ...testComponent,
    bars: updatedBars
  };
  
  // Generate BBS table
  const bbsTable = generateBBSTable(updatedComponent, testMetadata, 'M30');
  
  // Display results
  formatBBSTableConsole(bbsTable);
  
  // Check specific values
  const distBarRow = bbsTable.rows.find(row => row.barType === 'Bottom Bar Dist (X-X)');
  if (distBarRow) {
    console.log('\n🎯 BOTTOM BAR DIST (X-X) RESULTS:');
    console.log(`Total Measurement: ${distBarRow.total}mm`);
    console.log(`Cutting Length: ${distBarRow.cuttingLength}mm`);
    console.log(`Number of Bars: ${distBarRow.totalNoOfBars}`);
    console.log(`Total Length: ${distBarRow.totalLength.toFixed(2)}m`);
    
    if (Math.abs(distBarRow.total - 1800) < 50) {
      console.log('✅ CALCULATION MATCHES TARGET (±50mm)');
    } else {
      console.log('❌ CALCULATION DIFFERS FROM TARGET');
      console.log(`   Expected: ~1800mm`);
      console.log(`   Got: ${distBarRow.total}mm`);
      console.log(`   Difference: ${Math.abs(distBarRow.total - 1800)}mm`);
    }
  }
  
  return bbsTable;
}

// ============================================================================
// DEBUGGING HELPER
// ============================================================================

export function debugDistributionBarLogic() {
  console.log('\n🔍 DEBUGGING DISTRIBUTION BAR LOGIC');
  console.log('='.repeat(60));
  
  console.log('Distribution bars run PERPENDICULAR to main bars:');
  console.log('- Bottom Bar (X-X) runs along X direction');
  console.log('- Bottom Bar Dist (X-X) runs along Y direction (perpendicular)');
  console.log('');
  console.log('Component dimensions:');
  console.log(`- Span X: ${testComponent.spanX}mm (main span)`);
  console.log(`- Span Y: ${testComponent.spanY}mm (perpendicular span)`);
  console.log('');
  console.log('For Bottom Bar Dist (X-X):');
  console.log(`- Should use Span Y: ${testComponent.spanY}mm`);
  console.log(`- NOT Span X: ${testComponent.spanX}mm`);
  console.log('');
  console.log('This is why we were getting 4335mm instead of ~1800mm');
  console.log('(4335 ≈ 3160 + beam deductions + foot lengths)');
  console.log('(1800 ≈ 1350 + beam deductions + foot lengths)');
}

// ============================================================================
// ALTERNATIVE CALCULATION METHODS
// ============================================================================

export function testAlternativeCalculations() {
  console.log('\n🔄 TESTING ALTERNATIVE CALCULATION METHODS');
  console.log('='.repeat(60));
  
  const span = testComponent.spanY; // 1350 (perpendicular)
  const cover = testComponent.cover; // 30
  const diameter = 8;
  
  // Method 1: Simple span + foot lengths
  const method1 = span + (2 * 10 * diameter);
  console.log(`Method 1 (Span + 2×10D): ${span} + ${2 * 10 * diameter} = ${method1}mm`);
  
  // Method 2: Span + beam deductions + foot lengths  
  const beamDeduction = 2 * (160 - cover); // 2 * 130 = 260
  const footLengths = 2 * 10 * diameter; // 2 * 80 = 160
  const method2 = span + beamDeduction + footLengths;
  console.log(`Method 2 (Span + Beam + Foot): ${span} + ${beamDeduction} + ${footLengths} = ${method2}mm`);
  
  // Method 3: Your expected result
  const method3 = 1800;
  console.log(`Method 3 (Expected): ${method3}mm`);
  
  console.log('\nAnalysis:');
  console.log(`- Method 1 vs Expected: ${Math.abs(method1 - method3)}mm difference`);
  console.log(`- Method 2 vs Expected: ${Math.abs(method2 - method3)}mm difference`);
  
  // Find what foot length would give 1800mm
  const requiredFootTotal = method3 - span - beamDeduction;
  const requiredFootEach = requiredFootTotal / 2;
  const requiredMultiplier = requiredFootEach / diameter;
  
  console.log(`\nTo get 1800mm exactly:`);
  console.log(`- Required total foot length: ${requiredFootTotal}mm`);
  console.log(`- Required foot length each: ${requiredFootEach}mm`);
  console.log(`- Required multiplier: ${requiredMultiplier.toFixed(1)}×Diameter`);
  
  return {
    method1,
    method2,
    method3,
    requiredMultiplier
  };
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

export function runAllTests() {
  console.log('\n🚀 RUNNING ALL BBS CALCULATION TESTS');
  console.log('='.repeat(80));
  
  // Test 1: Debug logic
  debugDistributionBarLogic();
  
  // Test 2: Detailed calculation
  const calcTest = testBottomBarDistCalculation();
  
  // Test 3: Alternative methods
  const altTest = testAlternativeCalculations();
  
  // Test 4: Full BBS table
  const bbsTable = testFullBBSTable();
  
  console.log('\n📋 TEST SUMMARY');
  console.log('='.repeat(40));
  console.log(`Auto-calculated total: ${calcTest.actualTotal}mm`);
  console.log(`Expected target: 1800mm`);
  console.log(`Difference: ${Math.abs(calcTest.actualTotal - 1800)}mm`);
  console.log(`Recommended foot multiplier: ${altTest.requiredMultiplier.toFixed(1)}×D`);
  
  return {
    calcTest,
    altTest,
    bbsTable
  };
}

// Export for testing
export { testComponent, testMetadata };