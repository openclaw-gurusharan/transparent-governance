import { query } from '@anthropic-ai/claude-agent-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentRuntimeSnapshot, AppId, AgentStreamEvent, StoredSessionRecord } from './contracts.js';
import { streamBuyerOrchestration } from './buyer-orchestrator.js';
import { resolveRuntimePolicy } from './config.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENT_WORKSPACE_DIR = process.env.CLAUDE_AGENT_WORKSPACE_DIR
  ? path.resolve(process.env.CLAUDE_AGENT_WORKSPACE_DIR)
  : path.resolve(MODULE_DIR, '../../..');

function mapAppLabel(appId: AppId) {
  if (appId === 'ondc-buyer') return 'ONDC Buyer';
  if (appId === 'ondc-seller') return 'ONDC Seller';
  return 'FlatWatch';
}

function buildRoleInstructions(appId: AppId) {
  const baseInstructions = [
    `You are the trust-aware ${mapAppLabel(appId)} assistant for this portfolio workspace.`,
    `Stay strictly inside ${mapAppLabel(appId)}. Do not role-play as another product, workspace assistant, or tool domain such as Slack.`,
    'Do not claim access to tools, datasets, or accounts that are not explicitly provided in the session metadata below.',
    'If the session context is sparse, summarize only what is actually known from trust state, mode, and allowed capabilities, then offer domain-relevant next steps.',
  ];

  if (appId === 'ondc-buyer') {
    return [
      ...baseInstructions,
      'Focus on buyer tasks such as search guidance, product comparison, cart state, order status, and trust-aware checkout guidance.',
      'When account details are unavailable, say that no buyer account context is loaded yet instead of referring to unrelated tools or systems.',
    ].join('\n');
  }

  if (appId === 'ondc-seller') {
    return [
      ...baseInstructions,
      'Focus on seller tasks such as catalog management, listing quality, order status, and seller configuration guidance.',
      'When account details are unavailable, say that no seller account context is loaded yet instead of referring to unrelated tools or systems.',
    ].join('\n');
  }

  return [
    ...baseInstructions,
    'Focus on FlatWatch tasks such as transaction review, receipt processing status, challenge workflows, and bylaw-oriented transparency guidance.',
    'When account details are unavailable, say that no FlatWatch operational context is loaded yet instead of referring to unrelated tools or systems.',
  ].join('\n');
}

function extractText(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const record = message as Record<string, unknown>;
  if (typeof record.result === 'string') return record.result;
  if (Array.isArray(record.content)) {
    return record.content
      .map((item) => {
        if (item && typeof item === 'object' && (item as Record<string, unknown>).type === 'text') {
          return String((item as Record<string, unknown>).text ?? '');
        }
        return '';
      })
      .join('')
      .trim() || null;
  }
  return null;
}

function extractTextDelta(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const record = message as Record<string, unknown>;
  if (record.type !== 'stream_event' || !record.event || typeof record.event !== 'object') {
    return null;
  }

  const event = record.event as Record<string, unknown>;
  if (event.type !== 'content_block_delta' || !event.delta || typeof event.delta !== 'object') {
    return null;
  }

  const delta = event.delta as Record<string, unknown>;
  return delta.type === 'text_delta' && typeof delta.text === 'string' ? delta.text : null;
}

function extractCost(message: unknown) {
  if (!message || typeof message !== 'object') return 0;
  const record = message as Record<string, unknown>;
  return typeof record.total_cost_usd === 'number' ? record.total_cost_usd : 0;
}

function buildPrompt(appId: AppId, session: StoredSessionRecord, prompt: string) {
  return [
    buildRoleInstructions(appId),
    '',
    `App: ${mapAppLabel(appId)}`,
    `Mode: ${session.mode}`,
    `Allowed capabilities: ${session.allowed_capabilities.join(', ') || 'none'}`,
    `Trust state: ${session.trust_state}`,
    `Task type: ${session.task_type}`,
    `Context: ${JSON.stringify(session.context)}`,
    '',
    prompt
  ].join('\n');
}

export async function* streamAgentResponse(
  appId: AppId,
  session: StoredSessionRecord,
  prompt: string,
  runtimeSnapshot: AgentRuntimeSnapshot,
): AsyncGenerator<AgentStreamEvent> {
  const timestamp = Date.now();
  yield {
    type: 'init',
    session_id: session.session_id,
    sdk_session_id: session.sdk_session_id,
    mode: session.mode,
  };

  if (!runtimeSnapshot.runtime_available || session.mode === 'blocked') {
    yield {
      type: 'error',
      error: runtimeSnapshot.blocked_reason || 'Claude Agent runtime is unavailable.',
      timestamp,
    };
    return;
  }

  if (appId === 'ondc-buyer') {
    yield* streamBuyerOrchestration(session, prompt, runtimeSnapshot);
    return;
  }

  try {
    let finalText = '';
    let sdkSessionId = session.sdk_session_id;
    let totalCostUsd = 0;
    const runtimePolicy = resolveRuntimePolicy();

    for await (const message of query({
      prompt: buildPrompt(appId, session, prompt),
      options: {
        model: runtimeSnapshot.model,
        resume: sdkSessionId ?? undefined,
        tools: [],
        allowedTools: [],
        permissionMode: 'default',
        includePartialMessages: true,
        cwd: AGENT_WORKSPACE_DIR,
        pathToClaudeCodeExecutable: runtimePolicy.claudeCodeExecutablePath ?? undefined,
      },
    })) {
      const record = message as Record<string, unknown>;
      if (typeof record.session_id === 'string') {
        sdkSessionId = record.session_id;
      }
      totalCostUsd = Math.max(totalCostUsd, extractCost(record));

      const textDelta = extractTextDelta(record);
      if (textDelta) {
        yield {
          type: 'assistant_delta',
          content: textDelta,
          timestamp: Date.now(),
        };
      }

      const text = extractText(record);
      if (text) {
        finalText = text;
        yield {
          type: 'assistant_delta',
          content: text,
          timestamp: Date.now(),
        };
      }
    }

    if (!finalText) {
      throw new Error('Claude Agent SDK returned no assistant content.');
    }

    yield {
      type: 'result',
      content: finalText,
      sdk_session_id: sdkSessionId,
      estimated_cost_usd: totalCostUsd || undefined,
      timestamp: Date.now(),
    };
  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Claude Agent SDK request failed.',
      timestamp: Date.now(),
    };
  }
}
