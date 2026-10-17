# Product strategy

Research snapshot: 17 October 2026. Primary pages were reviewed; their statements are product claims, not an independent security audit. The linked Google AI Mode and Perplexity shares could not be retrieved. The pasted brief and supplied visual boards supplied the product context.

## The opportunity

Subscription overload is a recurring administrative problem: people forget what they have, when it renews, who bills it and what it costs across a year. Start with a ten-minute private subscription audit. Earn a monthly habit through renewals and review, rather than trying to become a general banking app.

Positioning: **Your subscriptions, beautifully in order. Your financial life stays yours.** Privacy is necessary but already contested. Pair it with reliable import review, honest cancellation guidance, device portability and a calm interface.

First audience: people with five or more digital subscriptions who dislike granting bank access, including freelancers and internationally mobile users. First validation markets: South Africa, UK and US. Global architecture does not mean every country's merchant rules are verified on day one.

## Competitors and product opportunities

| Product                   | Verified offering                                                                                                                              | Limitation or open question                                                                                                                         | Substition response                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rocket Money              | Bank-linked detection, broader budgeting and premium cancellation assistance. Its security page says it does not store bank login credentials. | Bank access and concierge workflows add dependency and operational complexity. Country/merchant availability needs direct checking.                 | Useful without bank access or an account; route directly to the actual billing channel. Do not describe Rocket Money as insecure without evidence.                  |
| Bobby                     | iPhone subscription tracking, catalog, custom records and reminders.                                                                           | The reviewed App Store listing is iPhone-focused. Historical reviews ask for larger-screen support; these reviews are not proof of current defects. | A responsive PWA for phones, tablets and desktops, plus portable backups. Preserve Bobby's speed and simplicity.                                                    |
| Billr                     | Its App Store listing advertises local storage, on-device Gmail scanning, 19 currencies, catalog and no paywalls.                              | Privacy-first discovery is already a competitor feature. Cross-platform portability and cancellation coverage need further hands-on research.       | Differentiate with auditable cancellation routes, cross-device exports, explicit encryption controls and optional offline chat. Do not claim unique local scanning. |
| Lunch Money               | Bank/CSV/manual import, multi-currency, recurring expenses, calendar and collaboration.                                                        | It targets broader budgeting; the effort needed for a quick subscription-only review is an inference to validate.                                   | A focused audit and renewal workflow that takes minutes and remains useful offline. Learn from its currency handling.                                               |
| A spreadsheet or calendar | Flexible, private when local, nearly free and familiar.                                                                                        | Manual upkeep and no merchant routing.                                                                                                              | Imports must save time; the app must earn its place against a spreadsheet. Never hide export behind a paywall.                                                      |

Sources are linked in [research-sources](research-sources.md). No competitor was logged into or subjected to a screenshot-based UX audit in this session. These are offering comparisons, not invented hands-on findings.

## Features that earn the next release

1. **Billing-channel confidence:** separate “Netflix” from “paid via Apple.” Ask a targeted question instead of guessing a route.
2. **Trial guardrails:** user-defined lead time, timezone, cancellation cutoff and calendar delivery. Surface overdue trials for review instead of silently renewing a trial record.
3. **Cancellation evidence:** encrypted attachments, effective date and confirmation state. Distinguish requested, confirmed and disputed.
4. **Price-change history:** compare two locally imported receipts, retain provenance and review before updating the price.
5. **Bundle review:** show possible duplication without claiming a service is unused. Example: cloud-storage bundles and overlapping music plans.
6. **Snooze and seasonal rotation:** private reminders for rotating streaming services, with no automated purchase or cancellation.
7. **Annual commitment warning:** an annual contract paid monthly can incur fees; never infer commitment from payment cadence.
8. **Lifetime purchase comparison:** break-even calculation using user-provided prices, useful life and opportunity cost assumptions.
9. **Household coordination:** explicit sharing of selected subscription records; no sharing of inboxes or full financial histories.
10. **Renewal stress map:** show charge clustering and a user-set cash-flow target. No invented account balances.
11. **Refund drafting:** local text template with no automatic email sending. Show exactly what will be shared.
12. **Accessibility and recovery:** keyboard-first flows, large text, device migration and a backup health check.

