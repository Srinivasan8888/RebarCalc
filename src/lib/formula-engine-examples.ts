/**
 * Example Usage of Rebar Calculation Engine
 * 
 * This file demonstrates how to use the formula engine with real data
 */

import {
  RebarProject,
  calculateProject,
  getSummaryByDiameter,
  getTotalProjectWeight,
  BarCalculationOutput
} from './formula-engine';

// ============================================
// EXAMPLE 1: Simple Slab with Basic Bars
// ============================================

export const exampleProject1: RebarProject = {
  project_id: "proj_001",
  project_name: "Simple Rectangular Slab",
  
  metadata: {
    concrete_grade: "M30",
    steel_grade: "550D",
    cover: 30,
    ld_values: {
      "8": 400,
      "10": 500,
      "12": 599,
      "16": 798,
      "20": 998,
      "25": 1247,
      "32": 1995
    }
  },
  
  members: [
    {
      member_id: "slab_1",
      span_x: 3000,              // 3m span in X direction
      span_y: 4000,              // 4m span in Y direction
      slab_depth: 150,           // 150mm thick slab
      projection_x1: 500,        // 500mm projection on one side
      projection_x2: 300,        // 300mm projection on other side
      projection_y1: 400,        // 400mm projection
      projection_y2: 600,        // 600mm projection
      hook_length_x1: 100,       // 100mm hook
      hook_length_x2: 120,       // 120mm hook
      hook_length_y1: 100,
      hook_length_y2: 120
    }
  ],
  
  bar_types: [
    {
      bar_type: "Bottom Bar (X-X)",
      spacing: 275,              // 275mm c/c
      dia: 8,                    // 8mm diameter
      no_bars: 1,                // Single layer
      bend_count: 4,             // 4 bends (U-shape)
      member_ref: "slab_1"
    },
    {
      bar_type: "Bottom Bar Dist (X-X)",
      spacing: 325,
      dia: 8,
      no_bars: 1,
      bend_count: 2,             // 2 bends (L-shape)
      member_ref: "slab_1"
    },
    {
      bar_type: "Bottom Bar (Y-Y)",
      spacing: 275,
      dia: 8,
      no_bars: 1,
      bend_count: 4,             // 4 bends (U-shape)
      member_ref: "slab_1"
    },
    {
      bar_type: "Bottom Bar Dist (Y-Y)",
      spacing: 325,
      dia: 8,
      no_bars: 1,
      bend_count: 2,             // 2 bends (L-shape)
      member_ref: "slab_1"
    }
  ]
};

// ============================================
// EXAMPLE 2: Slab with Opening
// ============================================

export const exampleProject2: RebarProject = {
  project_id: "proj_002",
  project_name: "Slab with Staircase Opening",
  
  metadata: {
    concrete_grade: "M30",
    steel_grade: "550D",
    cover: 30,
    ld_values: {
      "8": 400,
      "10": 500,
      "12": 599,
      "16": 798,
      "20": 998,
      "25": 1247,
      "32": 1995
    }
  },
  
  members: [
    {
      member_id: "slab_with_opening",
      span_x: 5000,              // 5m span
      span_y: 6000,              // 6m span
      slab_depth: 175,           // 175mm thick
      opening_x: 1000,           // 1m x 800mm opening
      opening_y: 800,
      hook_length_x1: 120,
      hook_length_x2: 120,
      hook_length_y1: 120,
      hook_length_y2: 120
    }
  ],
  
  bar_types: [
    {
      bar_type: "Bottom Bar (X-X) Full Span",
      spacing: 275,
      dia: 10,                   // 10mm bars for larger span
      no_bars: 1,
      bend_count: 2,
      member_ref: "slab_with_opening"
    },
    {
      bar_type: "Bottom Bar (Y-Y) Full Span",
      spacing: 225,
      dia: 10,
      no_bars: 1,
      bend_count: 2,
      member_ref: "slab_with_opening"
    }
  ]
};

// ============================================
// EXAMPLE 3: Multi-Member Project
// ============================================

