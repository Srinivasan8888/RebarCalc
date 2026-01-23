/**
 * BBS Table Formatter
 * Generates professional Bar Bending Schedule tables in standard format
 */

import type { 
  ConcreteComponent, 
  ComponentBarEntry, 
  CalculatedBarResult, 
  BarMeasurements,
  BBSMetadata,
  ConcreteGrade
} from '../types/component-types';

import { calculateComponentBarEntryEnhanced } from './enhanced-calculator';
import { WEIGHT_PER_METER } from './constants';

// ============================================================================
// BBS TABLE ROW INTERFACE
// ============================================================================

export interface BBSTableRow {
  // Basic Info
  slNo: number;
  barType: string;
  spanX?: number;
  spanY?: number;
  spacing: number;
  diameter: number;
  
  // Bar Details
  noOfBarsPerMeter: number;
  totalNoOfBars: number;
  noOfBarsRequired: number;
  
  // Measurements (a, b, c, d, e, f)
  measurements: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    lap: number;
  };
  
  // Calculations
  total: number;           // Total measurement
  noOfBends: number;       // Number of deductions
  deduction: number;       // Deduction amount
  cuttingLength: number;   // After deduction
  totalLength: number;     // Total length in meters
}

export interface BBSTable {
  // Project Header
  projectName: string;
  drawingNo: string;
  item: string;
  concrete: string;
  gradeOfSteel: string;
  
  // Component Info
  componentName: string;
  spanX: number;
  spanY: number;
  
  // Table Data
  rows: BBSTableRow[];
  
  // Summary
  totalWeight: number;
  diameterSummary: {
    [diameter: number]: {
      totalLength: number;
      totalWeight: number;
    };
  };
}

// ============================================================================
// BBS TABLE GENERATOR
// ============================================================================

/**
 * Generate complete BBS table for a component
 */
export function generateBBSTable(
  component: ConcreteComponent,
  metadata: BBSMetadata,
  concreteGrade: ConcreteGrade = 'M30'
): BBSTable {
  
  const rows: BBSTableRow[] = [];
  let slNo = 1;
  
  // Process each bar entry
  component.bars.forEach(barEntry => {
    // Calculate the bar entry with enhanced logic
    const calculated = calculateComponentBarEntryEnhanced(barEntry, component, concreteGrade);
    
    // Create table row
    const row = createBBSTableRow(slNo, barEntry, component, calculated);
    rows.push(row);
    slNo++;
  });
  
  // Calculate summary
  const { totalWeight, diameterSummary } = calculateBBSSummary(rows);
  
  return {
    projectName: metadata.projectName,
    drawingNo: metadata.drawingNumber,
    item: metadata.itemDescription,
    concrete: metadata.concreteGrade,
    gradeOfSteel: metadata.steelGrade,
    componentName: component.name,
    spanX: component.spanX,
    spanY: component.spanY,
    rows,
    totalWeight,
    diameterSummary
  };
}

/**
 * Create a single BBS table row
 */
function createBBSTableRow(
  slNo: number,
  barEntry: ComponentBarEntry,
  component: ConcreteComponent,
  calculated: CalculatedBarResult
): BBSTableRow {
  
  // Calculate bars per meter for spacing
  const relevantSpan = barEntry.direction === 'X' ? component.spanY : component.spanX;
  const barsPerMeter = barEntry.spacing > 0 ? Math.ceil(1000 / barEntry.spacing) : 0;
  
  return {
    slNo,
    barType: barEntry.barType,
    spanX: barEntry.direction === 'X' ? component.spanX : undefined,
    spanY: barEntry.direction === 'Y' ? component.spanY : undefined,
    spacing: barEntry.spacing,
    diameter: barEntry.diameter,
    noOfBarsPerMeter: barsPerMeter,
    totalNoOfBars: calculated.noOfBars,
    noOfBarsRequired: calculated.noOfBars,
    measurements: {
      a: barEntry.measurements.a || 0,
      b: barEntry.measurements.b || 0,
      c: barEntry.measurements.c || 0,
      d: barEntry.measurements.d || 0,
      e: barEntry.measurements.e || 0,
      f: barEntry.measurements.f || 0,
      lap: barEntry.measurements.lap || 0
    },
    total: calculated.totalMeasurement,
    noOfBends: calculated.noOfDeductions,
    deduction: calculated.deductionAmount,
    cuttingLength: calculated.cuttingLength,
    totalLength: calculated.totalLength
  };
}

