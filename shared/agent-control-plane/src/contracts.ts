import type { AgentAuthMode } from './config.js';

export type AppId = 'ondc-buyer' | 'ondc-seller' | 'flatwatch';

export type PortfolioTrustState =
  | 'no_identity'
  | 'identity_present_unverified'
  | 'verified'
  | 'manual_review'
  | 'revoked_or_blocked';

export type SessionMode = 'blocked' | 'read_only' | 'full';

export interface UsageSnapshot {
  requests_used: number;
  requests_limit: number;
  period_start: string;
  period_end: string;
  estimated_cost_usd: number;
}

export interface AgentRuntimeSnapshot {
  app_id: AppId;
  auth_mode: AgentAuthMode;
  model: string;
  runtime_available: boolean;
  agent_access: boolean;
  trust_state: PortfolioTrustState;
  trust_required_for_write: boolean;
  mode: SessionMode;
  usage: UsageSnapshot;
  allowed_capabilities: string[];
  blocked_reason: string | null;
}

export interface AgentSessionSummary {
  app_id: AppId;
  session_id: string;
  sdk_session_id: string | null;
  subject_id: string;
  trust_state: PortfolioTrustState;
  mode: SessionMode;
  allowed_capabilities: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentSessionCreateRequest {
  task_type: string;
  context: Record<string, unknown>;
  resume_session_id?: string;
}

export interface AgentMessageRequest {
  session_id: string;
  message: string;
}

export type AgentStreamEvent =
  | { type: 'init'; session_id: string; sdk_session_id: string | null; mode: SessionMode }
  | { type: 'assistant_delta'; content: string; timestamp: number }
  | { type: 'tool_call'; tool: string; status?: string; timestamp: number }
  | { type: 'tool_result'; tool: string; status?: string; content?: string; timestamp: number }
  | { type: 'result'; content: string; timestamp: number; sdk_session_id?: string | null; estimated_cost_usd?: number }
  | { type: 'error'; error: string; timestamp: number }
  | { type: 'usage'; usage: UsageSnapshot; timestamp: number };

export interface StoredUsageRecord extends UsageSnapshot {
  subject_id: string;
  app_id: AppId;
}

export interface StoredSessionRecord {
  app_id: AppId;
  session_id: string;
  sdk_session_id: string | null;
  subject_id: string;
  wallet_address: string | null;
  trust_state: PortfolioTrustState;
  mode: SessionMode;
  allowed_capabilities: string[];
  task_type: string;
  context: Record<string, unknown>;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  created_at: string;
  updated_at: string;
}

interface LegacyEntitlementRecord extends UsageSnapshot {
  subject_id: string;
  app_id: AppId;
}

export interface ControlPlaneStore {
  usage: StoredUsageRecord[];
  sessions: StoredSessionRecord[];
  entitlements?: LegacyEntitlementRecord[];
}