export const exampleProject3: RebarProject = {
  project_id: "proj_003",
  project_name: "Multi-Slab Building",
  
  metadata: {
    concrete_grade: "M30",
    steel_grade: "550D",
    cover: 30,
    ld_values: {
      "8": 400,
      "10": 500,
      "12": 599,
      "16": 798,
      "20": 998,
      "25": 1247,
      "32": 1995
    }
  },
  
  members: [
    {
      member_id: "ground_floor_slab",
      span_x: 3500,
      span_y: 4500,
      slab_depth: 150,
      hook_length_x1: 100,
      hook_length_x2: 100,
      hook_length_y1: 100,
      hook_length_y2: 100
    },
    {
      member_id: "first_floor_slab",
      span_x: 3500,
      span_y: 4500,
      slab_depth: 150,
      hook_length_x1: 100,
      hook_length_x2: 100,
      hook_length_y1: 100,
      hook_length_y2: 100
    },
    {
      member_id: "terrace_slab",
      span_x: 3500,
      span_y: 4500,
      slab_depth: 175,           // Thicker for terrace
      hook_length_x1: 120,
      hook_length_x2: 120,
      hook_length_y1: 120,
      hook_length_y2: 120
    }
  ],
  
  bar_types: [
    // Ground floor
    {
      bar_type: "Bottom Bar (X-X)",
      spacing: 200,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "ground_floor_slab"
    },
    {
      bar_type: "Bottom Bar (Y-Y)",
      spacing: 200,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "ground_floor_slab"
    },
    // First floor
    {
      bar_type: "Bottom Bar (X-X)",
      spacing: 200,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "first_floor_slab"
    },
    {
      bar_type: "Bottom Bar (Y-Y)",
      spacing: 200,
      dia: 8,
      no_bars: 1,
      bend_count: 2,
      member_ref: "first_floor_slab"
    },
    // Terrace (heavier reinforcement)
    {
      bar_type: "Bottom & Top Bar (X-X)",
      spacing: 150,
      dia: 10,
      no_bars: 2,                // Both top and bottom
      bend_count: 2,
      member_ref: "terrace_slab"
    },
    {
      bar_type: "Bottom & Top Bar (Y-Y)",
      spacing: 150,
      dia: 10,
      no_bars: 2,
      bend_count: 2,
      member_ref: "terrace_slab"
    }
  ]
};

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example 1: Calculate a simple project
 */
export function runExample1() {
  console.log("=== EXAMPLE 1: Simple Slab ===\n");
  
  const calculations = calculateProject(exampleProject1);
  
  console.log("Bar Bending Schedule:");
  console.table(calculations.map(calc => ({
    "Bar Type": calc.bar_type,
    "Dia (mm)": calc.dia,
    "Spacing (mm)": calc.spacing,
    "Total Members": calc.total_members,
    "Total Nos": calc.total_nos,
    "Cut Length (mm)": calc.cut_length,
    "Total Length (mm)": calc.total_length,
    "Weight (kg)": calc.weight.toFixed(2)
  })));
  
  const totalWeight = getTotalProjectWeight(calculations);
  console.log(`\nTotal Steel Weight: ${totalWeight.toFixed(2)} kg`);
  
  return calculations;
}

/**
 * Example 2: Calculate project with summary by diameter
 */
export function runExample2() {
  console.log("\n=== EXAMPLE 2: Slab with Opening ===\n");
  
  const calculations = calculateProject(exampleProject2);
  
  console.log("Bar Bending Schedule:");
  console.table(calculations.map(calc => ({
    "Bar Type": calc.bar_type,
    "Dia (mm)": calc.dia,
    "Total Nos": calc.total_nos,
    "Cut Length (mm)": calc.cut_length,
    "Weight (kg)": calc.weight.toFixed(2)
  })));
  
  const summary = getSummaryByDiameter(calculations);
  console.log("\nSummary by Diameter:");
  console.table(Object.entries(summary).map(([dia, data]) => ({
    "Diameter (mm)": dia,
    "Total Bars": data.count,
    "Total Length (mm)": data.total_length,
    "Total Weight (kg)": data.total_weight.toFixed(2)
  })));
  
  return calculations;
}

/**
 * Example 3: Multi-member project with detailed breakdown
 */
