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

---

# Architecture Design

Written 2026-09-22. Scope: the target architecture that lets the product ideas and AI ideas above land without a rewrite. Everything below is grounded in the current code (`src/lib`, `src/types`) and the graphify graph.

## 1. Current state (as-is)

```
┌─────────────────────────────── Browser (Vite + React 19) ───────────────────────────────┐
│                                                                                          │
│  ProjectListView ─► ProjectDetailPage ─► BBSSpreadsheetView / BarEntryTable / Summary*   │
│                          │                                                               │
│                          │ config: ProjectConfig { bbsMetadata, components[], bars[] }   │
│                          ▼                                                               │
│   ┌──────────── src/lib (pure TypeScript, no React) ────────────┐                        │
│   │ excel-importer.parseBBSWorkbook ──► schedule-importer        │                        │
│   │        │  (3 layouts: slab BBS, beam BBS, beam schedule)     │                        │
│   │        ▼                                                     │                        │
│   │ component-calculator.recalculateComponents ◄── enhanced-calculator (bar families)   │
│   │        │                                                     │                        │
│   │        ▼                                                     │                        │
│   │ bbs-excel-exporter.exportBBSWorkbook   formula-display-service (breakdowns)         │
│   │ calculator.ts (Manual mode, S1–S6 shapes)  code-profiles (IS456/BS/ACI)             │
│   └──────────────────────────────────────────────────────────────┘                        │
│                          │                                                               │
│                          ▼                                                               │
│                local-storage.ts  (localStorage, one key per project)                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Properties that matter for what follows:

- **The domain layer is already pure.** Nothing in `src/lib` imports React. `exceljs` is the only heavy dependency. This is the single most valuable fact: the same code can run in a Node serverless function unchanged.
- **Two god nodes.** `ProjectConfig` (58 edges) and `BarEntry` (42 edges). Schema changes to either ripple across 6–7 communities. New fields must be optional and additive.
- **Doubts are strings.** `parseBBSWorkbook` returns `doubts: string[]`; the page shows them once in a dialog and forgets them. Nothing is persisted, nothing is machine-readable.
- **No backend.** No `api/` directory, no `vercel.json`, Supabase client deleted. Any AI feature needs a place to hold an API key.
- **Golden-workbook tests are the gate.** `sample-slab-bbs.test.ts` and `beam-bbs.test.ts` assert exact Excel parity. Every architecture change below must keep them green; they are the regression oracle for AI-generated data too.

## 2. Target architecture (to-be)

```
┌──────────────────── Browser ────────────────────┐        ┌──────────── Vercel serverless ────────────┐
│                                                 │        │                                            │
│  UI (React)                                     │  HTTPS │  api/ai/[op].ts                            │
│   ├─ Import dialog  ──── PDF/image/xlsx ────────┼────────┼─►  extract_schedule                        │
│   ├─ Doubts panel   ──── rulings ───────────────┼────────┼─►  explain_doubt                           │
│   ├─ Command bar    ──── "change all stirrups…" ┼────────┼─►  propose_edits  (tool loop)              │
│   ├─ Review panel   ──── project snapshot ──────┼────────┼─►  review_rows                             │
│   └─ Profile wizard ──── client xlsx ───────────┼────────┼─►  infer_profile  (self-verifying)         │
│                                                 │        │         │                                  │
│  src/lib  (domain, isomorphic)  ◄───────────────┼────────┼─────────┘  same src/lib code runs here     │
│   ├─ importers / calculators / exporters        │        │                                            │
│   ├─ rulings.ts   (NEW)                         │        │  @anthropic-ai/sdk  ── claude-opus-5       │
│   └─ patches.ts   (NEW)                         │        │  prompt cache: house rules + schemas       │
│                                                 │        │  usage log ──► console / KV                │
│  storage: localStorage now, repository later    │        │                                            │
└─────────────────────────────────────────────────┘        └────────────────────────────────────────────┘
```

Design principles:

1. **The model never computes steel.** Claude produces *inputs* (schedule rows, rulings, patches, profile rules). `recalculateComponents` produces every number. Weights, cut lengths and counts always come from the deterministic calculator, so the golden tests still guard correctness.
2. **One serverless entry point, many operations.** `api/ai/[op].ts` dispatches on a fixed operation name. Each operation is a triple: system prompt, input schema, output schema. No general chat endpoint exists, so the API key can only be spent on known shapes.
3. **Additive data model.** New fields on `ProjectConfig` / `ConcreteComponent` are optional. Old localStorage projects load unchanged.
4. **Everything AI-produced carries provenance.** A row knows whether it came from manual entry, a workbook import, or an AI extraction, and at what confidence.
5. **Structured outputs, not prose parsing.** Every operation uses `output_config.format` with a JSON schema, so the response is schema-valid before the client sees it.

## 3. Data model changes

All in `src/types/component-types.ts`. Additive only.

```ts
// Provenance on every AI-touched entity
export type Provenance = 'manual' | 'import' | 'ai';

