# Portfolio Trust Action Policy

Status: active

Owner: workspace governance

Primary producer: `aadhaar-chain`

Consumers: `ondc-buyer`, `ondc-seller`, `flatwatch`, `shared/agent-control-plane`

## Decision

Trust display is informational. Protected actions must be enforced by server-side policy or an auditable control-plane decision.

Downstream apps must use the trust states from `docs/reference/TRUST-CONSUMER-CONTRACT.md`:

- `no_identity`
- `identity_present_unverified`
- `verified`
- `manual_review`
- `revoked_or_blocked`

Only `verified` can unlock high-trust writes by default. `manual_review` may allow reviewer-approved continuation only when an explicit review decision and audit record exist.

## Enforcement Levels

| Level | Meaning | Enforcement |
| --- | --- | --- |
| Public | No identity required. | No trust check. |
| Authenticated | App-local or wallet session required. | Session validation. |
| Trust-aware | Trust state must be visible, but the action remains read-only or low risk. | Trust lookup plus UI messaging. |
| Verified | Requires AadhaarChain trust state `verified`. | Server-side trust policy and audit event. |
| Step-up | Requires `verified` plus an additional approval, admin review, or stronger auth factor. | Server-side trust policy, step-up proof, and audit event. |

If the trust service is unavailable, protected actions must fail closed.

## `ondc-buyer`

Observed route and component surfaces include search, results, product detail, cart, checkout, payment selection, orders, order detail, and agent chat.

| Action | Level | Required behavior |
| --- | --- | --- |
| Search products | Public | No trust gate. |
| View results and product detail | Public | No trust gate; may show verified-seller indicators when available. |
| Add item to cart | Authenticated | Require session or wallet subject when persistence is not local-only. |
| View cart | Authenticated | Require access to the buyer subject/cart. |
| Enter billing or delivery details | Authenticated | Validate session and subject ownership. |
| Select payment method | Trust-aware | Show current trust state and explain elevated-action limits. |
| Standard checkout | Authenticated | Backend must validate session, cart ownership, price quote, and payment intent. |
| High-value checkout | Verified | Backend must require `verified` trust and record wallet, trust state, cart, quote, and order audit fields. |
| Restricted-category checkout | Verified | Backend must require `verified` trust and category-specific policy. |
| Refund request | Verified | Backend must require `verified` trust for high-risk or abuse-prone refunds. |
| Dispute creation | Verified | Backend must require `verified` trust and retain dispute audit state. |
| Payment method changes | Step-up | Require `verified` trust plus payment/session step-up. |
| Account recovery | Step-up | Require `verified` trust plus recovery-specific proof. |
| Buyer agent read-only chat | Trust-aware | Allow read-only mode for non-verified states. |
| Buyer agent commerce writes | Verified | Control plane and backend must reject writes unless trust is `verified`. |

## `ondc-seller`

Observed route and component surfaces include dashboard, catalog, product edit, orders, order detail, config, login, and agent chat.

| Action | Level | Required behavior |
| --- | --- | --- |
| View landing, login, and dashboard shell | Public | No trust gate for static shell. |
| View own catalog and orders | Authenticated | Validate seller session and subject ownership. |
| Draft local catalog item | Authenticated | Allow draft-only state without publishing. |
| Create or edit unpublished product draft | Authenticated | Keep draft isolated from public catalog. |
| Publish product | Verified | Backend must require `verified` trust and audit wallet, product, seller subject, and trust state. |
| Change product price | Verified | Backend must require `verified` trust and retain before/after audit fields. |
| Accept or reject order | Verified | Backend must require `verified` trust and order ownership. |
| Update fulfillment status | Verified | Backend must require `verified` trust for buyer-visible state changes. |
| Change seller profile or support identity | Verified | Backend must require `verified` trust and audit changes. |
| Change subscriber credentials or callback URLs | Step-up | Require `verified` trust plus admin/step-up approval. |
| Change payout or bank configuration | Step-up | Require `verified` trust plus payment/legal step-up. |
| Bulk high-value catalog upload | Step-up | Require `verified` trust plus explicit approval and audit. |
| Seller agent read-only chat | Trust-aware | Allow read-only mode for non-verified states. |
| Seller agent catalog/order writes | Verified | Control plane and backend must reject writes unless trust is `verified`. |

## `flatwatch`

Observed backend and frontend surfaces include dashboard, transactions, receipts, OCR, challenges, audit, admin, auth, notifications, scanner, chat, and control-plane routes.

FlatWatch keeps app-local auth separate from AadhaarChain trust. AadhaarChain trust is used for elevated transparency, evidence, challenge, and agent workflows.

| Action | Level | Required behavior |
| --- | --- | --- |
| View public transparency landing or aggregate dashboard | Public | Do not expose private resident data. |
| Resident dashboard and transaction list | Authenticated | Validate app-local resident session and society membership. |
| Admin transaction management | Authenticated | Validate admin role and society scope. |
| Upload receipt or evidence | Verified | Require app-local auth plus `verified` AadhaarChain trust before pilot use. |
| OCR or receipt matching review | Verified | Require authorized reviewer/admin and audit extraction state. |
| File challenge | Verified | Require app-local auth, `verified` trust, challenged transaction, reason, and audit event. |
| Resolve or reject challenge | Verified | Require admin/reviewer authorization, trust context, decision reason, and audit event. |
| Change roles, society config, or admin settings | Step-up | Require admin auth, `verified` trust where identity-sensitive, and step-up approval. |
| Import payment data or webhook ingestion | Step-up | Require signed integration source, idempotency, and admin approval policy. |
| FlatWatch agent read-only chat | Trust-aware | Allow read-only mode for non-verified states. |
| FlatWatch agent writes | Verified | Control plane and backend must reject writes unless trust is `verified` and app-local role permits it. |

## `shared/agent-control-plane`

| Trust state | Default mode | Write access |
| --- | --- | --- |
| `no_identity` | `read_only` or `blocked` depending on app auth | No writes. |
| `identity_present_unverified` | `read_only` | No writes. |
| `manual_review` | `read_only` | No writes without explicit reviewer-approved continuation. |
| `revoked_or_blocked` | `blocked` or `read_only` with warning | No writes. |
| `verified` | `full` only when runtime and usage policy allow | Writes may proceed through app-specific server policy. |

Every agent capability grant or denial should record:

- app ID
- subject ID
- wallet address
- trust state
- requested capability
- granted capability
- reason
- timestamp
- runtime availability
- usage state

## Required Failure Responses

Protected action failures should distinguish:

- missing identity
- unverified identity
- manual review
- revoked or blocked trust
- trust service unavailable
- app-local authorization failure
- step-up required

Do not collapse these into a generic unauthorized response in user-facing flows.

## Promotion Gates

Before any app claims protected actions are production-ready:

- each protected action must have a server-side trust check
- each protected action must have a policy test for all five trust states
- trust-service failure must fail closed
- audit events must include wallet, subject, action, trust state, timestamp, and outcome
- browser acceptance must confirm the visible blocked/remediation state through the Chrome plugin path
