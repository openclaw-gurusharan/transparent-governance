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
  context?: Record<string, unknown>;
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
  context?: Record<string, unknown>;
}

export interface BuyerMoney {
  currency: string;
  value: string;
}

export interface ShoppingIntent {
  raw_text: string;
  action: 'shop' | 'confirm' | 'track' | 'cancel' | 'issue' | 'issue_status' | 'status';
  product_query: string | null;
  quantity: number | null;
  budget_max_inr: number | null;
  preferences: string[];
  delivery_window: string | null;
  order_reference: string | null;
  issue_type: BuyerSupportCase['issue_type'] | null;
  issue_description: string | null;
}

export interface StructuredShoppingTask {
  query: string;
  quantity: number;
  budget_max_inr: number | null;
  preferences: string[];
  delivery_window: string | null;
  missing_fields: string[];
}

export interface CandidateOffer {
  candidate_id: string;
  item_id: string;
  title: string;
  provider_id: string;
  provider_name: string;
  quantity: number;
  unit_price: BuyerMoney;
  total_price: BuyerMoney;
  rating: number | null;
  delivery_eta: string;
  payment_modes: string[];
  cancellation_terms: string;
  substitution_policy: string;
  ranking_reason: string;
}

export interface OfferSelection {
  candidate_id: string;
  selected_at: string;
  reason: string;
}

export interface DraftCheckout {
  draft_id: string;
  candidate_id: string;
  item_title: string;
  quantity: number;
  provider_name: string;
  payment_mode: string;
  delivery_estimate: string;
  cancellation_terms: string;
  substitution_policy: string;
  charge_breakup: Array<{
    title: string;
    type: 'item' | 'delivery' | 'tax';
    amount: BuyerMoney;
  }>;
  total: BuyerMoney;
  expires_at: string;
  missing_fields: string[];
  ready_for_confirmation: boolean;
}

export interface FinalConfirmation {
  confirmed_by_subject_id: string;
  confirmed_at: string;
  confirmation_note: string;
}

export interface BuyerOrderRecord {
  id: string;
  status:
    | 'created'
    | 'accepted'
    | 'in_progress'
    | 'packed'
    | 'shipped'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'returned';
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    name: string;
    verified: boolean;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: BuyerMoney;
  }>;
  quote: {
    total: BuyerMoney;
    breakup: Array<{
      title: string;
      type: 'item' | 'delivery' | 'tax';
      price: BuyerMoney;
    }>;
  };
  fulfillment: {
    type: 'delivery';
    status:
      | 'pending'
      | 'processing'
      | 'packed'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelled';
    providerName: string;
    estimatedTime: {
      start: string;
      end: string;
    };
    tracking: {
      status: string;
      statusMessage: string;
    };
  };
  payment: {
    type: 'upi';
    status: 'PAID' | 'NOT-PAID' | 'failed';
    amount: BuyerMoney;
  };
  cancellation?: {
    cancelledBy: string;
    reason?: string;
    cancelledAt?: string;
    refund?: {
      amount: BuyerMoney;
      status: string;
    };
  };
}

export interface BuyerSupportCase {
  case_id: string;
  order_id: string;
  issue_type: 'cancellation' | 'fulfillment' | 'post_delivery' | 'payment' | 'other';
  description: string;
  evidence_links: string[];
  network_case_id: string;
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  updated_at: string;
  resolution_note?: string | null;
}

export interface BuyerCartLine {
  item_id: string;
  title: string;
  quantity: number;
  unit_price: BuyerMoney;
  provider_name: string;
}

export interface BuyerCartSessionSnapshot {
  session_id: string;
  items: BuyerCartLine[];
  buyer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface BuyerBrowserState {
  cart_session?: BuyerCartSessionSnapshot | null;
  recent_orders?: BuyerOrderRecord[];
  support_cases?: BuyerSupportCase[];
  active_route?: string | null;
}

export interface BuyerAgentTaskState {
  intent: ShoppingIntent | null;
  structured_task: StructuredShoppingTask | null;
  execution_state:
    | 'idle'
    | 'needs_clarification'
    | 'search_ready'
    | 'results_ready'
    | 'draft_ready'
    | 'awaiting_confirmation'
    | 'order_confirmed'
    | 'support_active';
  candidate_results: CandidateOffer[];
  selected_offer: OfferSelection | null;
  draft_checkout: DraftCheckout | null;
  final_confirmation: FinalConfirmation | null;
  active_order: BuyerOrderRecord | null;
  support_cases: BuyerSupportCase[];
  clarifying_questions: string[];
  last_adapter_operation:
    | 'intent_parse'
    | 'search_catalog'
    | 'select_offer'
    | 'prepare_checkout'
    | 'confirm_order'
    | 'get_order_status'
    | 'cancel_order'
    | 'create_support_case'
    | 'get_support_case_status'
    | null;
  browser_state: BuyerBrowserState;
  post_order_context: {
    latest_order_id: string | null;
    latest_support_case_id: string | null;
  };
}

export interface BuyerClientPatch {
  patch_type: 'replace_cart' | 'upsert_order' | 'upsert_support_case';
  cart_session?: BuyerCartSessionSnapshot;
  order?: BuyerOrderRecord;
  support_case?: BuyerSupportCase;
}

export type AgentStreamEvent =
  | { type: 'init'; session_id: string; sdk_session_id: string | null; mode: SessionMode }
  | { type: 'assistant_delta'; content: string; timestamp: number }
  | { type: 'tool_call'; tool: string; status?: string; timestamp: number }
  | { type: 'tool_result'; tool: string; status?: string; content?: string; timestamp: number }
  | { type: 'session_state'; state: BuyerAgentTaskState; timestamp: number }
  | { type: 'client_patch'; patch: BuyerClientPatch; timestamp: number }
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
