import type express from 'express';
import { resolveRuntimePolicy } from './config.js';
import type { AgentRuntimeSnapshot, AppId, PortfolioTrustState } from './contracts.js';
import { getOrCreateUsage, updateUsage } from './store.js';

const APP_CAPABILITIES: Record<AppId, { read: string[]; write: string[] }> = {
  'ondc-buyer': {
    read: ['intent_parse', 'search_catalog', 'select_offer', 'prepare_checkout', 'get_order_status', 'get_support_case_status'],
    write: ['confirm_order', 'cancel_order', 'create_support_case'],
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

function computeMode(runtimeAvailable: boolean, trustState: PortfolioTrustState) {
  if (!runtimeAvailable) return 'blocked' as const;
  if (trustState === 'verified') return 'full' as const;
  return 'read_only' as const;
}

function buildAllowedCapabilities(appId: AppId, mode: 'blocked' | 'read_only' | 'full') {
  if (mode === 'blocked') return [] as string[];
  if (mode === 'read_only') return APP_CAPABILITIES[appId].read;
  return [...APP_CAPABILITIES[appId].read, ...APP_CAPABILITIES[appId].write];
}

export async function buildRuntimeSnapshot(
  subjectId: string,
  appId: AppId,
  trustState: PortfolioTrustState,
  trustReason: string | null,
  req?: express.Request,
): Promise<AgentRuntimeSnapshot> {
  const usage = await getOrCreateUsage(subjectId, appId);
  const runtimePolicy = resolveRuntimePolicy(req);
  const mode = computeMode(runtimePolicy.runtimeAvailable, trustState);
  const blockedReason =
    runtimePolicy.blockedReason ??
    (mode === 'read_only' && trustState !== 'verified'
      ? trustReason ?? 'Trust verification is still required for higher-trust write actions.'
      : null);

  return {
    app_id: appId,
    auth_mode: runtimePolicy.authMode,
    model: runtimePolicy.model,
    runtime_available: runtimePolicy.runtimeAvailable,
    agent_access: runtimePolicy.runtimeAvailable,
    trust_state: trustState,
    trust_required_for_write: true,
    mode,
    usage: {
      requests_used: usage.requests_used,
      requests_limit: usage.requests_limit,
      period_start: usage.period_start,
      period_end: usage.period_end,
      estimated_cost_usd: usage.estimated_cost_usd,
    },
    allowed_capabilities: buildAllowedCapabilities(appId, mode),
    blocked_reason: blockedReason,
  };
}

export function recordUsage(subjectId: string, appId: AppId, incrementalCostUsd = 0) {
  return updateUsage(subjectId, appId, (record) => ({
    ...record,
    requests_used: record.requests_used + 1,
    estimated_cost_usd: Number((record.estimated_cost_usd + incrementalCostUsd).toFixed(6)),
  }));
}
