export type PortfolioTrustState =
  | 'no_identity'
  | 'identity_present_unverified'
  | 'verified'
  | 'manual_review'
  | 'revoked_or_blocked';

export interface TrustVerificationSummary {
  document_type: 'aadhaar' | 'pan';
  verification_id: string;
  workflow_status: 'pending' | 'processing' | 'verified' | 'failed' | 'manual_review';
  decision?: 'approve' | 'reject' | 'manual_review' | null;
  reason?: string | null;
}

export interface TrustSurface {
  trust_version: 'v1';
  wallet_address: string;
  did: string;
  verification_bitmap: number;
  updated_at: string;
  trust_state: PortfolioTrustState;
  high_trust_eligible: boolean;
  state_reason?: string | null;
  verifications: TrustVerificationSummary[];
}

export interface TrustSnapshot {
  state: PortfolioTrustState;
  eligible: boolean;
  reason: string | null;
  trust: TrustSurface | null;
}

export interface SSOUser {
  wallet_address: string;
  pda_address?: string;
  owner_pubkey?: string;
  created_at: number;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: SSOUser;
}

export interface LoginResult {
  user: SSOUser;
  session: {
    session_id: number;
    created_at: number;
    last_active: number;
    expires_at: number;
  };
}

export interface TrustClientOptions {
  trustApiUrl: string;
  fetchImpl?: typeof fetch;
}

export interface TrustStateMeta {
  label: string;
  buyerActionMessage: string;
}

export const TRUST_STATE_META: Record<PortfolioTrustState, TrustStateMeta> = {
  no_identity: {
    label: 'No identity',
    buyerActionMessage: 'Create an identity anchor in AadhaarChain before you attempt checkout.',
  },
  identity_present_unverified: {
    label: 'Unverified',
    buyerActionMessage: 'Complete AadhaarChain verification before you attempt checkout.',
  },
  verified: {
    label: 'Verified',
    buyerActionMessage: '',
  },
  manual_review: {
    label: 'Manual review',
    buyerActionMessage:
      'Verification is under manual review. Elevated commerce actions stay paused until review completes.',
  },
  revoked_or_blocked: {
    label: 'Blocked',
    buyerActionMessage:
      'Your trust state is blocked or revoked. Review AadhaarChain before attempting elevated actions.',
  },
};

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Trust API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createTrustClient({ trustApiUrl, fetchImpl }: TrustClientOptions) {
  const baseUrl = trustApiUrl.replace(/\/+$/, '');

  return {
    async fetchTrustSnapshot(walletAddress: string): Promise<TrustSnapshot> {
      const currentFetch = fetchImpl ?? fetch;
      if (!walletAddress) {
        return {
          state: 'no_identity',
          eligible: false,
          reason: 'Connect a wallet-backed AadhaarChain identity before using trust-gated flows.',
          trust: null,
        };
      }

      const identityResponse = await fetchJson<{ data: unknown | null }>(
        `${baseUrl}/api/identity/${walletAddress}`,
        currentFetch,
      );

      if (!identityResponse.data) {
        return {
          state: 'no_identity',
          eligible: false,
          reason: 'Create an identity anchor in AadhaarChain before continuing.',
          trust: null,
        };
      }

      const trustResponse = await fetchJson<{ data: TrustSurface }>(
        `${baseUrl}/api/identity/${walletAddress}/trust`,
        currentFetch,
      );
      const trust = trustResponse.data;

      return {
        state: trust.trust_state,
        eligible: trust.high_trust_eligible,
        reason: trust.state_reason ?? null,
        trust,
      };
    },
  };
}

export function getSessionWallet(result: SessionValidationResult): string | null {
  return result.valid && result.user ? result.user.wallet_address : null;
}
