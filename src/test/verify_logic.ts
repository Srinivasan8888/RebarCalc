// Node.js imports - commented out for browser compatibility
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
import { calculateComponentBarEntry } from '../lib/component-calculator.ts';
import { DEFAULT_DEVELOPMENT_LENGTHS, DEFAULT_STANDARD_BAR_LENGTH } from '../lib/constants.ts';
import type { ComponentBarEntry } from '../types/component-types.ts';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Load parsed data - commented out for browser compatibility
// const parsedDataPath = path.resolve(__dirname, '../../../excel_bbs_parsed.json');
// const rawData = fs.readFileSync(parsedDataPath, 'utf-8');
// const data = JSON.parse(rawData);

// Mock data for browser compatibility
const data: any = {};

let totalPassed = 0;
let totalFailed = 0;

console.log(`\n=========================================`);
console.log(`Running "Pixel Perfect" Verification`);
console.log(`=========================================\n`);

const settings = {
    developmentLengths: DEFAULT_DEVELOPMENT_LENGTHS, // Assuming M30 default matches
    standardBarLength: DEFAULT_STANDARD_BAR_LENGTH
};

data.sheets.forEach((sheet: any) => {
    console.log(`Checking Sheet: ${sheet.sheet_name}`);
    
    sheet.bars.forEach((bar: any, index: number) => {
        // Construct mock entry
        const entry: ComponentBarEntry = {
            id: 'test',
            barType: bar.bar_type,
            direction: 'X', // Dummy, logic relies on Span passed explicitly
            diameter: bar.diameter,
            spacing: bar.spacing,
            barsPerMember: bar.bars_per_member,
            totalMembers: bar.total_members, // Use Excel's calculated members to isolate unit test
            manualNoOfDeductions: bar.no_of_bends, // Pass raw bend count. Bends * Dia * 2 is typical deduction.
            measurements: {
                a: bar.a,
                b: bar.b,
                c: bar.c,
                d: bar.d,
                e: bar.e,
                f: bar.f,
                lap: bar.lap
            }
        };

        // Determine span from bar data to checking calculation
        // But for verification, we trust 'total_members' from Excel to check Cut Length accuracy primarily
        
        const result = calculateComponentBarEntry(
            entry,
            0, // Span dummy, we provided totalMembers
            0, // Cover dummy
            settings,
            false // UBar flag
        );

        // Verification Check 1: Cut Length
        const calcCut = result.cuttingLength;
        const excelCut = bar.cut_length;
        
        const diff = Math.abs(calcCut - excelCut);
        
        if (diff > 1) { // Allow 1mm tolerance for rounding diffs
            console.log(`[FAIL] Row ${index}: ${bar.bar_type}`);
            console.log(`Expected: ${excelCut}, Got: ${calcCut}`);
            console.log(`Inputs: ${JSON.stringify(entry.measurements)}`);
            console.log(`Debug: Bends=${bar.no_of_bends}, Dia=${bar.diameter}, Sum=${Number(bar.a||0)+Number(bar.b||0)+Number(bar.c||0)+Number(bar.d||0)+Number(bar.e||0)+Number(bar.f||0)}`);
            // console.log(`Meas: ${JSON.stringify(bar.formulas)}`);
            totalFailed++;
        } else {
            totalPassed++;
        }
    });
});

console.log(`\n=========================================`);
console.log(`Total Passed: ${totalPassed}`);
console.log(`Total Failed: ${totalFailed}`);
console.log(`Accuracy: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);
console.log(`=========================================`);
