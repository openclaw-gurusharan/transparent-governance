import fs from 'node:fs';
import path from 'node:path';
import type { AppId, ControlPlaneStore, StoredSessionRecord, StoredUsageRecord, UsageSnapshot } from './contracts.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'control-plane-store.json');

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

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

export function readStore(): ControlPlaneStore {
  ensureStore();
  return normalizeStore(JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as unknown);
}

export function writeStore(store: ControlPlaneStore) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getOrCreateUsage(subjectId: string, appId: AppId): StoredUsageRecord {
  const store = readStore();
  let record = store.usage.find((item) => item.subject_id === subjectId && item.app_id === appId);
  if (!record) {
    record = defaultUsageRecord(subjectId, appId);
    store.usage.push(record);
    writeStore(store);
  }
  return record;
}

export function updateUsage(subjectId: string, appId: AppId, updater: (record: StoredUsageRecord) => StoredUsageRecord) {
  const store = readStore();
  const index = store.usage.findIndex((item) => item.subject_id === subjectId && item.app_id === appId);
  const current = index >= 0 ? store.usage[index] : defaultUsageRecord(subjectId, appId);
  const next = updater(current);
  if (index >= 0) {
    store.usage[index] = next;
  } else {
    store.usage.push(next);
  }
  writeStore(store);
  return next;
}

export function saveSession(session: StoredSessionRecord) {
  const store = readStore();
  const index = store.sessions.findIndex((item) => item.session_id === session.session_id && item.app_id === session.app_id);
  if (index >= 0) {
    store.sessions[index] = session;
  } else {
    store.sessions.push(session);
  }
  writeStore(store);
  return session;
}

export function getSession(appId: AppId, sessionId: string): StoredSessionRecord | null {
  const store = readStore();
  return store.sessions.find((item) => item.app_id === appId && item.session_id === sessionId) ?? null;
}

export function listSessionsForSubject(subjectId: string, appId: AppId) {
  const store = readStore();
  return store.sessions.filter((item) => item.subject_id === subjectId && item.app_id === appId);
}
