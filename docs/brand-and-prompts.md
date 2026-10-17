# Brand and build kit

## Working brand

**Substition** — a substitute for subscription chaos. Spoken naming and typo tests should precede registration: ask ten people to hear the name once and spell it. The repository's name is the current working decision, not a trademark clearance.

Tagline: **Less recurring. More living.** Product headline: **A little clarity. A lot more control.** Promise: **Your subscriptions, beautifully in order. Your financial life stays yours.**

Voice: composed, useful, warm and specific. Explain a tradeoff in one sentence. Avoid shame, guilt, urgency tricks and imaginary AI savings. Use “possible overlap” rather than “waste”; “mark as cancelled” rather than “we cancelled it.”

Alternative names to test, without availability claims: **Recurra**, **Loopwise**, **Stillroom**, **Renewkind**, **Subharbor**. Subvault and Renewly already appear in subscription-related search material supplied in the brief, so do not treat them as clear names. Screen WIPO, relevant national registries, app stores, domains and common misspellings. Counsel should choose the relevant trademark classes from actual goods/services; a SaaS tracker is not automatically a regulated financial service.

## Visual direction

The supplied boards show rounded native interfaces, airy layouts, black floating navigation, soft gradients, recognisable merchant marks and gentle editorial type. Substition translates those cues into a responsive web app rather than copying the photographed device frames or another product's branding.

| Element         | Direction                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Typeface        | Self-hosted Urbanist; restrained weight changes, strong tabular money hierarchy.                                         |
| Light canvas    | Warm off-white `#f9faf7`; surfaces `#ffffff`; ink `#233229`.                                                             |
| Dark canvas     | Deep botanical `#101512`; surface `#1a221c`; ink `#edf3e9`.                                                              |
| Accent          | Pale mint `#e4eedb`, muted peach `#f8ece1`, soft blue `#e9f0f8`.                                                         |
| Primary control | Forest pill, high contrast, short action text.                                                                           |
| Shape           | 20–26 px cards; quiet borders; rounded icon tiles.                                                                       |
| Navigation      | Clear desktop tabs; floating mobile bar with visible labels and safe-area spacing.                                       |
| Illustration    | Sculptural mint loop with peach orb and silver orbit; original Blender render.                                           |
| Motion          | Short transitions, restrained depth response and an ambient shader; no essential information conveyed only by animation. |

The animated background is inspired by soft assistant-app ambience, not a claim of reproducing Gemini assets. iOS-inspired fluidity means responsive direct manipulation, continuity and performance; the app does not claim native iOS 27 APIs or a native binary.

## Asset inventory

- `public/brand/mark.svg`: working Phosphor IntersectThree mark. It is licensed third-party iconography, not exclusive trademark artwork.
- `public/brand/icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`: install assets with a generous safe zone.
- `public/images/renewal-loop.webp`: primary transparent 3D illustration. Use at ≤480 CSS pixels where practical.
- `assets/blender/renewal-loop.blend`, `create_renewal_loop.py`: editable original source, no external texture dependency.
- `public/merchants/*.svg`: local provider marks; no logo-lookup service receives subscription names.
- `public/fonts/*`: local Urbanist font files; the OFL accompanies them.
- `public/sample-statement.csv`: synthetic import sample.

Keep source PNG/Blender files out of routine page requests. No photography was embedded because the product dashboard benefits from focused information and the original sculpture. Use licensed, consented photography for marketing when there is a real editorial role.

## Photography direction

Subject: a quiet, lived-in moment after an admin task is finished. Natural daylight, real hands and realistic device anatomy, inclusive casting across launch markets, restrained wardrobe, unforced expressions, uncluttered environments. Avoid distressed people, exposed real bank statements, fake banking logos and screenshots containing personal data. Obtain model/property releases for commercial photography. Identify AI-generated images as such when used as testimonial-like material; never invent customer stories.

Image prompt for a future marketing asset:

