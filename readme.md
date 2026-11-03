# ProxiCommerce OS 🚀

A scalable, offline-first commerce monorepo powered by **Expo SDK 58**, **React Native**, **Next.js**, and **Turborepo**.

## 🏗️ Architecture & Stack

- **Monorepo Management**: `npm workspaces` + [Turborepo 2.x](https://turbo.build/)
- **Mobile App (`apps/mobile`)**: Expo SDK 58, React Native 0.78, SQLite (`expo-sqlite`), `react-native-safe-area-context`
- **Web Storefront (`apps/web`)**: Next.js 15, React 18
- **Shared Package (`packages/types`)**: Centralized TypeScript data models & domain interfaces
- **Design System**: Atomic UI components (`Button`, `Card`, `IconButton`, `TextInput`) built on centralized Design Tokens (`theme/`)

## 🛠️ Project Structure

```text
ProxiCommerce_OS/
├── apps/
│   ├── mobile/            # Expo SDK 58 POS Mobile Terminal
│   └── web/               # Next.js 15 PWA Storefront
├── packages/
│   └── types/             # Shared TypeScript types & entity models
├── package.json
└── turbo.json
```
