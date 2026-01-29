/**
 * Simple test to verify calculateBarMeasurementsAuto works correctly
 */
import { calculateBarMeasurementsAuto } from './enhanced-calculator';
import type { ConcreteComponent } from '../types/component-types';

const testComponent: ConcreteComponent = {
  id: 'test1',
  name: 'C1',
  componentType: 'SLAB',
  spanX: 3050,
  spanY: 3650,
  depth: 125,
  cover: 30,
  beamWidths: {
    left: 160,
    right: 160,
    top: 160,
    bottom: 160
  },
  topExtensions: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
  bars: []
};

console.log('\n=== Testing Bottom Bar (X-X) Full Span ===');
console.log('Component:', {
  spanX: testComponent.spanX,
  spanY: testComponent.spanY,
  depth: testComponent.depth,
  cover: testComponent.cover,
  beamWidths: testComponent.beamWidths
});

const result = calculateBarMeasurementsAuto(
  'Bottom Bar (X-X) Full Span',
  'X',
  testComponent,
  8,
  'M30'
);

console.log('\nResult:', result);
console.log('\nExpected:');
console.log('  a: 3050 (span)');
console.log('  b: 130 (160 - 30)');
console.log('  c: 130 (160 - 30)');
console.log('  d: 65 (125 - 2*30)');
console.log('  e: 65 (125 - 2*30)');

console.log('\nActual:');
console.log(`  a: ${result.a}`);
console.log(`  b: ${result.b || 'undefined'}`);
console.log(`  c: ${result.c || 'undefined'}`);
console.log(`  d: ${result.d || 'undefined'}`);
console.log(`  e: ${result.e || 'undefined'}`);

const passed = 
  result.a === 3050 &&
  result.b === 130 &&
  result.c === 130 &&
  result.d === 65 &&
  result.e === 65;

console.log(`\n${passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}`);
