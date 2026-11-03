// The one storage path. localStorage is always written first (it is the offline cache and the
// pre-SaaS behaviour); the cloud copy is pushed afterwards when Supabase is configured and the
// user is signed in. Nothing here ever overwrites a newer copy on either side without telling the UI.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectConfig, BarEntry } from '../types';
import { supabase } from './supabase';
import { saveToLocalStorage, loadFromLocalStorage, deleteFromLocalStorage, getProjectList, type StorageResult } from './local-storage';
import { serializeProject, deserializeProject, validateSerializedProject, type SerializedProject } from './json-serializer';

export type SyncStatus = 'synced' | 'conflict' | 'offline' | 'error';
export interface SyncOutcome { status: SyncStatus; error?: string }

/** What the browser knows about the cloud copy of each project. version 0 / missing = never pushed. */
export interface CloudMeta { version: number; dirty: boolean }
type MetaMap = Record<string, CloudMeta>;
const META_KEY = 'bbs_cloud_meta';

export function readMeta(): MetaMap {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') as MetaMap; } catch { return {}; }
}
function writeMeta(meta: MetaMap) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function setMeta(id: string, m: CloudMeta) { const all = readMeta(); all[id] = m; writeMeta(all); }

interface CloudRow { id: string; name: string; version: number; updated_at: string; payload?: SerializedProject }

/** Pure: given what we hold locally and what the cloud lists, decide what to pull and what is in conflict. */
export function planPull(meta: MetaMap, remote: Pick<CloudRow, 'id' | 'version'>[], localIds: string[]): { take: string[]; conflict: string[] } {
  const take: string[] = [], conflict: string[] = [];
  const local = new Set(localIds);
  for (const r of remote) {
    const m = meta[r.id];
    if (!local.has(r.id)) { take.push(r.id); continue; }
    if (!m) { conflict.push(r.id); continue; }            // local copy never synced, yet the cloud has one: same id from two places
    if (r.version <= m.version) continue;                  // we already hold this version
    (m.dirty ? conflict : take).push(r.id);
  }
  return { take, conflict };
}