> Editorial lifestyle photograph for a calm subscription-management app. A South African creative professional at a sunlit kitchen table, closing a laptop after finishing a small administrative task. Relaxed, candid, warm off-white architecture, a muted sage notebook and terracotta cup. Natural skin texture, anatomically accurate hands, soft directional daylight, premium documentary photography, generous negative space on the left for separately typeset copy. No visible financial documents, no readable text, no logos, no exaggerated smile. Landscape 3:2 composition.

3D asset prompt for another renderer:

> An original organic renewal-loop sculpture: inflated jade ceramic with subtle polished reflections, one small floating peach sphere and a separate thin silver ring. Three-quarter orthographic studio view, soft area lights, realistic contact shadows, transparent background, no text or brand logos. Quiet high-end product illustration. Preserve a clear loop silhouette at small sizes. Render 960 by 960 and provide an editable scene plus WebP export.

## Implementation prompts

### Master continuation prompt

> Continue the Next.js Substition repository. Read README.md, docs/architecture.md, docs/verification.md and the current code before editing. Preserve the local-first trust model. Use TypeScript, Tailwind, pnpm, Oxlint and Oxfmt. Build only the requested coherent slice. Do not claim email scanning, cloud sync, payments, universal auto-cancellation or encryption protocols that are not implemented. Financial records and raw imports must not reach a server. Preserve accessible dialog focus, keyboard flows, reduced motion, mobile safe areas, theme startup and honest unsupported-device states. Add focused tests for money, parsing, encryption or persistence changes. Run the relevant checks and report exactly what was verified.

### Offline assistant hardening prompt

> Harden the existing WebLLM worker integration using the pinned package API. Download only after explicit user action. Inspect model registry metadata and license. Show estimated download/memory requirements, loading progress, low-storage errors and unsupported WebGPU states. Verify a complete download, disconnect, reload the app, reload the model and generate a response without network. Keep context opt-in, omit raw documents and account secrets, and render messages as plain text. Test stop, GPU loss, backgrounding, model unload and complete cache deletion. Never add cloud fallback without a separately reviewed privacy contract and explicit consent.

### Private email discovery prompt

> Design an opt-in Gmail discovery flow after researching current official OAuth scope and verification requirements. Distinguish provider network access from server-side processing. Prefer a client-only public OAuth flow with short-lived tokens and no backend refresh token where technically supported. Do not store tokens in localStorage or claim a browser secure enclave. Fetch only user-approved message ranges; process bodies locally in a worker, discard originals and show reviewable subscription drafts. Include provider revocation and a narrow data map. Do not implement generic iCloud inbox access or receipt forwarding as “device only.” Stop before enabling a restricted-scope public integration without the required provider verification.

### Cancellation catalog prompt

> Implement docs/merchant-catalog.md as a normalization and routing catalog. Keep product identity, biller and sales channel separate. Resolve country/channel/contract-specific routes with documented fallbacks and stale status. Apple and Google developer APIs only act for authorised publishers; Stripe portal sessions require the relevant merchant account. Never execute a cancellation from an LLM. Bundle signed data and avoid sending users' merchant queries to a backend. Test global rows, locale fallback, unknown billers, stale links, malicious URLs and rollback rejection.

### Encrypted sync prompt

> Propose an independently reviewable E2EE protocol before implementing sync. Separate email authentication from encryption keys. Document key generation/wrapping, device enrollment, recovery, revocation, rotation and metadata leakage. Start with revision compare-and-swap and conflict copies unless evidence requires a more complex model. Use synthetic data in all tests. No server plaintext or server-held recovery master key. Make deletion and export work before marketing sync.

### Device acceptance prompt

> Run the production build. At 360, 390, 768, 1024 and 1440 CSS widths, inspect light/dark/system themes, large text, keyboard navigation and reduced motion. Test real vault creation, add/edit/delete/undo, lock/reload/unlock, backup restore, import review, calendar reminders and cancellation confirmation. Check local storage/network traffic with synthetic records. Install on current iOS Safari and Android Chromium, then cold-launch offline. Verify shell and optional model caches independently. Record screenshots, console errors, exact device/browser versions and failures; never replace browser verification with an HTTP health check.
