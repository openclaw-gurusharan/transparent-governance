# Portfolio Vercel Deployment Reference

Use this reference when you need the current portfolio deployment inventory, domain mapping, and required env/runtime configuration.

Companion runbook:

- `docs/workflow/portfolio-vercel-deployment-control-plane.md`

## Current Frontend Hosting Inventory

| App | Vercel project | Project ID | Current production alias | Custom domain target | Current status |
|---|---|---|---|---|---|
| AadhaarChain frontend | `aadhaar-chain-frontend` | `prj_nA1cNZwKzOp1Rv5zFGnm2EQvOTTx` | `https://aadhaar-chain-frontend.vercel.app` | `aadharcha.in`, `www.aadharcha.in` | deployed |
| FlatWatch frontend | `flatwatch-frontend` | `prj_gvQAAgxTcVbvoGqCrkUsfZgA1q9o` | `https://flatwatch-frontend.vercel.app` | `flatwatch.aadharcha.in` | deployed |
| ONDC Buyer | `ondc-buyer` | `prj_0xIVM1vE4H0VPH7Q11o2qbWBBF9R` | `https://ondc-buyer.vercel.app` | `ondcbuyer.aadharcha.in` | deployed in public read-only mode |
| ONDC Seller | `ondc-seller` | `prj_Vkje6TU6kdPFtVVm0PQxkP5BjTSd` | `https://ondc-seller.vercel.app` | `ondcseller.aadharcha.in` | deployed in public read-only mode |

Vercel team / scope:

- `ingpocs-projects`

## Current DNS Contract

Authoritative DNS provider:

- GoDaddy

Current web record targets:

| Host | Type | Required value |
|---|---|---|
| `@` | `A` | `76.76.21.21` |
| `www` | `A` | `76.76.21.21` |
| `flatwatch` | `A` | `76.76.21.21` |
| `ondcbuyer` | `A` | `76.76.21.21` |
| `ondcseller` | `A` | `76.76.21.21` |

DNS records that must be preserved:

- `MX` for GoDaddy email
- `email` CNAME
- `secureserver1._domainkey`
- `secureserver2._domainkey`
- SPF / DMARC TXT records
- `_domainconnect`

## Critical GoDaddy Learning

`aadharcha.in` previously had GoDaddy domain forwarding enabled. That forwarding created readonly apex `A` records and blocked a clean Vercel apex cutover.

Required fix sequence for apex changes:

1. remove GoDaddy domain forwarding
2. verify the forwarding-owned readonly apex `A` records are gone
3. update the remaining editable apex `A` record

Do not skip that sequence.

## Frontend Environment Matrix

### AadhaarChain frontend

Working directory:

- `aadhaar-chain/frontend`

Required production envs:

| Variable | Required value now |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://identity-aadhar-gateway-main.onrender.com` |

Relevant files:

- `aadhaar-chain/frontend/vercel.json`
- `aadhaar-chain/frontend/.env.production.example`

### FlatWatch frontend

Working directory:

- `flatwatch/frontend`

Required production envs:

| Variable | Required value now |
|---|---|
| `NEXT_PUBLIC_TRUST_API_URL` | `https://identity-aadhar-gateway-main.onrender.com` |
| `NEXT_PUBLIC_IDENTITY_WEB_URL` | `https://aadharcha.in` |

Current live dependency note:

- the deployed FlatWatch frontend keeps browser requests same-origin on `flatwatch.aadharcha.in` and Vercel preview hosts via `flatwatch/frontend/src/lib/apiBase.ts`
- `flatwatch/frontend/vercel.json` rewrites `/api/:path*` to `https://flatwatch-api.onrender.com/api/:path*`
- `flatwatch/frontend/src/lib/trust.ts` must resolve trust reads to `https://identity-aadhar-gateway-main.onrender.com` in deployed mode; localhost `43101` is only valid for local development
- do not restore `NEXT_PUBLIC_API_URL` as a Vercel secret reference; the old `@flatwatch-api-url` secret does not exist and breaks production deploys
- the deployed FlatWatch frontend is only operational if `https://flatwatch-api.onrender.com` is up and serving `/api/auth/*` plus the transaction endpoints
- when that host is down or unreachable, users see the exact message: `FlatWatch backend unavailable at https://flatwatch.aadharcha.in. Start the local API and try again.`
- this behavior comes from:
  - `flatwatch/frontend/src/lib/auth.tsx`
  - `flatwatch/frontend/src/lib/api.ts`
  - `flatwatch/frontend/src/lib/apiBase.ts`

