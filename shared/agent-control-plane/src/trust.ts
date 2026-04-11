import type { PortfolioTrustState } from './contracts.js';

const TRUST_API_URL = process.env.TRUST_API_URL || 'http://127.0.0.1:43101';

interface TrustSurface {
  trust_state: Exclude<PortfolioTrustState, 'no_identity'>;
  high_trust_eligible: boolean;
  state_reason?: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Trust API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchTrustSnapshot(walletAddress: string | null): Promise<{ state: PortfolioTrustState; eligible: boolean; reason: string | null }> {
  if (!walletAddress) {
    return {
      state: 'no_identity',
      eligible: false,
      reason: 'Connect a wallet-backed AadhaarChain identity before using trust-gated flows.'
    };
  }

  try {
    const identityResponse = await fetchJson<{ data: unknown | null }>(`${TRUST_API_URL}/api/identity/${walletAddress}`);
    if (!identityResponse.data) {
      return {
        state: 'no_identity',
        eligible: false,
        reason: 'Create an identity anchor in AadhaarChain before continuing.'
      };
    }

    const trustResponse = await fetchJson<{ data: TrustSurface }>(`${TRUST_API_URL}/api/identity/${walletAddress}/trust`);
    return {
      state: trustResponse.data.trust_state,
      eligible: trustResponse.data.high_trust_eligible,
      reason: trustResponse.data.state_reason ?? null
    };
  } catch (error) {
    return {
      state: 'no_identity',
      eligible: false,
      reason: error instanceof Error ? error.message : 'Trust lookup failed.'
    };
  }
}
