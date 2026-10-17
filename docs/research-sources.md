# Research sources

Reviewed on 17 October 2026. Links are direct primary sources where possible. Competitor descriptions are claims from their own pages, not an independent audit. Pricing hypotheses in the strategy document are our proposed experiments, not extracted competitor prices.

## Competitors

- [Rocket Money: cancellation requests](https://help.rocketmoney.com/en/articles/934402-how-do-i-cancel-a-subscription-on-rocket-money) — premium-assisted workflow and follow-up responsibilities.
- [Rocket Money: premium features](https://help.rocketmoney.com/en/articles/2677184-premium-membership-features) — broader account-linked finance features.
- [Rocket Money: security](https://www.rocketmoney.com/security) — its stated credential and security practices; do not infer it stores bank passwords.
- [Bobby App Store listing](https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023) — manual catalog, fixed-cost view, reminders and iPhone listing. User reviews include historical multi-device requests, which may not reflect today's state.
- [Billr App Store listing](https://apps.apple.com/us/app/billr-track-subscriptions/id6759629002) — explicitly advertises local Gmail scanning, local data, currencies and no accounts/paywalls. Apple states developer privacy declarations are not verified by Apple.
- [Lunch Money features](https://lunchmoney.app/features) — multi-currency, CSV/bank/manual input, recurring expenses, calendar and collaboration.

## Cancellation authority

- [Apple consumer cancellation guidance](https://support.apple.com/en-us/118428) — device/web management and billing-account distinctions, plus regional differences.
- [Apple Advanced Commerce API](https://developer.apple.com/in-app-purchase/advanced-commerce-api/) — a publisher integration, not general authority over all consumer subscriptions.
- [Google Play consumer cancellation guidance](https://support.google.com/googleplay/answer/7018481) — uninstalling is not cancellation, access/commitments vary.
- [Google subscriptionsv2.cancel API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/cancel) — package/purchase-token-specific developer endpoint.
- [Stripe portal-session creation](https://docs.stripe.com/api/customer_portal/sessions/create) — authenticated merchant API and existing customer context. Substition cannot create sessions for unrelated Stripe merchants.

## Implementation

- [Better Auth magic links](https://better-auth.com/docs/plugins/magic-link).
- [Better Auth email OTP](https://better-auth.com/docs/plugins/email-otp).
- [Gmail scope classification](https://developers.google.com/workspace/gmail/api/auth/scopes) — assess requirements before asking users to connect email.
- [web.dev theming](https://web.dev/learn/design/theming) — browser theme colour, manifest, system preference and CSS custom properties.
- [WebLLM getting started](https://webllm.mlc.ai/docs/user/get_started.html).
- [WebLLM basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html).
- [WebLLM API](https://webllm.mlc.ai/docs/user/api_reference.html).
- [WebLLM advanced caching](https://webllm.mlc.ai/docs/user/advanced_usage.html).
- [WebLLM model registry](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts) — supported model identifiers and memory/feature requirements. The app uses the registry in its pinned installed package.
- [SmolLM2 model card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) and [MLC quantized model](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC).

## Legal research starting points

- [EU GDPR official text](https://eur-lex.europa.eu/eli/reg/2016/679/oj).
- [California Attorney General CCPA information](https://oag.ca.gov/privacy/ccpa).
- [South Africa Information Regulator](https://inforegulator.org.za/).
- [UK ICO data protection guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/).
- [WIPO Global Brand Database](https://branddb.wipo.int/).

These are places to investigate applicability, not evidence that the app has been certified or meets every requirement.

## Unavailable references

The supplied `share.google/aimode/irCac8JYegPzZljZ9` and Perplexity share returned retrieval errors. Their contents were not verified or used as independent evidence. The user supplied a detailed product brief and visual reference boards, which informed the implementation and design direction.
