# RebarCalc

Web version of AutoScan Steel (Newton India): turns a reinforcement schedule or an issued Bar Bending Schedule (BBS) workbook into an exact, editable BBS for RCC slabs and beams, and writes it back in the customer's Excel layout. Read `PRODUCT.md` before any UI work and `DESIGN.md` before any visual work.

## The one rule

**The customer's Excel is the specification.** Every calculation in Component mode is a port of a cell formula from a real workbook in `data/`, cited in a code comment, and locked by a test that asserts the workbook's own cached values. Engineering heuristics ("IS 456 says…") are not a substitute. If a formula is not in a workbook we have, ask for the workbook; do not invent one.

Reference workbooks (client data, keep them in `data/`, never copy elsewhere):

| File | What it proves |
|---|---|
| `data/Sample Slab BBS.xlsx` | Provident slab format, rows 15–18: U-bars, dist bars, CEILING cut rule, 23.790617 kg |
| `data/DRA_iHeart_19th_Floor_Beam_BBS.xlsx` | DRA beam format, 369 beams / 2,6xx rows, grand total 34,227.2066779835 kg |
| `data/DRA_iHeart_19th_Floor_BBS_Doubts.xlsx` | "Geometry Required" sheet = a beam *schedule* (23 marks, no spans) |
| `data/dra-bbs.skill` | The generator skill the DRA beam workbook came from; `references/beam-rules.md` and `slab-rules.md` inside are the written house rules |

Tests that are the spec (keep green, extend rather than weaken):
`sample-slab-bbs`, `slab-bar-families`, `beam-bbs`, `excel-importer`, `schedule-importer`, `bbs-excel-exporter`, `bbs-spreadsheet-view`.

## Map

```
src/types/component-types.ts   ConcreteComponent (slab/beam member), ComponentBarEntry, BBSMetadata
src/lib/enhanced-calculator.ts calculateBarMeasurementsAuto (legs a..f per bar family), calculateBarsPerMember (col H), runOf
src/lib/component-calculator.ts bends (col R/L), deduction, cut length (STD vs CEILING), weight d²/162, recalculateComponents (the one path)
src/lib/excel-importer.ts       parseBBSWorkbook: sniffs slab BBS / beam BBS / beam schedule layouts
src/lib/schedule-importer.ts    schedule row → generated bars by DRA house rules + doubts[]
src/lib/bbs-excel-exporter.ts   writes both house layouts back (live formulas + cached results); round-trips
src/lib/constants.ts            BAR_TYPES per member type (names must match the sheets), Ld tables, covers
src/components/BBSSpreadsheetView.tsx  the BBS table (sheet column order); one member expanded at a time
src/components/ProjectDetailPage.tsx   import/export buttons, inline doubts panel, autosave
src/components/TotalSteelWeight.tsx    dia-wise TOTAL block
src/lib/calculator.ts + BarEntryTable  legacy Manual mode (shape codes S1–S6); untouched by the Excel work
```

Data flow: `components[]` (with stored `measurements` and `calculated`) live in `ProjectConfig.components`, persisted to localStorage. Editing a bar or a member calls `recalculateComponents(components, metadata)`; the table displays only `bar.calculated`. Measurements are stored values (the user can overtype any leg) and are regenerated only when bar type, direction, or member dimensions change.

## Domain vocabulary

- **Member**: a slab panel or a beam (a `ConcreteComponent`). Beams carry `elementCount` (sheet col F "Element": identical beams sharing one entry) and, in a continuous run, `runId`/`runPosition`.
- **Legs a..f + Lap**: the segments of one bar; **Total** = sum; **Bends** × 2d = **Deduction**; **Cut length** = Total − Deduction, except Y-Y slab main bars and top main/dist bars which use `CEILING(a+b+c+d+e+deduction, 5)`.
- **Members** (col H) = bars along the perpendicular span (`ROUNDUP(span/spacing)`), or for dist bars over the top extensions, or for beam stirrups `TRUNC(2D/sp)` (end zones) / `TRUNC((J−4D)/sp)` (middle) / `TRUNC(J/sp)` (full). For beam main bars it is typed (rods per layer).
- **Total nos** = bars/member × members × elementCount. **Length (m)** = cut × total nos / 1000. **kg** = length × d²/162 (unrounded).
- **Ld**: development length per diameter; the slab workbook uses 50D, the DRA beam workbook's table is 40D even though its header says 50D (the table wins). **Curtail offset** (`R8`, 300) shortens bottom curtail bars.
- **Doubt**: anything the app had to assume (missing span, bundled call-out `2T20+1T16`, a typed member count that differs from the formula). Shown inline; never resolved silently.

## Working here

- Shortest correct diff. Reuse `recalculateComponents`, `fmt`, `num`, the ui primitives. No new dependencies without a reason the stdlib or an installed package cannot meet.
- New bar family or layout: read the workbook with exceljs (`node -e` scripts are fine), derive the rule from the cell formulas, comment the cells, add a test that asserts the sheet's cached values, then implement.
- Performance ceiling that matters: a floor is ~400 members / 3,000 bars. Never mount every bar row; native `<select>` in rows, Radix only for the two grade dropdowns.
- Copy: terse, specific, no em dashes. Numbers right-aligned with tabular figures. Meaning never by colour alone.
- `npm run dev` (Vite, :5173), `npm test` (vitest, 23 files), `npm run build` (tsc -b + vite). `npm run lint` has pre-existing errors in `calculator.ts`, `formula-display-service.ts`, `validation.test.ts`, `ShapeDiagram.tsx`; do not let them grow.
- Commit only when asked. `graphify-out/` is a scratch directory, not part of the app.

## Known gaps

- DRA **slab** format (cranked bars, `L/7 · L/5 · 0.3L`, sunken panels) is not implemented; needs `DRA_iHeart_14th_to_18th_Floor_BBS.xlsx` (Typical_Slab sheet).
- A workbook with both beam and slab sheets re-imports beams only (importer sniffs the first sheet).
- Runs can be imported, not created in the UI; a hand-typed intermediate `Left & Right` extra-top bar gets 1 bend from the name rule instead of 0.
- Export writes one cover per sheet (from the first member).
- Header project switcher and settings icon never render: `App.tsx` does not pass `onProjectChange` / `onProjectSettings`.
- Column and footing formulas are heuristics, not from a sheet.
