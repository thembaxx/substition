# Automatic maintenance

The repository runs daily dependency maintenance and can run one weekly AI-assisted app improvement. It publishes only an exact, verified candidate to `main`. No personal access token is required.

## Schedule and controls

| Workflow                          | Schedule                                             | Result                                                                                                     |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Automatic maintenance             | Daily, 06:17 UTC                                     | Refresh compatible direct/transitive dependencies; format; run all gates; publish safe changes.            |
| AI improvement inside maintenance | Sunday, or an enabled manual run                     | One small, justified UI/accessibility/performance fix, when `GEMINI_API_KEY` exists.                       |
| Security analysis                 | Saturday, 05:43 UTC, plus pushes/PRs/manual dispatch | CodeQL JavaScript/TypeScript security-extended analysis in GitHub's Security tab.                          |
| Check                             | Pushes, PRs and explicit post-maintenance dispatch   | Tests, types, lint, formatting, dependency audit, production build and HTTP smoke checks.                  |
| Dependabot for GitHub Actions     | Monday, 05:00 UTC                                    | Reviewable PRs for pinned workflow-action versions. Workflow changes are not self-approved by maintenance. |

Use **Actions → Automatic maintenance → Run workflow** to run now. `apply: false` generates and verifies an artifact without changing `main`. `ai_improvements: false` disables AI for that manual run. Scheduled dependency maintenance works without AI credentials.

Set the repository Actions variable `MAINTENANCE_PAUSED` to `true` to stop preparation/publication. Disable the workflow itself to stop scheduling entirely. Concurrent maintenance runs are serialized; nothing is force-pushed.

## How automatic integration works

1. A read-only job checks out the current trusted `main` snapshot with persisted Git credentials disabled.
2. `pnpm update --depth 100` refreshes versions within the existing constraints. The package manager's allowed-build policy remains intact.
3. If configured, a Node script makes one Gemini Interactions API request using `gemini-3.8-flash`, capped at 8,192 output tokens and two minutes. It supplies only named repository source files, requests structured replacements, sets `store: false`, and provides no model tools or command execution. It validates the entire proposal before writing files. A no-change proposal is valid. API/network/quota failures record an AI skip and leave dependency maintenance running; invalid or unsafe proposals stop the workflow. There are no retries or alternate-model fallbacks.
4. A guard copied outside the editable workspace captures the candidate. It rejects changes outside an allowlist, edits to existing tests, dependency additions/removals, script/package-manager changes, major version upgrades, pre-1.0 minor jumps, deletions, symlinks, oversized changes and digest mismatches.
5. The exact candidate must pass tests, typecheck, lint, formatting, a full dependency audit at moderate-or-higher severity, production build and HTTP smoke checks. Audit/network failures fail closed; there is no ignore-advisory list.
6. The guard confirms checks did not change the candidate. An immutable workflow artifact contains only validated paths, text and content hashes.
7. A separate publishing job starts from the trusted base again. It installs no project dependencies and executes no candidate application code. It validates the artifact with the original guard, checks the current remote base, commits the tested files and uses an ordinary fast-forward Git push to `main`.
8. If `main` advanced meanwhile, the push is rejected rather than mixing in untested changes. The next scheduled run starts from the newer base. Branch protection is respected; there is no admin bypass, force push, automatic rollback or deletion of user work.
9. A separate job explicitly dispatches Check and Security analysis after publication. This avoids relying on `GITHUB_TOKEN` pushes to trigger other Actions workflows.

This is automatic integration through verified commits, rather than opening bot PRs and depending on an additional repository permission to create/approve them. Every change links its verifying workflow run in the commit body. Candidates with no changes do not create commits. Failed checks or a blocked push remain visible as failed Actions runs and never publish the candidate.

## Allowed AI scope

Permitted: error/loading pages, dialog interaction, subscription-form presentation, decorative WebGL performance and existing styles. A focused new `tests/maintenance-*.test.ts` can prove a change. Limit: eight total files and 200 actual changed app/test lines, with dependency files excluded from the line budget.

Protected: workflows, policy scripts, existing tests, auth, encryption, money logic, parsers, cancellation data, offline-LLM privacy logic, legal text, package-manager policy and product strategy. Maintenance cannot add dependencies, bypass tests or rewrite contracts. Major migrations and sensitive logic changes need a dedicated task and evidence. The bot does not claim screenshots, device testing, feature completion or that all future vulnerabilities can be fixed automatically.

Compatible updates are attempted daily. When an advisory requires a major upgrade, an unavailable patch or a dedicated code fix, the audit fails and the run stops. CodeQL surfaces source findings separately; a successful upload does not mean its findings have been resolved. Review these findings rather than interpreting the workflow as a security certification.

## Enabling weekly AI improvements

Add a Google AI Studio Gemini API key as repository Actions secret **`GEMINI_API_KEY`** at:

<https://github.com/thembaxx/substition/settings/secrets/actions>

The current connector cannot manage repository secrets. Do not paste a key into chat, source code, an issue, a workflow variable or an artifact. The workflow detects the secret at runtime; absent credentials cause a documented AI skip, not a fake improvement or a failure of dependency maintenance.

`gemini-3.8-flash` has a free API tier as checked on 18 October 2026. For zero API charges, use a project without billing and stay within its free quotas. A key from a billing-enabled project follows that project's pricing; the workflow cannot change its billing settings. The model is fixed in reviewed source, with one request per weekly/manual run and no paid-model fallback. The GitHub step has a three-minute timeout.

Google's unpaid-service terms may use submitted source and generated output to improve products, subject to regional/account exceptions. `store: false` disables stored Interaction objects; it does not override those terms. The request contains only README, architecture, package metadata and the six allowed UI files, with a 160 KB context cap. The API key is an HTTP header, never prompt content; its environment binding is removed before local validation and no raw provider error body is logged. The publishing job never receives it. Users' vaults and statements remain on their devices. This maintenance helper is separate from the product's offline LLM. `HIBP_API_KEY` and a personal GitHub token are not used by this workflow.

## Security fixes included with setup

The initial audit found three advisories:

- [PDF.js GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j): upgraded `pdfjs-dist` from 5.7.284 to 6.4.299.
- [Tinypool GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr): upgraded Oxfmt from 0.40.0 to 0.73.0 to remove its vulnerable transitive resolution.

The resulting full audit reports zero known vulnerabilities. This is a dated dependency-advisory result, not a guarantee about undiscovered issues. Existing PDF import behaviour is checked by the build/types and core parser tests; physical browser/PDF-device QA remains separate.

## Verification and operations

- `pnpm test` includes policy tests for protected paths, tampered digests, incompatible dependency changes, exact-file publication, post-check mutations and stale base rejection.
- Gemini tests check stateless/credential-separated requests, quota/network failures, incomplete/malformed output, exact replacement matching, protected paths, existing-test rejection and no-change proposals without making real API calls.
- Actionlint validates all workflow YAML.
- `pnpm audit --audit-level moderate` covers development dependencies as well as production packages.
- `pnpm build && pnpm smoke` verifies serving of every offline shell asset, including the local PDF worker.
- Manually dispatch a dry run before changing any maintenance policy. Inspect the candidate artifact and run summary, then test an apply run.
- Revert a bad application change through a normal tested commit/PR. Do not force-reset `main` or overwrite device vaults.

External references: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Interactions API](https://ai.google.dev/api/interactions), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini terms](https://ai.google.dev/gemini-api/terms), [GitHub token behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [CodeQL advanced setup](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning), and [Dependabot configuration](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference).
