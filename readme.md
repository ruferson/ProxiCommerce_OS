# ProxiCommerce OS 🚀

A scalable, offline-first commerce monorepo powered by **Expo SDK 58**, **React Native 0.78**, **Next.js 15**, and **Turborepo 2**.

## 🏗️ Architecture & Technical Stack

- **Monorepo Management**: `npm workspaces` + [Turborepo 2](https://turbo.build/)
- **Mobile Application (`apps/mobile`)**:
  - Expo SDK 58 (Expo Go compliant)
  - React Native 0.78
  - Local SQLite database (`expo-sqlite`)
  - Safe area management (`react-native-safe-area-context`)
  - File system operations (`expo-file-system/legacy`)
- **Web Storefront (`apps/web`)**: Next.js 15, React 18
- **Shared Packages (`packages/types`)**: Centralized TypeScript data models & domain interfaces
- **Design System**: Atomic UI components (`Button`, `Card`, `IconButton`, `TextInput`) built on top of centralized Design Tokens (`theme/`)

## 🛠️ Project Structure

    ProxiCommerce_OS/
    ├── apps/
    │   ├── mobile/            # Expo SDK 58 POS Mobile Terminal
    │   └── web/               # Next.js 15 PWA Storefront
    ├── packages/
    │   └── types/             # Shared TypeScript types & entity models
    ├── package.json           # Root package manager & workspace setup
    └── turbo.json             # Turborepo task pipeline configuration

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Expo Go app on your mobile device

### Installation

1. **Install all workspace dependencies from the root:**

   npm install

2. **Run all applications concurrently in development mode:**

   npm run dev

3. **Run the mobile app independently:**

   cd apps/mobile
   npm run dev

## 📄 License

MIT
