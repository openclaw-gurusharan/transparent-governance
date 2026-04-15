# Portfolio Vercel Deployment Control Plane

Use this workflow before redeploying portfolio frontends, remapping `aadharcha.in` DNS, or changing deployed frontend/backend environment bindings.

This is the workspace-owned deployment runbook for:

- `aadhaar-chain/frontend`
- `flatwatch/frontend`
- `ondc-buyer`
- `ondc-seller`

Load the companion reference doc first when you need the current project names, domains, URLs, or env matrix:

- `docs/reference/PORTFOLIO-VERCEL-DEPLOYMENT-REFERENCE.md`

## Primary Judgments

1. Frontend deployment and custom-domain management are workspace-owned, not repo-local.
2. Vercel is the system of record for portfolio frontend projects; GoDaddy is only the DNS authority.
3. Do not cut DNS first. A frontend must already exist on Vercel before its custom domain is repointed.
4. Do not silently ship buyer or seller with a dead or unsupported agent runtime. If the shared control-plane URL or supported auth mode is missing, stop and surface it.
5. Do not touch email records while changing web traffic. Preserve `MX`, SPF, DKIM, and `_domainconnect`.
6. `aadharcha.in` apex must have GoDaddy forwarding removed before the apex `A` record can point cleanly to Vercel.
7. Repo-local `.env` and `.env.local` files are part of the effective deploy input when building locally; audit them before every redeploy.
8. `flatwatch/frontend` now uses a same-origin Vercel rewrite for `/api/*` to `https://flatwatch-api.onrender.com`; do not switch it back to direct browser-to-Render API calls unless you intentionally want to own CORS and preflight behavior again.
9. `flatwatch/frontend/src/lib/trust.ts` must keep deployed trust reads on `https://identity-aadhar-gateway-main.onrender.com`; localhost `43101` is a local-dev-only fallback.
10. Production deployment happens from `main` only. Before every deploy, fetch, switch to local `main`, and align it to the remote `main` that owns the deploy lane.
11. `npx vercel redeploy <deployment>` is an artifact replay, not a latest-code release. Use it only when you intentionally want the old build and env snapshot.
12. The temp-directory `--prebuilt` workaround is valid for the Vite apps in this workspace, but the Next.js apps must deploy `--prebuilt` from the repo root because `.vercel/output` still references helper files under local `node_modules`.

## Scope Split

| Surface | Owner | Notes |
|---|---|---|
| Vercel project creation, linking, envs, deploys | this workflow | Frontend hosting only |
| GoDaddy DNS changes for `aadharcha.in` and subdomains | this workflow | Use `A 76.76.21.21` unless the strategy changes |
| Agent-capable backend host config | this workflow + companion reference | Separate from the public frontend deployments |
| Supabase schema/storage rollout | later extension | Not covered by the current live deploy lane |

## Prerequisites

Before any deployment run:

- `npx vercel login` completed on this machine
- Vercel scope is `ingpocs-projects`
- Chrome session is already authenticated to GoDaddy
- the target backend/runtime URLs are known
- the target app builds locally
- repo-local `.env*` files have been checked for localhost or stale development values
- local `main` matches the remote `main` being deployed

Required live systems:

- Vercel team: `ingpocs-projects`
- DNS authority: GoDaddy for `aadharcha.in`
- Browser path for GoDaddy changes: live Chrome session using `$chrome-gui-testing`

## Working Directories

| App | Working directory | Vercel project |
|---|---|---|
| AadhaarChain frontend | `aadhaar-chain/frontend` | `aadhaar-chain-frontend` |
| FlatWatch frontend | `flatwatch/frontend` | `flatwatch-frontend` |
| ONDC Buyer | `ondc-buyer` | `ondc-buyer` |
| ONDC Seller | `ondc-seller` | `ondc-seller` |

## Decision Table

| Need | Do this |
|---|---|
| Redeploy an existing frontend with no domain change | Run the frontend deploy lane only |
| Add or repair a custom domain | Verify the Vercel project first, then run the DNS lane |
| Deploy buyer or seller | Stop unless `VITE_AGENT_CONTROL_PLANE_URL` is real, reachable, and backed by a supported deployed auth mode |
| Move AadhaarChain or FlatWatch frontend | Verify their backend hosts and browser-origin allowlists first |
| Change apex `aadharcha.in` | Remove GoDaddy forwarding first, then update the editable apex `A` record |

## Frontend Deploy Lane

### 1. Verify local build

Start from the correct source branch:

```bash
git fetch origin --prune
git switch main
git reset --hard origin/main
```

If the repo publishes from a different review-base remote, align local `main` to that remote's `main` first. Do not deploy from feature branches or detached HEAD.

Run the smallest meaningful build from the app root:

```bash
npm run build
```

For Vite apps, confirm the repo already contains a Vercel SPA rewrite in `vercel.json`.

