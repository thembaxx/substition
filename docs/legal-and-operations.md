# Legal preparation and operating workflows

This is an implementation and preparation pack, not legal advice or a claim of compliance. Public launch needs an identified operator, real contact details and jurisdiction-specific review. The app's privacy and terms pages disclose their preview scope rather than inventing those details.

## Smallest practical data map

| Data                                        | Current location                                        | Leaves device?                    | Retention/control                                                    |
| ------------------------------------------- | ------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Subscription records and cancellation notes | Encrypted IndexedDB; plaintext in memory while unlocked | No app upload                     | User deletes vault; clearing site storage can remove it.             |
| Raw statements                              | Browser/PDF worker memory                               | No                                | App does not persist originals; browser controls memory reclamation. |
| Passphrase / derived key                    | Browser memory                                          | No                                | Passphrase never saved; key reference removed on lock.               |
| Theme preference                            | localStorage                                            | No app upload                     | Until site data is cleared.                                          |
| Chat messages                               | Browser/worker memory                                   | No                                | Cleared when assistant closes.                                       |
| AI model files                              | Browser caches                                          | Files downloaded from model hosts | User delete control; browser may evict.                              |
| Download request metadata                   | Hugging Face/GitHub delivery infrastructure             | Yes, on explicit download         | Model host policy; no chat or statement payload.                     |
| Optional sign-in email and session          | Operator DB and Resend                                  | Yes, only if configured and used  | Operator must implement and publish retention/deletion policy.       |
| Ordinary web request logs                   | Hosting infrastructure                                  | Yes                               | Configure minimum retention and no request body logging.             |
| CSV/ICS/backup files                        | User's download destination                             | User controls subsequent sharing  | CSV/ICS are plaintext; backup is encrypted.                          |

Do not promise “no data ever leaves the device.” Serve the more precise promise: **financial records stay on the device by default; optional network features explain their data flows.** Encryption does not eliminate legal responsibility for account identifiers, IP addresses or service logs.

## Before commercial launch

1. Establish legal operator, address/contact route, supported markets and intended age range. Decide whether to exclude underage account registrations initially.
2. Review privacy notice for purposes, lawful bases, recipients, transfers, retention, rights and complaint channels. Consider GDPR/UK GDPR, South Africa POPIA and applicable US state laws according to actual reach and thresholds.
3. Execute processor contracts with hosting, email and account database providers. Publish an accurate subprocessor list and transfer mechanisms where needed.
4. Assess Gmail restricted-scope verification/security requirements before connecting inboxes. Local processing does not itself waive provider rules.
5. Confirm brand/domain rights and merchant logo use. Do not imply endorsement or scrape private account areas without authority.
6. Write terms covering tracker estimates, cancellation limitations, data loss/recovery, user responsibilities, optional AI, purchases/refunds and mandatory consumer rights.
7. If selling, publish prices inclusive/exclusive of taxes as legally appropriate, renewal frequency, renewal notice, cancellation method and refund rules. Offer a self-service path to cancel Substition itself.
8. Review accessibility on actual devices. A polished interface is not proof of WCAG conformance.
9. Complete a security review of storage, XSS, token handling, dependency supply chain and any future encryption-sync protocol.

## Documents to complete with real facts

- Privacy notice and short data promise.
- Terms of service and separate subscription purchase terms when monetization exists.
- Retention schedule, data processing record, subprocessor list and request-handling guide.
- Connector disclosure: provider, scopes, fetched fields, processing location, token lifetime, revocation and deletion.
- Incident response procedure and applicable notification decision process.
- Affiliate disclosure if any commercial alternative recommendations are introduced.
- Trademark and asset provenance file; model license notices.

A cookie banner is not a universal legal requirement for an app using only necessary local storage. Assess actual technologies and jurisdictions instead of inserting a misleading consent banner. Keep marketing consent separate from sign-in.

## User workflows

**First private audit:** explore synthetic demo; create an empty encrypted vault; store passphrase in a password manager; import a local CSV or add manually; review every candidate; choose correct billing platform; export an encrypted backup. No account gate.

**Renewal review:** open calendar; inspect trial/renewal date; open subscription guide; finish action on the official provider site; record confirmation/effective date locally; export refreshed calendar if needed. Never mark a cancellation complete based only on opening a link.

**Device move:** export encrypted vault; transfer the file through a user-chosen secure method; open Substition on the new device; restore file with its passphrase; verify totals and entries; only then erase the old device copy. An email login alone does not move data.

**Model setup:** explain model/hosts/size; check GPU support and storage; download on explicit action; request persistent storage; verify a short response; opt into workspace context only if wanted. Delete weights in assistant controls independently of vault deletion.

## Support without sensitive-data collection

Default support evidence: browser/version, app version, error category, a synthetic CSV reproducer and a redacted screenshot if the user chooses. Do not request a full bank statement, inbox archive, vault passphrase, OAuth token or decrypted backup. No remote support tool should silently upload the workspace.

For parser bugs, ask users to recreate the problematic row with synthetic merchant/amount/date data while keeping the same delimiters and quoting. Provide a local diagnostic report containing capability flags only. Obtain consent before transmitting it.

## Account and deletion requests

Local-only records are already under the user's control. Explain local deletion/export accurately. If optional accounts are enabled, verify account ownership, export server-held account metadata, revoke sessions and delete account records according to the documented retention policy. Do not claim deleting the server account deletes every local device vault.

For future E2EE sync, list copies/backups and deletion windows. For emails already delivered, third-party mailbox retention is outside the app's control. Track a request with minimum metadata and do not record vault contents in the ticket.

## Incident response

Triage suspected exposure; preserve minimal technical evidence; restrict compromised deployment credentials; revoke affected sessions; rotate relevant secrets and signing keys; assess whether ciphertext, encryption material or plaintext could have been exposed. A client-code compromise can read an unlocked vault despite server storage being encrypted. Involve appropriate legal/security expertise to determine notification obligations from actual facts, then communicate precise impact and user steps.

## Release workflow

Make a focused branch/change. Use synthetic fixtures. Run tests/typecheck/Oxlint/Oxfmt/build. Review network destinations and bundled third-party code. Verify app and model offline flows separately on real devices. Version and sign catalog releases. Deploy a preview before production. Keep a known-good deployment and a compatible vault backup/rollback plan. Publish limitations and fix regressions before expanding scope.
