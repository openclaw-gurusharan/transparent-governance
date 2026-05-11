import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AppId, PortfolioTrustState } from './contracts.js';

process.env.CONTROL_PLANE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'agent-control-plane-test-'));
process.env.CLAUDE_AGENT_AUTH_MODE = 'bedrock';
process.env.CLAUDE_AGENT_MODEL = 'test-agent-model';

const { buildRuntimeSnapshot } = await import('./entitlements.js');

const TRUST_STATES: PortfolioTrustState[] = [
  'no_identity',
  'identity_present_unverified',
  'verified',
  'manual_review',
  'revoked_or_blocked',
];

const APP_CAPABILITIES: Record<AppId, { read: string[]; write: string[] }> = {
  'ondc-buyer': {
    read: ['search', 'product_detail', 'cart_state', 'order_status', 'trust_checkout_guidance'],
    write: ['checkout_mutation'],
  },
  'ondc-seller': {
    read: ['catalog_read', 'listing_quality_analysis', 'order_status', 'seller_config_guidance'],
    write: ['catalog_write', 'listing_publish'],
  },
  flatwatch: {
    read: ['transactions_query', 'receipts_metadata', 'challenges_summary', 'bylaw_lookup'],
    write: ['receipt_process_metadata', 'challenge_create', 'challenge_resolve'],
  },
};

for (const [appId, capabilities] of Object.entries(APP_CAPABILITIES) as [AppId, (typeof APP_CAPABILITIES)[AppId]][]) {
  test(`${appId} exposes full access only for verified trust`, async (t) => {
    for (const trustState of TRUST_STATES) {
      await t.test(trustState, async () => {
        const trustReason = `trust reason for ${trustState}`;
        const snapshot = await buildRuntimeSnapshot(
          `subject-${appId}-${trustState}`,
          appId,
          trustState,
          trustReason,
        );

        assert.equal(snapshot.runtime_available, true);
        assert.equal(snapshot.agent_access, true);
        assert.equal(snapshot.trust_state, trustState);
        assert.equal(snapshot.trust_required_for_write, true);

        if (trustState === 'verified') {
          assert.equal(snapshot.mode, 'full');
          assert.equal(snapshot.blocked_reason, null);
          assert.deepEqual(snapshot.allowed_capabilities, [...capabilities.read, ...capabilities.write]);
          return;
        }

        assert.equal(snapshot.mode, 'read_only');
        assert.equal(snapshot.blocked_reason, trustReason);
        assert.deepEqual(snapshot.allowed_capabilities, capabilities.read);
        for (const writeCapability of capabilities.write) {
          assert.equal(snapshot.allowed_capabilities.includes(writeCapability), false);
        }
      });
    }
  });
}

test('runtime auth blocker overrides trust-state access', async () => {
  process.env.CLAUDE_AGENT_AUTH_MODE = 'api_key';
  delete process.env.ANTHROPIC_API_KEY;

  const snapshot = await buildRuntimeSnapshot('subject-runtime-blocked', 'ondc-buyer', 'verified', null);

  assert.equal(snapshot.runtime_available, false);
  assert.equal(snapshot.agent_access, false);
  assert.equal(snapshot.mode, 'blocked');
  assert.deepEqual(snapshot.allowed_capabilities, []);
  assert.match(snapshot.blocked_reason ?? '', /ANTHROPIC_API_KEY is required/);
});
