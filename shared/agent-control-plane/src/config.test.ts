import assert from 'node:assert/strict';
import test from 'node:test';
import type express from 'express';

process.env.CLAUDE_AGENT_ALLOWED_ORIGINS = 'https://buyer.example.test, https://seller.example.test/app';
process.env.CLAUDE_AGENT_AUTH_MODE = 'local_cli';
process.env.CLAUDE_CODE_EXECUTABLE = '/bin/sh';
process.env.CLAUDE_AGENT_ALLOW_LOCAL_CLI_AUTH = 'true';
process.env.NODE_ENV = 'development';

const { isCorsOriginAllowed, requestMatchesAllowedOrigin, resolveRuntimePolicy } = await import('./config.js');

function requestWithHeaders(headers: Record<string, string | undefined>): express.Request {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    header(name: string) {
      return normalized.get(name.toLowerCase());
    },
  } as express.Request;
}

test('allows CORS only for local or configured frontend origins', () => {
  assert.equal(isCorsOriginAllowed(undefined), true);
  assert.equal(isCorsOriginAllowed('http://127.0.0.1:43102'), true);
  assert.equal(isCorsOriginAllowed('http://localhost:43103'), true);
  assert.equal(isCorsOriginAllowed('https://buyer.example.test'), true);
  assert.equal(isCorsOriginAllowed('https://seller.example.test'), true);
  assert.equal(isCorsOriginAllowed('https://evil.example.test'), false);
});

test('matches configured origins from origin or referer headers', () => {
  assert.equal(
    requestMatchesAllowedOrigin(requestWithHeaders({ origin: 'https://buyer.example.test' })),
    true,
  );
  assert.equal(
    requestMatchesAllowedOrigin(requestWithHeaders({ referer: 'https://seller.example.test/dashboard' })),
    true,
  );
  assert.equal(
    requestMatchesAllowedOrigin(requestWithHeaders({ origin: 'https://evil.example.test' })),
    false,
  );
});

test('permits local CLI runtime only for local or explicitly allowed frontend origins', () => {
  process.env.NODE_ENV = 'development';

  const allowed = resolveRuntimePolicy(
    requestWithHeaders({
      host: 'agent.example.test',
      origin: 'https://buyer.example.test',
    }),
  );

  assert.equal(allowed.runtimeAvailable, true);
  assert.equal(allowed.authMode, 'local_cli');

  const blocked = resolveRuntimePolicy(
    requestWithHeaders({
      host: 'agent.example.test',
      origin: 'https://evil.example.test',
    }),
  );

  assert.equal(blocked.runtimeAvailable, false);
  assert.equal(blocked.authMode, 'unavailable');
  assert.match(blocked.blockedReason ?? '', /CLAUDE_AGENT_ALLOWED_ORIGINS/);
});

test('blocks local CLI runtime in production even for an allowed frontend origin', () => {
  process.env.NODE_ENV = 'production';

  const blocked = resolveRuntimePolicy(
    requestWithHeaders({
      host: 'agent.example.test',
      origin: 'https://buyer.example.test',
    }),
  );

  assert.equal(blocked.runtimeAvailable, false);
  assert.equal(blocked.authMode, 'unavailable');
  assert.match(blocked.blockedReason ?? '', /deployed runtimes/);

  process.env.NODE_ENV = 'development';
});
