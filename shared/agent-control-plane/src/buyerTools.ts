import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { PortfolioTrustState, StoredSessionRecord } from './contracts.js';

const BUYER_TOOL_SERVER_NAME = 'buyer_commerce';
const MAX_CATALOG_SEARCH_RESULTS = 6;
const MAX_RECENT_ORDER_RESULTS = 5;
interface BuyerCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  provider: string;
}

interface BuyerCartSummary {
  session_id: string;
  item_count: number;
  subtotal: string;
  items: Array<{
    item_id: string;
    name: string;
    quantity: number;
    price: string;
  }>;
  buyer_profile_ready: boolean;
}

interface BuyerOrderSummary {
  total: number;
  recent: Array<{
    id: string;
    status: string;
    total: string;
    provider_name: string;
    created_at: string;
  }>;
}

interface BuyerSnapshot {
  route?: {
    path?: string;
    search?: string;
  };
  trust?: {
    state?: PortfolioTrustState;
    write_enabled?: boolean;
  };
  catalog?: {
    total_items?: number;
    items?: BuyerCatalogItem[];
  };
  cart?: BuyerCartSummary;
  orders?: BuyerOrderSummary;
}

function safeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isPortfolioTrustState(value: string): value is PortfolioTrustState {
  return (
    value === 'no_identity' ||
    value === 'identity_present_unverified' ||
    value === 'verified' ||
    value === 'manual_review' ||
    value === 'revoked_or_blocked'
  );
}

function safeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function parseTrustState(value: unknown, fallback: PortfolioTrustState): PortfolioTrustState {
  const candidate = safeString(value);
  return isPortfolioTrustState(candidate) ? candidate : fallback;
}

function parseBuyerSnapshot(session: StoredSessionRecord): BuyerSnapshot {
  const candidate = safeRecord(session.context?.buyer_snapshot);
  if (!candidate) {
    return {};
  }

  const route = safeRecord(candidate.route);
  const trust = safeRecord(candidate.trust);
  const catalog = safeRecord(candidate.catalog);
  const cart = safeRecord(candidate.cart);
  const orders = safeRecord(candidate.orders);

  return {
    route: route
      ? {
          path: safeString(route.path),
          search: safeString(route.search),
        }
      : undefined,
    trust: trust
      ? {
          state: parseTrustState(trust.state, session.trust_state),
          write_enabled: safeBoolean(trust.write_enabled, session.trust_state === 'verified'),
        }
      : {
          state: session.trust_state,
          write_enabled: session.trust_state === 'verified',
        },
    catalog: catalog
      ? {
          total_items: safeNumber(catalog.total_items),
          items: Array.isArray(catalog.items)
            ? catalog.items
                .map((entry) => {
                  const item = safeRecord(entry);
                  if (!item) return null;
                  const id = safeString(item.id);
                  if (!id) return null;
                  return {
                    id,
                    name: safeString(item.name),
                    description: safeString(item.description),
                    category: safeString(item.category),
                    price: safeString(item.price),
                    provider: safeString(item.provider),
                  };
                })
                .filter((item): item is BuyerCatalogItem => item !== null)
            : [],
        }
      : {
          total_items: 0,
          items: [],
        },
    cart: cart
      ? {
          session_id: safeString(cart.session_id),
          item_count: safeNumber(cart.item_count),
          subtotal: safeString(cart.subtotal),
          items: Array.isArray(cart.items)
            ? cart.items
                .map((entry) => {
                  const item = safeRecord(entry);
                  if (!item) return null;
                  const itemId = safeString(item.item_id);
                  if (!itemId) return null;
                  return {
                    item_id: itemId,
                    name: safeString(item.name),
                    quantity: safeNumber(item.quantity, 1),
                    price: safeString(item.price),
                  };
                })
                .filter((item): item is BuyerCartSummary['items'][number] => item !== null)
            : [],
          buyer_profile_ready: safeBoolean(cart.buyer_profile_ready),
        }
      : undefined,
    orders: orders
      ? {
          total: safeNumber(orders.total),
          recent: Array.isArray(orders.recent)
            ? orders.recent
                .map((entry) => {
                  const item = safeRecord(entry);
                  if (!item) return null;
                  const id = safeString(item.id);
                  if (!id) return null;
                  return {
                    id,
                    status: safeString(item.status),
                    total: safeString(item.total),
                    provider_name: safeString(item.provider_name),
                    created_at: safeString(item.created_at),
                  };
                })
                .filter((item): item is BuyerOrderSummary['recent'][number] => item !== null)
            : [],
        }
      : undefined,
  };
}

