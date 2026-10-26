# Substition

**A privacy-conscious, local-first subscription dashboard** for tracking renewal dates, recurring spending, trials and cancellation next steps without linking a bank account.

**Implementation highlights:** passphrase-derived AES-GCM encrypted IndexedDB workspace; local CSV and text-PDF import with user review; exportable calendars and encrypted backups; installable offline PWA; optional, explicitly downloaded WebGPU-based local assistant.

**Built with:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, WebLLM, Better Auth (optional integration), Oxlint and Oxfmt. Versions and enabled integrations are documented below.

**Project status:** functional first release and demonstration workspace, _not_ a connected financial service. Cancellation is guided, not performed automatically. Real bank/email discovery and cloud sync are not connected. See [deliberate boundaries](#deliberate-boundaries) for limits.

[View source](https://github.com/thembaxx/substition) · [Verification notes](docs/verification.md)

---

**A little clarity. A lot more control.** A local-first subscription manager built with Next.js, TypeScript, Tailwind CSS, pnpm, Oxlint and Oxfmt.

## Run

Node 24+ and pnpm 11.25.0 are used by this checkout.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For the installable offline PWA, use a production build. Service workers are deliberately disabled in development.

```sh
pnpm build
pnpm smoke
pnpm start
```

Open `http://localhost:3000`. Production hosting needs HTTPS. No credentials are required for the encrypted local workspace or the optional offline assistant.

## What works

- Clearly labelled demo workspace; create an empty personal vault without an account.
- Passphrase-derived AES-GCM encrypted IndexedDB storage, lock/unlock, encrypted backups, restore and local deletion.
- Subscription CRUD, monthly/yearly estimates, separate currency totals, recurring calendar, search, status/category filters, budgets, trial dates and cancellation notes.
- ISO 4217 currencies supported by the runtime, including zero- and three-decimal currencies. No guessed FX conversion.
- Local CSV discovery with reviewable drafts and a narrow text-PDF parser. Twelve bundled merchant identities and logos.
- Apple, Google Play, PayPal and merchant cancellation guides. Stripe-billed services route to the merchant, not an invented universal billing portal.
- Calendar export with one-day reminders, safe CSV export and JSON encrypted backups.
- Light/dark/system themes, early theme setup, safe-area handling, responsive navigation, reduced-motion support, subtle WebGL ambience and an interactive original Blender illustration.
- PWA manifest variants, any/maskable icons, offline shell and assets, update notification, home screen shortcuts, install controls and an offline fallback.
- Optional **offline LLM chat**: WebLLM in a dedicated worker, SmolLM2-360M, explicit model download, progress, streaming replies, stop/unload/delete, opt-in local workspace context. No cloud inference endpoint.
- Optional Better Auth magic-link and email OTP integration, disabled clearly until a database and email provider are configured.

## Deliberate boundaries

This is a functional first release, not a production financial service. Email/bank discovery, encrypted cloud sync, household sharing, live alternative prices, paid tiers and third-party auto-cancellation are not connected. The interface labels planned connections. A tracker status change does not cancel a merchant contract.

The PDF parser supports text lines with ISO dates and decimal amounts; review every candidate. Bank CSVs require Date, Description, Amount and optional Currency columns. Scanned PDFs and arbitrary bank formats need further work.

The offline assistant requires a WebGPU-capable browser/device. The quantized model has ~204 MB of weight files plus runtime/tokenizer overhead; allow ~210–250 MB disk and ~0.4–0.6 GB GPU memory. Its first download contacts Hugging Face and GitHub. Browser storage eviction can remove a model or a vault. Download once, retain the cache, then inference can run without a network connection. No physical-device inference test was available in this session.

Web apps cannot reliably schedule background local renewal alarms on every platform. The working reminder path is a user-imported calendar export. PWA launch colours and installation affordances remain partly controlled by the OS/browser.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Tests cover money exponents, month-end/leap-year recurrence, encrypted round-trip/tampering, input validation, CSV parsing, cancellation billing channels, safe exports and offline-worker cache boundaries. See [verification](docs/verification.md) for executed checks and limits. Browser screenshots and real iOS/Android/WebGPU tests require an available browser environment; do not infer their completion from a successful build.

`pnpm smoke` starts a temporary production server and checks the app/legal routes, disabled-auth response, headers, manifest variants and every precached asset. GitHub Actions runs the same checks on pushes and pull requests.

## Automatic maintenance

[Scheduled maintenance](docs/automatic-maintenance.md) refreshes compatible dependencies daily, rejects known moderate/high/critical advisories, runs the full suite and fast-forwards only the exact tested files into `main`. A separate publishing job holds the write token. Weekly CodeQL scanning and pinned-action Dependabot updates cover repository tooling.

Optional weekly Gemini improvements activate when the repository Actions secret `GEMINI_API_KEY` is configured. One stateless request proposes a small patch using a free-tier Flash model; quota/network failures skip AI while dependency checks continue. Financial/security logic, existing tests and workflow policy are protected from the maintenance bot. Manual runs support dry-run mode; `MAINTENANCE_PAUSED=true` stops publication. See the guide for setup, pricing/privacy terms, scope, limits and audit evidence.

## Optional account setup

Copy `.env.example` to `.env.local` and configure PostgreSQL, a high-entropy Better Auth secret, the canonical app URL and a verified Resend sender. Never expose these through `NEXT_PUBLIC_*` variables. See [architecture](docs/architecture.md#optional-authentication) for migrations and account-data obligations. Sign-in never supplies the vault encryption key.

## Product and launch kit

- [Strategy, competitors, feature ideas, pricing and launch experiments](docs/product-strategy.md)
- [System design, privacy, global rollout and offline AI](docs/architecture.md)
- [Merchant normalization and cancellation catalog](docs/merchant-catalog.md)
- [Brand, visual direction, assets and agent build prompts](docs/brand-and-prompts.md)
- [Legal preparation, data map and operating workflows](docs/legal-and-operations.md)
- [Sources and research boundaries](docs/research-sources.md)
- [Verification and device acceptance checklist](docs/verification.md)

## Assets

Original Blender scene: `assets/blender/renewal-loop.blend`. Reproducible source: `assets/blender/create_renewal_loop.py`. Web-optimised 960×960 transparent illustration: `public/images/renewal-loop.webp`. No Blender or Unity runtime is shipped to users. Unity is unnecessary for this web app; dedicated Blender/Unity skills were not installed, but Blender was available to create the illustration.

Merchant marks identify their owners and do not imply affiliation. Urbanist is self-hosted under SIL OFL. UI icons and the working brand mark come from Phosphor (MIT); most merchant marks come from Simple Icons (CC0, with separate trademark rights). See [asset notices](assets/ATTRIBUTION.md). Working brand assets are not trademark clearance.
