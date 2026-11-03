// Reviews that sit beside the BBS and never change it: cutting plan, concrete volume, IS 1786 mass tolerance.
import type { ConcreteComponent } from '@/types/component-types';

export const STOCK_LENGTH_MM = 12000;

/**
 * IS 1786:2008 Table 1 (cl. 6.2): tolerance on nominal mass per metre, batch basis.
 * ≤10 mm ±7%, 12–16 mm ±5%, >16 mm ±3%. Individual-sample limits are looser and not used here.
 */
export const is1786BatchTolerancePct = (dia: number): number => (dia <= 10 ? 7 : dia <= 16 ? 5 : 3);

export interface CutPlan {
  pieces: number;
  stockBars: number;
  usedMm: number;
  wastePct: number;   // (stockBars × stock − used) / (stockBars × stock)
  longestMm: number;
}

/**
 * First-fit decreasing per diameter, one stock length. Each bar row contributes `noOfBars` pieces of
 * `cuttingLength`. A piece longer than stock takes ceil(piece/stock) bars on its own (it carries a lap already).
 * ponytail: O(pieces × open bars); ~5k pieces per floor finish in ms. Move to bin-tree if a 50k-piece job appears.
 */
export function planCuts(components: ConcreteComponent[], stockMm = STOCK_LENGTH_MM): Record<number, CutPlan> {
  const byDia: Record<number, number[]> = {};
  for (const c of components) for (const b of c.bars) {
    const r = b.calculated;
    if (!r || r.cuttingLength <= 0 || r.noOfBars <= 0) continue;
    (byDia[b.diameter] ||= []).push(...Array<number>(Math.round(r.noOfBars)).fill(r.cuttingLength));
  }
  const out: Record<number, CutPlan> = {};
  for (const [dia, pieces] of Object.entries(byDia)) {
    pieces.sort((a, b) => b - a);
    const remaining: number[] = [];
    let extraBars = 0, used = 0;
    for (const p of pieces) {
      used += p;
      if (p > stockMm) { extraBars += Math.ceil(p / stockMm); continue; }
      const i = remaining.findIndex(r => r >= p);
      if (i === -1) remaining.push(stockMm - p); else remaining[i] -= p;
    }
    const stockBars = remaining.length + extraBars;
    const total = stockBars * stockMm;
    out[+dia] = { pieces: pieces.length, stockBars, usedMm: used, wastePct: total ? Math.max(0, (total - used) / total) * 100 : 0, longestMm: pieces[0] ?? 0 };
  }
  return out;
}

/** Concrete volume of the members we can size: beams (clear span × width × depth × nos) and slabs (span X × span Y × depth). */
export function concreteVolumeM3(components: ConcreteComponent[]): number {
  let mm3 = 0;
  for (const c of components) {
    if (!c.depth) continue;
    if (c.componentType === 'BEAM') mm3 += c.spanX * c.spanY * c.depth * (c.elementCount || 1);
    else if (c.componentType === 'SLAB') mm3 += c.spanX * c.spanY * c.depth;
  }
  return mm3 / 1e9;
}
