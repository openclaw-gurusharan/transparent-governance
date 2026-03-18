import crypto from 'node:crypto';
import type {
  AgentRuntimeSnapshot,
  AgentStreamEvent,
  BuyerAgentTaskState,
  BuyerBrowserState,
  BuyerCartSessionSnapshot,
  BuyerClientPatch,
  BuyerMoney,
  BuyerOrderRecord,
  BuyerSupportCase,
  CandidateOffer,
  DraftCheckout,
  OfferSelection,
  ShoppingIntent,
  StoredSessionRecord,
  StructuredShoppingTask,
} from './contracts.js';

interface DemoCatalogItem {
  item_id: string;
  title: string;
  description: string;
  provider_id: string;
  provider_name: string;
  category: string;
  keywords: string[];
  unit_price: number;
  rating: number;
  delivery_eta: string;
  payment_modes: string[];
  cancellation_terms: string;
  substitution_policy: string;
}

const DEMO_CATALOG: DemoCatalogItem[] = [
  {
    item_id: 'fresh-apples-1kg',
    title: 'Shimla Apples 1kg',
    description: 'Fresh table apples packed for same-day grocery delivery.',
    provider_id: 'orchard-fresh',
    provider_name: 'Orchard Fresh',
    category: 'fruits',
    keywords: ['apple', 'apples', 'fruit', 'fresh', 'shimla'],
    unit_price: 160,
    rating: 4.7,
    delivery_eta: 'Today by 7:00 PM',
    payment_modes: ['upi'],
    cancellation_terms: 'Cancel any time before packing starts.',
    substitution_policy: 'Allowed only with buyer approval.',
  },
  {
    item_id: 'organic-apples-1kg',
    title: 'Organic Apples 1kg',
    description: 'Certified organic apples for trust-aware produce orders.',
    provider_id: 'earth-basket',
    provider_name: 'Earth Basket',
    category: 'fruits',
    keywords: ['apple', 'apples', 'organic', 'fruit', 'fresh'],
    unit_price: 195,
    rating: 4.8,
    delivery_eta: 'Tomorrow by 9:00 AM',
    payment_modes: ['upi'],
    cancellation_terms: 'Cancel before dispatch without penalty.',
    substitution_policy: 'No substitutions without confirmation.',
  },
  {
    item_id: 'banana-robusta-dozen',
    title: 'Robusta Bananas (12 pcs)',
    description: 'Banana bunch for quick-delivery household orders.',
    provider_id: 'city-greens',
    provider_name: 'City Greens',
    category: 'fruits',
    keywords: ['banana', 'bananas', 'fruit', 'fresh'],
    unit_price: 78,
    rating: 4.5,
    delivery_eta: 'Today by 5:30 PM',
    payment_modes: ['upi'],
    cancellation_terms: 'Cancel before the picker is assigned.',
    substitution_policy: 'Closest ripeness substitute allowed on request.',
  },
  {
    item_id: 'basmati-rice-5kg',
    title: 'Basmati Rice 5kg',
    description: 'Premium long-grain rice suited for pantry refill orders.',
    provider_id: 'verified-pantry',
    provider_name: 'Verified Pantry Co.',
    category: 'grocery',
    keywords: ['rice', 'basmati', 'pantry', 'grocery'],
    unit_price: 640,
    rating: 4.6,
    delivery_eta: 'Tomorrow by 11:00 AM',
    payment_modes: ['upi'],
    cancellation_terms: 'Cancel before the seller accepts the order.',
    substitution_policy: 'No substitutions.',
  },
];

const DELIVERY_FEE = 49;
const TAX_RATE = 0.05;