export interface ConcreteComponent {
  // ...existing fields unchanged
  provenance?: Provenance;
  sourceRef?: { file: string; page?: number; row?: number }; // where it came from
}

export interface ComponentBarEntry {
  // ...existing fields unchanged
  confidence?: number;         // 0..1, only set by AI extraction
  provenance?: Provenance;
}

// Structured doubt replaces doubts: string[]
export interface Doubt {
  id: string;                  // stable hash of (code, subject) so re-import matches
  code: DoubtCode;             // 'LD_FACTOR' | 'BUNDLED_CALLOUT' | 'STIRRUP_ZONING' | 'SLAB_THICKNESS' | 'BEND_COUNT' | 'GRADE' | 'OTHER'
  subject: string;             // "B91A top bars", "Floor 19 slab S3"
  message: string;             // the human sentence shown today
  options: DoubtOption[];      // each option is a concrete change to metadata/components
  affects: string[];           // component ids whose quantities change
}

export interface DoubtOption {
  key: string;                 // '40D' | '50D' | 'split' | 'bundle' ...
  label: string;
  patch: Patch[];              // applied to metadata/components when chosen
}

export interface Ruling {
  doubtId: string;
  chosenKey: string;
  decidedBy: 'user' | 'ai-default';
  rationale?: string;          // AI explanation or user note
  decidedAt: string;           // ISO
}

export interface ProjectConfig {
  // ...existing
  doubts?: Doubt[];
  rulings?: Ruling[];
  aiAudit?: AiAuditEntry[];    // one per AI call: op, tokens, model, timestamp, applied?
}
```

**Patch** is the universal edit unit. AI operations, doubt options and the command bar all produce patches; the UI previews and applies them through one path.

```ts
// src/lib/patches.ts
export type Patch =
  | { op: 'set_metadata'; key: keyof BBSMetadata; value: unknown }
  | { op: 'set_bar'; componentId: string; barId: string; field: keyof ComponentBarEntry; value: unknown }
  | { op: 'add_bar'; componentId: string; bar: ComponentBarEntry }
  | { op: 'remove_bar'; componentId: string; barId: string }
  | { op: 'set_component'; componentId: string; field: keyof ConcreteComponent; value: unknown };

export function applyPatches(config: ProjectConfig, patches: Patch[]): ProjectConfig; // pure, returns new config
export function describePatch(p: Patch, config: ProjectConfig): string;              // for the preview list
```

`applyPatches` always ends with `recalculateComponents`. There is no way to apply a patch without recalculating.

## 4. Rulings engine

`src/lib/rulings.ts`, pure.

```
importer ──► Doubt[]  ──┐
                        ├──► resolve(doubts, rulings) ──► Patch[] ──► applyPatches ──► recalculate
stored Ruling[] ────────┘
```

- Importers stop returning `string[]` and return `Doubt[]`. The string message survives as `Doubt.message`, so the current dialog keeps working with zero UI change in phase 1.
- `Doubt.id` is a hash of `(code, subject)`. Re-importing the same floor produces the same ids, so existing rulings re-apply automatically. This is what makes "settle once, never again" work.
- Unresolved doubts block export. `exportBBSWorkbook` gains a guard that throws if any doubt in `affects` has no ruling. Steel should not be cut on an open question.
- The seven rulings from the dra-bbs skill become the first seven `DoubtCode` values.

## 5. AI gateway

### 5.1 Layout

```
api/
  ai/
    [op].ts            Vercel function; dispatch + auth + rate limit + usage log
    ops/
      extract-schedule.ts
      explain-doubt.ts
      propose-edits.ts
      review-rows.ts
      infer-profile.ts
    prompts/
      house-rules.md   dra-bbs SKILL.md content, cached as a stable system block
      schemas.ts       JSON schemas for every output (shared with client types)