function asToolText(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload),
      },
    ],
  };
}

function findCatalogItem(snapshot: BuyerSnapshot, itemId: string) {
  return snapshot.catalog?.items?.find((item) => item.id === itemId) ?? null;
}

export function buildBuyerToolRuntime(session: StoredSessionRecord) {
  const snapshot = parseBuyerSnapshot(session);

  const server = createSdkMcpServer({
    name: BUYER_TOOL_SERVER_NAME,
    version: '1.0.0',
    tools: [
      tool(
        'search_catalog',
        'Search the current ONDC Buyer catalog snapshot for matching items by query and optional category.',
        {
          query: z.string().min(1).describe('Search query from the buyer request'),
          category: z.string().optional().describe('Optional category lane like grocery or electronics'),
        },
        async (args) => {
          const query = args.query.trim().toLowerCase();
          const category = args.category?.trim().toLowerCase();
          const matches = (snapshot.catalog?.items ?? []).filter((item) => {
            const haystack = `${item.name} ${item.description} ${item.provider} ${item.category}`.toLowerCase();
            const queryMatch = !query || haystack.includes(query);
            const categoryMatch = !category || item.category.toLowerCase() === category;
            return queryMatch && categoryMatch;
          });

          return asToolText({
            route: snapshot.route?.path ?? '/agent',
            total_matches: matches.length,
            items: matches.slice(0, MAX_CATALOG_SEARCH_RESULTS),
          });
        },
      ),
      tool(
        'get_product_detail',
        'Get detailed information for a single buyer catalog item from the current snapshot.',
        {
          item_id: z.string().min(1).describe('Catalog item identifier'),
        },
        async (args) => {
          const item = findCatalogItem(snapshot, args.item_id);
          return asToolText({
            found: Boolean(item),
            item,
          });
        },
      ),
      tool(
        'get_cart_state',
        'Return the buyer cart summary from the current browser snapshot.',
        {},
        async () => asToolText(snapshot.cart ?? { session_id: '', item_count: 0, subtotal: 'INR 0.00', items: [], buyer_profile_ready: false }),
      ),
      tool(
        'get_order_status',
        'Return recent buyer order summary or a specific order if an order id is provided.',
        {
          order_id: z.string().optional().describe('Optional order id to inspect'),
        },
        async (args) => {
          const orders = snapshot.orders?.recent ?? [];
          const match = args.order_id ? orders.find((order) => order.id === args.order_id) ?? null : null;
          return asToolText(
            args.order_id
              ? { found: Boolean(match), order: match }
              : { total: snapshot.orders?.total ?? 0, recent: orders.slice(0, MAX_RECENT_ORDER_RESULTS) },
          );
        },
      ),
      tool(
        'get_checkout_guidance',
        'Explain whether checkout can proceed based on trust state, cart contents, and buyer profile readiness.',
        {},
        async () => {
          const itemCount = snapshot.cart?.item_count ?? 0;
          const writeEnabled = snapshot.trust?.write_enabled ?? session.trust_state === 'verified';
          const buyerProfileReady = snapshot.cart?.buyer_profile_ready ?? false;

          return asToolText({
            trust_state: snapshot.trust?.state ?? session.trust_state,
            write_enabled: writeEnabled,
            cart_item_count: itemCount,
            buyer_profile_ready: buyerProfileReady,
            checkout_ready: writeEnabled && itemCount > 0,
            guidance: !writeEnabled
              ? 'Trust is not verified yet. Recommend buyer guidance and trust resolution instead of checkout navigation.'
              : itemCount === 0
                ? 'Cart is empty. Add an item before navigating to checkout.'
                : buyerProfileReady
                  ? 'Checkout can proceed. A navigate action to /checkout is allowed.'
                  : 'Checkout route can be opened, but the buyer profile still needs billing details before order submission.',
          });
        },
      ),
    ],
  });

  return {
    mcpServer: server,
    allowedTools: [
      `mcp__${BUYER_TOOL_SERVER_NAME}__search_catalog`,
      `mcp__${BUYER_TOOL_SERVER_NAME}__get_product_detail`,
      `mcp__${BUYER_TOOL_SERVER_NAME}__get_cart_state`,
      `mcp__${BUYER_TOOL_SERVER_NAME}__get_order_status`,
      `mcp__${BUYER_TOOL_SERVER_NAME}__get_checkout_guidance`,
    ],
  };
}
