# Merchant normalization and routing catalog

The current app bundles twelve merchant records in `src/lib/catalog.ts`. This is a useful starter dataset, not verified worldwide coverage. Routes are curated starting points; no record is represented as human-verified or guaranteed current.

## Separate identity from authority

Normalize a messy descriptor to candidate product identities, then ask who bills the subscription. `APPLE.COM/BILL`, `GOOGLE*` and a generic Stripe charge do not identify one app. Never map those descriptors to a specific provider. Match sender domains by exact host or correct subdomain boundary, not substring. Never trust a display name in an email as authentication.

The starter matcher uses normalized known aliases and returns reviewable drafts. It has a known false-positive ceiling. Keep it local. Do not upload user corrections into the public catalog by default. Moderate deliberately submitted aliases without attaching raw statements or email.

## Catalog model for the next stage

Use four core entities initially. Add plan/alternative taxonomies only after a real feature uses them.

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table provider (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  canonical_name text not null,
  parent_id uuid references provider(id),
  domains text[] not null default '{}',
  category text not null,
  logo_path text,
  status text not null check (status in ('draft','active','merged','retired')),
  merged_into uuid references provider(id),
  updated_at timestamptz not null default now()
);

create table provider_alias (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider(id),
  kind text not null,
  normalized_value text not null,
  country char(2),
  confidence numeric not null check (confidence between 0 and 1),
  source_url text,
  review_state text not null check (review_state in ('draft','reviewed','rejected')),
  unique nulls not distinct (kind, normalized_value, country)
);

create table cancellation_route (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references provider(id),
  billing_channel text not null,
  country char(2),
  locale text not null default 'en',
  contract_type text,
  method text not null,
  url text check (url is null or url like 'https://%'),
  steps jsonb not null default '[]',
  timing text not null check (timing in ('unknown','immediate','period_end','user_choice')),
  verification text not null check (verification in ('unverified','human_verified','stale','broken')),
  source_url text not null,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (provider_id,billing_channel,country,locale,contract_type)
);

create table catalog_release (
  version text primary key,
  published_at timestamptz not null,
  sha256 text not null,
  signature text not null,
  minimum_app_version text not null,
  record_count integer not null
);
```

PostgreSQL 15+ supports `NULLS NOT DISTINCT`. Ordinary nullable unique constraints in the pasted schema would permit duplicate global rows. Its trigram index also needs `pg_trgm`. Avoid a uniqueness constraint on `(merchant, locale, is_primary)` that permits only one non-primary email template. These details matter before deploying the proposed larger schema.

## Resolution rules

1. Require an explicit billing channel. Unknown biller produces a chooser, not an automatic route.
2. Prefer provider + channel + country + contract type; then known global provider/channel fallback. Locale fallback changes language only, never legal applicability.
3. Exclude broken routes. Show stale routes as stale with a documented fallback and last-reviewed date.
4. Merchant-direct and merchant-via-Stripe routes go to the merchant account/billing page. A universal `app://create-stripe-portal-session` for unrelated merchants is invalid.
5. Apple/Google routes open official user management. Developer cancellation APIs require the publisher's authority and purchase identifiers, not merely a consumer OAuth login.
6. PayPal automatic-payment cancellation is distinct from ending the underlying service contract.
7. Treat HTTP 200 or a login redirect as reachability only. Neither proves the cancellation workflow works.

## Safe distribution

Bundle a baseline snapshot. A future public catalog endpoint serves the same complete snapshot for a locale/region cohort rather than revealing individual merchant queries. Sign canonical release bytes with an offline-controlled signing key. Clients verify with a pinned public key, validate schema and limits, reject rollback, and atomically replace the prior accepted snapshot. Keep a last-known-good copy. A checksum alone is not authenticity.

No remote executable regex, HTML or arbitrary deep link should enter a catalog update. Use bounded exact/token rules; if reviewed regex is necessary, protect against catastrophic backtracking. Sanitize imported SVGs at build time or publish raster assets from a reviewed source. Restrict route protocols and approved domains. A compromised catalog must not become an executable-code channel.

## Catalog maintenance workflow

Contributor submits public merchant facts and official source links. Maintainer checks product/biller distinction, regional applicability and trademark rights. A link check validates scheme/redirect hosts and reachability, with SSRF protection and no access to private network ranges. A human walks the cancellation route with an authorised test account; no real consumer action is performed without consent.

Record source, reviewer, timestamp and change diff. Mark unreviewed routes stale at a documented 30–90 day threshold according to risk. Retain broken routes for audit, while preferring a safer fallback. Publish signed releases and a rollback procedure. Community submissions stay quarantined until reviewed.

## Pricing and alternatives

Prices require country, currency, tax inclusion, plan, commitment, source and observation time. A stale price is not a savings fact. Compare equivalent plans and user constraints, and show cancellation fees. Affiliate compensation is separately disclosed and never changes an organic score silently. Do not use customer-specific merchant IDs in server analytics merely because the catalog IDs are public.