```

Vercel is the deployment target because the plugin is already installed and the app is a static Vite build. Node runtime (not Edge) because `exceljs` and `src/lib` run there.

### 5.2 Request contract

Every operation is `POST /api/ai/<op>` with JSON body `{ input, snapshot? }` and returns `{ output, usage, model }`.

- `snapshot` is a `ProjectConfig` when the operation needs project context (propose_edits, review_rows). The server runs `src/lib` against it in memory. Nothing is stored server-side.
- Files (PDF, images, xlsx) are sent base64 in `input`. Cap: 20 MB request, enforced before the SDK call.
- Response `output` is validated against the operation's schema on the server *and* the client. Structured outputs guarantee the shape from the model; the second check guards the transport.

### 5.3 Model and request settings

| Setting | Value | Why |
|---|---|---|
| Model | `claude-opus-5` | Vision + structured outputs + tool use, 1M context, adaptive thinking on by default |
| Thinking | omitted (adaptive) | Default on Opus 5; `effort` controls depth |
| Effort | `high` for extract/infer, `medium` for explain/review | Extraction accuracy matters more than latency |
| Output | `output_config.format` JSON schema per op | No prose parsing |
| Streaming | on for extract_schedule and infer_profile | Long outputs; avoids HTTP timeout |
| Caching | `cache_control` on the house-rules system block | 30–40k tokens of rules reused across every call |
| `max_tokens` | 64000 streamed, 16000 otherwise | Per SDK guidance |

### 5.4 Operations

**extract_schedule** (AI idea 1, the biggest unlock)

```
PDF/image ──► split per page ──► for each page (parallel, ≤4):
                                   Opus 5 vision + house-rules system block
                                   output: { rows: ScheduleRow[], cells: CellConfidence[] }
          ──► merge pages ──► buildBeamFromSchedule (existing) ──► components + doubts
```

- Output schema is exactly `ScheduleRow` from `schedule-importer.ts` plus a per-cell confidence. No new domain type.
- `ScheduleRow` fields stay as the schedule text (`"2T20+1T16"`); `parseCallout` (existing) turns them into bars. The model transcribes; it does not interpret.
- Cells under 0.8 confidence render highlighted in a review table beside the page image. The user corrects in place, then imports. Import goes through the *existing* `importBeamSchedule` path so the doubt logic and continuous-run logic are reused as-is.
- PDF limit: 600 pages on Opus 5. Split at 20 pages per request to keep each call short and retryable.

**explain_doubt** (AI idea 3)

Input: one `Doubt` plus the relevant slice of metadata. Output: `{ explanation, citation, recommendedKey }`. The house-rules block already contains the IS 456 references the skill cites. Recommended key is shown as a default, never auto-applied; the user still clicks. If they accept, `Ruling.decidedBy = 'ai-default'` so the audit trail shows it.

**propose_edits** (AI idea 4, natural-language edits)

This is the only operation that uses tool use, and it is a workflow, not an agent: bounded tools, bounded turns.

```
client: { snapshot, instruction: "change all end-zone stirrups on floor 19 to T8@150" }
server:
  tools (read-only, run against the in-memory snapshot using src/lib):
    list_components(filter)      ─► ids, names, types
    get_component(id)            ─► full component with bars
    find_bars(query)             ─► matching {componentId, barId, barType, dia, spacing}
  final output (structured): Patch[]
client:
  previews describePatch() for each ─► user confirms ─► applyPatches ─► recalculate
```

- Tools are read-only. The model cannot mutate anything; it can only *propose* a `Patch[]`. That keeps the blast radius at zero until the user clicks apply.
- Max 8 tool turns. Beyond that, return what it has with a `partial: true` flag.
- Because `src/lib` is isomorphic, the tool implementations are 5–10 lines each wrapping existing functions.

**review_rows** (AI idea 5)

Input: the calculated component table (post-recalculate) plus benchmark totals from the house rules. Output: `{ findings: { componentId, barId?, severity, message }[] }`. Pure read. Runs on the Batch API when the user reviews a whole building (50% cheaper, no latency requirement).

**infer_profile** (AI idea 2, rule porting) — self-verifying loop

```
client xlsx ──► ExcelJS: dump formulas + cached values as CSV text
            ──► Opus 5: infer { metadata: BBSMetadata, familyRules: BarFamilyRule[] }
            ──► server: build components from the same rows with the inferred rules
            ──► recalculateComponents ──► diff against the workbook's cached values
            ──► mismatches > 0 ? feed diff back (max 3 rounds) : return profile + report
