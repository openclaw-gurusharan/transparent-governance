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

export type IdentityProofAudience = 'buyer' | 'seller' | 'flatwatch';

export interface IdentityProofToken {
  token_id: string;
  wallet_address: string;
  audience: IdentityProofAudience;
  purpose: string;
  trust_state: PortfolioTrustState;
  high_trust_eligible: boolean;
  issued_at: string;
  expires_at: string;
  message: string;
}

export interface SignedIdentityProofResult {
  valid: boolean;
  wallet_address: string;
  audience: IdentityProofAudience;
  trust_state?: PortfolioTrustState | null;
  high_trust_eligible: boolean;
  reason: string;
  verified_at: string;
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

async function postJson<T>(url: string, fetchImpl: typeof fetch, body: unknown): Promise<T> {
  const response = await fetchImpl(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Trust API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function encodeBase58(bytes: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let encoded = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded += alphabet[0];
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    encoded += alphabet[digits[index]];
  }
  return encoded;
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

    async issueIdentityProofToken(
      walletAddress: string,
      audience: IdentityProofAudience,
      purpose = 'portfolio_identity_proof',
    ): Promise<IdentityProofToken> {
      const currentFetch = fetchImpl ?? fetch;
      const response = await postJson<{ data: IdentityProofToken }>(
        `${baseUrl}/api/identity/${walletAddress}/proof-token`,
        currentFetch,
        { audience, purpose },
      );
      return response.data;
    },

    async verifySignedIdentityProof(input: {
      tokenId: string;
      walletAddress: string;
      audience: IdentityProofAudience;
      message: string;
      signature: string;
    }): Promise<SignedIdentityProofResult> {
      const currentFetch = fetchImpl ?? fetch;
      const response = await postJson<{ data: SignedIdentityProofResult }>(
        `${baseUrl}/api/identity/proof-token/verify`,
        currentFetch,
        {
          token_id: input.tokenId,
          wallet_address: input.walletAddress,
          audience: input.audience,
          message: input.message,
          signature: input.signature,
        },
      );
      return response.data;
    },
  };
}

export function getSessionWallet(result: SessionValidationResult): string | null {
  return result.valid && result.user ? result.user.wallet_address : null;
}
