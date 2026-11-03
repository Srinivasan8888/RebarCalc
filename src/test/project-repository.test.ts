import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { planPull, pushProject, saveProject, readMeta } from '../lib/project-repository';
import { exportAllProjectsAsJSON, importAllProjectsFromJSON, loadFromLocalStorage, saveToLocalStorage } from '../lib/local-storage';
import { findCalculationDrift, recalculateComponents } from '../lib/component-calculator';
import type { ProjectConfig } from '../types';
import type { ConcreteComponent } from '../types/component-types';

beforeEach(() => localStorage.clear());

const config = (over: Partial<ProjectConfig> = {}): ProjectConfig => ({
  id: 'p1', name: 'Tower A', codeStandard: 'IS', defaultCover: 25, defaultHookMultiplier: 9,
  bendDeductions: { deg45: 1, deg90: 2, deg135: 3 }, calculationMode: 'COMPONENT',
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), ...over
} as ProjectConfig);

describe('planPull: never overwrite a dirty local copy', () => {
  it('takes rows we do not have, skips rows we already hold, conflicts on dirty or unsynced', () => {
    const meta = { a: { version: 2, dirty: false }, b: { version: 1, dirty: true }, d: { version: 3, dirty: false } };
    const remote = [{ id: 'a', version: 3 }, { id: 'b', version: 2 }, { id: 'c', version: 1 }, { id: 'd', version: 3 }, { id: 'e', version: 1 }];
    expect(planPull(meta, remote, ['a', 'b', 'd', 'e'])).toEqual({ take: ['a', 'c'], conflict: ['b', 'e'] });
  });
});

// Minimal stand-in for the PostgREST builder: records the query, returns what the test scripts.
function fakeClient(script: { insertError?: { code: string; message: string } | null; updateRows?: { version: number }[] }) {
  const calls: Record<string, unknown>[] = [];
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => { calls.push({ [name]: args }); return builder; };
  ['eq', 'is', 'select'].forEach(n => { builder[n] = chain(n); });
  builder.insert = (row: unknown) => { calls.push({ insert: row }); return Promise.resolve({ error: script.insertError ?? null }); };
  builder.update = chain('update');
  (builder as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: script.updateRows ?? [], error: null });
  const client = {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'owner-1' } } } }) },
    from: () => builder
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('pushProject: optimistic concurrency', () => {
  it('first push inserts and records version 1', async () => {
    const { client, calls } = fakeClient({});
    expect(await pushProject(config(), [], client)).toEqual({ status: 'synced' });
    expect(calls.some(c => 'insert' in c)).toBe(true);
    expect(readMeta().p1).toEqual({ version: 1, dirty: false });
  });
  it('a duplicate id in the cloud is a conflict, not an overwrite', async () => {
    const { client } = fakeClient({ insertError: { code: '23505', message: 'duplicate' } });
    expect((await pushProject(config(), [], client)).status).toBe('conflict');
    expect(readMeta().p1).toBeUndefined();
  });
  it('an update that matches no row (cloud moved on) is a conflict and keeps the local copy dirty', async () => {
    saveProject(config(), []);                       // local save marks dirty, version 0
    localStorage.setItem('bbs_cloud_meta', JSON.stringify({ p1: { version: 4, dirty: true } }));
    const { client, calls } = fakeClient({ updateRows: [] });
    expect((await pushProject(config(), [], client)).status).toBe('conflict');
    expect(readMeta().p1).toEqual({ version: 4, dirty: true });
    expect(calls).toContainEqual({ eq: ['version', 4] });
  });
  it('a matching update bumps the known version', async () => {
    localStorage.setItem('bbs_cloud_meta', JSON.stringify({ p1: { version: 4, dirty: true } }));
    const { client } = fakeClient({ updateRows: [{ version: 5 }] });
    expect((await pushProject(config(), [], client)).status).toBe('synced');
    expect(readMeta().p1).toEqual({ version: 5, dirty: false });
  });
  it('without Supabase configured the save still lands locally and reports offline', async () => {
    const { local, sync } = saveProject(config(), []);
    expect(local.success).toBe(true);
    expect((await sync).status).toBe('offline');
    expect(loadFromLocalStorage('p1').success).toBe(true);
  });
});

describe('backup and restore', () => {
  it('restores missing projects and never overwrites a newer local copy', () => {
    vi.useFakeTimers({ now: new Date('2026-02-01') });
    saveToLocalStorage(config({ id: 'old', name: 'Old' }), []);
    saveToLocalStorage(config({ id: 'keep', name: 'Keep v1' }), []);
    const backup = exportAllProjectsAsJSON().data!;
    vi.setSystemTime(new Date('2026-03-01'));
    saveToLocalStorage(config({ id: 'keep', name: 'Keep v2 (newer)' }), []);
    localStorage.removeItem('bbs_project_old');
    const report = importAllProjectsFromJSON(backup);
    expect(report.data).toEqual({ added: 1, updated: 0, skippedNewer: 1, invalid: 0 });
    expect(loadFromLocalStorage('keep').data!.config.name).toBe('Keep v2 (newer)');
    expect(loadFromLocalStorage('old').success).toBe(true);
    vi.useRealTimers();
  });
  it('rejects files that are not a backup', () => {
    expect(importAllProjectsFromJSON('{"nope":1}').success).toBe(false);
    expect(importAllProjectsFromJSON('garbage').success).toBe(false);
  });
});

describe('findCalculationDrift', () => {
  it('is silent for freshly calculated bars and names a bar whose stored kg went stale', () => {
    const slab: ConcreteComponent = {
      id: 's1', name: 'S1', componentType: 'SLAB', spanX: 4000, spanY: 5000, depth: 150, cover: 20,
      bars: [{ id: 'b1', barType: 'Bottom Bar (X-X)', direction: 'X', diameter: 10, spacing: 150, measurements: { a: 4000, b: 0, c: 0, d: 0, e: 0, f: 0, lap: 0 } }]
    } as unknown as ConcreteComponent;
    const fresh = recalculateComponents([slab]);
    expect(findCalculationDrift(fresh)).toEqual([]);
    const stale = structuredClone(fresh);
    stale[0].bars[0].calculated!.totalWeight += 1;
    expect(findCalculationDrift(stale)).toHaveLength(1);
    expect(findCalculationDrift(stale)[0]).toMatch(/^S1 Bottom Bar \(X-X\): stored/);
  });
});