/**
 * Calculate BBS summary totals
 */
function calculateBBSSummary(rows: BBSTableRow[]) {
  const diameterSummary: { [diameter: number]: { totalLength: number; totalWeight: number } } = {};
  let totalWeight = 0;
  
  rows.forEach(row => {
    const diameter = row.diameter;
    const length = row.totalLength;
    const unitWeight = WEIGHT_PER_METER[diameter] || ((diameter * diameter) / 162);
    const weight = length * unitWeight;
    
    if (!diameterSummary[diameter]) {
      diameterSummary[diameter] = { totalLength: 0, totalWeight: 0 };
    }
    
    diameterSummary[diameter].totalLength += length;
    diameterSummary[diameter].totalWeight += weight;
    totalWeight += weight;
  });
  
  return { totalWeight, diameterSummary };
}

// ============================================================================
// TABLE FORMATTERS
// ============================================================================

/**
 * Format BBS table as HTML for display
 */
export function formatBBSTableHTML(bbsTable: BBSTable): string {
  const diameterHeaders = Object.keys(bbsTable.diameterSummary)
    .map(d => `<th>${d}</th>`)
    .join('');
  
  const diameterWeights = Object.keys(bbsTable.diameterSummary)
    .map(d => {
      const summary = bbsTable.diameterSummary[parseInt(d)];
      return `<td>${summary.totalWeight.toFixed(2)}</td>`;
    })
    .join('');
  
  return `
    <div class="bbs-table">
      <!-- Header -->
      <div class="bbs-header">
        <h3>PROJECT: ${bbsTable.projectName}</h3>
        <p>Dwg No: ${bbsTable.drawingNo}</p>
        <p>Item: ${bbsTable.item}</p>
        <p>Concrete: ${bbsTable.concrete} | Grade of Steel: ${bbsTable.gradeOfSteel}</p>
      </div>
      
      <!-- Diameter Summary -->
      <table class="diameter-summary">
        <tr>
          <th>Dia of Bar</th>
          ${diameterHeaders}
        </tr>
        <tr>
          <th>Wt per MTR</th>
          ${Object.keys(bbsTable.diameterSummary).map(d => `<td>${(WEIGHT_PER_METER[parseInt(d)] || ((parseInt(d) * parseInt(d)) / 162)).toFixed(3)}</td>`).join('')}
        </tr>
        <tr>
          <th>Wt</th>
          ${diameterWeights}
        </tr>
      </table>
      
      <!-- Main BBS Table -->
      <table class="bbs-main-table">
        <thead>
          <tr>
            <th rowspan="2">Sl No</th>
            <th rowspan="2">Bar Type</th>
            <th rowspan="2">Span (X)</th>
            <th rowspan="2">Span (Y)</th>
            <th rowspan="2">Spacing (MM)</th>
            <th rowspan="2">Dia</th>
            <th rowspan="2">No of Bars per Meter</th>
            <th rowspan="2">Total No of Bars</th>
            <th rowspan="2">No of Bars Required</th>
            <th colspan="7">Measurement of the Bar (MM)</th>
            <th rowspan="2">Total</th>
            <th rowspan="2">No of Bends</th>
            <th rowspan="2">Deduction</th>
            <th rowspan="2">Cutting Length</th>
            <th rowspan="2">Total Length (m)</th>
          </tr>
          <tr>
            <th>a</th>
            <th>b</th>
            <th>c</th>
            <th>d</th>
            <th>e</th>
            <th>f</th>
            <th>Lap</th>
          </tr>
        </thead>
        <tbody>
          ${bbsTable.rows.map(row => `
            <tr>
              <td>${row.slNo}</td>
              <td>${row.barType}</td>
              <td>${row.spanX || ''}</td>
              <td>${row.spanY || ''}</td>
              <td>${row.spacing}</td>
              <td>${row.diameter}</td>
              <td>${row.noOfBarsPerMeter}</td>
              <td>${row.totalNoOfBars}</td>
              <td>${row.noOfBarsRequired}</td>
              <td>${row.measurements.a}</td>
              <td>${row.measurements.b}</td>
              <td>${row.measurements.c}</td>
              <td>${row.measurements.d}</td>
              <td>${row.measurements.e}</td>
              <td>${row.measurements.f}</td>
              <td>${row.measurements.lap}</td>
              <td>${row.total}</td>
              <td>${row.noOfBends}</td>
              <td>${row.deduction}</td>
              <td>${row.cuttingLength}</td>
              <td>${row.totalLength.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <!-- Total Weight -->
      <div class="bbs-footer">
        <p><strong>Total Weight: ${bbsTable.totalWeight.toFixed(2)} kg</strong></p>
      </div>
    </div>
  `;
}

/**
 * Format BBS table as CSV for Excel export
 */
export function formatBBSTableCSV(bbsTable: BBSTable): string {
  const headers = [
    'Sl No', 'Bar Type', 'Span (X)', 'Span (Y)', 'Spacing (MM)', 'Dia',
    'No of Bars per Meter', 'Total No of Bars', 'No of Bars Required',
    'a', 'b', 'c', 'd', 'e', 'f', 'Lap',
    'Total', 'No of Bends', 'Deduction', 'Cutting Length', 'Total Length (m)'
  ];
  
  const rows = bbsTable.rows.map(row => [
    row.slNo,
    row.barType,
    row.spanX || '',
    row.spanY || '',
    row.spacing,
    row.diameter,
    row.noOfBarsPerMeter,
    row.totalNoOfBars,
    row.noOfBarsRequired,
    row.measurements.a,
    row.measurements.b,
    row.measurements.c,
    row.measurements.d,
    row.measurements.e,
    row.measurements.f,
    row.measurements.lap,
    row.total,
    row.noOfBends,
    row.deduction,
    row.cuttingLength,
    row.totalLength.toFixed(2)
  ]);
  
  return [
    `PROJECT: ${bbsTable.projectName}`,
    `Dwg No: ${bbsTable.drawingNo}`,
    `Item: ${bbsTable.item}`,
    `Concrete: ${bbsTable.concrete} | Grade of Steel: ${bbsTable.gradeOfSteel}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Format BBS table as console table for debugging
 */
export function formatBBSTableConsole(bbsTable: BBSTable): void {
  console.log(`\n=== BBS TABLE: ${bbsTable.componentName} ===`);
  console.log(`Project: ${bbsTable.projectName}`);
  console.log(`Drawing: ${bbsTable.drawingNo}`);
  console.log(`Concrete: ${bbsTable.concrete} | Steel: ${bbsTable.gradeOfSteel}`);
  console.log(`Span X: ${bbsTable.spanX}mm | Span Y: ${bbsTable.spanY}mm\n`);
  
  // Main table
  console.table(bbsTable.rows.map(row => ({
    'Sl': row.slNo,
    'Bar Type': row.barType,
    'Dia': row.diameter,
    'Spacing': row.spacing,
    'Bars': row.totalNoOfBars,
    'a': row.measurements.a,
    'b': row.measurements.b,
    'c': row.measurements.c,
    'd': row.measurements.d,
    'e': row.measurements.e,
    'f': row.measurements.f,
    'Total': row.total,
    'Bends': row.noOfBends,
    'Deduction': row.deduction,
    'Cutting': row.cuttingLength,
    'Length(m)': row.totalLength.toFixed(2)
  })));
  
  // Summary
  console.log('\n=== DIAMETER SUMMARY ===');
  Object.entries(bbsTable.diameterSummary).forEach(([dia, summary]) => {
    console.log(`${dia}mm: ${summary.totalLength.toFixed(2)}m | ${summary.totalWeight.toFixed(2)}kg`);
  });
  console.log(`\nTOTAL WEIGHT: ${bbsTable.totalWeight.toFixed(2)} kg\n`);
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example usage of BBS table generation
 */
export function generateExampleBBSTable(): BBSTable {
  // Example component data
  const component: ConcreteComponent = {
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
      {
        id: '1',
        barType: 'Bottom Bar (X-X)',
        direction: 'X',
        diameter: 8,
        spacing: 275,
        measurements: { a: 3160, b: 260, c: 260, d: 65, e: 65, f: 650 }
      },
      {
        id: '2',
        barType: 'Bottom Bar Dist (X-X)',
        direction: 'X',
        diameter: 8,
        spacing: 325,
        measurements: { a: 1350, b: 130, c: 130, d: 65, e: 95 }
      }
    ]
  };
  
  const metadata: BBSMetadata = {
    projectName: 'Provident White Oaks - Bangalore',
    drawingNumber: 'ST-B-327-R0',
    itemDescription: 'Terrace Slab Reinforcement',
    concreteGrade: 'M30',
    steelGrade: 'Fe500'
  };
  
  return generateBBSTable(component, metadata, 'M30');
}