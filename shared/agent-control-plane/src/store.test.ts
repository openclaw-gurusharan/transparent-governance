import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import test from 'node:test';

process.env.CONTROL_PLANE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'agent-control-plane-store-test-'));

const { appendAuditEvent } = await import('./store.js');

test('persists capability audit events with trust and capability context', async () => {
  const event = await appendAuditEvent({
    event_type: 'capability_denial',
    app_id: 'ondc-buyer',
    subject_id: 'subject-audit',
    wallet_address: 'wallet-audit',
    session_id: 'session-audit',
    trust_state: 'manual_review',
    mode: 'read_only',
    allowed_capabilities: ['search', 'product_detail'],
    outcome: 'denied',
    reason: 'Trust verification is still required.',
    tool: null,
  });

  assert.match(event.audit_id, /^audit-/);
  assert.equal(event.event_type, 'capability_denial');
  assert.equal(event.trust_state, 'manual_review');
  assert.deepEqual(event.allowed_capabilities, ['search', 'product_detail']);

  const storePath = path.join(process.env.CONTROL_PLANE_DATA_DIR ?? '', 'control-plane-store.json');
  const stored = JSON.parse(await readFile(storePath, 'utf8'));
  assert.equal(stored.audit_events.length, 1);
  assert.equal(stored.audit_events[0].audit_id, event.audit_id);
  assert.equal(stored.audit_events[0].reason, 'Trust verification is still required.');
});
