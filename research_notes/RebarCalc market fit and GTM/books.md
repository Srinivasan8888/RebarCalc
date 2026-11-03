# Reading list for RebarCalc (compiled 2026-11-03)

Rule of the house still applies: **the customer's Excel is the specification**. None of these books may replace a workbook formula. They are for three things only: vocabulary when talking to estimation heads, the shape-code and reconciliation conventions a new house format is likely to follow, and the standards an auditor will cite back at us.

Verification: "verified" = found on a publisher, standards-body or library page in this session. "catalogue only" = well-known title, bibliographic details confirmed from a catalogue listing, contents not inspected. "unverified" = found only on resellers or aggregators.

## Codes and standards (the documents a client's QS will quote)

| Title | Status | Why it matters to the app |
|---|---|---|
| IS 2502:1963 *Code of practice for bending and fixing of bars for concrete reinforcement* (BIS, reaffirmed) | verified, free PDF at law.resource.org (https://law.resource.org/pub/in/bis/S03/is.2502.1963.pdf); summary at https://infralens.in/code/IS-2502-1963 | Indian shape codes, hook and bend allowances, the "deduction per bend" idea the slab workbook implements as bends × 2d. Use for naming bar shapes in the UI and in doubts, never for the numbers. |
| SP 34:1987 *Handbook on Concrete Reinforcement and Detailing* (BIS) | verified (BIS draft revision https://services.bis.gov.in/tmp/11242_28062023164413_8.pdf; copies on Scribd) | Section on bar bending schedules and detailing do's and don'ts. The 2023 BIS draft says IS 2502 is to be aligned with BS 8666 Table 1 shape codes; that is the signal that a shape-code column may appear in future Indian house formats. |
| IS 456:2000 *Plain and reinforced concrete, code of practice* (BIS) | verified (public standard) | Cover, development length and lap clauses the house rules in `dra-bbs.skill` paraphrase. The app's Ld tables come from the workbooks (40D/50D), not from this code; cite it only in doubt text. |
| IS 1786:2008 *High strength deformed steel bars and wires for concrete reinforcement* | verified (public standard) | Table of permitted mass tolerance per diameter ("rolling margin"). Needed for the dia-wise reconciliation feature ranked second in the build order: issued kg vs BBS kg within tolerance. |
| BS 8666:2020 *Scheduling, dimensioning, bending and cutting of steel reinforcement for concrete* (BSI) | verified (BSI catalogue) | The shape-code table (00, 11, 21, 51 ...) that Gulf and UK-trained detailers use. Only relevant when a client's workbook already carries BS shape codes; the importer should recognise the column, not invent it. |

## Detailing handbooks

| Title | Status | Why it matters |
|---|---|---|
| IStructE / Concrete Society, *Standard Method of Detailing Structural Concrete*, 3rd ed. (2006, amended 2015) | catalogue only | The standard reference for how a bending schedule page is laid out (bar mark, type and size, no. of members, no. in each, total no., length, shape code, A..E dimensions). Our column order comes from the customer sheet, but this is the vocabulary estimation heads expect in demos. |
| Reynolds, Steedman and Threlfall, *Reynolds's Reinforced Concrete Designer's Handbook*, 11th ed. (CRC Press, 2007) | catalogue only | Bar areas, weights per metre (the d²/162 rule is the metric approximation of the exact 0.006165 d² kg/m), bend radii. Useful when a client asks why the app's kg differ from a steel merchant's weight table. |
| ACI, *ACI Detailing Manual* (SP-66) and CRSI, *Manual of Standard Practice* | catalogue only | US practice. Out of the target segment; keep only as a reference if a US-format workbook ever arrives. |

## Estimating, costing and reconciliation (the buyer's own textbooks)

| Title | Status | Why it matters |
|---|---|---|
| B.N. Dutta, *Estimating and Costing in Civil Engineering: Theory and Practice*, 28th ed. (UBS Publishers) | catalogue only | The textbook most Indian QS and site engineers learnt steel takeoff from. Its worked BBS examples (hooks 9d, 45° bends, lap lengths) are where the "engineering heuristics" the house rules override come from. Read to understand the objections, not to implement. |
| M. Chakraborti, *Estimating, Costing, Specification and Valuation in Civil Engineering* | catalogue only | Same role as Dutta; common in southern India colleges. |
| *A Text Book of Estimating and Costing* (Anuradha Publications, 2011) | verified, library listing at https://libexplorer.upnm.edu.my/home/Record/50039/TOC | Tamil Nadu syllabus text. Low value beyond vocabulary. |
| Er. Suraj Laghe, *Estimating and Costing for Civil Engineers, Valuers and Contractors* | unverified (reseller listing only) | Skip unless a customer cites it. |

## Product and SaaS (for the GTM side of the report)

| Title | Status | Why it matters |
|---|---|---|
| Steve Blank, *The Four Steps to the Epiphany* | verified (public) | Customer-development loop; the report's segment bets need 5 to 8 interviews per segment before the pricing page is final. |
| April Dunford, *Obviously Awesome* | verified (public) | Positioning against the real alternative (the house Excel, not RebarCAD). The report's one-line position "Sell exactness to the client who checks the kilograms" was written this way. |
| Bob Moesta and Chris Spiek, *Demand-Side Sales 101* | verified (public) | Switching-cost interviews; useful because the switch here is away from a trusted spreadsheet, not from a competitor product. |

## How these feed the roadmap

1. **Reconciliation (build order item 2)**: IS 1786 tolerance table becomes a constants file with the standard cited per row, and a test that asserts the published numbers. No book replaces the client's issued-steel register format; ask for the register workbook first.
2. **Columns and walls (item 1)**: IS 2502 and SP 34 give names for the bar shapes we will see (links, ties, L-bars, cranks) so doubts read in the customer's language. The formulas still come from `DRA_iHeart_14th_to_18th_Floor_BBS.xlsx` or whichever column sheet the client supplies.
3. **Shape codes**: when a workbook carries BS 8666 or IS 2502 shape codes, the importer should carry them through as text and the exporter should write them back unchanged. Do not compute shape codes from geometry.
4. **Sales conversations**: Dutta and SMDSC are the shared vocabulary with estimation heads. Keep one copy of each on the desk.

## Still to verify

ISBNs and current editions for the "catalogue only" rows (IStructE 3rd ed. amendment date, Reynolds 11th ed., Dutta 28th ed.). Web searches in this session returned mostly spam PDF mirrors for these titles; confirm from the publisher pages before quoting them in customer-facing material.
