# Substition maintenance task

Inspect the app and make at most one small, evidence-based improvement to accessibility, robustness, error handling or performance. A no-change result is correct when there is no credible issue. Do not invent work, rewrite the design or add features merely to create a commit.

Read README.md and docs/architecture.md first. Use synthetic data only. This is a privacy-first subscription app: never add analytics, cloud inference, inbox access, credential handling or new network requests. No user documents or vaults belong in CI.

The workflow has already refreshed compatible dependencies. Do not change package.json, the lockfile, the package manager, build tools, installation policy, workflows, scripts, existing tests, merchant data, legal pages or product strategy. Never weaken or bypass a check.

Permitted implementation files:

- src/app/error.tsx
- src/app/loading.tsx
- src/app/globals.css
- src/components/dialog.tsx
- src/components/subscription-form.tsx
- src/components/ambient.tsx

Add a focused new test named tests/maintenance-<description>.test.ts if it provides meaningful proof. Do not modify an existing test. Keep the change within 200 changed app/test lines and eight total files, including the dependency files already changed by the updater.

Do not touch money calculations, parsing, vault encryption, authentication, sync, cancellation semantics or the offline LLM privacy boundary. Those require dedicated evidence and review. Preserve keyboard access, dialog focus, native input behaviour, reduced motion and safe-area support.

Investigate the root cause, make the smallest coherent fix, and run relevant checks. Do not commit, stage changes, push, merge, access secrets or edit Git metadata. The trusted workflow validates and publishes changes independently. Stop after one useful improvement and report the concrete reason, files changed and proof. Do not claim browser or physical-device verification unless performed.
