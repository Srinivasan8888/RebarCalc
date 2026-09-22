---
name: RebarCalc
description: A bar bending schedule that reads like the engineer's own ledger
colors:
  verdigris: "oklch(0.52 0.10 195)"
  verdigris-dark-mode: "oklch(0.72 0.11 195)"
  paper: "oklch(0.985 0.004 195)"
  sheet: "oklch(0.995 0.003 195)"
  ink: "oklch(0.21 0.012 195)"
  ink-muted: "oklch(0.50 0.014 195)"
  rule: "oklch(0.90 0.008 195)"
  rule-input: "oklch(0.88 0.008 195)"
  band: "oklch(0.955 0.006 195)"
  band-selected: "oklch(0.94 0.012 195)"
  pencil-warning: "oklch(0.72 0.14 75)"
  pencil-warning-ink: "oklch(0.30 0.06 75)"
  red-ink: "oklch(0.55 0.19 25)"
typography:
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
rounded:
  cell: "2px"
  control: "6px"
  region: "6px"
spacing:
  cell-x: "6px"
  control-x: "8px"
  region: "16px"
  section: "20px"
components:
  button-primary:
    backgroundColor: "{colors.verdigris}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 12px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  input-cell:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.cell}"
    height: "36px"
    padding: "0 6px"
  table-header:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    height: "40px"
    padding: "0 8px"
  doubt-panel:
    backgroundColor: "{colors.pencil-warning}"
    textColor: "{colors.pencil-warning-ink}"
    rounded: "{rounded.region}"
    padding: "12px 16px"
---

# Design System: RebarCalc

## 1. Overview

**Creative North Star: "The Engineer's Ledger"**

A bar bending schedule is a ruled sheet where every figure has a column, and RebarCalc looks like that sheet. Paper-toned neutrals, ink-toned text, thin rules between rows, and figures set in tabular numerals so a column can be read top to bottom without moving the eye. Alignment carries the hierarchy; borders and colour do not have to. The single accent, Verdigris, marks what is live: the primary action, the focused cell, a value the formula produced rather than the user typed.

The register is product. The user is a quantity surveyor checking numbers against a client's Excel, a project manager reading totals, or a site engineer reading one member on a tablet in daylight. The interface must disappear into the task and never make them pause at a component that is subtly off. Light is the primary theme because those three scenes are lit rooms and open sites; dark follows the OS preference only.

This system explicitly rejects the generic AI-built dashboard (hero metric cards, gradient text, glass panels, identical icon-heading-text grids), consumer-app friendliness (pastel chrome, illustrations, hand-holding), terminal density for its own sake (dark by default, monospaced everything), and any number hidden behind a hover.

**Key Characteristics:**
- Sheet-order layout: tables follow the BBS column order, one column per leg a..f, Lap, Total, Bends, Deduction, Cut, Length, kg.
- Dense but aligned: 36 px cells, 44 px rows, right-aligned figures, tabular numerals everywhere.
- One accent, Verdigris, at most a tenth of any screen.
- Flat surfaces separated by 1 px tinted rules and muted bands; no shadows.
- Doubts are a pencil mark in the margin: a warm band above the table, never a modal.
- Copy is terse and specific; no em dashes; a cell says `4596`, a doubt names the beam and the cell.

## 2. Colors: The Ledger Palette

Paper, ink, rules, one metal accent, one pencil colour for doubts.

### Primary
- **Verdigris** (oklch(0.52 0.10 195)): aged copper. Primary buttons, the focus ring, selected direction chip, and formula-derived figures in an input (a member count the sheet computed, not the user). In dark mode it lifts to oklch(0.72 0.11 195) so it still reads on ink.

### Neutral
- **Paper** (oklch(0.985 0.004 195)): the page. Tinted toward the accent hue at chroma 0.004; never pure white.
- **Sheet** (oklch(0.995 0.003 195)): cards, popovers, the header strip.
- **Ink** (oklch(0.21 0.012 195)): all primary text and figures. Never pure black.
- **Ink, muted** (oklch(0.50 0.014 195)): labels, table headers, secondary text, the member type after a mark.
- **Rule** (oklch(0.90 0.008 195)): every border and row divider. **Rule, input** (oklch(0.88 0.008 195)): the border of a standalone field.
- **Band** (oklch(0.955 0.006 195)): table header rows, the open member's toolbar row, the totals footer. **Band, selected** (oklch(0.94 0.012 195)): hover on rows and ghost buttons, the run badge.

