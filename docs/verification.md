# Verification record

Implementation date: 17 October 2026. Use synthetic data for all verification.

## Executed

- TypeScript strict check and Oxlint passed during implementation.
- Focused Node tests passed for money exponents, monthly/yearly totals, month-end/leap-year recurrence, encrypted vault round-trip/wrong-password/tamper rejection, record validation, CSV quoting, billing-channel cancellation routing, spreadsheet-safe CSV and calendar exports.
- Service-worker harness passed: auth/API paths and non-GET requests bypass caches, offline navigation gets a cached shell/fallback and application cache cleanup preserves model caches.
- Next.js production compilation completed successfully with static app/legal/sign-in pages and dynamic optional-auth routes. The build emits the production worker after its client assets are known.
- Original Blender illustration and generated install icon were opened with the image inspection tool.

Final local run: **14 tests passed**; TypeScript, Oxlint, Oxfmt, Actionlint and the Next.js production build passed. The full dependency audit reported zero known vulnerabilities. The generated worker precaches **60 local assets**. `pnpm smoke` passed app/legal/sign-in routes, disabled-auth 503, security/no-cache headers, light/dark manifests and HTTP 200 for every shell asset. This checks serving and cache logic, not an actual browser installation.

Automatic-maintenance setup adds three policy checks, full dependency-audit gating and a scheduled CodeQL workflow. Vulnerable PDF.js/Oxfmt resolutions were upgraded; PDF extraction now destroys its loading task on success or failure, as required by PDF.js 6. See `automatic-maintenance.md` for the publishing protocol and runtime setup.

18 October 2026: the Gemini maintenance helper adds mocked request and patch-validation checks, bringing the suite to **17 passing tests**. TypeScript, Oxlint, Oxfmt and Actionlint passed locally; the dependency audit reported zero known vulnerabilities. A [live GitHub dry run](https://github.com/thembaxx/substition/actions/runs/39130261337) authenticated with the repository's `GEMINI_API_KEY` and passed all gates. That response contained no file edits. Incomplete generations are discarded before file writes; a focused test covers that boundary.

## Not verified

Browser automation was not callable in this session, including on retry. No browser-rendered screenshots, browser console check, visual fidelity pass or actual iOS/Android installation was performed. `design-qa.md` records `final result: blocked`. Static layout code is not a substitute for these checks.

No compatible physical WebGPU device was available for model generation. The installed WebLLM registry and model config/weight manifest were inspected, the worker integration compiled, and unsupported states are implemented. A real complete download, offline reload, generation, GPU-loss and deletion test remains required.

No database/email credentials were supplied. Live Better Auth email delivery, schema migrations, session lifecycle and server-account deletion are not verified. API disabled-state checks can run without credentials.

## Device acceptance checklist

1. Desktop Chromium/Safari/Firefox plus iOS Safari installed mode and Android Chromium installed mode. Record exact browser/OS versions.
2. At 360, 390, 768, 1024 and 1440 CSS px: no horizontal overflow, readable money, reachable navigation and dialogs, large text, keyboard focus, screen-reader labels and reduced motion.
3. Light/dark/system: initial load, reload, loading state, installed launch, scroll boundaries, browser chrome and safe areas. OS-controlled splash colours may lag theme updates.
4. Create vault, add/edit/delete/undo, reload/unlock, lock after hidden-tab interval, wrong passphrase, disabled storage and quota failure. Confirm failure does not discard unsaved changes.
5. Export encrypted backup, restore in a second clean browser profile, compare records/totals. Delete only after checking backup. Confirm CSV/calendar exports are clearly plaintext.
6. Import synthetic CSVs with both sign conventions, refunds, duplicate charges, missing/ambiguous columns and invalid dates. Test supported text PDF and unsupported/scanned PDF error states. No document request must reach a server.
7. Open cancellation links for each actual billing channel. The tracker must never claim an external cancellation occurred without user confirmation.
8. Install worker, wait for cache setup, disable network, cold-reload, edit local records, use cached PDF parser, navigate legal pages and verify update availability/reload. Confirm API/auth responses are absent from caches.
9. Download model explicitly, inspect external requests, opt into local summary, generate, stop, unload, cold-launch offline and generate again. Delete both supported model variants and verify caches. Confirm chat/context never reaches network.
10. If enabling optional auth, verify the full staging DB/email/session flow and account deletion before production use.
