# RebarCalc: Future Ideas

Brainstormed 2026-09-22 from the graphify knowledge graph (`graphify-out/`) and the dra-bbs skill archive.

## Product ideas (no AI needed)

1. **DRA slab format.** Only the Provident U-bar slab style is built. Cranked bars, L/7 and L/5 extra tops, and sunken panels are unported. Needs `DRA_iHeart_14th_to_18th_Floor_BBS.xlsx` (Typical_Slab sheet) to port from.
2. **Columns, footings, staircases.** `FOOTING_TYPES` and `COMPONENT_COVERS` exist in `constants.ts` but nothing consumes them. Beams and slabs cover roughly 60% of a floor's steel.
3. **In-app doubt resolution.** Make each importer doubt a persisted decision with a chosen option, so re-import recalculates from rulings instead of re-asking. The skill's "seven open rulings" (Ld 40D vs 50D, bundled call-out split, stirrup zoning, slab thickness divergences, etc.) are the seed list.
4. **Cutting-stock optimizer.** Nest cut lengths into 12 m stock bars per diameter; report waste % and offcut reuse.
5. **Benchmark sanity check.** Surface a kg/m³ gauge per floor (typical-floor benchmark: 140.5 kg/m³, 29.680 MT beams, 23.575 MT slabs) so a mis-entered span shows as an outlier.
6. **Revision diff.** Compare two BBS versions of the same floor; list changed rows and weight delta. Importer + a row key is enough.
7. **Cloud sync.** Everything is localStorage today (old Supabase client was deleted). Multi-device and sharing with a site engineer need a backend.

## AI ideas (ordered by value over effort)

1. **Schedule from drawing.** Upload a PDF/photo of the beam schedule; Claude (vision + structured outputs) extracts it into the JSON shape `schedule-importer.ts` already consumes. This is what the dra-bbs skill did by hand in a separate session. Biggest single unlock.
2. **Rule porting from a client's sample workbook.** Give Claude a new client's BBS `.xlsx`; it infers the house rules as a code profile (Ld factor, curtail offset, rounding rules). Two formats were ported by hand this session at ~a day each.
3. **Doubt explainer and default picker.** For each doubt, Claude explains both readings, cites the IS 456 clause, proposes a default. Pairs with product idea 3.
4. **Natural-language bulk edits.** "Change all end-zone stirrups on the 19th floor to T8 at 150." Claude emits tool calls against existing calculator functions; it computes nothing itself.
5. **Anomaly review.** After import, Claude reads the row table plus benchmark totals and flags suspicious rows (e.g. stirrup count double its neighbours).
6. **Formula chat.** `formulaDisplayService` breakdowns become context for "why is this cut length 4,235?" answered in plain language.

## Architecture note

All AI features need one small server function to hold the API key (app is pure client-side). A single Vercel serverless route proxying to the Messages API covers ideas 1–6. Model: `claude-opus-5` with adaptive thinking; structured outputs for the extraction cases.

## Graph findings worth acting on

- `ProjectConfig` (58 edges) and `BarEntry` (42) are the god nodes; any schema change ripples across 6–7 communities.
- "Component BBS Calc & Excel Export" and "Manual Bar Calculator & Formulas" have cohesion 0.05; both are split candidates.
- Barrel files (`SummaryCards.tsx`, `types/index.ts`) create duplicate import/re-export edges; harmless but noisy.

## Open question

Which outcome first for the next release: (A) schedule from drawing, (B) DRA slab format, (C) persisted doubt rulings + AI explanations, or (D) other?