### 2. Link the local directory to the intended Vercel project

From the app root:

```bash
npx vercel link --project <project-name> --scope ingpocs-projects --yes
```

Expected result:

- `.vercel/project.json` points at the correct Vercel project

### 3. Confirm production env configuration

Check the companion reference doc for the current required envs.

Minimum rule:

- do not rely on local defaults in production
- do not deploy buyer or seller with an empty `VITE_AGENT_CONTROL_PLANE_URL`
- do not deploy buyer or seller behind a public control plane that depends on Claude.ai subscription OAuth via `local_cli`
- do not deploy AadhaarChain or FlatWatch frontends against a backend host that has not allowlisted the deployed browser origin
- if a public read-only buyer/seller deploy is intentional, set `VITE_AGENT_RUNTIME_ENABLED=false` explicitly instead of faking a live runtime

### 4. Deploy production

From the linked app root:

```bash
npx vercel deploy --prod --yes --scope ingpocs-projects
```

If Vercel rejects the deploy because the inferred Git author is not a member of `ingpocs-projects`, use this recovery path:

For Vite apps (`ondc-buyer`, `ondc-seller`):

1. run `vercel build --prod --yes` in the real repo on `main` with explicit shell env overrides for the intended production values
2. copy only `.vercel/project.json` and `.vercel/output` into a temp directory outside the git repo
3. run `npx vercel deploy --prebuilt --prod --yes --scope ingpocs-projects` from that temp directory

For Next.js apps (`aadhaar-chain/frontend`, `flatwatch/frontend`):

1. run `vercel build --prod --yes` in the real repo on `main` with explicit shell env overrides for the intended production values
2. keep the generated `.vercel/output` in place
3. run `npx vercel deploy --prebuilt --prod --yes --scope ingpocs-projects` from the repo root

Why:

- the build still happens against the correct linked project and env contract
- the deploy request no longer carries Git metadata that can trigger the Vercel team-collaboration rejection for the Vite apps
- the Next.js apps keep access to helper files under local `node_modules`, which the copied temp directory does not preserve

Expected result:

- deployment reaches `Ready`
- the project has a production alias on `*.vercel.app`

### 5. Verify the Vercel deployment before touching DNS

Use:

```bash
npx vercel inspect <project>.vercel.app --scope ingpocs-projects
```

And then browser-check the deployment URL or production alias for:

- page load success
- no blocking JavaScript crash
- correct backend base URL behavior

## Custom Domain Lane

### 1. Add the domain to the Vercel project first

Examples:

```bash
npx vercel domains add aadharcha.in aadhaar-chain-frontend --scope ingpocs-projects
npx vercel domains add www.aadharcha.in aadhaar-chain-frontend --scope ingpocs-projects
npx vercel domains add flatwatch.aadharcha.in flatwatch-frontend --scope ingpocs-projects
npx vercel domains add ondcbuyer.aadharcha.in ondc-buyer --scope ingpocs-projects
npx vercel domains add ondcseller.aadharcha.in ondc-seller --scope ingpocs-projects
```

Expected result:

- Vercel accepts the domain and shows the intended record target

### 2. Use GoDaddy only as DNS authority

Do not switch nameservers just to point the site at Vercel. The current operating model uses GoDaddy DNS with explicit `A` records to `76.76.21.21`.

### 3. Safe DNS rules

Always preserve these records:

- `MX` for GoDaddy email
- `email` CNAME
- DKIM CNAMEs such as `secureserver1._domainkey` and `secureserver2._domainkey`
- SPF / DMARC TXT records
- `_domainconnect`

### 4. Subdomain rule

For portfolio web subdomains, point them to:

```text
A <host> 76.76.21.21
```

Current hosts:

- `flatwatch`
- `ondcbuyer`
- `ondcseller`
- `www`

### 5. Apex rule for `aadharcha.in`

Before changing the apex `A` record:

1. open GoDaddy `Forwarding`
2. delete active domain forwarding for `aadharcha.in`
3. verify the readonly forwarding-owned apex `A` records are gone
4. update the remaining editable apex `A` record to `76.76.21.21`

Why:

- GoDaddy forwarding creates readonly apex `A` records that will fight the Vercel cutover

### 6. Post-DNS verification

Verify from both sides:

```bash
npx vercel domains inspect <domain> --scope ingpocs-projects
```

And by checking the authoritative GoDaddy record inventory in the live browser session.

Important:

- Vercel verification can lag after a correct DNS change
- treat correct GoDaddy records plus a recent Vercel inspect warning as propagation unless there is conflicting evidence

## Backend Runtime Config Lane

Before calling a frontend deployment complete, verify its backend/runtime host contract:

