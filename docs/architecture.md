# Architecture and privacy boundaries

## Current implementation

Next.js App Router serves an anonymous app shell. React operates the workspace in browser memory. Business records are encrypted locally, then stored as a single envelope in IndexedDB. No subscription API exists. Optional account endpoints are separate from financial records.

```text
User input / local CSV / local text PDF
             |
    Browser parser + review UI
             |
       Validated workspace --------> Optional local LLM worker
             |                       (explicit context opt-in)
       Web Crypto AES-GCM
             |
     Encrypted IndexedDB vault

Public server: app assets + merchant catalog
Optional server: Better Auth + PostgreSQL + email delivery
Optional model hosts: download model files only
```

No inbox scanning, bank API, cloud LLM, encrypted sync or subscription billing service is configured. No fake integration success is shown.

## Encryption and recovery

PBKDF2-HMAC-SHA-256, 310,000 iterations, random 128-bit salt and a nonextractable 256-bit AES-GCM key. Every save uses a fresh random 96-bit IV. The envelope stores only the algorithm/version, KDF parameters, salt, IV and ciphertext. Restored envelopes have bounded sizes and accepted KDF parameters; restored records are validated.

The passphrase is not persisted. The derived key remains in memory while unlocked. Locking clears app references; JavaScript cannot guarantee zeroing managed memory or protect an already compromised browser. XSS, malicious extensions and a device being used while unlocked remain threats. Shipping client code updates is also a trust boundary.

Encryption protects stored records against someone without the passphrase. It is not a secure enclave, a guarantee against forensic recovery or a substitute for device security. Auth login does not derive or recover the vault key. Lost passphrases are unrecoverable. Backups require the original passphrase.

Writes are serialized; storage failures are visible. The UI warns before navigating away with pending/failed writes. Storage persistence is requested but not guaranteed. A five-minute hidden-tab lock reduces casual exposure. The current single-record format is suitable for personal subscription volumes; move to per-record encrypted transactions if attachment/history volume demands it.

## Optional authentication

`src/lib/auth.ts` creates Better Auth only when all required environment values exist. PostgreSQL stores account/session/verification/rate-limit records, not subscriptions. Magic link tokens and OTPs are hashed, expire after five minutes, and OTP attempts are limited. Database-backed rate limiting avoids a per-process-only counter. Seven-day sessions are independent from vault locking.

The implementation uses Resend for transactional email. A verified sender and DB must be provisioned by the operator. Before enabling accounts:

1. Configure only server-side environment variables from `.env.example`.
2. Use a high-entropy secret, HTTPS canonical URL, correct proxy/IP configuration and TLS PostgreSQL connection settings appropriate to the provider.
3. Run the Better Auth CLI schema generation/migration for the pinned package/config against a staging database. The adapter needs core user, session, account, verification and rate-limit tables.
4. Review the generated migration before applying. Export a migration configuration from `createAuth()` in a CLI-only file; never substitute a memory DB in production.
5. Verify token consumption, expired/incorrect OTPs, email failure, same-site cookies, trusted origins, rate limits and sign-out in staging.
6. Publish the operator identity, processor contract and retention/deletion process before collecting account data.

No database or email credentials were provided, so live delivery and DB migrations were not run. The disabled state and API 503 response are intentional. Passkeys are a later option and must never be paywalled as a security benefit.

## Offline LLM

`@mlc-ai/web-llm` runs in a dedicated web worker. The UI imports the runtime only when the assistant is opened. Model download begins only after the user selects Download & enable. SmolLM2-360M q4f16 is selected where shader-f16 is supported; q4f32 is the compatibility option. Registry metadata lists about 376/580 MB GPU memory. The reviewed weight manifest totals 203,614,080 bytes before runtime and tokenizer overhead.

Model weights, config/tokenizer and WASM are cached by WebLLM. The app service worker precaches application/worker chunks, not model weights. Inference can run offline after a successful download while all caches remain. A future offline re-load still depends on the browser retaining those caches. No background model download occurs on the tracking screen.

