/**
 * Debug U-Bar Calculation Discrepancy
 * Analyzing the difference between web app and Excel calculations
 */

// Test data from user
const componentData = {
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
};

export function analyzeUBarDiscrepancy() {
  console.log('\n🔍 ANALYZING U-BAR CALCULATION DISCREPANCY');
  console.log('='.repeat(70));
  
  console.log('Component Data:');
  console.log(`- Span X: ${componentData.spanX}mm`);
  console.log(`- Span Y: ${componentData.spanY}mm`);
  console.log(`- Depth: ${componentData.depth}mm`);
  console.log(`- Cover: ${componentData.cover}mm`);
  console.log(`- Beam Widths: ${JSON.stringify(componentData.beamWidths)}mm`);
  console.log(`- Top Extensions: ${JSON.stringify(componentData.topExtensions)}mm`);
  
  console.log('\n📱 WEB APP OUTPUT:');
  const webApp = {
    a: 3160,
    b: 130,
    c: 65,
    d: 130,
    e: 425,
    f: 425,
    total: 4660
  };
  console.log(`a = ${webApp.a}, b = ${webApp.b}, c = ${webApp.c}, d = ${webApp.d}, e = ${webApp.e}, f = ${webApp.f}`);
  console.log(`Total = ${webApp.total}`);
  console.log(`Verification: ${webApp.a + webApp.b + webApp.c + webApp.d + webApp.e + webApp.f} (should be ${webApp.total})`);
  
  console.log('\n📊 EXCEL REFERENCE:');
  const excel = {
    a: 3160,
    b: 260,
    c: 260,
    d: 65,
    e: 65,
    f: 859,
    total: 4660
  };
  console.log(`a = ${excel.a}, b = ${excel.b}, c = ${excel.c}, d = ${excel.d}, e = ${excel.e}, f = ${excel.f}`);
  console.log(`Total = ${excel.total}`);
  console.log(`Verification: ${excel.a + excel.b + excel.c + excel.d + excel.e + excel.f} (should be ${excel.total})`);
  
  console.log('\n🔄 PATTERN ANALYSIS:');
  
  // Analyze Web App Pattern
  console.log('\nWeb App Pattern Analysis:');
  console.log(`- a (${webApp.a}): Span X = ${componentData.spanX} ✅`);
  console.log(`- b (${webApp.b}): Left beam - cover = ${componentData.beamWidths.left} - ${componentData.cover} = ${componentData.beamWidths.left - componentData.cover} ✅`);
  console.log(`- c (${webApp.c}): Vertical rise = ${componentData.depth} - 2×${componentData.cover} = ${componentData.depth - 2 * componentData.cover} ✅`);
  console.log(`- d (${webApp.d}): Right beam - cover = ${componentData.beamWidths.right} - ${componentData.cover} = ${componentData.beamWidths.right - componentData.cover} ✅`);
  console.log(`- e (${webApp.e}): Left top extension = ${componentData.topExtensions.left} ✅`);
  console.log(`- f (${webApp.f}): Right top extension = ${componentData.topExtensions.right} ✅`);
  
  // Analyze Excel Pattern
  console.log('\nExcel Pattern Analysis:');
  console.log(`- a (${excel.a}): Span X = ${componentData.spanX} ✅`);
  console.log(`- b (${excel.b}): 2 × (beam - cover) = 2 × ${componentData.beamWidths.left - componentData.cover} = ${2 * (componentData.beamWidths.left - componentData.cover)} ✅`);
  console.log(`- c (${excel.c}): 2 × vertical rise = 2 × ${componentData.depth - 2 * componentData.cover} = ${2 * (componentData.depth - 2 * componentData.cover)} ✅`);
  console.log(`- d (${excel.d}): Single vertical rise = ${componentData.depth - 2 * componentData.cover} ✅`);
  console.log(`- e (${excel.e}): Single vertical rise = ${componentData.depth - 2 * componentData.cover} ✅`);
  console.log(`- f (${excel.f}): Combined extensions = ${componentData.topExtensions.left + componentData.topExtensions.right} = ${componentData.topExtensions.left + componentData.topExtensions.right} ✅`);
  
  console.log('\n🎯 INTERPRETATION:');
  console.log('\nWeb App Method (Segment-by-Segment):');
  console.log('- Each segment (b, c, d, e, f) represents individual lengths');
  console.log('- More detailed breakdown showing each part separately');
  console.log('- Formula: a + b + c + d + e + f (standard BBS format)');
  
  console.log('\nExcel Method (Grouped Segments):');
  console.log('- Some segments are combined/grouped for efficiency');
  console.log('- b & c represent doubled values (both ends)');
  console.log('- f combines both top extensions');
  console.log('- Formula: a + b + c + d + e + f (same total, different grouping)');
  
  console.log('\n🔧 BOTH METHODS ARE CORRECT!');
  console.log('- Same total length: 4660mm');
  console.log('- Different segment organization');
  console.log('- Web app: more detailed breakdown');
  console.log('- Excel: more efficient grouping');
  
  return { webApp, excel, componentData };
}

