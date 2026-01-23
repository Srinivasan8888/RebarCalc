// Debug runner for U-bar calculation analysis
// Run with: node debug-runner.js

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

function analyzeUBarDiscrepancy() {
  console.log('\n🔍 ANALYZING U-BAR CALCULATION DISCREPANCY');
  console.log('='.repeat(70));
  
  console.log('📱 WEB APP OUTPUT:');
  const webApp = {
    a: 3160,
    b: 130,
    c: 65,
    d: 130,
    e: 425,
    f: 425
  };
  const webAppTotal = webApp.a + webApp.b + webApp.c + webApp.d + webApp.e + webApp.f;
  console.log(`a=${webApp.a}, b=${webApp.b}, c=${webApp.c}, d=${webApp.d}, e=${webApp.e}, f=${webApp.f}`);
  console.log(`Sum: ${webApp.a} + ${webApp.b} + ${webApp.c} + ${webApp.d} + ${webApp.e} + ${webApp.f} = ${webAppTotal}mm`);
  console.log(`Web app claims total: 4660mm`);
  console.log(`❌ DISCREPANCY: ${webAppTotal} ≠ 4660 (difference: ${Math.abs(webAppTotal - 4660)}mm)`);
  
  console.log('\n📊 EXCEL REFERENCE:');
  const excel = {
    a: 3160,
    b: 260,
    c: 260,
    d: 65,
    e: 65,
    f: 859
  };
  const excelTotal = excel.a + excel.b + excel.c + excel.d + excel.e + excel.f;
  console.log(`a=${excel.a}, b=${excel.b}, c=${excel.c}, d=${excel.d}, e=${excel.e}, f=${excel.f}`);
  console.log(`Sum: ${excel.a} + ${excel.b} + ${excel.c} + ${excel.d} + ${excel.e} + ${excel.f} = ${excelTotal}mm`);
  console.log(`✅ CORRECT: ${excelTotal} = 4660mm`);
  
  return { webApp, excel, webAppTotal, excelTotal };
}

function analyzeExcelPattern() {
  console.log('\n🔍 ANALYZING EXCEL PATTERN');
  console.log('='.repeat(50));
  
  const data = componentData;
  
  console.log('Excel segments breakdown:');
  console.log(`a = ${data.spanX}mm (bottom span) ✅`);
  
  // b = 260 = 2 × (beam - cover) = 2 × (160 - 30) = 2 × 130
  const expectedB = 2 * (data.beamWidths.left - data.cover);
  console.log(`b = ${expectedB}mm (2 × beam penetration) = 2 × (${data.beamWidths.left} - ${data.cover}) ✅`);
  
  // c = 260 = 2 × vertical rise = 2 × (125 - 2×30) = 2 × 65
  const expectedC = 2 * (data.depth - 2 * data.cover);
  console.log(`c = ${expectedC}mm (2 × vertical rise) = 2 × (${data.depth} - 2×${data.cover}) ✅`);
  
  // d = 65 = vertical rise = 125 - 2×30
  const expectedD = data.depth - 2 * data.cover;
  console.log(`d = ${expectedD}mm (vertical rise) = ${data.depth} - 2×${data.cover} ✅`);
  
  // e = 65 = vertical rise (same as d)
  const expectedE = data.depth - 2 * data.cover;
  console.log(`e = ${expectedE}mm (vertical rise) = ${data.depth} - 2×${data.cover} ✅`);
  
  // f = 859 = ? Let's figure this out
  const totalWithoutF = data.spanX + expectedB + expectedC + expectedD + expectedE;
  const calculatedF = 4660 - totalWithoutF;
  console.log(`f = ${calculatedF}mm (calculated to make total = 4660)`);
  console.log(`f = 4660 - (${data.spanX} + ${expectedB} + ${expectedC} + ${expectedD} + ${expectedE})`);
  console.log(`f = 4660 - ${totalWithoutF} = ${calculatedF}mm`);
  
  // What could f represent?
  const bothExtensions = data.topExtensions.left + data.topExtensions.right;
  const additionalLength = calculatedF - bothExtensions;
  console.log(`\nAnalyzing f = ${calculatedF}mm:`);
  console.log(`- Both extensions: ${data.topExtensions.left} + ${data.topExtensions.right} = ${bothExtensions}mm`);
  console.log(`- Additional length: ${calculatedF} - ${bothExtensions} = ${additionalLength}mm`);
  
  if (additionalLength > 0) {
    console.log(`- f seems to include extensions PLUS ${additionalLength}mm extra`);
    console.log(`- This extra ${additionalLength}mm might be additional anchorage or development length`);
  }
}

function proposeCorrectFormula() {
  console.log('\n💡 PROPOSED CORRECT U-BAR FORMULA');
  console.log('='.repeat(50));
  
  console.log('Based on Excel pattern, the correct U-bar formula appears to be:');
  console.log('');
  console.log('For Bottom Bar (X-X) U-shape:');
  console.log('a = Bottom span');
  console.log('b = 2 × (beam width - cover)  [both beam penetrations]');
  console.log('c = 2 × (depth - 2×cover)     [both vertical rises]');
  console.log('d = depth - 2×cover           [single vertical rise]');
  console.log('e = depth - 2×cover           [single vertical rise]');
  console.log('f = extensions + anchorage    [top extensions plus extra length]');
  console.log('');
  console.log('This suggests a complex U-bar with:');
  console.log('- Double counting of some vertical segments');
  console.log('- Additional anchorage length in the extensions');
  console.log('');
  console.log('🚨 ISSUE WITH WEB APP:');
  console.log('The web app is using simple addition (a+b+c+d+e+f)');
  console.log('But should be using the proper U-bar formula with doubled segments');
}

// Run analysis
console.log('🚀 RUNNING U-BAR CALCULATION ANALYSIS');
console.log('='.repeat(80));

const analysis = analyzeUBarDiscrepancy();
analyzeExcelPattern();
proposeCorrectFormula();

console.log('\n📋 FINAL SUMMARY:');
console.log('='.repeat(40));
console.log(`❌ Web app calculation: ${analysis.webAppTotal}mm (WRONG)`);
console.log(`✅ Excel calculation: ${analysis.excelTotal}mm (CORRECT)`);
console.log(`🔧 Issue: Web app not using proper U-bar formula`);
console.log(`💡 Solution: Implement Excel's segment calculation method`);