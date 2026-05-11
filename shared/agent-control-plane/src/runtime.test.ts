import assert from 'node:assert/strict';
import test from 'node:test';
import { enforceAgentWriteTrustGate } from './runtime.js';

test('blocks buyer checkout navigation outside full mode', () => {
  const content = JSON.stringify({
    summary: 'Ready for checkout.',
    actions: [
      { type: 'cart_add', item_id: 'mustard-oil-1l', quantity: 1, reason: 'Selected.' },
      { type: 'navigate', path: '/checkout', reason: 'Proceed.' },
    ],
  });

  const gated = JSON.parse(enforceAgentWriteTrustGate('ondc-buyer', 'read_only', content));

  assert.equal(gated.actions[0].type, 'cart_add');
  assert.deepEqual(gated.actions[1], {
    type: 'trust_required',
    operation: 'buyer_checkout',
    reason: 'Buyer checkout requires a verified AadhaarChain trust state before higher-trust execution.',
    suggested_path: '/agent',
  });
  assert.match(gated.summary, /blocked/);
});

test('blocks seller catalog patches outside full mode', () => {
  const content = JSON.stringify({
    summary: 'Patch the listing.',
    actions: [
      {
        type: 'catalog_patch',
        target_item_id: 'demo-cold-pressed-oil',
        reason: 'Direct edit.',
        patch: { price: '333.00' },
      },
      { type: 'navigate', path: '/catalog', reason: 'Review catalog.' },
    ],
  });

  const gated = JSON.parse(enforceAgentWriteTrustGate('ondc-seller', 'read_only', content));

  assert.deepEqual(gated.actions[0], {
    type: 'trust_required',
    operation: 'seller_catalog_write',
    reason: 'Seller catalog write actions require a verified AadhaarChain trust state.',
    suggested_path: '/catalog',
  });
  assert.equal(gated.actions[1].type, 'navigate');
});

test('leaves verified full-mode write actions unchanged', () => {
  const content = JSON.stringify({
    summary: 'Patch the listing.',
    actions: [{ type: 'catalog_patch', target_item_id: 'demo-cold-pressed-oil', patch: { price: '333.00' } }],
  });

  assert.equal(enforceAgentWriteTrustGate('ondc-seller', 'full', content), content);
});

test('leaves non-json content unchanged', () => {
  assert.equal(enforceAgentWriteTrustGate('flatwatch', 'read_only', 'Plain response.'), 'Plain response.');
});
