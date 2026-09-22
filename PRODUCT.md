# Product

## Register

product

## Users

Three people, one document.

- **Quantity surveyor / estimator** in the office, on a large monitor, most of the day. Builds the Bar Bending Schedule from drawings and schedules, checks it against the client's Excel row by row, and is judged on whether the numbers match to the kilogram. Types a lot; lives in spreadsheets.
- **Contractor / project manager** reviewing totals: steel weight by diameter, per floor, for ordering and billing. Opens the project, reads the summary, rarely edits a row.
- **Site engineer / bar bender** on a tablet in daylight, reading cut lengths, bar counts and bends for one member at a time. Little typing, big numbers, no hover.

RebarCalc is the web version of AutoScan Steel (Newton India), so the same screen is sometimes shown to a prospect in a demo, but the demo is won by the numbers, not the chrome.

## Product Purpose

Turn a reinforcement schedule or an issued BBS workbook into an exact, editable Bar Bending Schedule: cut lengths, bar counts, dia-wise weight, and the doubts a checker would raise, for slabs and beams in the customer's own house format. Success is a BBS the QS trusts enough to cut steel from, produced faster than doing it in Excel, and exported back into the Excel layout the site already reads by column position.

## Brand Personality

Exact, quiet, fast. An engineering instrument, not a dashboard. Numbers are the hero; the interface should disappear into the task. Copy is terse and specific: a cell says `4596` and a doubt says which beam and which cell, never "something went wrong".

## Anti-references

- The generic AI-built dashboard: hero-metric cards, gradient text, glass panels, identical icon+heading+text card grids, decorative motion.
- Consumer-app friendliness (Airtable, Coda): rounded pastel chrome, illustrations, guidance that gets in the way of a user who already knows what a bar bending schedule is.
- Trading-terminal density for its own sake: dark by default, monospaced everything, no breathing room.
- Anything that hides a number behind a hover or a tooltip that a tablet user cannot reach.

## Design Principles

1. **The sheet is the truth.** Every number on screen corresponds to a cell in the customer's Excel, in the same order and with the same rounding. Layout follows the BBS column order, not a card metaphor.
2. **Density with alignment, not decoration.** A QS wants many rows visible; alignment (right-aligned numbers, consistent column widths, tabular figures) carries the hierarchy so borders and colour don't have to.
3. **Doubts are first-class output.** What the app is unsure of (missing spans, bundled bars, a member count that differs from the formula) is shown next to the data, plainly, before anything is exported. Never resolve a mismatch silently.
4. **One vocabulary everywhere.** Same input, same select, same button on every screen; the same bar-type name in the table, the export and the import.
5. **Works standing up.** Anything a site engineer needs (cut length, count, bends, weight) is readable on a tablet in daylight with touch targets that a gloved hand can hit.

## Accessibility & Inclusion

- Touch targets at least 44 px on any control a site user reaches; no hover-only affordances for essential information.
- Light theme is the primary target (office monitors, daylight tablets); the existing dark theme follows the OS preference and must stay legible but is not the design reference.
- Meaning never carried by colour alone: bar direction (X/Y), doubts, errors and run membership each get a text or icon cue.
- Numbers use tabular figures and consistent decimals so columns scan vertically.
- Respect `prefers-reduced-motion`; the app has no motion that conveys anything essential.