```

This automates exactly what was done by hand this session for the slab and beam formats. The diff step is the same assertion the golden tests make, so a profile that passes here passes the test suite by construction. `BarFamilyRule` is a new small type describing count/length formula per bar family; the calculator gains one code path that reads rules from data instead of the hard-coded families in `enhanced-calculator.ts`. Deliberate simplification: only the formula *shapes* already supported (ROUNDUP, CEILING, span/N, extension sums) are expressible. A client whose sheet needs a new shape still needs a code change, and the report says so.

### 5.5 Cross-cutting

- **Auth.** Phase 1: a shared bearer token in an env var, checked by the function. Phase 2 (cloud sync): per-user session. There is no user model today, so anything more is speculative.
- **Rate limiting.** Per-IP token bucket in memory per function instance plus a daily cap on total tokens read from the usage log. Cheap, good enough for one team.
- **Usage log.** Every call appends `{ op, model, input_tokens, output_tokens, cache_read_input_tokens, ms }` to the response and to a Vercel KV list. The client stores it on `ProjectConfig.aiAudit`. This gives per-project cost visibility for free.
- **Refusal handling.** Check `stop_reason === 'refusal'` before reading content; surface a plain message. Engineering schedules should never trigger it, but the check is two lines.
- **Errors.** Typed SDK errors mapped to HTTP: `RateLimitError → 429`, `BadRequestError → 400`, others `502`. The client shows the op name and a retry button; it never shows raw SDK text.

## 6. Storage evolution

Today: `local-storage.ts`, one key per project, `ProjectConfig` JSON. This stays as the offline cache forever.

When cloud sync lands (product idea 7), the change is confined to one module:

```
local-storage.ts  ──►  storage/
                         local.ts     (current code, unchanged behaviour)
                         remote.ts    (Vercel Postgres or Supabase; same 5 functions)
                         sync.ts      (last-write-wins by updatedAt; conflicts shown, not merged)
```

Same five function signatures (`save`, `load`, `list`, `delete`, `exportJSON`). Components never import storage directly; `ProjectManager` does, so the swap touches one file. Deliberately no repository interface until `remote.ts` exists.

## 7. Directory layout after phase 3

```
api/ai/                     serverless AI gateway (section 5)
src/lib/                    domain, isomorphic, unchanged files plus:
  rulings.ts                Doubt → Ruling → Patch
  patches.ts                Patch type, applyPatches, describePatch
  bar-family-rules.ts       data-driven family rules for infer_profile (phase 4)
src/components/
  DoubtsPanel.tsx           replaces the one-shot dialog
  AiReviewTable.tsx         extraction review beside page image
  CommandBar.tsx            natural-language edits with patch preview
src/test/
  golden/                   existing workbook parity tests (unchanged gate)
  ai-fixtures/              recorded JSON responses per op, replayed in unit tests
  evals/                    10 schedule pages with hand-verified ScheduleRow[]; scored, not asserted
