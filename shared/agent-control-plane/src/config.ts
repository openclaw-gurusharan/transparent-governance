import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import type express from 'express';

export type AgentAuthMode = 'api_key' | 'local_cli' | 'bedrock' | 'vertex' | 'azure' | 'unavailable';

export interface AgentRuntimePolicy {
  runtimeAvailable: boolean;
  authMode: AgentAuthMode;
  model: string;
  blockedReason: string | null;
  claudeCodeExecutablePath: string | null;
}

const DEFAULT_MODEL = process.env.CLAUDE_AGENT_MODEL || 'claude-haiku-4-5-20251001';
const EXPLICIT_CLAUDE_PATH = process.env.CLAUDE_CODE_EXECUTABLE || process.env.CLAUDE_CODE_PATH || null;
let cachedClaudeExecutablePath: string | null | undefined;

function isTruthy(value: string | undefined, defaultValue = false) {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function normalizeRequestedAuthMode(value: string | undefined) {
  const normalized = (value || 'auto').toLowerCase();
  if (normalized === 'api_key' || normalized === 'local_cli' || normalized === 'bedrock' || normalized === 'vertex' || normalized === 'azure') {
    return normalized;
  }
  return 'auto';
}

function hostLooksLocal(value: string | undefined) {
  if (!value) return false;
  const host = value.split('/')[0]?.split(':')[0]?.trim().toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function requestLooksLocal(req?: express.Request) {
  if (!req) return false;
  const forwardedFor = req.header('x-forwarded-for');
  const host = req.header('host');
  const origin = req.header('origin');
  const referer = req.header('referer');
  return (
    hostLooksLocal(host) ||
    hostLooksLocal(origin?.replace(/^https?:\/\//, '')) ||
    hostLooksLocal(referer?.replace(/^https?:\/\//, '')) ||
    forwardedFor === '127.0.0.1' ||
    forwardedFor === '::1'
  );
}

function resolveClaudeExecutablePath() {
  if (cachedClaudeExecutablePath !== undefined) {
    return cachedClaudeExecutablePath;
  }

  if (EXPLICIT_CLAUDE_PATH) {
    cachedClaudeExecutablePath = fs.existsSync(EXPLICIT_CLAUDE_PATH) ? EXPLICIT_CLAUDE_PATH : null;
    return cachedClaudeExecutablePath;
  }

  const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['claude'], {
    encoding: 'utf8',
  });

  if (lookup.status === 0) {
    const candidate = lookup.stdout
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    cachedClaudeExecutablePath = candidate || null;
    return cachedClaudeExecutablePath;
  }

  cachedClaudeExecutablePath = null;
  return cachedClaudeExecutablePath;
}

export function resolveRuntimePolicy(req?: express.Request): AgentRuntimePolicy {
  const requestedAuthMode = normalizeRequestedAuthMode(process.env.CLAUDE_AGENT_AUTH_MODE);
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const allowLocalCli = isTruthy(process.env.CLAUDE_AGENT_ALLOW_LOCAL_CLI_AUTH, true);
  const nonProduction = process.env.NODE_ENV !== 'production';
  const localRequest = requestLooksLocal(req);
  const claudeCodeExecutablePath = resolveClaudeExecutablePath();

  if (requestedAuthMode === 'bedrock' || requestedAuthMode === 'vertex' || requestedAuthMode === 'azure') {
    return {
      runtimeAvailable: true,
      authMode: requestedAuthMode,
      model: DEFAULT_MODEL,
      blockedReason: null,
      claudeCodeExecutablePath,
    };
  }

  if (requestedAuthMode === 'api_key') {
    return hasApiKey
      ? {
          runtimeAvailable: true,
          authMode: 'api_key',
          model: DEFAULT_MODEL,
          blockedReason: null,
          claudeCodeExecutablePath,
        }
      : {
          runtimeAvailable: false,
          authMode: 'unavailable',
          model: DEFAULT_MODEL,
          blockedReason: 'ANTHROPIC_API_KEY is required for the configured runtime mode.',
          claudeCodeExecutablePath,
        };
  }

  if (hasApiKey) {
    return {
      runtimeAvailable: true,
      authMode: 'api_key',
      model: DEFAULT_MODEL,
      blockedReason: null,
      claudeCodeExecutablePath,
    };
  }

  if (requestedAuthMode === 'local_cli' || requestedAuthMode === 'auto') {
    if (!claudeCodeExecutablePath) {
      return {
        runtimeAvailable: false,
        authMode: 'unavailable',
        model: DEFAULT_MODEL,
        blockedReason: 'Claude Code CLI auth requires the local `claude` executable to be installed or CLAUDE_CODE_EXECUTABLE to be set.',
        claudeCodeExecutablePath: null,
      };
    }

    if (allowLocalCli && nonProduction && localRequest) {
      return {
        runtimeAvailable: true,
        authMode: 'local_cli',
        model: DEFAULT_MODEL,
        blockedReason: null,
        claudeCodeExecutablePath,
      };
    }

    return {
      runtimeAvailable: false,
      authMode: 'unavailable',
      model: DEFAULT_MODEL,
      blockedReason: 'Claude Code CLI auth is restricted to localhost development. Configure API-key or cloud-provider auth for deployed runtimes.',
      claudeCodeExecutablePath,
    };
  }

  return {
    runtimeAvailable: false,
    authMode: 'unavailable',
    model: DEFAULT_MODEL,
    blockedReason: 'No supported Claude Agent SDK auth mode is configured.',
    claudeCodeExecutablePath,
  };
}
