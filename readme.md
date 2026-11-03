# ProxiCommerce OS 🚀

> **The Offline-First, Point-of-Sale (POS) & Unified Commerce Engine for Local Merchants.**

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.78-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📖 Overview

**ProxiCommerce OS** is an open-source, offline-first commerce platform designed specifically for physical merchants, pop-up stores, and neighborhood retail. Powered by a high-performance **Turborepo monorepo**, it unifies an instant **Mobile POS (Point-of-Sale) terminal** with an online storefront and shared domain typing.

Even when connectivity drops entirely, ProxiCommerce OS continues processing sales, managing inventory counts, and storing transaction snapshots through an embedded local SQLite engine.

---

## ✨ Key Features

### 📱 Mobile POS & Merchant Terminal (`apps/mobile`)
- **Offline-First by Design**: Embedded local database using `expo-sqlite` with Write-Ahead Logging (`WAL`) and foreign-key integrity.
- **Atomic Sales Checkout**: Transactions and stock decrements are committed atomically using `db.withTransactionAsync()`, guaranteeing zero data corruption.
- **Interactive POS Cart**: In-memory shopping cart with animated quantity steppers ([`LayoutAnimation`](https://reactnative.dev/docs/layoutanimation)), subtotal calculation, and stock-bound guards.
- **Multiple Payment Channels**: Support for **Cash** (with automated change calculation), **NFC / Card**, **AI Scan**, and **Online Web**.
- **Product & Inventory Management**:
  - In-app camera capture with local document storage via `expo-file-system`.
  - Add, edit details, update stock counters, and permanently remove items with confirmation prompts.
  - Zero stock resilience (products remain in catalog without accidental deletion).
- **Material 3 Expressive UI**: Custom design system built with clean atomic components ([`Button`](apps/mobile/src/components/ui/Button.tsx), [`Card`](apps/mobile/src/components/ui/Card.tsx), [`IconButton`](apps/mobile/src/components/ui/IconButton.tsx), [`TextInput`](apps/mobile/src/components/ui/TextInput.tsx)) and an 8-point grid token architecture.

### 🌐 Next.js Web Storefront (`apps/web`)
- Server-side rendered (SSR) catalog with Next.js 15 App Router.
- Designed for seamless synchronization with cloud replicas and headless e-commerce backends.

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
     │  Local SQLite Engine  │ │  @proxi/types     │ │   Cloud Storefront    │
     │  - products           │ │  (Shared Domain   │ │   (Public Showcase)   │
     │  - transactions (WAL) │ │   Interfaces)     │ └───────────────────────┘
     │  - store settings     │ └───────────────────┘
     └───────────────────────┘
```

---

## 📁 Repository Structure

```
ProxiCommerce_OS/
├── apps/
│   ├── mobile/                    # Mobile POS App (Expo SDK 58, React Native 0.78)
│   │   ├── src/
│   │   │   ├── components/        # Atomic UI & domain-specific components
│   │   │   │   ├── catalog/       # Product cards & creation/editing modals
│   │   │   │   ├── layout/        # App bars and headers
│   │   │   │   ├── pos/           # Floating cart bar & checkout modals
│   │   │   │   └── ui/            # Buttons, Cards, Inputs, IconButtons
│   │   │   ├── db/                # SQLite initialization and SQL schema definitions
│   │   │   ├── hooks/             # Reactive hooks (useCart, useCatalog)
│   │   │   ├── services/          # SQLite service queries (catalog, transactions)
│   │   │   └── theme/             # Design tokens (colors, typography, spacing)
│   │   ├── App.tsx                # Mobile entry point
│   │   └── package.json
│   └── web/                       # Next.js 15 Web Storefront (App Router)
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
- **Expo Go** app installed on your physical iOS/Android device (or an emulator configured)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/proxi-commerce-os.git
cd proxi-commerce-os
npm install
```

### 2. Development Mode

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

## 🗄️ SQLite Database Schema

The mobile app initializes a local SQLite database named `proxi_commerce.db` with WAL mode enabled:

```sql
-- Store Profile
CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY NOT NULL,
  owner_auth_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stripe_account_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Catalog & Stock Inventory
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  stock_count INTEGER NOT NULL DEFAULT 0,
  image_uri TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Offline Sales Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  type TEXT CHECK(type IN ('NFC', 'AI_SCAN', 'ONLINE_WEB', 'CASH')) NOT NULL,
  total REAL NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  items TEXT NOT NULL -- Serialized JSON of CartItems
);
```

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

Contributions, feedback, and pull requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
