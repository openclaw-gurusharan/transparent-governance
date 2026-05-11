import assert from 'node:assert/strict';
import test from 'node:test';
import type { StoredSessionRecord } from './contracts.js';
import { parseBuyerSnapshot } from './buyerTools.js';

function sessionWithBuyerSnapshot(trustState: StoredSessionRecord['trust_state'], snapshot: unknown): StoredSessionRecord {
  return {
    app_id: 'ondc-buyer',
    session_id: 'session-test',
    sdk_session_id: null,
    subject_id: 'subject-test',
    wallet_address: 'wallet-test',
    trust_state: trustState,
    mode: trustState === 'verified' ? 'full' : 'read_only',
    allowed_capabilities: [],
    task_type: 'agent_chat',
    context: {
      buyer_snapshot: snapshot,
    },
    messages: [],
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:00.000Z',
  };
}

test('falls back to session trust state when buyer snapshot trust state is unsupported', () => {
  const snapshot = parseBuyerSnapshot(
    sessionWithBuyerSnapshot('manual_review', {
      trust: {
        state: 'verified-but-not-real',
        write_enabled: true,
      },
    }),
  );

  assert.equal(snapshot.trust?.state, 'manual_review');
  assert.equal(snapshot.trust?.write_enabled, true);
});

test('keeps supported buyer snapshot trust states', () => {
  const snapshot = parseBuyerSnapshot(
    sessionWithBuyerSnapshot('manual_review', {
      trust: {
        state: 'verified',
        write_enabled: true,
      },
    }),
  );

  assert.equal(snapshot.trust?.state, 'verified');
  assert.equal(snapshot.trust?.write_enabled, true);
});