async function userId(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Save locally (always), then push. The local result is synchronous so callers keep their old flow. */
export function saveProject(config: ProjectConfig, bars: BarEntry[]): { local: StorageResult<void>; sync: Promise<SyncOutcome> } {
  const local = saveToLocalStorage(config, bars);
  if (!local.success) return { local, sync: Promise.resolve({ status: 'error', error: local.error }) };
  const m = readMeta()[config.id];
  setMeta(config.id, { version: m?.version ?? 0, dirty: true });
  return { local, sync: pushProject(config, bars) };
}

export async function pushProject(config: ProjectConfig, bars: BarEntry[], client: SupabaseClient | null = supabase): Promise<SyncOutcome> {
  if (!client) return { status: 'offline' };
  const owner = await userId(client);
  if (!owner) return { status: 'offline' };
  const known = readMeta()[config.id]?.version ?? 0;
  const payload = serializeProject(config, bars);
  const row = { name: config.name, payload, updated_at: payload.lastModified };
  try {
    if (known === 0) {
      const { error } = await client.from('projects').insert({ ...row, id: config.id, owner });
      if (error?.code === '23505') return { status: 'conflict' };          // a copy with this id already exists in the cloud
      if (error) return { status: 'error', error: error.message };
      setMeta(config.id, { version: 1, dirty: false });
      return { status: 'synced' };
    }
    const { data, error } = await client.from('projects')
      .update({ ...row, version: known + 1 })
      .eq('id', config.id).eq('version', known).is('deleted_at', null)
      .select('version');
    if (error) return { status: 'error', error: error.message };
    if (!data?.length) return { status: 'conflict' };                      // someone saved version > known since we last pulled
    setMeta(config.id, { version: data[0].version, dirty: false });
    return { status: 'synced' };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchRow(client: SupabaseClient, id: string): Promise<CloudRow | null> {
  const { data } = await client.from('projects').select('id,name,version,updated_at,payload').eq('id', id).is('deleted_at', null).maybeSingle();
  return (data as CloudRow | null) ?? null;
}

/** Writes a cloud row into localStorage. Refuses anything that does not validate, so bad cloud data cannot clobber a good local copy. */
function adoptRow(row: CloudRow): boolean {
  if (!row.payload || !validateSerializedProject(row.payload)) return false;
  const { config, bars } = deserializeProject(row.payload);
  if (!saveToLocalStorage(config, bars).success) return false;
  setMeta(row.id, { version: row.version, dirty: false });
  return true;
}

/** Take the cloud copy of one project, stashing the local copy in the history table first so it is never lost. */
export async function takeCloudCopy(id: string, client: SupabaseClient | null = supabase): Promise<StorageResult<{ config: ProjectConfig; bars: BarEntry[] }>> {
  if (!client) return { success: false, error: 'Cloud sync is not configured.' };
  const owner = await userId(client);
  if (!owner) return { success: false, error: 'Sign in first.' };
  const local = loadFromLocalStorage(id);
  if (local.success && local.data) {
    const { error } = await client.from('project_versions').insert({ owner, project_id: id, payload: serializeProject(local.data.config, local.data.bars), note: 'local copy set aside on conflict' });
    if (error) return { success: false, error: `Could not keep a copy of the local version: ${error.message}` };
  }
  const row = await fetchRow(client, id);
  if (!row) return { success: false, error: 'The cloud copy no longer exists.' };
  if (!adoptRow(row)) return { success: false, error: 'The cloud copy did not validate; local copy kept.' };
  return loadFromLocalStorage(id);
}

/** Keep the local copy: push it on top of whatever the cloud holds. The overwritten cloud version stays in history. */
export async function keepLocalCopy(config: ProjectConfig, bars: BarEntry[], client: SupabaseClient | null = supabase): Promise<SyncOutcome> {
  if (!client) return { status: 'offline' };
  const row = await fetchRow(client, config.id);
  setMeta(config.id, { version: row?.version ?? 0, dirty: true });
  if (!row) {
    // the id exists but is soft-deleted or unreadable: give the local copy a fresh id so nothing is overwritten
    return { status: 'error', error: 'The cloud copy cannot be replaced. Export this project and re-import it as a new one.' };
  }
  return pushProject(config, bars, client);
}

export interface SyncReport { pulled: string[]; pushed: string[]; conflicts: string[]; errors: string[] }

/** Called after sign-in and on demand: pull what is newer in the cloud, push what is newer here. */
export async function syncAll(client: SupabaseClient | null = supabase): Promise<SyncReport> {
  const report: SyncReport = { pulled: [], pushed: [], conflicts: [], errors: [] };
  if (!client || !(await userId(client))) return report;
  const { data, error } = await client.from('projects').select('id,name,version,updated_at').is('deleted_at', null);
  if (error) { report.errors.push(error.message); return report; }
  const remote = (data ?? []) as CloudRow[];
  const localIds = (getProjectList().data ?? []).map(p => p.id);
  const { take, conflict } = planPull(readMeta(), remote, localIds);
  report.conflicts = conflict;
  for (const id of take) {
    const row = await fetchRow(client, id);
    if (row && adoptRow(row)) report.pulled.push(id); else report.errors.push(`${id}: cloud copy did not validate`);
  }
  const remoteIds = new Set(remote.map(r => r.id));
  const meta = readMeta();
  for (const id of localIds) {
    if (conflict.includes(id)) continue;
    const m = meta[id];
    if (m && !m.dirty && remoteIds.has(id)) continue;
    const local = loadFromLocalStorage(id);
    if (!local.success || !local.data) continue;
    if (!m || !remoteIds.has(id)) setMeta(id, { version: 0, dirty: true });   // never pushed, or pushed to a copy that is gone
    const out = await pushProject(local.data.config, local.data.bars, client);
    if (out.status === 'synced') report.pushed.push(id);
    else if (out.status === 'conflict') report.conflicts.push(id);
    else if (out.status === 'error') report.errors.push(`${id}: ${out.error}`);
  }
  return report;
}

/** Local delete plus cloud soft-delete. The cloud row and its history stay in the database. */
export async function deleteProject(id: string, client: SupabaseClient | null = supabase): Promise<StorageResult<void>> {
  const local = deleteFromLocalStorage(id);
  if (!local.success) return local;
  const meta = readMeta(); delete meta[id]; writeMeta(meta);
  if (client && (await userId(client))) {
    const { error } = await client.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return { success: true, error: `Deleted here, but the cloud copy could not be marked deleted: ${error.message}` };
  }
  return { success: true };
}

export async function createShareLink(id: string, client: SupabaseClient | null = supabase): Promise<StorageResult<string>> {
  if (!client) return { success: false, error: 'Cloud sync is not configured.' };
  if (!(await userId(client))) return { success: false, error: 'Sign in to share.' };
  if ((readMeta()[id]?.version ?? 0) === 0) return { success: false, error: 'Sync this project first.' };
  const { data, error } = await client.from('project_shares').insert({ project_id: id }).select('token').single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: `${window.location.origin}${window.location.pathname}?share=${data.token}` };
}

/** Anyone with the token gets a read-only copy; it is never written to localStorage. */
export async function loadSharedProject(token: string, client: SupabaseClient | null = supabase): Promise<StorageResult<{ config: ProjectConfig; bars: BarEntry[] }>> {
  if (!client) return { success: false, error: 'Cloud sync is not configured.' };
  const { data, error } = await client.rpc('shared_project', { share_token: token });
  if (error) return { success: false, error: error.message };
  if (!data || !validateSerializedProject(data)) return { success: false, error: 'This share link is not valid any more.' };
  return { success: true, data: deserializeProject(data) };
}