export function runExample3() {
  console.log("\n=== EXAMPLE 3: Multi-Slab Building ===\n");
  
  const calculations = calculateProject(exampleProject3);
  
  // Group by member
  const byMember: Record<string, BarCalculationOutput[]> = {};
  
  exampleProject3.bar_types.forEach((barType, idx) => {
    const memberRef = barType.member_ref;
    if (!byMember[memberRef]) {
      byMember[memberRef] = [];
    }
    byMember[memberRef].push(calculations[idx]);
  });
  
  // Display by member
  Object.entries(byMember).forEach(([memberRef, calcs]) => {
    console.log(`\n${memberRef.toUpperCase()}:`);
    console.table(calcs.map(calc => ({
      "Bar Type": calc.bar_type,
      "Dia": calc.dia,
      "Total Nos": calc.total_nos,
      "Weight (kg)": calc.weight.toFixed(2)
    })));
    
    const memberWeight = calcs.reduce((sum, c) => sum + c.weight, 0);
    console.log(`Subtotal: ${memberWeight.toFixed(2)} kg`);
  });
  
  const totalWeight = getTotalProjectWeight(calculations);
  console.log(`\n=== TOTAL PROJECT WEIGHT: ${totalWeight.toFixed(2)} kg ===`);
  
  return calculations;
}

/**
 * Example 4: Detailed breakdown showing all MEAS values
 */
export function runExample4Detailed() {
  console.log("\n=== EXAMPLE 4: Detailed Calculation Breakdown ===\n");
  
  const calculations = calculateProject(exampleProject1);
  const firstBar = calculations[0];
  
  console.log(`Bar Type: ${firstBar.bar_type}`);
  console.log(`Diameter: ${firstBar.dia}mm`);
  console.log(`Spacing: ${firstBar.spacing}mm c/c`);
  console.log(`\nCalculation Steps:`);
  console.log(`1. Total Members = ${firstBar.total_members}`);
  console.log(`2. Total Nos = ${firstBar.total_members} × ${firstBar.no_bars} = ${firstBar.total_nos}`);
  console.log(`\n3. Measurements:`);
  console.log(`   MEAS_A (Main Span) = ${firstBar.meas_a}mm`);
  console.log(`   MEAS_B (Hook 1) = ${firstBar.meas_b}mm`);
  console.log(`   MEAS_C (Hook 2) = ${firstBar.meas_c}mm`);
  console.log(`   MEAS_D (Depth 1) = ${firstBar.meas_d}mm`);
  console.log(`   MEAS_E (Depth 2) = ${firstBar.meas_e}mm`);
  if (firstBar.meas_f) {
    console.log(`   MEAS_F (Additional) = ${firstBar.meas_f}mm`);
  }
  console.log(`\n4. Cut Length = ${firstBar.meas_a} + ${firstBar.meas_b} + ${firstBar.meas_c} + ${firstBar.meas_d} + ${firstBar.meas_e}${firstBar.meas_f ? ` + ${firstBar.meas_f}` : ''} = ${firstBar.cut_length}mm`);
  console.log(`5. Deduction = ${firstBar.deduction}mm`);
  console.log(`6. Total Length = ${firstBar.total_nos} × ${firstBar.cut_length} = ${firstBar.total_length}mm`);
  console.log(`7. Weight = (${firstBar.dia}² / 162) × ${firstBar.cut_length} × ${firstBar.total_nos} / 1000 = ${firstBar.weight.toFixed(2)}kg`);
  
  return firstBar;
}

// ============================================
// REACT COMPONENT USAGE EXAMPLE
// ============================================

/**
 * Example React component using the calculation engine
 */
export const ExampleReactComponent = `
import { useState } from 'react';
import { RebarProject, calculateProject, BarCalculationOutput } from '@/lib/formula-engine';

export function RebarCalculator() {
  const [project, setProject] = useState<RebarProject | null>(null);
  const [results, setResults] = useState<BarCalculationOutput[]>([]);
  
  const handleCalculate = () => {
    if (project) {
      const calculations = calculateProject(project);
      setResults(calculations);
    }
  };
  
  return (
    <div>
      <h1>Rebar Calculator</h1>
      
      {/* Project input form */}
      <ProjectForm onSubmit={setProject} />
      
      {/* Calculate button */}
      <button onClick={handleCalculate}>Calculate</button>
      
      {/* Results table */}
      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Bar Type</th>
              <th>Dia</th>
              <th>Spacing</th>
              <th>Total Nos</th>
              <th>Cut Length</th>
              <th>Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((calc, idx) => (
              <tr key={idx}>
                <td>{calc.bar_type}</td>
                <td>{calc.dia}</td>
                <td>{calc.spacing}</td>
                <td>{calc.total_nos}</td>
                <td>{calc.cut_length}</td>
                <td>{calc.weight.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
`;

// ============================================
// RUN ALL EXAMPLES
// ============================================

export function runAllExamples() {
  runExample1();
  runExample2();
  runExample3();
  runExample4Detailed();
}

// For Node.js execution
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}
