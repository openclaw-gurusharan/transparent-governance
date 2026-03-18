const TRUST_API_URL = process.env.TRUST_API_URL || 'http://127.0.0.1:8000';
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Trust API request failed: ${response.status}`);
    }
    return response.json();
}
export async function fetchTrustSnapshot(walletAddress) {
    if (!walletAddress) {
        return {
            state: 'no_identity',
            eligible: false,
            reason: 'Connect a wallet-backed AadhaarChain identity before using trust-gated flows.'
        };
    }
    try {
        const identityResponse = await fetchJson(`${TRUST_API_URL}/api/identity/${walletAddress}`);
        if (!identityResponse.data) {
            return {
                state: 'no_identity',
                eligible: false,
                reason: 'Create an identity anchor in AadhaarChain before continuing.'
            };
        }
        const trustResponse = await fetchJson(`${TRUST_API_URL}/api/identity/${walletAddress}/trust`);
        return {
            state: trustResponse.data.trust_state,
            eligible: trustResponse.data.high_trust_eligible,
            reason: trustResponse.data.state_reason ?? null
        };
    }
    catch (error) {
        return {
            state: 'no_identity',
            eligible: false,
            reason: error instanceof Error ? error.message : 'Trust lookup failed.'
        };
    }
}
