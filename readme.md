# ProxiCommerce OS

> Offline-first point-of-sale and commerce platform for local merchants.

**Development status: work in progress.** The project is not production-ready.
Database migrations, Stripe integrations, authentication providers, and native builds
must be configured and validated before real users or payments are used.

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=flat&logo=react&logoColor=black)](https://reactnative.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?style=flat&logo=turbo.build)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](LICENSE)

---

## Overview

ProxiCommerce OS is a Turborepo monorepo for small local merchants:

- `apps/mobile`: Expo/React Native merchant POS.
- `apps/web`: Next.js customer storefront.
- `packages/types`: Shared TypeScript domain types.
- `supabase`: SQL migrations and cloud configuration.

The mobile app keeps the operational catalog and transactions in local SQLite. Supabase
can publish the public catalog and synchronize supported changes. Google Drive is a
separate, manual, store-scoped backup mechanism.

---

## Current status

### Implemented

#### Mobile POS

- Local SQLite database with WAL mode.
- Product CRUD, stock, barcode, and local/remote image support.
- Cash sales with change calculation.
- Barcode scanning.
- Sales history and refund flows.
- Daily cash closing and reconciliation.
- Store creation and Supabase email/password or Google authentication.
- Manual Google Drive export and restore.
- Realtime and incremental inbound synchronization.
- Optional Supabase synchronization that can be enabled or disabled from the app.
- One-tap upload of the complete local catalog to Supabase.
- Configurable OpenAI-compatible receipt vision provider.
- Receipt reconciliation and AI/receipt transaction registration, disabled by default.

#### Web storefront

- Dynamic `/store/[store_slug]` route.
- Server-rendered initial catalog.
- Live product and stock updates with Supabase Realtime.
- Product search and category-free basic filtering.
- Store-specific cart.
- Pickup and delivery fulfillment forms.
- Atomic `create_web_order` RPC order creation.
- Stock decrement inside the database transaction.
- Pickup code displayed after order confirmation.
- PWA manifest and service-worker registration.

#### Supabase

- Public stores and products.
- Store-owner RLS policies.
- Public product read access.
- Product image storage bucket.
- Atomic web-order RPC.
- Realtime publication for transactions and products.
- Phase 4 foundation migration for payment and fulfillment fields.
- Phase 4 tables and RPCs for provider events, payment attempts, pickup validation,
  fulfillment updates, and pickup state.

#### Phase 4 foundation

The database foundation for paid orders is implemented, but Stripe payment processing
itself is not complete.

Present:

- Payment, fulfillment, refund, and pickup fields.
- Stripe account fields on stores.
- Provider-event and payment-attempt tables.
- Idempotency-oriented event schema.
- Fulfillment update RPC.
- One-time pickup validation RPC.

Not present:

- Stripe Checkout hosted sessions.
- Stripe Connect account onboarding.
- Stripe Connect webhooks.
- Apple Pay or Google Pay payment processing.
- Stripe Terminal or real Tap to Pay.
- Real QR image generation.
- Stripe refunds.
- Paid-order checkout enforcement.

The existing mobile NFC option only registers a local `NFC` transaction. It does not
open an NFC reader or call Stripe.

---

## Architecture

```text
┌──────────────────┐       ┌─────────────────────┐
│ Expo/React Native │◄────►│ Supabase             │
│ Local SQLite      │       │ Auth, PostgreSQL     │
│ Catalog & POS     │       │ Realtime, Storage    │
└────────┬─────────┘       └──────────┬──────────┘
         │                            │
         │ manual JSON backup         │ public catalog
         ▼                            ▼
┌──────────────────┐       ┌─────────────────────┐
│ Google Drive     │       │ Next.js Storefront   │
│ Store snapshot   │       │ Cart & web orders    │
└──────────────────┘       └─────────────────────┘
```

### Data ownership

- **Mobile SQLite:** merchant operational source for local POS.
- **Supabase:** public catalog, cloud synchronization, and web orders.
- **Google Drive:** optional manual snapshot export and restore.
- **Card processors:** not yet integrated.

The web storefront reads products from Supabase. It does not read the mobile SQLite
database or Google Drive.

---

## Repository structure

```text
apps/
  mobile/
    App.tsx
    src/
      components/
      db/
      hooks/
      lib/
      screens/
      services/
      theme/
  web/
    src/
      app/
      components/
      lib/
      types/
packages/
  types/
    src/
      index.ts
      index.d.ts
supabase/
  migrations/
  schema.sql
```

---

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- A Supabase project.
- Expo development tooling for the mobile app.
- Google OAuth configuration if Google sign-in or Drive backup is required.
- A physical iOS/Android device for native camera, NFC, or OAuth validation.

`Expo Go` is sufficient for some local UI and SQLite workflows, but native integrations
such as a future Stripe Terminal SDK require an Expo development build or custom native
module.

---

## Installation

```bash
git clone https://github.com/ruferson/ProxiCommerce_OS.git
cd ProxiCommerce_OS
npm install
```

Copy the environment templates:

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.example apps/web/.env.local
```

Configure both Supabase public environment pairs:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

The public anon key is not an administrator key. The database must enforce access
through RLS and authorized RPCs.

---

## Supabase setup

Do not apply [`supabase/schema.sql`](supabase/schema.sql) to an existing database.
It contains destructive drop-and-recreate statements intended only for controlled
initialization of an empty database.

Apply migrations in chronological order using the Supabase SQL Editor or Supabase CLI:

1. [`20261117110000_public_storefront.sql`](supabase/migrations/20261117110000_public_storefront.sql)
2. [`20261120120000_phase4_orders_payments.sql`](supabase/migrations/20261120120000_phase4_orders_payments.sql)

After applying the migrations, notify PostgREST:

```sql
NOTIFY pgrst, 'reload schema';
```

Verify that the RPCs exist:

```sql
select proname, pronargs
from pg_proc
where proname in (
  'create_web_order',
  'update_order_fulfillment',
  'validate_pickup_order'
);
```

Verify the payment columns:

```sql
select payment_status, fulfillment_status
from public.transactions
limit 1;
```

The storefront migration:

- replaces RLS policies on stores, products, transactions, transaction items, and closures;
- creates the public stores view;
- creates the public product-images bucket;
- creates `create_web_order`;
- enables Realtime publication.

Review all policies before production use.

---

## Supabase synchronization

Supabase synchronization is optional and independent of Google Drive.

### Enable from the mobile app

The mobile app exposes a **Supabase synchronization** switch:

1. Open the `Supabase desactivado` status in the header or `Activar nube` in the bottom
   navigation.
2. Activate synchronization.
3. Confirm the complete local catalog upload.

Activation:

- stores `cloud_sync_enabled: true` in the authenticated user's metadata;
- replaces the remote catalog with the active store's local catalog;
- deletes remote-only products;
- enables automatic queue synchronization for supported mutations.

If synchronization is disabled, local writes continue to work but are not added to the
remote sync queue.

### Manual reconciliation

When synchronization is active, the `Catalogo` action asks whether to download the remote
catalog or upload the local catalog. These options are destructive and should be used
with care.

---

## Google Drive backups

Google Drive backup is:

- manual;
- store-scoped;
- independent of Supabase synchronization;
- not an encrypted database copy;
- not device-to-device synchronization.

The snapshot includes products, sales, and closures. Device-local image paths are cleared
from exported JSON. Remote image URLs are retained.

Restore replaces products, sales, and closures for the active store on the current
device. It does not modify Supabase or another store.

Configure the Google Drive API and OAuth clients described in
`apps/mobile/.env.example`. Native OAuth requires rebuilds rather than merely changing
variables in Expo Go.

---

## Authentication

The mobile app supports:

- Supabase email/password auth;
- Google OAuth through Supabase PKCE;
- automatic store resolution by `owner_auth_id`;
- a store onboarding screen for accounts that do not yet own a store.

Configure provider settings in the Supabase dashboard. The app callback must include:

```text
proxicommerce://auth/callback
```

Direct Google Drive authorization uses the platform-specific OAuth client and the Expo
redirect URI. Never place a Google or Supabase service-secret in the mobile app.

---

## AI receipt scanning

Receipt scanning is prepared for a multimodal provider compatible with the OpenAI
`chat/completions` format. It is disabled by default.

Optional mobile variables:

```dotenv
EXPO_PUBLIC_AI_API_URL=https://your-provider.example/v1/chat/completions
EXPO_PUBLIC_AI_MODEL=your-vision-model
EXPO_PUBLIC_AI_API_KEY=your-api-key
```

Set `AI_RECEIPT_ANALYSIS_ENABLED` to `true` in
[`ReceiptScannerModal.tsx`](apps/mobile/src/components/pos/ReceiptScannerModal.tsx)
before testing. The key is embedded in the mobile build because of `EXPO_PUBLIC_*`.
Use a restricted local-development key only. A production implementation should proxy
AI requests through a server-side function and keep the provider key out of the app.

---

## Stripe status

Stripe is not production-integrated yet. Phase 4 foundation is present in
`20261120120000_phase4_orders_payments.sql`, but Supabase Edge Functions and payment UI
still need implementation.

Before implementation, Stripe secrets must be stored in Supabase Edge Function secrets,
for example:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_VERSION`

Do not use `EXPO_PUBLIC_STRIPE_SECRET_KEY`, a Stripe secret key in Next.js client code,
or a Supabase Service Role key in the PWA/mobile bundle.

---

## Development

Start all applications:

```bash
npm run dev
```

Run only the mobile app:

```bash
npm run dev:mobile
```

Run only the web app:

```bash
npm run dev:web
```

Open the storefront at:

```text
http://localhost:3000/store/<store_slug>
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start mobile and web applications. |
| `npm run dev:mobile` | Start Expo only. |
| `npm run dev:web` | Start Next.js only. |
| `npm run build` | Build all workspaces through Turborepo. |
| `npm run lint` | Run configured linters. |
| `npm run clean` | Clean generated caches and build outputs. |

Build targets can also be run independently:

```bash
npm run build --workspace=@proxi-commerce/mobile
npm run build --workspace=@proxi-commerce/web
```

---

## Local data

The mobile database is `proxi_commerce.db`. Its schema is initialized and migrated in
[`apps/mobile/src/db/schema.ts`](apps/mobile/src/db/schema.ts).

Current mobile tables include:

- `store`
- `products`
- `transactions`
- `closures`
- `sync_queue`
- `app_kv_store`

Transactions store a JSON snapshot of transaction items. The code also records refund,
fulfillment, payment, and pickup fields where Phase 4 migration columns are available.

---

## Known limitations

- No real Stripe Connect, Stripe Checkout, Terminal, or Tap to Pay.
- The card/NFC POS option does not execute a payment.
- No real QR payload/signature, only a textual pickup code.
- No production dispute, refund, payout, or Stripe webhook workflow.
- Apple Pay and Google Pay are not implemented.
- The AI provider key must not be shipped in production builds.
- Google Drive data is not encrypted by the app.
- iCloud is not implemented.
- Supabase migrations must be applied manually or through a deployment pipeline.
- The repository has no configured automated test suite yet.
- The app is not ready for real financial or personal-data use.

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE).
