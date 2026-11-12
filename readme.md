# ProxiCommerce OS

> **An offline-first point-of-sale and commerce platform for local merchants.**
>
> **Development status: Work in progress.** The mobile app, web storefront, cloud
> synchronization, and security configuration are all under active development.
> Features and setup may change; this project is not production-ready.

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=flat&logo=react&logoColor=black)](https://reactnative.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?style=flat&logo=turborepo&logoColor=white)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat)](#development-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](https://opensource.org/licenses/MIT)

---

## 📖 Overview

**ProxiCommerce OS** is an open-source project exploring an offline-first commerce platform for physical merchants, pop-up stores, and neighborhood retail. The **Turborepo monorepo** contains an Expo/React Native POS app, an early-stage Next.js storefront, and shared TypeScript domain types.

The mobile app stores catalog and transaction data locally in SQLite. New users can opt in to automatic Supabase synchronization; manual Google Drive backups are a separate export/restore feature. The project is still evolving: cloud integration, security policies, and the web storefront need further development and validation before production use.

## 🚧 Development Status

All parts of this repository are in development. Expect incomplete workflows, changing interfaces, and setup requirements that may evolve. In particular:

- The web storefront is currently a scaffold, not a complete customer shopping experience.
- Supabase synchronization and storage require a configured project and matching schema.
- Review and harden the Supabase Row Level Security (RLS) policies before connecting real users or data. The current example policies are permissive for development.
- Do not apply [`supabase/schema.sql`](supabase/schema.sql) to a database containing data without reviewing it first; it includes statements that drop and recreate tables.
- Authentication email confirmation and other provider settings are configured in Supabase, not by the app.

---

## ✨ Key Features

### 📱 Mobile POS & Merchant Terminal (`apps/mobile`)
- **Local-first data**: SQLite storage via `expo-sqlite`, with write-ahead logging and transaction support.
- **Point-of-sale flow**: Product catalog, cart, cash checkout with change calculation, and card/NFC payment selection.
- **Inventory and sales records**: Checkout updates local stock and stores transaction snapshots; sales history and refund flows are implemented locally.
- **Cash closing**: Daily cash reconciliation and closure records can be stored locally and optionally queued for Supabase sync.
- **Store accounts**: Supabase email/password authentication and merchant store onboarding are wired into the mobile app.
- **Product & Inventory Management**:
  - Add, edit, update stock, scan barcodes, and remove products.
  - Capture product images locally; image upload requires the matching Supabase Storage bucket.
- **Optional Supabase synchronization**: New accounts can opt in during registration. When enabled, supported product, transaction, and closure changes are sent to Supabase when online.
- **Manual Google Drive backups**: Export or restore a store-scoped snapshot on demand; this is not device-to-device synchronization.
- **POS interface**: Shared theme tokens and reusable UI components, including a bottom navigation bar.

### 🌐 Next.js Web Storefront (`apps/web`)
- Early Next.js 15 App Router scaffold; a complete storefront and cloud-connected catalog are not yet implemented.

### 📦 Shared Domain Models (`packages/types`)
- Central source of truth for TypeScript interfaces (`Product`, `Store`, `CartItem`, `Transaction`, `TransactionType`).

---

## 🏗️ Architecture & Data Flow

```
                      ┌──────────────────────────────────────┐
                      │          Turborepo Monorepo          │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │      apps/mobile      │                       │       apps/web        │
     │  (Expo SDK 58 / RN)   │                       │     (Next.js 15)      │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
                 ├───────────────────────┬───────────────────────┤
                 │                       │                       │
                 ▼                       ▼                       ▼
     ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
     │  Local SQLite Engine  │ │  @proxi/types     │ │   Supabase Cloud      │
     │  - products           │ │  (Shared Domain   │ │   (Sync backend)      │
     │  - transactions (WAL) │ │   Interfaces)     │ └───────────────────────┘
     │  - store settings     │ └───────────────────┘
     └───────────────────────┘
```

---

## 📁 Repository Structure

```
ProxiCommerce_OS/
├── apps/
│   ├── mobile/                    # Mobile POS App (Expo SDK 58, React Native 0.88)
│   │   ├── src/
│   │   │   ├── components/        # Atomic UI & domain-specific components
│   │   │   │   ├── catalog/       # Product cards & creation/editing modals
│   │   │   │   ├── layout/        # Header and bottom navigation
│   │   │   │   ├── pos/           # Floating cart bar & checkout modals
│   │   │   │   └── ui/            # Buttons, Cards, Inputs, IconButtons
│   │   │   ├── db/                # SQLite initialization and SQL schema definitions
│   │   │   ├── hooks/             # Auth, catalog, cart, and sync hooks
│   │   │   ├── services/          # SQLite, Supabase sync, and storage services
│   │   │   └── theme/             # Design tokens (colors, typography, spacing)
│   │   ├── App.tsx                # Mobile entry point
│   │   └── package.json
│   └── web/                       # Early Next.js 15 storefront scaffold
│       ├── src/app/               # Pages & layouts
│       └── package.json
├── packages/
│   └── types/                     # Central TypeScript domain interfaces
│       ├── src/index.ts           # Product, Transaction, Store definitions
│       └── package.json
├── package.json                   # Root monorepo configuration (npm workspaces)
├── turbo.json                     # Turborepo task pipeline
└── readme.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js**: `20.x` or higher
- **npm**: `10.x` or higher
- **Expo Go** app installed on your physical iOS/Android device (or a simulator/emulator configured)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ruferson/ProxiCommerce_OS.git
cd ProxiCommerce_OS
npm install
```

### 2. Configure Supabase (optional for local-only development)

Copy the mobile environment template and provide a Supabase project URL and public anon key:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`.
Without these values, cloud authentication and synchronization are unavailable; local
development can still start. Configure the database and Storage bucket separately, and
review the development RLS policies before using any real data.

### 3. Optional Supabase sync and manual Google Drive backups

These are separate features:

- **Supabase sync** is optional and off by default at registration. If enabled, the app
  queues supported changes and sends them to Supabase when internet is available. The
  `Supabase` action in the bottom navigation opens the catalog replacement/conciliation
  flow; the status badge in the header reports the automatic queue.
- **Google Drive backup** is always a user-initiated export or restore. It does not keep
  devices synchronized and does not change Supabase. It includes products, sales, and
  cash closures for the active store only. Restoring replaces those records on this
  device after confirmation. The JSON snapshot is not encrypted by the app; device-local
  image files are not included (remote image URLs are kept and device-local image paths
  are cleared in the exported snapshot).

#### Google Cloud Console

The supplied screenshots show the `ProxiCommerce-OS` project, an enabled Google Drive
API, and existing Android and Web OAuth clients. Verify the following settings:

1. Keep **Google Drive API** enabled in **APIs & Services → Enabled APIs & services**.
2. Configure the OAuth consent screen for the intended audience. While the app is in
   Testing, add the Google accounts that will use it as test users. Request only the
   `https://www.googleapis.com/auth/drive.file` scope used by the app.
3. For the existing **Android** OAuth client, confirm the package name is
   `com.proxicommerce.app`. Add the SHA-1 fingerprints for every signing certificate
   used to install the app (local debug, EAS build, and Google Play app-signing
   certificate if applicable). For EAS/Play fingerprints, use the credentials shown
   by EAS and Play Console; do not assume the local debug certificate is sufficient.
4. For the existing **Web application** OAuth client, use its client ID for
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. If using the Expo web build, configure the
   authorized JavaScript origins and redirect URI for that actual web deployment.
5. The screenshots do not show an **iOS** OAuth client. Create one with bundle ID
   `com.proxicommerce.app` and use its client ID for
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. For Android, set
   `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` to the Android client ID.
6. Do not create an API key or put an OAuth client secret in the app. These are native
   OAuth clients; the app requests a short-lived access token and stores no refresh
   token. No service account is needed.

Google sign-in for the app is handled by **Supabase OAuth with PKCE** and a system
browser, on both Android and iOS. In Supabase Dashboard → Authentication → Sign In /
Providers → Google, configure the **Web application** OAuth client ID and its client
secret on the server. Add the Supabase callback URL shown on that page to the Web
client's authorized redirect URIs. In Supabase Authentication → URL Configuration,
allow `proxicommerce://auth/callback` as a redirect URL. The app exchanges the returned
authorization code with Supabase; it does not receive or validate a Google ID token.
Therefore this login flow does not need a reversed iOS Google client-ID scheme or
native Google Sign-In SDK. Google Android/iOS client IDs in the app are used for the
separate, direct-to-Drive backup authorization.

For direct Google Drive authorization, Expo AuthSession returns to
`com.proxicommerce.app:/oauthredirect`; Expo registers that scheme in the Android
manifest and iOS `CFBundleURLTypes`. For Supabase sign-in, `proxicommerce` is registered
as the app callback scheme on both platforms.

After setting IDs in `apps/mobile/.env` (copy the names from
[`apps/mobile/.env.example`](./apps/mobile/.env.example)), rebuild the native app with
`npx expo run:android` or `npx expo run:ios`. OAuth client IDs are public identifiers,
not secrets.

Because `.env` files are gitignored, also add the required
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values to the matching EAS development, preview, and
production environments before cloud builds. The Google IDs are public; do not add a
Google client secret to EAS build variables or the mobile app. The Google web client
secret belongs only in the Supabase Google-provider settings.

The access to Drive is restricted to files created or opened by this app through
`drive.file`. The app lists only its own backup files tagged for the active store.
Existing raw SQLite `.db` exports from older versions are not compatible with this
store-scoped JSON backup format.

### 4. Development Mode

Run all workspace applications (Mobile & Web) concurrently:

```bash
npm run dev
```

Or run individual apps independently:

#### Run Mobile (Expo):
```bash
cd apps/mobile
npm run dev
# Scan the terminal QR code with Expo Go (Android) or the Camera app (iOS)
```

#### Run Web Storefront (Next.js):
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

---

## 🗄️ Local Data

The mobile app initializes `proxi_commerce.db` with WAL mode enabled. Its local schema
currently includes store settings, products, transactions, cash closures, the sync queue,
and key-value storage for authentication persistence. The schema is defined and migrated
in [`apps/mobile/src/db/schema.ts`](apps/mobile/src/db/schema.ts); it evolves with the app.

The Supabase example schema is [`supabase/schema.sql`](supabase/schema.sql). Review its
destructive reset statements and development-only access policies before applying it.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts all apps concurrently via Turborepo |
| `npm run build` | Builds all packages and web app for production |
| `npm run lint` | Runs linter across all monorepo packages |
| `npm run clean` | Cleans `.turbo`, cache, and build outputs |

---

## 🤝 Contributing

Contributions, feedback, and pull requests are welcome. As the project is in active
development, please open an issue to discuss larger changes before starting work.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