Relevant files:

- `flatwatch/frontend/vercel.json`
- `flatwatch/frontend/.env.production.example`

### ONDC Buyer

Working directory:

- `ondc-buyer`

Required production envs:

| Variable | Required value now |
|---|---|
| `VITE_IDENTITY_URL` | `https://identity-aadhar-gateway-main.onrender.com` |
| `VITE_IDENTITY_WEB_URL` | `https://aadharcha.in` |
| `VITE_COMMERCE_DEMO_MODE` | `true` until a real commerce backend exists |
| `VITE_AGENT_RUNTIME_ENABLED` | `false` for the current public deployment; set to `true` only after a real shared control plane exists |
| `VITE_AGENT_CONTROL_PLANE_URL` | not required while runtime is disabled; required before agent-enabled production |

Relevant files:

- `ondc-buyer/vercel.json`
- `ondc-buyer/.env.example`

### ONDC Seller

Working directory:

- `ondc-seller`

Required production envs:

| Variable | Required value now |
|---|---|
| `VITE_IDENTITY_URL` | `https://identity-aadhar-gateway-main.onrender.com` |
| `VITE_IDENTITY_WEB_URL` | `https://aadharcha.in` |
| `VITE_COMMERCE_DEMO_MODE` | `true` until a real commerce backend exists |
| `VITE_AGENT_RUNTIME_ENABLED` | `false` for the current public deployment; set to `true` only after a real shared control plane exists |
| `VITE_AGENT_CONTROL_PLANE_URL` | not required while runtime is disabled; required before agent-enabled production |

Relevant files:

- `ondc-seller/vercel.json`
- `ondc-seller/.env.example`

## Backend / Control-Plane Runtime Matrix

These hosts stay separate from the public Vercel frontends.

| Service | Code location | Current public host | Required deployed auth policy |
|---|---|---|---|
| Aadhaar gateway | `aadhaar-chain/gateway` | `https://identity-aadhar-gateway-main.onrender.com` | `CLAUDE_AGENT_ALLOW_DEPLOYED_CLI_AUTH=true` only on a trusted host with Claude Code already authenticated |
| FlatWatch backend | `flatwatch/backend` | `https://flatwatch-api.onrender.com` | `CLAUDE_AGENT_ALLOWED_ORIGINS=https://flatwatch.aadharcha.in`; backend health plus `/api/auth/login` and `/api/auth/verify` must work or the public frontend degrades immediately, even though the browser now reaches it through the frontend's same-origin Vercel rewrite |
| Shared buyer/seller control plane | `shared/agent-control-plane` | not deployed yet | deployed auth must use `ANTHROPIC_API_KEY`, Bedrock, Vertex, or Azure; do not use public Claude.ai OAuth / `local_cli` for this lane |

### Required backend-origin allowlists

| Service | Required browser origins |
|---|---|
| Aadhaar gateway `CORS_ORIGINS` | `https://aadharcha.in`, `https://ondcbuyer.aadharcha.in`, `https://ondcseller.aadharcha.in`, `https://flatwatch.aadharcha.in` |
| FlatWatch backend `CORS_ORIGINS` | `https://aadharcha.in`, `https://ondcbuyer.aadharcha.in`, `https://ondcseller.aadharcha.in`, `https://flatwatch.aadharcha.in` |
| Shared control plane `CLAUDE_AGENT_ALLOWED_ORIGINS` | `https://ondcbuyer.aadharcha.in`, `https://ondcseller.aadharcha.in` |

## Current Deployment Gaps

These are real blockers, not optional cleanup:

1. buyer and seller are live on Vercel, but only in public read-only mode with agent runtime intentionally disabled.
2. buyer and seller still need a real shared deployed control-plane URL before they can be shipped as agent-enabled.
3. the shared control plane currently defaults to `local_cli`, but the deployed buyer/seller lane needs supported server auth instead.
4. `flatwatch/backend` still depends on local SQLite and local uploads, so the frontend is moved but persistence migration is not complete.
5. `flatwatch.aadharcha.in` is not fully healthy unless `https://flatwatch-api.onrender.com` is reachable; otherwise users hit the explicit `FlatWatch backend unavailable ...` auth error even though the browser request stays same-origin.

