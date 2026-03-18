import cors from 'cors';
import express from 'express';
import crypto from 'node:crypto';
import { buildRuntimeSnapshot, recordUsage } from './entitlements.js';
import { getSession, saveSession } from './store.js';
import { fetchTrustSnapshot } from './trust.js';
import { streamAgentResponse } from './runtime.js';
const PORT = Number(process.env.PORT || 8100);
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
function mapAppId(raw) {
    if (raw === 'buyer')
        return 'ondc-buyer';
    if (raw === 'seller')
        return 'ondc-seller';
    if (raw === 'flatwatch' || raw === 'ondc-buyer' || raw === 'ondc-seller')
        return raw;
    throw new HttpError(400, `Unsupported app id: ${raw}`);
}
function getSubjectId(req) {
    const subject = req.header('x-user-id') || req.header('x-subject-id') || req.query.subject_id;
    return typeof subject === 'string' ? subject.trim() : '';
}
function getWalletAddress(req) {
    const wallet = req.header('x-wallet-address') || req.query.wallet_address;
    return typeof wallet === 'string' && wallet.trim() ? wallet.trim() : null;
}
function createSessionId() {
    return `session-${crypto.randomUUID().slice(0, 12)}`;
}
function buildSessionSummary(session) {
    return {
        app_id: session.app_id,
        session_id: session.session_id,
        sdk_session_id: session.sdk_session_id,
        subject_id: session.subject_id,
        trust_state: session.trust_state,
        mode: session.mode,
        allowed_capabilities: session.allowed_capabilities,
        created_at: session.created_at,
        updated_at: session.updated_at,
    };
}
async function resolveRequestRuntime(appId, req) {
    const subjectId = getSubjectId(req);
    if (!subjectId) {
        throw new HttpError(401, 'Authentication required.');
    }
    const walletAddress = getWalletAddress(req);
    const trust = await fetchTrustSnapshot(walletAddress);
    const runtime = buildRuntimeSnapshot(subjectId, appId, trust.state, trust.reason, req);
    return { subjectId, walletAddress, trust, runtime };
}
async function createOrResumeSession(appId, req, payload) {
    const { subjectId, walletAddress, runtime } = await resolveRequestRuntime(appId, req);
    if (!runtime.agent_access) {
        throw new HttpError(403, runtime.blocked_reason || 'Claude Agent runtime is unavailable.');
    }
    const existing = payload.resume_session_id ? getSession(appId, payload.resume_session_id) : null;
    if (existing && existing.subject_id !== subjectId) {
        throw new HttpError(403, 'Cannot resume a session owned by another subject.');
    }
    const now = new Date().toISOString();
    const session = existing ?? {
        app_id: appId,
        session_id: payload.resume_session_id || createSessionId(),
        sdk_session_id: null,
        subject_id: subjectId,
        wallet_address: walletAddress,
        trust_state: runtime.trust_state,
        mode: runtime.mode,
        allowed_capabilities: runtime.allowed_capabilities,
        task_type: payload.task_type,
        context: payload.context ?? {},
        messages: [],
        created_at: now,
        updated_at: now,
    };
    session.wallet_address = walletAddress;
    session.trust_state = runtime.trust_state;
    session.mode = runtime.mode;
    session.allowed_capabilities = runtime.allowed_capabilities;
    session.task_type = payload.task_type;
    session.context = payload.context ?? {};
    session.updated_at = now;
    saveSession(session);
    return {
        runtime,
        session,
    };
}
function streamSse(res, events) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (async () => {
        try {
            for await (const event of events) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            res.write('data: [DONE]\n\n');
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unexpected agent runtime failure.',
                timestamp: Date.now(),
            })}\n\n`);
            res.write('data: [DONE]\n\n');
        }
        finally {
            res.end();
        }
    })().catch((error) => {
        console.error('Failed to write SSE response:', error);
    });
}
async function sendAgentMessage(appId, req, res, payload) {
    const subjectId = getSubjectId(req);
    if (!subjectId) {
        throw new HttpError(401, 'Authentication required.');
    }
    const session = getSession(appId, payload.session_id);
    if (!session || session.subject_id !== subjectId) {
        throw new HttpError(404, 'Session not found.');
    }
    const walletAddress = getWalletAddress(req) ?? session.wallet_address;
    const trust = await fetchTrustSnapshot(walletAddress);
    const runtime = buildRuntimeSnapshot(subjectId, appId, trust.state, trust.reason, req);
    if (!runtime.agent_access) {
        throw new HttpError(403, runtime.blocked_reason || 'Claude Agent runtime is unavailable.');
    }
    session.wallet_address = walletAddress;
    session.trust_state = runtime.trust_state;
    session.mode = runtime.mode;
    session.allowed_capabilities = runtime.allowed_capabilities;
    session.messages.push({ role: 'user', content: payload.message, timestamp: Date.now() });
    session.updated_at = new Date().toISOString();
    saveSession(session);
    const events = async function* () {
        let finalResult = '';
        let latestSdkSessionId = session.sdk_session_id;
        let estimatedCostUsd = 0;
        for await (const event of streamAgentResponse(appId, session, payload.message, runtime)) {
            if (event.type === 'result') {
                finalResult = event.content;
                latestSdkSessionId = event.sdk_session_id ?? latestSdkSessionId;
                estimatedCostUsd = event.estimated_cost_usd ?? estimatedCostUsd;
            }
            yield event;
        }
        session.sdk_session_id = latestSdkSessionId;
        if (finalResult) {
            session.messages.push({ role: 'assistant', content: finalResult, timestamp: Date.now() });
        }
        session.updated_at = new Date().toISOString();
        saveSession(session);
        if (finalResult) {
            const usage = recordUsage(session.subject_id, session.app_id, estimatedCostUsd);
            yield {
                type: 'usage',
                usage: {
                    requests_used: usage.requests_used,
                    requests_limit: usage.requests_limit,
                    period_start: usage.period_start,
                    period_end: usage.period_end,
                    estimated_cost_usd: usage.estimated_cost_usd,
                },
                timestamp: Date.now(),
            };
        }
    }();
    streamSse(res, events);
}
function handleRouteError(res, error, fallbackMessage) {
    const statusCode = error instanceof HttpError ? error.statusCode : 400;
    const message = error instanceof Error ? error.message : fallbackMessage;
    res.status(statusCode).json({ error: message });
}
function runtimeResponse(snapshot) {
    return {
        ...snapshot,
        compatibility_surface: 'agent_runtime',
    };
}
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'agent-control-plane' });
});
app.get('/api/agent/runtime', async (req, res) => {
    try {
        const rawApp = req.query.app;
        if (typeof rawApp !== 'string') {
            throw new HttpError(400, 'Missing app query parameter.');
        }
        const appId = mapAppId(rawApp);
        const { runtime } = await resolveRequestRuntime(appId, req);
        res.json(runtimeResponse(runtime));
    }
    catch (error) {
        handleRouteError(res, error, 'Failed to resolve agent runtime.');
    }
});
app.get('/api/entitlements/me', async (req, res) => {
    try {
        const rawApp = req.query.app;
        if (typeof rawApp !== 'string') {
            throw new HttpError(400, 'Missing app query parameter.');
        }
        const appId = mapAppId(rawApp);
        const { runtime } = await resolveRequestRuntime(appId, req);
        res.json(runtimeResponse(runtime));
    }
    catch (error) {
        handleRouteError(res, error, 'Failed to resolve agent runtime.');
    }
});
app.post('/api/agent/:appId/sessions', async (req, res) => {
    try {
        const appId = mapAppId(req.params.appId);
        const payload = req.body;
        const { session } = await createOrResumeSession(appId, req, payload);
        res.json(buildSessionSummary(session));
    }
    catch (error) {
        handleRouteError(res, error, 'Failed to create session.');
    }
});
app.get('/api/agent/:appId/sessions/:sessionId', async (req, res) => {
    try {
        const appId = mapAppId(req.params.appId);
        const subjectId = getSubjectId(req);
        if (!subjectId) {
            throw new HttpError(401, 'Authentication required.');
        }
        const session = getSession(appId, req.params.sessionId);
        if (!session || session.subject_id !== subjectId) {
            throw new HttpError(404, 'Session not found.');
        }
        res.json(buildSessionSummary(session));
    }
    catch (error) {
        handleRouteError(res, error, 'Failed to load session.');
    }
});
app.post('/api/agent/:appId/messages', async (req, res) => {
    try {
        const appId = mapAppId(req.params.appId);
        await sendAgentMessage(appId, req, res, req.body);
    }
    catch (error) {
        handleRouteError(res, error, 'Failed to send message.');
    }
});
app.post('/api/agent/:legacyApp', async (req, res, next) => {
    if (!['buyer', 'seller'].includes(req.params.legacyApp)) {
        return next();
    }
    try {
        const appId = mapAppId(req.params.legacyApp);
        const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
        if (!prompt) {
            throw new HttpError(400, 'Prompt is required.');
        }
        const payload = {
            task_type: 'agent_chat',
            context: typeof req.body?.context === 'object' && req.body.context ? req.body.context : {},
            resume_session_id: typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined,
        };
        const { session } = await createOrResumeSession(appId, req, payload);
        await sendAgentMessage(appId, req, res, {
            session_id: session.session_id,
            message: prompt,
        });
    }
    catch (error) {
        handleRouteError(res, error, 'Compatibility route failed.');
    }
});
app.listen(PORT, () => {
    console.log(`agent-control-plane listening on http://127.0.0.1:${PORT}`);
});
