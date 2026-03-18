import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolveRuntimePolicy } from './config.js';
function mapAppLabel(appId) {
    if (appId === 'ondc-buyer')
        return 'ONDC Buyer';
    if (appId === 'ondc-seller')
        return 'ONDC Seller';
    return 'FlatWatch';
}
function extractText(message) {
    if (!message || typeof message !== 'object')
        return null;
    const record = message;
    if (typeof record.result === 'string')
        return record.result;
    if (Array.isArray(record.content)) {
        return record.content
            .map((item) => {
            if (item && typeof item === 'object' && item.type === 'text') {
                return String(item.text ?? '');
            }
            return '';
        })
            .join('')
            .trim() || null;
    }
    return null;
}
function extractTextDelta(message) {
    if (!message || typeof message !== 'object')
        return null;
    const record = message;
    if (record.type !== 'stream_event' || !record.event || typeof record.event !== 'object') {
        return null;
    }
    const event = record.event;
    if (event.type !== 'content_block_delta' || !event.delta || typeof event.delta !== 'object') {
        return null;
    }
    const delta = event.delta;
    return delta.type === 'text_delta' && typeof delta.text === 'string' ? delta.text : null;
}
function extractCost(message) {
    if (!message || typeof message !== 'object')
        return 0;
    const record = message;
    return typeof record.total_cost_usd === 'number' ? record.total_cost_usd : 0;
}
function buildPrompt(appId, session, prompt) {
    return [
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
export async function* streamAgentResponse(appId, session, prompt, runtimeSnapshot) {
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
                cwd: process.cwd(),
                pathToClaudeCodeExecutable: runtimePolicy.claudeCodeExecutablePath ?? undefined,
            },
        })) {
            const record = message;
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
    }
    catch (error) {
        yield {
            type: 'error',
            error: error instanceof Error ? error.message : 'Claude Agent SDK request failed.',
            timestamp: Date.now(),
        };
    }
}