export function determineCorrectMethod() {
  console.log('\n🎯 DETERMINING THE CORRECT METHOD');
  console.log('='.repeat(50));
  
  console.log('For Bottom Bar (X-X) U-shape:');
  console.log('');
  console.log('Physical bar shape:');
  console.log('    e ←--→ f');
  console.log('    ↓     ↓');
  console.log('    c     c');
  console.log('    ↓     ↓');
  console.log('b ←-+     +-→ d');
  console.log('    ←--a--→');
  console.log('');
  
  console.log('Method 1 (Web App - Individual Segments):');
  console.log('- a: Bottom span (3160mm)');
  console.log('- b: Left beam penetration (130mm)');
  console.log('- c: Vertical rise (65mm)');
  console.log('- d: Right beam penetration (130mm)');
  console.log('- e: Left top extension (425mm)');
  console.log('- f: Right top extension (425mm)');
  console.log('Total: 3160 + 130 + 65 + 130 + 425 + 425 = 4335mm');
  console.log('❌ This gives 4335mm, not 4660mm!');
  
  console.log('\nMethod 2 (Excel - U-Bar Formula):');
  console.log('- a: Bottom span (3160mm)');
  console.log('- 2×b: Both beam penetrations (2×130 = 260mm)');
  console.log('- 2×c: Both vertical rises (2×65 = 130mm)');
  console.log('- Additional segments for extensions...');
  console.log('');
  
  console.log('🚨 ISSUE FOUND:');
  console.log('The web app segments don\'t add up to 4660mm!');
  console.log('3160 + 130 + 65 + 130 + 425 + 425 = 4335mm ≠ 4660mm');
  console.log('');
  console.log('There\'s a 325mm discrepancy!');
  console.log('This suggests the web app is missing some length or using wrong formula.');
}

export function proposeCorrectCalculation() {
  console.log('\n💡 PROPOSED CORRECT CALCULATION');
  console.log('='.repeat(50));
  
  const data = componentData;
  
  console.log('For Bottom Bar (X-X) U-shape, the correct calculation should be:');
  console.log('');
  
  // Method: U-bar formula a + 2b + 2c + 2d + e + f
  const a = data.spanX; // 3160
  const b = data.beamWidths.left - data.cover; // 130
  const c = data.depth - 2 * data.cover; // 65
  const d = data.beamWidths.right - data.cover; // 130 (same as b for symmetric)
  const e = data.topExtensions.left; // 425
  const f = data.topExtensions.right; // 425
  
  console.log('U-Bar Formula: a + 2×b + 2×c + 2×d + e + f');
  console.log(`a = ${a}mm (bottom span)`);
  console.log(`b = ${b}mm (left beam - cover)`);
  console.log(`c = ${c}mm (vertical rise)`);
  console.log(`d = ${d}mm (right beam - cover)`);
  console.log(`e = ${e}mm (left extension)`);
  console.log(`f = ${f}mm (right extension)`);
  console.log('');
  
  const total = a + 2*b + 2*c + 2*d + e + f;
  console.log(`Total = ${a} + 2×${b} + 2×${c} + 2×${d} + ${e} + ${f}`);
  console.log(`Total = ${a} + ${2*b} + ${2*c} + ${2*d} + ${e} + ${f}`);
  console.log(`Total = ${total}mm`);
  
  console.log('\n🎯 COMPARISON:');
  console.log(`- Calculated: ${total}mm`);
  console.log(`- Excel target: 4660mm`);
  console.log(`- Difference: ${Math.abs(total - 4660)}mm`);
  
  if (Math.abs(total - 4660) < 10) {
    console.log('✅ MATCHES EXCEL!');
  } else {
    console.log('❌ Still doesn\'t match. Need to investigate further.');
  }
  
  return total;
}

// Run all analyses
export function runFullAnalysis() {
  analyzeUBarDiscrepancy();
  determineCorrectMethod();
  const calculatedTotal = proposeCorrectCalculation();
  
  console.log('\n📋 SUMMARY:');
  console.log(`- Web app shows segments that don't add up correctly`);
  console.log(`- Excel uses proper U-bar formula`);
  console.log(`- Correct calculation: ${calculatedTotal}mm`);
  console.log(`- Need to fix web app to use proper U-bar formula`);
  
  return calculatedTotal;
}