Default context is empty. Enabling context supplies a bounded summary of up to six subscriptions and calculated totals to the local worker. Notes, source documents, OAuth credentials and account sessions are excluded. Chats remain in memory, are rendered as plain text and clear on close. There are no tool calls, URL execution or subscription mutations. Cancellation actions remain explicit app workflows.

Small models hallucinate. The assistant must never be authoritative for legal rules, current plan prices, billing totals or cancellation confirmations. The app calculates totals deterministically and warns that model suggestions need verification. Device compatibility, storage quota failures, GPU loss, offline restart, stop/download cancellation and cache deletion need real-device acceptance testing.

## PWA and native behaviour

HTTPS, scope `/`, stable manifest id, standalone display, any/maskable PNG icons, Apple icon metadata, shortcuts, safe-area padding and standalone responsive layouts. Theme setup runs before hydration to reduce theme flashes. CSS, browser chrome meta colours and light/dark manifest variants share tokens. OS launch snapshots and install-time background colours are not fully controlled by a website.

The production build generates a service worker after Next emits its client assets. It precaches the shell, legal pages, logos, font/application chunks, the PDF worker and illustration. Updates wait for the user to refresh. Old Substition shell caches are removed after activation; WebLLM model caches are preserved. Auth paths and API responses are never cached.

Core tracking is offline after shell setup. Optional auth and first model downloads require network. Background local alarms are not portable across PWAs; the current product exports 12 months of calendar events with a one-day reminder. A later Web Push service requires opt-in, platform testing, push subscription metadata and honest notification privacy controls. Native wrappers may add OS scheduling and keychain capabilities but are separate projects.

## Global system design

Money is integer minor units with currency-specific exponents. Monthly normalization is an estimate; a weekly subscription uses 52/12, not four charges/month. Annualized totals are separate per currency. FX is not fetched or guessed. A later conversion must use a user-selected reporting currency, dated rates, provenance and an explicit estimate label.

Billing anchors use calendar dates rather than UTC timestamps. Month-end recurrence clamps each occurrence independently, preserving January 31 and leap-day intent. Notifications will need an IANA timezone and explicit cutoff time. Calendar views are currently English with Sunday-first headings; full translated catalogs, locale week starts and RTL need release-specific QA.

Keep provider identity, biller, sales channel, contract commitment and payment cadence separate. Country and locale belong in route resolution, not only in display text. Countries differ in cancellation rights, fees and required notice. A global fallback route should explain uncertainty rather than invent regional legal advice.

## Future sync, only when validated

Do not turn passwordless email login into an encryption backdoor. Use an independent random vault master key; wrap it for approved devices using an audited protocol. The account server can store opaque ciphertext, device identifiers, revisions, entitlement and minimal metadata. Disclose traffic analysis: encryption does not hide IP, timing, blob size or account email.

Start with revision-based whole-vault compare-and-swap and an explicit conflict copy. Add an encrypted event log only when simultaneous editing requires it. Avoid an unneeded CRDT before conflict cases exist. Device revocation requires key rotation and rewrapping; deletion must cover ciphertext, backups and retention rules. Audit the protocol externally before advertising “zero knowledge.”

## Hosting and performance

Deploy to a Node-compatible Next.js host. `pnpm build` must run in order; do not run static export with the optional API routes. Set `NEXT_TELEMETRY_DISABLED=1` for build tooling if desired. There is no browser analytics SDK.

Use self-hosted fonts/logos and lazy PDF/LLM chunks. The decorative shader pauses when hidden, caps frame rate and skips reduced-motion/data-saving devices. The Blender image is served as a compact WebP. WebGL is a progressive visual enhancement. Unity adds size and runtime cost without improving the subscription workflow, so it is not shipped.

Harden production with a tested nonce-based CSP, dependency monitoring, strict deployment control, limited log retention and no request-body logging. The current CSP allows inline Next bootstrap/style content and WASM compilation; it is a useful boundary but not a security audit. Adding third-party scripts would weaken the local-first trust model.
