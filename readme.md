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

The mobile app stores catalog and transaction data locally in SQLite and queues supported changes for synchronization when connectivity is available. The project is still evolving: cloud integration, security policies, and the web storefront need further development and validation before production use.

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
- **Cash closing**: Daily cash reconciliation and closure records can be stored locally and queued for cloud sync.
- **Store accounts**: Supabase email/password authentication and merchant store onboarding are wired into the mobile app.
- **Product & Inventory Management**:
  - Add, edit, update stock, scan barcodes, and remove products.
  - Capture product images locally; image upload requires the matching Supabase Storage bucket.
- **Queued synchronization**: Supported product, transaction, and closure changes are queued locally and sent to Supabase when online.
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

### 3. Development Mode

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