function money(value: number): BuyerMoney {
  return {
    currency: 'INR',
    value: value.toFixed(2),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeBuyerBrowserState(value: unknown): BuyerBrowserState {
  const record = asObject(value);
  return {
    cart_session: record.cart_session && typeof record.cart_session === 'object'
      ? (record.cart_session as BuyerCartSessionSnapshot)
      : null,
    recent_orders: Array.isArray(record.recent_orders)
      ? (record.recent_orders as BuyerOrderRecord[])
      : [],
    support_cases: Array.isArray(record.support_cases)
      ? (record.support_cases as BuyerSupportCase[])
      : [],
    active_route: typeof record.active_route === 'string' ? record.active_route : null,
  };
}

export function buildBuyerTaskState(context: Record<string, unknown>): BuyerAgentTaskState {
  const record = asObject(context.buyer_task_state);
  const browserState = normalizeBuyerBrowserState(record.browser_state ?? context.browser_state);

  return {
    intent: (record.intent as ShoppingIntent | null) ?? null,
    structured_task: (record.structured_task as StructuredShoppingTask | null) ?? null,
    execution_state:
      (record.execution_state as BuyerAgentTaskState['execution_state'] | undefined) ?? 'idle',
    candidate_results: Array.isArray(record.candidate_results)
      ? (record.candidate_results as CandidateOffer[])
      : [],
    selected_offer: (record.selected_offer as OfferSelection | null) ?? null,
    draft_checkout: (record.draft_checkout as DraftCheckout | null) ?? null,
    final_confirmation: (record.final_confirmation as BuyerAgentTaskState['final_confirmation'] | null) ?? null,
    active_order: (record.active_order as BuyerOrderRecord | null) ?? null,
    support_cases: Array.isArray(record.support_cases)
      ? (record.support_cases as BuyerSupportCase[])
      : browserState.support_cases ?? [],
    clarifying_questions: Array.isArray(record.clarifying_questions)
      ? (record.clarifying_questions as string[])
      : [],
    last_adapter_operation:
      (record.last_adapter_operation as BuyerAgentTaskState['last_adapter_operation'] | null) ?? null,
    browser_state: browserState,
    post_order_context: {
      latest_order_id:
        typeof asObject(record.post_order_context).latest_order_id === 'string'
          ? (asObject(record.post_order_context).latest_order_id as string)
          : browserState.recent_orders?.[0]?.id ?? null,
      latest_support_case_id:
        typeof asObject(record.post_order_context).latest_support_case_id === 'string'
          ? (asObject(record.post_order_context).latest_support_case_id as string)
          : browserState.support_cases?.[0]?.case_id ?? null,
    },
  };
}

export function writeBuyerTaskState(context: Record<string, unknown>, taskState: BuyerAgentTaskState) {
  context.browser_state = taskState.browser_state;
  context.buyer_task_state = taskState;
}

export function mergeBuyerBrowserState(
  context: Record<string, unknown>,
  incomingContext: Record<string, unknown> | undefined,
) {
  if (!incomingContext) {
    return;
  }

  const nextBrowserState = normalizeBuyerBrowserState(incomingContext.browser_state);
  const taskState = buildBuyerTaskState(context);
  taskState.browser_state = {
    cart_session: nextBrowserState.cart_session ?? taskState.browser_state.cart_session ?? null,
    recent_orders: nextBrowserState.recent_orders?.length
      ? nextBrowserState.recent_orders
      : taskState.browser_state.recent_orders ?? [],
    support_cases: nextBrowserState.support_cases?.length
      ? nextBrowserState.support_cases
      : taskState.browser_state.support_cases ?? [],
    active_route: nextBrowserState.active_route ?? taskState.browser_state.active_route ?? null,
  };
  const freshestOrders = taskState.browser_state.recent_orders ?? [];
  const trackedOrderId = taskState.post_order_context.latest_order_id ?? taskState.active_order?.id ?? null;
  if (freshestOrders.length > 0) {
    taskState.active_order =
      freshestOrders.find((order) => order.id === trackedOrderId) ??
      freshestOrders[0] ??
      taskState.active_order;
  }
  if (taskState.browser_state.support_cases?.length) {
    const supportCasesById = new Map(
      [...taskState.support_cases, ...taskState.browser_state.support_cases].map((entry) => [entry.case_id, entry]),
    );
    taskState.support_cases = Array.from(supportCasesById.values()).sort((left, right) =>
      right.created_at.localeCompare(left.created_at),
    );
  }
  writeBuyerTaskState(context, taskState);
}

function extractBudget(prompt: string): number | null {
  const match = prompt.match(/(?:under|below|less than)\s*(?:₹|rs\.?\s*)?(\d{2,5})/i);
  return match ? Number(match[1]) : null;
}

function extractQuantity(prompt: string): number | null {
  const match = prompt.match(/\b(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
}

function extractPreferences(prompt: string): string[] {
  const lowered = prompt.toLowerCase();
  return ['organic', 'fresh', 'cheapest', 'premium', 'same-day']
    .filter((keyword) => lowered.includes(keyword));
}

function extractProductQuery(prompt: string): string | null {
  const lowered = prompt
    .toLowerCase()
    .replace(/\b(buy|order|want|need|please|find|get|me|for|quote|confirm|place|track|cancel|issue|raise|status|my)\b/g, ' ')
    .replace(/\b(\d{1,3})\b/g, ' ')
    .replace(/₹\s*\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return lowered || null;
}

function detectAction(prompt: string): ShoppingIntent['action'] {
  const lowered = prompt.toLowerCase();
  if (/\b(confirm|place order|go ahead|proceed with order)\b/.test(lowered)) {
    return 'confirm';
  }
  if (/\b(cancel|stop order)\b/.test(lowered)) {
    return 'cancel';
  }
  if (/\b(track|where is|status of order|order status)\b/.test(lowered)) {
    return 'track';
  }
  if (/\b(grievance|issue|complaint|damaged|missing|refund)\b/.test(lowered)) {
    return /\b(status|update)\b/.test(lowered) ? 'issue_status' : 'issue';
  }
  if (/\b(status)\b/.test(lowered)) {
    return 'status';
  }
  return 'shop';
}

function parseIntent(prompt: string): ShoppingIntent {
  const lowered = prompt.toLowerCase();
  const action = detectAction(prompt);
  const explicitOrderReference =
    prompt.match(/\b(demo-[a-z0-9-]{6,})\b/i)?.[1] ??
    prompt.match(/\border\s*(?:id|number|#)\s*[:#-]?\s*([a-z0-9]{6,}(?:-[a-z0-9]{2,})*)\b/i)?.[1] ??
    null;
  const issueType: BuyerSupportCase['issue_type'] | null =
    lowered.includes('refund') || lowered.includes('payment')
      ? 'payment'
      : lowered.includes('cancel')
        ? 'cancellation'
        : lowered.includes('damaged') || lowered.includes('missing') || lowered.includes('delivery')
          ? 'post_delivery'
          : lowered.includes('delay') || lowered.includes('late')
            ? 'fulfillment'
            : action === 'issue'
              ? 'other'
              : null;

  return {
    raw_text: prompt,
    action,
    product_query: action === 'shop' ? extractProductQuery(prompt) : null,
    quantity: extractQuantity(prompt),
    budget_max_inr: extractBudget(prompt),
    preferences: extractPreferences(prompt),
    delivery_window: lowered.includes('today') ? 'today' : lowered.includes('tomorrow') ? 'tomorrow' : null,
    order_reference: explicitOrderReference,
    issue_type: issueType,
    issue_description: action === 'issue' ? prompt.trim() : null,
  };
}

function buildStructuredTask(intent: ShoppingIntent): StructuredShoppingTask {
  const missingFields: string[] = [];
  if (!intent.product_query) {
    missingFields.push('product');
  }
  if (!intent.quantity) {
    missingFields.push('quantity');
  }

  return {
    query: intent.product_query ?? '',
    quantity: intent.quantity ?? 1,
    budget_max_inr: intent.budget_max_inr,
    preferences: intent.preferences,
    delivery_window: intent.delivery_window,
    missing_fields: missingFields,
  };
}

function scoreItem(item: DemoCatalogItem, task: StructuredShoppingTask): number {
  const query = task.query.toLowerCase();
  const haystack = `${item.title} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();
  let score = haystack.includes(query) ? 10 : 0;
  if (task.preferences.includes('organic') && item.keywords.includes('organic')) score += 4;
  if (task.preferences.includes('fresh') && item.keywords.includes('fresh')) score += 2;
  if (task.budget_max_inr && item.unit_price * task.quantity <= task.budget_max_inr) score += 3;
  score += item.rating;
  return score;
}

function rankOffers(task: StructuredShoppingTask): CandidateOffer[] {
  return DEMO_CATALOG
    .filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(task.query.toLowerCase());
    })
    .sort((left, right) => scoreItem(right, task) - scoreItem(left, task))
    .map((item) => ({
      candidate_id: `candidate-${item.item_id}`,
      item_id: item.item_id,
      title: item.title,
      provider_id: item.provider_id,
      provider_name: item.provider_name,
      quantity: task.quantity,
      unit_price: money(item.unit_price),
      total_price: money(item.unit_price * task.quantity),
      rating: item.rating,
      delivery_eta: item.delivery_eta,
      payment_modes: item.payment_modes,
      cancellation_terms: item.cancellation_terms,
      substitution_policy: item.substitution_policy,
      ranking_reason:
        task.preferences.length > 0
          ? `Matched ${task.preferences.join(', ')} preference and stayed inside the current buyer brief.`
          : `Best match for "${task.query}" based on relevance, provider quality, and delivery promise.`,
    }));
}

function buildDraftCheckout(offer: CandidateOffer, browserState: BuyerBrowserState): DraftCheckout {
  const subtotal = Number(offer.total_price.value);
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = subtotal + DELIVERY_FEE + tax;
  const buyer = browserState.cart_session?.buyer;
  const missingFields = [
    !buyer?.name ? 'buyer_name' : null,
    !buyer?.email ? 'buyer_email' : null,
    !buyer?.phone ? 'buyer_phone' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    draft_id: `draft-${crypto.randomUUID()}`,
    candidate_id: offer.candidate_id,
    item_title: offer.title,
    quantity: offer.quantity,
    provider_name: offer.provider_name,
    payment_mode: offer.payment_modes[0] ?? 'upi',
    delivery_estimate: offer.delivery_eta,
    cancellation_terms: offer.cancellation_terms,
    substitution_policy: offer.substitution_policy,
    charge_breakup: [
      { title: 'Items', type: 'item', amount: money(subtotal) },
      { title: 'Delivery', type: 'delivery', amount: money(DELIVERY_FEE) },
      { title: 'Tax', type: 'tax', amount: money(tax) },
    ],
    total: money(total),
    expires_at: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
    missing_fields: missingFields,
    ready_for_confirmation: missingFields.length === 0,
  };
}

function buildCartPatch(task: StructuredShoppingTask, offer: CandidateOffer, browserState: BuyerBrowserState): BuyerClientPatch {
  return {
    patch_type: 'replace_cart',
    cart_session: {
      session_id: browserState.cart_session?.session_id ?? 'session-agent-buyer',
      items: [{
        item_id: offer.item_id,
        title: offer.title,
        quantity: task.quantity,
        unit_price: offer.unit_price,
        provider_name: offer.provider_name,
      }],
      buyer: browserState.cart_session?.buyer,
    },
  };
}

function buildOrderFromDraft(
  draft: DraftCheckout,
  offer: CandidateOffer,
): BuyerOrderRecord {
  const now = new Date().toISOString();
  return {
    id: `demo-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
    status: 'created',
    createdAt: now,
    updatedAt: now,
    provider: {
      id: offer.provider_id,
      name: offer.provider_name,
      verified: true,
    },
    items: [{
      id: offer.item_id,
      name: offer.title,
      quantity: offer.quantity,
      price: offer.unit_price,
    }],
    quote: {
      total: draft.total,
      breakup: draft.charge_breakup.map((entry) => ({
        title: entry.title,
        type: entry.type,
        price: entry.amount,
      })),
    },
    fulfillment: {
      type: 'delivery',
      status: 'pending',
      providerName: 'Local Demo Logistics',
      estimatedTime: {
        start: now,
        end: new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString(),
      },
      tracking: {
        status: 'pending',
        statusMessage: `Order created with ${offer.provider_name}. Awaiting seller acceptance.`,
      },
    },
    payment: {
      type: 'upi',
      status: 'NOT-PAID',
      amount: draft.total,
    },
  };
}

function buildCancelledOrder(order: BuyerOrderRecord): BuyerOrderRecord {
  const cancelledAt = new Date().toISOString();
  return {
    ...order,
    status: 'cancelled',
    updatedAt: cancelledAt,
    fulfillment: {
      ...order.fulfillment,
      status: 'cancelled',
      tracking: {
        status: 'cancelled',
        statusMessage: 'The buyer cancelled this order before fulfillment completed.',
      },
    },
    payment: {
      ...order.payment,
      status: 'failed',
    },
    cancellation: {
      cancelledBy: 'buyer',
      reason: 'Buyer requested cancellation',
      cancelledAt,
      refund: {
        amount: order.payment.amount,
        status: 'pending',
      },
    },
  };
}

function createSupportCase(order: BuyerOrderRecord, intent: ShoppingIntent): BuyerSupportCase {
  const now = new Date().toISOString();
  return {
    case_id: `case-${crypto.randomUUID().slice(0, 8)}`,
    order_id: order.id,
    issue_type: intent.issue_type ?? 'other',
    description: intent.issue_description ?? intent.raw_text,
    evidence_links: [],
    network_case_id: `ondc-case-${crypto.randomUUID().slice(0, 10)}`,
    status: 'open',
    created_at: now,
    updated_at: now,
    resolution_note: null,
  };
}

function findRelevantOrder(taskState: BuyerAgentTaskState, intent: ShoppingIntent): BuyerOrderRecord | null {
  const allOrders = [
    ...(taskState.browser_state.recent_orders ?? []),
    ...(taskState.active_order ? [taskState.active_order] : []),
  ];
  if (intent.order_reference) {
    return allOrders.find((order) => order.id.includes(intent.order_reference!)) ?? null;
  }
  return allOrders[0] ?? taskState.active_order ?? null;
}

function summarizeOffers(task: StructuredShoppingTask, offers: CandidateOffer[]): string {
  const summary = offers
    .slice(0, 3)
    .map((offer, index) => `${index + 1}. ${offer.title} from ${offer.provider_name} at INR ${offer.total_price.value}`)
    .join('\n');

  return [
    `I found ${offers.length} candidate offer${offers.length === 1 ? '' : 's'} for ${task.quantity} ${task.query}.`,
    summary,
    '',
    'I prepared the top-ranked option as a draft checkout. Review the draft and reply with "confirm order" when you want me to place it.',
  ].join('\n');
}

function summarizeOrder(order: BuyerOrderRecord): string {
  return [
    `Order ${order.id} is currently ${order.status}.`,
    `Provider: ${order.provider.name}.`,
    `Tracking: ${order.fulfillment.tracking.statusMessage}`,
    `Total: INR ${order.quote.total.value}.`,
  ].join('\n');
}

function summarizeSupportCases(cases: BuyerSupportCase[]): string {
  if (cases.length === 0) {
    return 'No active buyer grievance cases are linked to this session yet.';
  }

  return cases
    .map((supportCase) => `${supportCase.case_id}: ${supportCase.issue_type} is ${supportCase.status} on order ${supportCase.order_id}.`)
    .join('\n');
}

function canMutate(runtimeSnapshot: AgentRuntimeSnapshot) {
  return runtimeSnapshot.mode === 'full' && runtimeSnapshot.trust_state === 'verified';
}

export async function* streamBuyerOrchestration(
  session: StoredSessionRecord,
  prompt: string,
  runtimeSnapshot: AgentRuntimeSnapshot,
): AsyncGenerator<AgentStreamEvent> {
  const taskState = buildBuyerTaskState(session.context);
  const now = Date.now();
  yield {
    type: 'session_state',
    state: taskState,
    timestamp: now,
  };

  const intent = parseIntent(prompt);
  taskState.intent = intent;
  taskState.last_adapter_operation = 'intent_parse';
  taskState.clarifying_questions = [];
  yield {
    type: 'tool_call',
    tool: 'intent_parse',
    status: 'completed',
    timestamp: Date.now(),
  };

  if (intent.action === 'shop') {
    const structuredTask = buildStructuredTask(intent);
    taskState.structured_task = structuredTask;
    if (structuredTask.missing_fields.length > 0) {
      taskState.execution_state = 'needs_clarification';
      taskState.clarifying_questions = structuredTask.missing_fields.map((field) =>
        field === 'quantity'
          ? 'How many units should I buy?'
          : 'What exact item should I look for on ONDC?',
      );
      writeBuyerTaskState(session.context, taskState);
      yield {
        type: 'session_state',
        state: taskState,
        timestamp: Date.now(),
      };
      yield {
        type: 'result',
        content: `I can continue once you clarify the missing details:\n- ${taskState.clarifying_questions.join('\n- ')}`,
        timestamp: Date.now(),
      };
      return;
    }

    yield {
      type: 'tool_call',
      tool: 'search_catalog',
      status: 'running',
      timestamp: Date.now(),
    };

    const offers = rankOffers(structuredTask);
    taskState.last_adapter_operation = 'search_catalog';
    taskState.candidate_results = offers;

    if (offers.length === 0) {
      taskState.execution_state = 'search_ready';
      writeBuyerTaskState(session.context, taskState);
      yield {
        type: 'session_state',
        state: taskState,
        timestamp: Date.now(),
      };
      yield {
        type: 'result',
        content: `I could not find a deterministic local ONDC demo match for "${structuredTask.query}". Try another product name or loosen the brief.`,
        timestamp: Date.now(),
      };
      return;
    }

    const selectedOffer = offers[0];
    taskState.selected_offer = {
      candidate_id: selectedOffer.candidate_id,
      selected_at: new Date().toISOString(),
      reason: selectedOffer.ranking_reason,
    };
    taskState.last_adapter_operation = 'select_offer';
    taskState.draft_checkout = buildDraftCheckout(selectedOffer, taskState.browser_state);
    taskState.execution_state = 'awaiting_confirmation';
    writeBuyerTaskState(session.context, taskState);

    yield {
      type: 'tool_result',
      tool: 'search_catalog',
      status: 'completed',
      content: `${offers.length} candidate offers normalized into buyer state.`,
      timestamp: Date.now(),
    };
    yield {
      type: 'client_patch',
      patch: buildCartPatch(structuredTask, selectedOffer, taskState.browser_state),
      timestamp: Date.now(),
    };
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: summarizeOffers(structuredTask, offers),
      timestamp: Date.now(),
    };
    return;
  }

  if (intent.action === 'confirm') {
    taskState.last_adapter_operation = 'confirm_order';
    if (!taskState.draft_checkout || !taskState.selected_offer) {
      yield {
        type: 'result',
        content: 'There is no draft checkout ready yet. Ask me to find an item first, for example: "buy 5 apples".',
        timestamp: Date.now(),
      };
      return;
    }
    if (!canMutate(runtimeSnapshot)) {
      yield {
        type: 'result',
        content: runtimeSnapshot.blocked_reason ?? 'Trust verification is still required before I can place an order.',
        timestamp: Date.now(),
      };
      return;
    }
    if (!taskState.draft_checkout.ready_for_confirmation) {
      yield {
        type: 'result',
        content: `The draft checkout is missing buyer details: ${taskState.draft_checkout.missing_fields.join(', ')}. Complete billing information in the manual checkout flow or refresh your cart context and try again.`,
        timestamp: Date.now(),
      };
      return;
    }

    const offer = taskState.candidate_results.find(
      (candidate) => candidate.candidate_id === taskState.draft_checkout?.candidate_id,
    );
    if (!offer) {
      yield {
        type: 'result',
        content: 'The selected offer is no longer available in session state. Search again before confirming.',
        timestamp: Date.now(),
      };
      return;
    }

    const order = buildOrderFromDraft(taskState.draft_checkout, offer);
    taskState.final_confirmation = {
      confirmed_by_subject_id: session.subject_id,
      confirmed_at: new Date().toISOString(),
      confirmation_note: intent.raw_text,
    };
    taskState.selected_offer = null;
    taskState.draft_checkout = null;
    taskState.active_order = order;
    taskState.execution_state = 'order_confirmed';
    taskState.post_order_context.latest_order_id = order.id;
    taskState.browser_state.recent_orders = [order, ...(taskState.browser_state.recent_orders ?? [])];
    writeBuyerTaskState(session.context, taskState);

    yield {
      type: 'client_patch',
      patch: {
        patch_type: 'upsert_order',
        order,
      },
      timestamp: Date.now(),
    };
    yield {
      type: 'client_patch',
      patch: {
        patch_type: 'replace_cart',
        cart_session: {
          session_id: taskState.browser_state.cart_session?.session_id ?? 'session-agent-buyer',
          items: [],
          buyer: taskState.browser_state.cart_session?.buyer,
        },
      },
      timestamp: Date.now(),
    };
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: `Confirmed. I placed order ${order.id} with ${order.provider.name} for INR ${order.quote.total.value}. You can now track it, cancel it, or raise an issue from the agent or the orders view.`,
      timestamp: Date.now(),
    };
    return;
  }

  if (intent.action === 'track' || intent.action === 'status') {
    taskState.last_adapter_operation = 'get_order_status';
    const order = findRelevantOrder(taskState, intent);
    if (!order) {
      yield {
        type: 'result',
        content: 'No order context is loaded yet. Place an order or sync recent orders before asking for status.',
        timestamp: Date.now(),
      };
      return;
    }
    taskState.active_order = order;
    taskState.post_order_context.latest_order_id = order.id;
    writeBuyerTaskState(session.context, taskState);
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: summarizeOrder(order),
      timestamp: Date.now(),
    };
    return;
  }

  if (intent.action === 'cancel') {
    taskState.last_adapter_operation = 'cancel_order';
    if (!canMutate(runtimeSnapshot)) {
      yield {
        type: 'result',
        content: runtimeSnapshot.blocked_reason ?? 'Trust verification is still required before I can cancel an order.',
        timestamp: Date.now(),
      };
      return;
    }
    const order = findRelevantOrder(taskState, intent);
    if (!order) {
      yield {
        type: 'result',
        content: 'I could not identify which order to cancel. Mention the order id or ask for your latest order status first.',
        timestamp: Date.now(),
      };
      return;
    }
    if (['cancelled', 'delivered', 'returned'].includes(order.status)) {
      yield {
        type: 'result',
        content: `Order ${order.id} is already ${order.status} and cannot be cancelled from this flow.`,
        timestamp: Date.now(),
      };
      return;
    }
    const cancelledOrder = buildCancelledOrder(order);
    taskState.active_order = cancelledOrder;
    taskState.browser_state.recent_orders = (taskState.browser_state.recent_orders ?? []).map((entry) =>
      entry.id === cancelledOrder.id ? cancelledOrder : entry,
    );
    writeBuyerTaskState(session.context, taskState);
    yield {
      type: 'client_patch',
      patch: {
        patch_type: 'upsert_order',
        order: cancelledOrder,
      },
      timestamp: Date.now(),
    };
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: `Order ${cancelledOrder.id} is now cancelled. Refund status is pending against the original payment amount of INR ${cancelledOrder.payment.amount.value}.`,
      timestamp: Date.now(),
    };
    return;
  }

  if (intent.action === 'issue') {
    taskState.last_adapter_operation = 'create_support_case';
    if (!canMutate(runtimeSnapshot)) {
      yield {
        type: 'result',
        content: runtimeSnapshot.blocked_reason ?? 'Trust verification is still required before I can raise a grievance.',
        timestamp: Date.now(),
      };
      return;
    }
    const order = findRelevantOrder(taskState, intent);
    if (!order) {
      yield {
        type: 'result',
        content: 'I need an order context before I can raise a grievance. Ask for your latest order status first or mention the order id.',
        timestamp: Date.now(),
      };
      return;
    }
    const supportCase = createSupportCase(order, intent);
    taskState.support_cases = [supportCase, ...taskState.support_cases];
    taskState.execution_state = 'support_active';
    taskState.post_order_context.latest_support_case_id = supportCase.case_id;
    taskState.browser_state.support_cases = [supportCase, ...(taskState.browser_state.support_cases ?? [])];
    writeBuyerTaskState(session.context, taskState);
    yield {
      type: 'client_patch',
      patch: {
        patch_type: 'upsert_support_case',
        support_case: supportCase,
      },
      timestamp: Date.now(),
    };
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: `Raised grievance ${supportCase.network_case_id} for order ${order.id}. I classified it as ${supportCase.issue_type} and marked it open for follow-up.`,
      timestamp: Date.now(),
    };
    return;
  }

  if (intent.action === 'issue_status') {
    taskState.last_adapter_operation = 'get_support_case_status';
    writeBuyerTaskState(session.context, taskState);
    yield {
      type: 'session_state',
      state: taskState,
      timestamp: Date.now(),
    };
    yield {
      type: 'result',
      content: summarizeSupportCases(taskState.support_cases),
      timestamp: Date.now(),
    };
    return;
  }

  writeBuyerTaskState(session.context, taskState);
  yield {
    type: 'session_state',
    state: taskState,
    timestamp: Date.now(),
  };
  yield {
    type: 'result',
    content: 'I can help with shopping, confirming a draft checkout, tracking orders, cancelling orders, and raising ONDC buyer grievances. Try: "buy 5 apples".',
    timestamp: Date.now(),
  };
}