## Current Healthy Main Baseline

All public frontend deployments are currently sourced from local `main`, aligned to the latest remote `main` before build.

Latest known healthy `main` heads at the time of this reference update:

- `ondc-buyer`: `06dd165`
- `ondc-seller`: `cc0200c`
- `flatwatch`: `5bab450`
- `aadhaar-chain`: `87d94a6`

Current healthy public deployments came from fresh builds on `main`, not from `npx vercel redeploy`.

## Current Command Baseline

Useful current commands:

```bash
npx vercel project ls --scope ingpocs-projects
npx vercel domains inspect aadharcha.in --scope ingpocs-projects
npx vercel inspect aadhaar-chain-frontend.vercel.app --scope ingpocs-projects
npx vercel inspect flatwatch-frontend.vercel.app --scope ingpocs-projects
```

For a linked app directory:

```bash
npx vercel deploy --prod --yes --scope ingpocs-projects
```

Before any production build or deploy, enforce the source branch:

```bash
git fetch origin --prune
git switch main
git reset --hard origin/main
```

If the repo publishes from a different review-base remote, first align local `main` to that remote `main`. Production deployment still happens from local `main` only.

If Vercel rejects the deploy because the inferred Git author is not a member of `ingpocs-projects`, use the approved recovery lane:

For Vite apps (`ondc-buyer`, `ondc-seller`):

```bash
VITE_IDENTITY_URL=https://identity-aadhar-gateway-main.onrender.com \
VITE_IDENTITY_WEB_URL=https://aadharcha.in \
VITE_COMMERCE_DEMO_MODE=true \
VITE_AGENT_RUNTIME_ENABLED=false \
npx vercel build --prod --yes --scope ingpocs-projects

tmp="$(mktemp -d /tmp/portfolio-deploy.XXXXXX)"
mkdir -p "$tmp/.vercel"
cp .vercel/project.json "$tmp/.vercel/project.json"
cp -R .vercel/output "$tmp/.vercel/output"
(cd "$tmp" && npx vercel deploy --prebuilt --prod --yes --scope ingpocs-projects)
```

For Next.js apps (`aadhaar-chain/frontend`, `flatwatch/frontend`):

```bash
NEXT_PUBLIC_API_URL=https://identity-aadhar-gateway-main.onrender.com \
npx vercel build --prod --yes --scope ingpocs-projects

npx vercel deploy --prebuilt --prod --yes --scope ingpocs-projects
```

Why this is the current safe path:

- `ondc-buyer/.env` and `ondc-seller/.env` still contain `VITE_API_BASE_URL=http://localhost:3001`, so production values must be overridden explicitly at build time
- deploying the Vite apps from the temp directory removes the Git metadata that triggers the Vercel team-collaboration rejection
- the Next.js prebuilt output still references helper files in local `node_modules`, so those deploys must run from the repo root after building on `main`

## Anti-Patterns

- Treating GoDaddy nameserver mismatch warnings as proof the DNS write failed even when the `A` records are already correct
- Reusing Netlify hostnames in `www` or subdomain DNS records after the Vercel cutover
- Deploying buyer or seller with `VITE_AGENT_RUNTIME_ENABLED=true` and no real `VITE_AGENT_CONTROL_PLANE_URL`
- Assuming a public deployed control plane can use Claude.ai subscription OAuth / `local_cli` as its product auth model
- Assuming FlatWatch is healthy because the sign-in page loads from Vercel, without verifying `https://flatwatch-api.onrender.com`
- Forgetting that `ondc-buyer/.env` and `ondc-seller/.env` still contain `VITE_API_BASE_URL=http://localhost:3001`
- Treating `npx vercel redeploy <deployment>` as a latest-main release
- Deploying from the repo when Vercel infers `githubCommitAuthorEmail=gupta.huf.gurusharan@gmail.com`, which `ingpocs-projects` rejects for deployment creation
- Using the temp-directory `--prebuilt` workaround for the Next.js apps