```

## 8. Testing strategy

| Layer | How | Gate |
|---|---|---|
| Domain (`src/lib`) | Existing vitest golden tests against `data/*.xlsx` | Must stay green on every commit |
| Patches / rulings | Property tests with `fast-check` (already installed): applying a doubt option then its inverse is identity; `applyPatches` always recalculates | Unit |
| AI ops (unit) | Recorded fixture JSON replayed through the op handler; no network | Unit |
| AI ops (eval) | 10 real schedule pages, hand-verified rows. Score = cell accuracy. Run on demand, reported not asserted | Weekly / before prompt changes |
| End to end | One Playwright flow: upload PDF fixture → review → import → export → re-import round-trips | CI, nightly |

The eval set is the only new thing. Build it first, before extract_schedule, using the pages the dra-bbs skill already processed; their rows are known good.

## 9. Rollout phases

Each phase ships on its own and is useful alone.

| Phase | Delivers | Touches | Depends on |
|---|---|---|---|
| 1. Rulings | `Doubt`/`Ruling`/`Patch` types, `rulings.ts`, `patches.ts`, DoubtsPanel, export guard | types, importers, ProjectDetailPage | nothing |
| 2. Gateway + explain | `api/ai/[op].ts`, house-rules cache, `explain_doubt`, usage log | new `api/`, DoubtsPanel | 1 |
| 3. Extract schedule | `extract_schedule`, AiReviewTable, eval set | gateway, import dialog | 2 |
| 4. Command bar | `propose_edits` tool loop, CommandBar with patch preview | gateway, patches | 1, 2 |
| 5. Review + profile | `review_rows` on Batch API, `infer_profile` self-verify loop, `bar-family-rules.ts` | calculator (one new data-driven path) | 2, 3 |
| 6. Cloud sync | `storage/remote.ts`, `sync.ts`, per-user auth | ProjectManager, gateway auth | 2 |

Phase 1 has no AI in it and is the foundation for everything else. It is also the cheapest way to make the current doubts dialog actually useful.

## 10. Decisions and trade-offs

- **Serverless proxy over client-side SDK.** A key in the browser bundle is a leaked key. Non-negotiable.
- **Operations over chat.** A free-form chat endpoint would be easier to build and impossible to cost-control or test. Named ops with schemas are testable with fixtures.
- **Patches over direct mutation.** One extra type, but it gives preview, undo, provenance and a single recalculation choke point. Every future feature that edits data benefits.
- **Read-only tools in propose_edits.** Slightly more round trips than letting the model write. Worth it: the model can never corrupt a project.
- **No new dependencies client-side.** `@anthropic-ai/sdk` is server-only. Structured outputs remove the need for a client-side schema library.
- **Opus 5, not Haiku, for extraction.** Schedule pages are dense tables where one wrong cell is one wrong beam. Cost per page is cents; a wrong beam is a site visit.
- **Not built: a general agent, RAG over drawings, multi-tenant auth.** No evidence any of these is needed before phase 6. Add when a second team asks.

## 11. Open questions for the owner

1. Which comes first, phase 3 (extract from drawing) or the DRA slab format (no AI)? Both are client-facing; only one can be next.
2. Is a shared bearer token acceptable for phase 2, or does the first AI feature already need per-user login?
3. Do site engineers need to see doubts and rulings, or only the office team? This decides whether DoubtsPanel needs a read-only mode.

## 12. Session 2026-11-03: what shipped, what is next

Built this session (all additive; localStorage projects and the golden tests untouched):

| Area | What | Where |
|---|---|---|
| SaaS layer | Supabase magic-link sign-in, per-user `projects` with integer `version` optimistic concurrency, append-only `project_versions` trigger, soft delete, RLS, read-only share links via `shared_project(token)` RPC. localStorage is always written first; neither side silently overwrites a newer copy. | `supabase/migrations/0001_projects.sql`, `src/lib/supabase.ts`, `src/lib/project-repository.ts`, `src/components/AccountMenu.tsx`, `App.tsx` |
| Data safety | Back up all / Restore (JSON, newer-wins per project with a count of what was kept), delete confirmation that names the kg at stake. | `ProjectListView.tsx`, `local-storage.ts` |
| Doubts | Persisted on `bbsMetadata.doubts` with a `ruling`; open count in the header; "Rule" / "Edit ruling" inline. Phase 1 of section 9 without the patch engine. | `ProjectDetailPage.tsx`, `component-types.ts` |
| Steel review | Dia-wise BBS kg vs issued kg with IS 1786:2008 batch tolerance verdict, first-fit cut plan over 12 m stock (bars and waste %), m³ and kg/m³ gauge. | `src/lib/steel-review.ts`, `SteelReview.tsx` |
| Print | Bar-bender sheet, one page per member plus dia-wise total, print CSS only. | `PrintSheet.tsx`, `index.css` |
| UI | Project header with members · bar rows · kg · open doubts; member filter above 8 members; new-project form repaired (name field was swallowed by a broken JSX comment) and the Vite template `#root { text-align: center }` removed. | `ProjectDetailPage.tsx`, `BBSSpreadsheetView.tsx`, `ProjectSetupForm.tsx` |

Next candidates, in the order I would build them:

1. **Revision diff**: import a revised BBS over an existing project and show per-member kg delta before accepting. Needs only `project_versions` and `recalculateComponents`; no new rule.
2. **Version history UI**: list `project_versions`, open one read-only, restore with a new version. Table already exists.
3. **Doubt options as patches** (section 4): a ruling that changes a number should apply it. Build when a ruling is edited twice by hand on the same project.
4. **Cut plan with offcut reuse** and per-dia stock length: ask the fabricator what stock they actually buy first.
5. **Bar tags**: print one label per bar mark (mark, dia, cut, nos, shape sketch). Needs the shape sketch; the legacy `ShapeDiagram` covers S1–S6 only.
6. **Columns, walls, footings**: blocked on a client workbook. Heuristic formulas stay out of Component mode.
7. **DRA slab format**: blocked on `DRA_iHeart_14th_to_18th_Floor_BBS.xlsx`.
8. **Schedule from drawing (AI)**: sections 5 and 9 phases 2–3; needs a server route and the eval set before anything else.