Defer screen-time inference: a PWA cannot read arbitrary app usage on iOS. Defer receipt forwarding unless users explicitly accept server processing. Defer card controls and banking aggregation until a regulated provider and a clear commercial case exist.

## Pricing hypotheses, not market facts

Keep unlimited local tracking, export, essential reminders and cancellation links free. Security features and deletion are never premium.

| Offer      | Test price                    | Why pay                                                                                                       |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Local      | Free                          | Full private manual tracking, local imports and offline assistance on supported devices.                      |
| Supporter  | $19–29 one time               | Optional app themes, supporting development and nonessential polish. Price does not promise lifetime hosting. |
| Plus       | $24–36/year, optional monthly | Future encrypted sync, device recovery tools and curated regional route updates. Only charge once delivered.  |
| Household  | $39–59/year                   | Future selective encrypted sharing and household coordination.                                                |
| Freelancer | $49–79/year                   | Future exports by business owner, tax labels and auditable renewal history. No tax advice.                    |

Avoid launching five overlapping paid tiers. Start with one annual plan after repeat use is demonstrated. Offer regional prices in local currency, with tax and renewal terms shown before purchase. Consider a merchant of record for global tax handling, subject to supported countries and cost.

Affiliate alternatives are an optional later experiment. Disclose compensation at recommendation time, do not send a user's subscription list to advertisers and keep paid placement separate from organic ranking. Never sell financial records. Human cancellation concierge increases sensitive-data exposure; it is not the initial model.

Illustrative unit economics: at $29/year and 1,000 payers, gross revenue is $29,000/year before fees, tax, support and refunds. A $20 acquisition cost leaves little room for an annual plan until retention is proven. These are planning scenarios, not revenue forecasts. Local inference avoids per-chat cloud inference fees but creates device-compatibility support costs.

## Validation and launch

Interview 20 people. Ask them to estimate subscriptions and cost before a private audit, then compare with records they choose to share. Do not collect their statements. Measure the size of the recall gap, the effort to complete the audit and willingness to pay for the next job.

First 30 days: recruit 30–50 testers, test manual entry and three common CSV formats, observe one provider cancellation per billing channel, and publish the privacy architecture. Define success before measuring: 70% add three real subscriptions, 50% finish an import review, 30% return before a renewal. Treat these as test thresholds, not industry benchmarks.

Days 31–60: add country-specific route coverage, improve parser failures, test backup restore on a second device, verify PWA install flows and run a transparent pricing survey. Avoid adding cloud sync before local recovery is sound.

Days 61–90: sell one small paid capability only if delivered; publish a public changelog and a supported-feature matrix. Measure annualized projected savings separately from provider-confirmed realised savings.

## Marketing experiments

- Lead magnet: an anonymous local “10-minute subscription audit.” Explain file processing before selection; show a manual alternative.
- Content: “What did I forget I was paying for?”, trial cutoffs, actual billing-channel guides and privacy tradeoffs. Use consented or synthetic examples.
- Search: maintain dated, country/platform-specific cancellation guides with official source links. Avoid hundreds of thin autogenerated merchant pages.
- Short video: show a 30-second local import and one reviewable cancellation path. No fabricated customer savings or testimonials.
- Partners: privacy newsletters, personal-finance educators and freelancer communities. Offer fixed sponsorship or clearly disclosed affiliates.
- Product launch: show the app running offline and restore a vault live. Publish what the product cannot do.
- Retention: optional calendar reminders, a monthly review ritual and a backup reminder. No surprise marketing notifications.

Marketing metrics should be voluntary aggregate reports or acquisition counts. Do not attach merchant lists to analytics identifiers. Obtain explicit consent before any off-device product telemetry. Initially use interviews and anonymous feedback instead.
