import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import type { AppId, ControlPlaneStore, StoredSessionRecord, StoredUsageRecord, UsageSnapshot } from './contracts.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CONTROL_PLANE_DATA_DIR
  ? path.resolve(process.env.CONTROL_PLANE_DATA_DIR)
  : path.resolve(MODULE_DIR, '../data');
const STORE_PATH = path.join(DATA_DIR, 'control-plane-store.json');
let storeOperationQueue: Promise<unknown> = Promise.resolve();

const nowIso = () => new Date().toISOString();
const defaultPeriodEnd = () => {
  const next = new Date();
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
};

const DEFAULT_STORE: ControlPlaneStore = {
  usage: [],
  sessions: []
};

function normalizeUsageRecord(record: Partial<StoredUsageRecord> & { subject_id?: unknown; app_id?: unknown }): StoredUsageRecord | null {
  if (typeof record.subject_id !== 'string' || typeof record.app_id !== 'string') {
    return null;
  }

  return {
    subject_id: record.subject_id,
    app_id: record.app_id as AppId,
    requests_used: Number(record.requests_used ?? 0),
    requests_limit: Number(record.requests_limit ?? 0),
    period_start: typeof record.period_start === 'string' ? record.period_start : nowIso(),
    period_end: typeof record.period_end === 'string' ? record.period_end : defaultPeriodEnd(),
    estimated_cost_usd: Number(record.estimated_cost_usd ?? 0),
  };
}

function normalizeStore(raw: unknown): ControlPlaneStore {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const directUsage = Array.isArray(source.usage) ? source.usage : [];
  const legacyEntitlements = Array.isArray(source.entitlements) ? source.entitlements : [];
  const usage = (directUsage.length > 0 ? directUsage : legacyEntitlements)
    .map((record) => normalizeUsageRecord(record as Partial<StoredUsageRecord> & { subject_id?: unknown; app_id?: unknown }))
    .filter((record): record is StoredUsageRecord => record !== null);
  const sessions = Array.isArray(source.sessions) ? (source.sessions as StoredSessionRecord[]) : [];

  return { usage, sessions };
}

function defaultUsageRecord(subjectId: string, appId: AppId): StoredUsageRecord {
  return {
    subject_id: subjectId,
    app_id: appId,
    requests_limit: 0,
    requests_used: 0,
    period_start: nowIso(),
    period_end: defaultPeriodEnd(),
    estimated_cost_usd: 0,
  };
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function runStoreOperation<T>(operation: () => Promise<T>): Promise<T> {
  const queued = storeOperationQueue.then(operation, operation);
  storeOperationQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

export async function readStore(): Promise<ControlPlaneStore> {
  await ensureStore();
  return normalizeStore(JSON.parse(await fs.readFile(STORE_PATH, 'utf8')) as unknown);
}

export async function writeStore(store: ControlPlaneStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getOrCreateUsage(subjectId: string, appId: AppId): Promise<StoredUsageRecord> {
  return runStoreOperation(async () => {
    const store = await readStore();
    let record = store.usage.find((item) => item.subject_id === subjectId && item.app_id === appId);
    if (!record) {
      record = defaultUsageRecord(subjectId, appId);
      store.usage.push(record);
      await writeStore(store);
    }
    return record;
  });
}

export async function updateUsage(
  subjectId: string,
  appId: AppId,
  updater: (record: StoredUsageRecord) => StoredUsageRecord,
): Promise<StoredUsageRecord> {
  return runStoreOperation(async () => {
    const store = await readStore();
    const index = store.usage.findIndex((item) => item.subject_id === subjectId && item.app_id === appId);
    const current = index >= 0 ? store.usage[index] : defaultUsageRecord(subjectId, appId);
    const next = updater(current);
    if (index >= 0) {
      store.usage[index] = next;
    } else {
      store.usage.push(next);
    }
    await writeStore(store);
    return next;
  });
}

export async function saveSession(session: StoredSessionRecord): Promise<StoredSessionRecord> {
  return runStoreOperation(async () => {
    const store = await readStore();
    const index = store.sessions.findIndex((item) => item.session_id === session.session_id && item.app_id === session.app_id);
    if (index >= 0) {
      store.sessions[index] = session;
    } else {
      store.sessions.push(session);
    }
    await writeStore(store);
    return session;
  });
}

export async function getSession(appId: AppId, sessionId: string): Promise<StoredSessionRecord | null> {
  return runStoreOperation(async () => {
    const store = await readStore();
    return store.sessions.find((item) => item.app_id === appId && item.session_id === sessionId) ?? null;
  });
}

export async function listSessionsForSubject(subjectId: string, appId: AppId): Promise<StoredSessionRecord[]> {
  return runStoreOperation(async () => {
    const store = await readStore();
    return store.sessions.filter((item) => item.subject_id === subjectId && item.app_id === appId);
  });
}
