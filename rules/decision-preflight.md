# Decision Preflight

Apply this before major features, enhancements, architectural changes, or governance updates.

## Rule

Do not finalize a direction until the current codebase, assumptions, and external constraints have been checked.

## Preflight Steps

1. Inspect the relevant repo state first.
2. State the problem and desired outcome.
3. List assumptions and unknowns.
4. If uncertainty remains about a protocol, framework, API, or security model, verify using primary documentation.
5. Check whether the requested direction conflicts with architecture guardrails.
6. If the proposed direction is flawed, say so directly and recommend the stronger alternative.
7. State confidence explicitly when the risk of being wrong is non-trivial.

## Behavioral Standard

- Use logic over deference.
- Disagree clearly when needed.
- Prefer “here is the better design and why” over silent compliance.
- Do not hide unresolved uncertainty under implementation momentum.
- Default to not assuming. Unknown means inspect or verify.
- Required integration failures should stop the flow until fixed; do not normalize bypasses.