### Semantic
- **Pencil warning** (oklch(0.72 0.14 75)) with **Pencil warning ink** (oklch(0.30 0.06 75)): the doubts panel band and border, at 10 % tint over Paper. Nothing else is amber.
- **Red ink** (oklch(0.55 0.19 25)): destructive actions and errors only; a delete icon turns red on hover, never at rest.

### Named Rules
**The One Accent Rule.** Verdigris appears on primary actions, focus, selection, and formula-derived figures. It never decorates, never fills a header, never colours a whole row. If a screen looks green, it has failed.

**The Tinted Neutral Rule.** Every neutral carries the accent hue at chroma 0.003 to 0.012. `#000` and `#fff` are forbidden.

**The Not-By-Colour Rule.** Direction (X / Y), doubts, run membership and errors each have a text or icon cue. Colour only reinforces.

## 3. Typography

**Display Font:** none. This is a product surface.
**Body Font:** the system stack (-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif)
**Label/Mono Font:** none. Figures use the body font with `font-variant-numeric: tabular-nums`; monospace is not needed and looks like a terminal.

**Character:** native, neutral, invisible. One family carries titles, labels, controls and figures. Weight and size do the work; the scale ratio is a tight 1.2 so the many labels on a dense screen do not shout at each other.

### Hierarchy
- **Title** (700, 1.5 rem / 24 px, 1.2): the project name on the project page. One per screen.
- **Body** (400, 0.875 rem / 14 px, 1.45): controls, cells, prose. Prose runs no wider than 65 ch.
- **Label** (500, 0.75 rem / 12 px, 1.3): field labels, table headers, dimension labels in the member toolbar. Sentence case, muted ink, never uppercase tracking.
- **Figure** (400, 0.875 rem, tabular numerals): every number in a table. Right-aligned. Fixed decimals per column: cut length as the sheet shows it (integer, or one decimal when the sheet has one), length 3 decimals, kg 2 decimals with Indian grouping (`34,227.21`). Cell values are never grouped, totals are.

### Named Rules
**The Column Rule.** A number is never centred. Right-align it, set it in tabular numerals, give the column a fixed width, and let the decimals line up.

**The One Family Rule.** No second typeface. No display font in a label, button or figure.

## 4. Elevation

The system is flat. Depth is conveyed by 1 px Rule borders and by Band fills: a header row is a band, the open member's toolbar is a band, the totals footer is a darker band. Regions on a page are separated by a rule and 20 px of space, not by a card. Overlays (the delete-confirmation dialog, the grade dropdowns) sit on a Sheet surface with a Rule border and the page dimmed behind them; they carry no shadow either.

### Named Rules
**The No-Shadow Rule.** `box-shadow` is not used. If a component needs to look "above" the page, give it a border and a band, or reconsider whether it should be an overlay at all.

**The Focus-Is-The-Only-Lift Rule.** The single visual "lift" is the focus ring: a 2 px Verdigris ring at 60 % on the focused cell or control.

## 5. Components

Every interactive control has default, hover, focus-visible, active, disabled. Same shape, same vocabulary on every screen.

### Buttons
- **Shape:** softly squared (6 px radius), 36 px tall, 14 px medium text, 16 px horizontal padding; icon buttons are 32 or 36 px square with an `aria-label`.
- **Primary:** Verdigris fill, Paper text. One per screen: "New project", "Add member", "Update settings".
- **Outline:** Paper fill, Rule border, Ink text. Import, Export, Settings.
- **Ghost:** transparent, muted ink; hover fills with Band, selected. Row actions, collapse, "Add bar".
- **Hover / Focus:** primary darkens 10 %; all buttons get the 2 px Verdigris ring on focus-visible; transitions 150 ms ease-out.
- **Destructive:** never a red button at rest. The delete icon is muted and turns Red ink on hover; the confirmation dialog's confirm button is the only red fill.