| Frontend | Required backend contract |
|---|---|
| `aadharcha.in` | Aadhaar gateway host reachable at `NEXT_PUBLIC_API_URL`, CORS allows deployed origins, deployed CLI auth explicitly enabled only if the host is trusted |
| `flatwatch.aadharcha.in` | FlatWatch backend reachable through the frontend's same-origin `/api/*` rewrite to `https://flatwatch-api.onrender.com`, trust API host explicit as `https://identity-aadhar-gateway-main.onrender.com`, `CLAUDE_AGENT_ALLOWED_ORIGINS` includes `https://flatwatch.aadharcha.in`, and the backend auth endpoints must actually respond so the frontend does not degrade into the `FlatWatch backend unavailable at https://flatwatch.aadharcha.in. Start the local API and try again.` state |
| `ondcbuyer.aadharcha.in` | shared control plane reachable at `VITE_AGENT_CONTROL_PLANE_URL`, allowed origins include buyer domain, deployed auth uses Anthropic API key or supported cloud-provider auth |
| `ondcseller.aadharcha.in` | shared control plane reachable at `VITE_AGENT_CONTROL_PLANE_URL`, allowed origins include seller domain, deployed auth uses Anthropic API key or supported cloud-provider auth |

Stop conditions:

- missing shared control-plane URL for buyer/seller
- shared control plane only works through deployed `local_cli` / Claude.ai OAuth
- missing deployed-origin allowlist on backend hosts
- frontend deployed against dead or placeholder backend URLs
- `flatwatch-api.onrender.com` is unreachable or its auth/session endpoints fail, even if the FlatWatch shell still loads from Vercel
- `flatwatch/frontend/vercel.json` is missing the `/api/:path*` rewrite or still references deleted Vercel secrets for FlatWatch API host selection

## Validation Checklist

After each production change:

- deploy source repo is on local `main`, aligned to the intended remote `main`
- Vercel deployment is `Ready`
- custom domain exists on the correct Vercel project
- GoDaddy DNS record matches `76.76.21.21` for the intended host
- app loads at the custom domain
- browser console has no blocking errors
- required backend requests resolve against the intended host
- for FlatWatch specifically, the sign-in flow must not show `FlatWatch backend unavailable ...`; a loaded login shell alone is not enough evidence

## Current Healthy Main-Deploy Baseline

The current healthy public state came from fresh builds on local `main`, not from `npx vercel redeploy`.

- `aadhaar-chain/frontend` -> `https://aadharcha.in`
- `flatwatch/frontend` -> `https://flatwatch.aadharcha.in`
- `ondc-buyer` -> `https://ondcbuyer.aadharcha.in`
- `ondc-seller` -> `https://ondcseller.aadharcha.in`

Runtime hosts:

- Aadhaar trust and identity API: `https://identity-aadhar-gateway-main.onrender.com`
- FlatWatch backend rewrite target: `https://flatwatch-api.onrender.com`

## Known Traps

| Trap | Why it breaks | Correct move |
|---|---|---|
| Editing apex DNS while GoDaddy forwarding is still active | Creates split apex ownership and readonly `A` records | Delete forwarding first |
| Treating Vercel warning output as proof of bad DNS immediately after a change | Vercel re-verification lags propagation | Recheck authoritative GoDaddy records first |
| Reusing Netlify-era `www` or subdomain records | Leaves traffic on the old host | Replace them with `A 76.76.21.21` |
| Deploying buyer/seller without a real control-plane URL | `/agent` calls fail in production | Stop and surface the missing runtime host |
| Deploying buyer/seller with Claude.ai OAuth-backed `local_cli` on a public control plane | Not a supported product auth model for Agent SDK-backed public services | Use `ANTHROPIC_API_KEY` or supported cloud-provider auth on the deployed host |
| Treating the FlatWatch sign-in shell as proof the app is healthy | The shell can render while `flatwatch-api.onrender.com` is down and the user still gets `FlatWatch backend unavailable ...` | Verify backend health and auth endpoints, not just page load |
| Trusting repo-local `.env` files during a production redeploy | Localhost or stale dev URLs can be baked into the live bundle | Audit `.env` and `.env.local`, then override production values explicitly during the build |
| Treating `npx vercel redeploy <deployment>` as a latest-main release | It replays an older artifact and env snapshot instead of rebuilding current `main` | Rebuild from local `main` and deploy the fresh prebuilt output |
| Deploying from a git repo when Vercel infers a non-member Git author | Vercel rejects the deployment even when the prebuilt output is valid | Build in the repo, then deploy the Vite app prebuilt artifact from a temp directory with no `.git` metadata, or deploy Next.js prebuilt output from the repo root |
| Using the temp-directory `--prebuilt` workaround for Next.js apps | The copied output still references helper files under local `node_modules` and the deploy fails at upload/runtime preparation | Build on `main`, then deploy `--prebuilt` from the repo root |
| Changing email-related DNS while moving web traffic | Can break mailbox delivery | Leave `MX`, DKIM, SPF, and email CNAME untouched |
