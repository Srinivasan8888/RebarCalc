// Simple test runner to check the BBS calculation
// Run with: node test-runner.js

// Mock the required modules for testing
const testData = {
  component: {
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
    }
  }
};

// Manual calculation for Bottom Bar Dist (X-X)
function calculateDistributionBarManual() {
  console.log('\n🧪 MANUAL CALCULATION: Bottom Bar Dist (X-X)');
  console.log('='.repeat(60));
  
  const component = testData.component;
  const diameter = 8;
  
  console.log('Input Data:');
  console.log(`- Component Type: ${component.componentType}`);
  console.log(`- Span X: ${component.spanX}mm`);
  console.log(`- Span Y: ${component.spanY}mm`);
  console.log(`- Cover: ${component.cover}mm`);
  console.log(`- Beam Widths: ${JSON.stringify(component.beamWidths)}mm`);
  console.log(`- Diameter: ${diameter}mm`);
  
  console.log('\nDistribution Bar Logic:');
  console.log('- Bottom Bar Dist (X-X) runs PERPENDICULAR to Bottom Bar (X-X)');
  console.log('- Main bars run along X, so distribution bars run along Y');
  console.log(`- Therefore, use Span Y: ${component.spanY}mm`);
  
  console.log('\nCalculation Steps:');
  
  // Step 1: Base span (perpendicular)
  const baseSpan = component.spanY;
  console.log(`1. Base span (Y): ${baseSpan}mm`);
  
  // Step 2: Beam deductions (top and bottom for Y direction)
  const topBeamDeduction = Math.max(0, component.beamWidths.top - component.cover);
  const bottomBeamDeduction = Math.max(0, component.beamWidths.bottom - component.cover);
  console.log(`2. Top beam deduction: max(0, ${component.beamWidths.top} - ${component.cover}) = ${topBeamDeduction}mm`);
  console.log(`3. Bottom beam deduction: max(0, ${component.beamWidths.bottom} - ${component.cover}) = ${bottomBeamDeduction}mm`);
  
  // Step 3: Foot lengths
  const footLength = 12 * diameter; // Updated multiplier
  console.log(`4. Foot length each: 12 × ${diameter} = ${footLength}mm`);
  console.log(`5. Total foot lengths: 2 × ${footLength} = ${2 * footLength}mm`);
  
  // Step 4: Total calculation
  const total = baseSpan + topBeamDeduction + bottomBeamDeduction + (2 * footLength);
  console.log(`\nFinal Calculation:`);
  console.log(`Total = ${baseSpan} + ${topBeamDeduction} + ${bottomBeamDeduction} + ${2 * footLength}`);
  console.log(`Total = ${total}mm`);
  
  console.log(`\nComparison:`);
  console.log(`- Calculated: ${total}mm`);
  console.log(`- Expected: 1800mm`);
  console.log(`- Difference: ${Math.abs(total - 1800)}mm`);
  
  // Alternative calculations
  console.log(`\n🔄 Alternative Methods:`);
  
  // Method A: Just span + foot lengths (no beam deductions)
  const methodA = baseSpan + (2 * footLength);
  console.log(`Method A (Span + Feet): ${baseSpan} + ${2 * footLength} = ${methodA}mm`);
  
  // Method B: Different foot length multiplier
  const targetTotal = 1800;
  const requiredFootTotal = targetTotal - baseSpan - topBeamDeduction - bottomBeamDeduction;
  const requiredFootEach = requiredFootTotal / 2;
  const requiredMultiplier = requiredFootEach / diameter;
  
  console.log(`Method B (To get 1800mm):`);
  console.log(`- Required foot total: ${targetTotal} - ${baseSpan} - ${topBeamDeduction} - ${bottomBeamDeduction} = ${requiredFootTotal}mm`);
  console.log(`- Required foot each: ${requiredFootTotal} / 2 = ${requiredFootEach}mm`);
  console.log(`- Required multiplier: ${requiredFootEach} / ${diameter} = ${requiredMultiplier.toFixed(1)}×D`);
  
  if (requiredMultiplier >= 0 && requiredMultiplier <= 15) {
    console.log(`✅ Reasonable multiplier: ${requiredMultiplier.toFixed(1)}×D`);
  } else {
    console.log(`❌ Unreasonable multiplier: ${requiredMultiplier.toFixed(1)}×D`);
  }
  
  return {
    calculated: total,
    expected: 1800,
    difference: Math.abs(total - 1800),
    requiredMultiplier: requiredMultiplier.toFixed(1)
  };
}

// Run the test
const result = calculateDistributionBarManual();

console.log(`\n📊 SUMMARY:`);
console.log(`- Current calculation: ${result.calculated}mm`);
console.log(`- Target: ${result.expected}mm`);
console.log(`- Difference: ${result.difference}mm`);
console.log(`- Suggested foot multiplier: ${result.requiredMultiplier}×D`);

if (result.difference <= 50) {
  console.log(`✅ CLOSE ENOUGH (within 50mm)`);
} else {
  console.log(`❌ NEEDS ADJUSTMENT`);
  console.log(`\n💡 Recommendations:`);
  console.log(`1. Use ${result.requiredMultiplier}×D for foot length instead of 10×D`);
  console.log(`2. Or check if beam deductions should be excluded`);
  console.log(`3. Or verify the expected 1800mm value`);
}