### Inputs / Fields
- **Field** (standalone, in headers and toolbars): Paper fill, Rule-input border, 6 px radius, 36 px tall, 12 px padding.
- **Cell** (inside a table): transparent, no border, 2 px radius, 36 px tall, 6 px padding, right-aligned tabular figures. On focus it fills with Paper and shows the ring. Placeholder is a single en dash in muted ink.
- **Formula-derived value in a cell** (a member count the sheet computed): Verdigris text; once the user types, it becomes Ink. Clearing the cell returns it to the formula.
- **Selects:** native `<select>` styled as a Field or a Cell inside tables (hundreds per screen); the Radix select is used only for the two grade dropdowns in the sheet header.
- **Error / Disabled:** `aria-invalid` gets a Red ink border; disabled is 50 % opacity, no pointer.

### Tables
- **Header row:** Band fill, Label typography in muted ink, 40 px tall, sticky at the top of the scroll container.
- **Rows:** 44 px, 1 px Rule divider, hover Band-selected at 40 %. Collapsed member rows are clickable in full and show a chevron.
- **Open member:** its toolbar row is a Band; its bar rows follow; a final row holds the ghost "Add bar" button and a 2 px bottom rule closes the member.
- **Column order is the sheet's.** Never reorder for aesthetics; site staff read by column position.

### Doubts panel (signature)
A warm band above the table: Pencil warning border at 60 %, fill at 10 %, Pencil warning ink text. A one-line heading with the count ("7 doubts from the import. Settle these before steel is cut."), a ghost Dismiss, then a numbered list. Inline, dismissable, never a modal.

### Totals block (signature)
The sheet's "TOTAL in Kg / MT" as a small table, at most 28 rem wide, right-aligned figures: one row per diameter (length m, weight kg), then a Band footer with the total in kg and MT. No big number, no card.

### Navigation
A 56 px flat header on Sheet with a bottom Rule: wordmark, then a breadcrumb "Projects / {project}" where "Projects" is a 44 px hit area. Nothing else lives there; save status, import and export belong to the page.

## 6. Do's and Don'ts

### Do:
- **Do** lay every BBS table out in the sheet's column order, one column per leg, with fixed column widths.
- **Do** right-align every figure, set it in tabular numerals, and fix its decimals per column (cut as the sheet, length 3, kg 2).
- **Do** keep Verdigris to primary actions, focus, selection and formula-derived figures, under a tenth of the screen.
- **Do** tint every neutral toward hue 195 at chroma 0.003 to 0.012.
- **Do** separate regions with a 1 px Rule and 20 px of space, and use Band fills for header rows and toolbars.
- **Do** put doubts inline above the data in the Pencil warning band, with the beam and cell named.
- **Do** give every control on a row a 44 px hit area and an `aria-label` when it is icon-only.
- **Do** render one member expanded at a time and use native selects inside tables; a floor is 400 members and 3,000 bars.
- **Do** write copy that is terse and specific, in sentence case, without em dashes.

### Don't:
- **Don't** build the generic AI-built dashboard: no hero metric cards, no gradient text, no glass panels, no identical icon-heading-text card grids, no decorative motion.
- **Don't** reach for consumer-app friendliness: no pastel chrome, illustrations, rounded blobs, or guidance that gets in the way of someone who knows what a bar bending schedule is.
- **Don't** default to trading-terminal density: no dark-by-default, no monospace for figures, no cramming.
- **Don't** hide a number behind a hover or a tooltip; a tablet user cannot reach it.
- **Don't** use `#000` or `#fff`, `box-shadow`, `border-left` wider than 1 px as an accent stripe, or `background-clip: text`.
- **Don't** carry meaning by colour alone: X / Y, doubts, runs and errors always have a text or icon cue.
- **Don't** wrap a table in a card, nest a card in a card, or centre a column of numbers.
- **Don't** reorder or rename BBS columns, and don't render a second typeface anywhere.
