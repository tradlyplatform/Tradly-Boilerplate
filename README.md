# Tradly Boilerplate

A production-ready foundation for building marketplace apps powered by the [Tradly](https://tradly.app) platform. Handles auth, listings, and cart out of the box — with full caching, state sync, and SDK wiring already done.

**Duplicate this repo for each new project. Do not modify it in place.**

---

## What's included

| Domain | Capabilities |
|---|---|
| **Auth** | Sign in (email + phone), sign up, OTP verify, resend OTP, forgot password, set password, social sign-in (Google/Facebook/Apple), token refresh, logout |
| **Listings** | List with filters/pagination, listing detail, like/unlike (optimistic), `in_cart` sync |
| **Cart** | Get cart, add to cart, delete item, clear cart, guest cart (UUID), multi-seller conflict (error 480/489) |
| **Order types** | `listings`, `events`, `appointments`, `donation`, `digital`, `information_listing`, `video_listing`, `requests` — each with the correct cart flow |

---

## Stack

- **RTK Query** — data fetching, caching, and cache invalidation
- **Redux Toolkit** — global state (auth + app settings)
- **redux-persist** — auth and app slices persisted to localStorage
- **Tradly JS SDK** — all marketplace API calls

---

## Quick Start

### 1. Install dependencies

```bash
npm install @reduxjs/toolkit react-redux redux-persist tradly
npm install -D typescript @types/react @types/react-dom
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your Tradly workspace values:

```bash
cp .env.example .env.local
```

```env
VITE_TRADLY_DOMAIN=your-workspace.tradly.co
VITE_TRADLY_PK_KEY=your-public-key
VITE_TRADLY_ENV=production
VITE_DEFAULT_CURRENCY=USD
VITE_DEFAULT_LANGUAGE=en
```

Get your domain and public key from the [Tradly Dashboard](https://tradly.app/dashboard).

### 3. Wrap your app with the store

```tsx
// app/layout.tsx (Next.js) or main.tsx (Vite)
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/state/store'

export default function RootLayout({ children }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  )
}
```

### 4. Add the app initializer

Run token refresh on every page load so the auth session stays valid:

```tsx
// components/AppInitializer.tsx
import { useEffect, useState } from 'react'
import { useRefreshAuthMutation } from '@/state/auth/api'
import { useAuthSelector } from '@/state/auth/selectors'

export function AppInitializer({ children }) {
  const [ready, setReady] = useState(false)
  const [refreshAuth] = useRefreshAuthMutation()
  const isAuthenticated = useAuthSelector(s => s.isAuthenticated)

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) await refreshAuth()
      setReady(true)
    }
    init()
  }, [])

  if (!ready) return <SplashScreen />
  return <>{children}</>
}
```

---

## Project Structure

```
tradly-boilerplate/
│
├── api/                        # Raw SDK wrappers — no state, no side effects
│   ├── sdk-context.ts          # Four payload builders for the Tradly SDK
│   ├── auth.ts                 # TradlySDK.user.* wrappers
│   ├── listing.ts              # getListings / getListingDetail / like / unlike
│   └── cart.ts                 # getCarts / addToCart / deleteFromCart / clearCart
│
├── state/                      # RTK Query APIs + Redux slices
│   ├── store.ts                # configureStore — all reducers + middleware
│   ├── auth/
│   │   ├── api.ts              # All auth mutations
│   │   ├── slice.ts            # isAuthenticated, authKey, tokens, cookies
│   │   └── selectors.ts        # useAuthSelector
│   ├── listing/
│   │   ├── api.ts              # getListings, getListingDetail, like, unlike
│   │   └── selectors.ts        # Cache-only reads — no extra fetches
│   ├── cart/
│   │   ├── api.ts              # getCart, addToCart, deleteCartItem, clearCart
│   │   └── selectors.ts        # useCartItems, useCartSummary, useCartItemCount
│   └── app/
│       └── slice.ts            # currency, language (persisted)
│
├── config/
│   ├── app.config.ts           # Domain, pkKey, env, defaults
│   └── uuid.ts                 # Guest cart UUID (persisted to localStorage)
│
├── types/
│   ├── auth.types.ts           # All auth input/response/state types
│   ├── listing.types.ts        # Listing, Category, Money, RatingData, etc.
│   ├── cart.types.ts           # CartItem, CartSummary, AddToCartInput, etc.
│   └── index.ts                # Re-exports all types
│
└── flows/                      # AI-assisted implementation guides (.mdc)
    ├── project-setup.mdc       # Architecture, wiring, anti-patterns
    ├── auth-flows.mdc          # Every auth screen with full code examples
    ├── listing-flows.mdc       # List, detail, like/unlike, order_type branching
    └── cart-flows.mdc          # All 8 order types — add, delete, clear
```

---

## Architecture

Three layers — components never call the SDK directly:

```
Component
  → RTK Query hooks  (state/*/api.ts)
      → SDK wrappers  (api/*.ts)
          → TradlySDK
```

**Four SDK payload builders** (`api/sdk-context.ts`):

| Builder | Used for |
|---|---|
| `buildSdkPayload` | Auth — `TradlySDK.user.*` |
| `buildAppQueryPayload` | Listing/cart reads — adds `bodyParam` |
| `buildAppMutationPayload` | Cart writes — wraps in `data: {}` |
| `buildAppDirectPayload` | Flat params — like/unlike, listing detail |

---

## Caching

| Cache | Lifetime | Invalidated by |
|---|---|---|
| Listing list | 5 min | addToCart, deleteCartItem, clearCart, sign-in, logout |
| Listing detail | 5 min | Same as above |
| Like / unlike | Optimistic — instant, no re-fetch | Rolled back on API error |
| Cart | Until mutation | addToCart, deleteCartItem, clearCart |

Sign-in and logout automatically flush both listing and cart caches so guest/user data never bleeds across sessions.

---

## Order Types

Every listing has an `order_type` field that determines the CTA and cart flow:

| `order_type` | CTA | Auth required | Cart behaviour |
|---|---|---|---|
| `listings` | Add to Cart / Buy Now | No | Multi-item ok |
| `digital` | Buy Now | No | Multi-item ok |
| `events` | Book Now | Yes | Clear cart first |
| `appointments` | Book Appointment | Yes | Clear cart first |
| `donation` | Fund Now | No | Clear cart first + `custom_price` |
| `information_listing` | Contact / Enquire | No | No cart |
| `video_listing` | Watch / Subscribe | No | No cart |
| `requests` | Submit Request | Yes | No cart — reverse marketplace |

---

## Flow Guides

The `flows/` directory contains `.mdc` guides for Cursor and AI-assisted editors. Open them for copy-paste-ready component code for every supported flow.

| File | Covers |
|---|---|
| `project-setup.mdc` | Full setup, wiring, path aliases, new domain checklist |
| `auth-flows.mdc` | Sign in, sign up → OTP, forgot password, social, token refresh, logout |
| `listing-flows.mdc` | List page, detail page, like/unlike, all 8 order types |
| `cart-flows.mdc` | Add to cart (all order types), delete, clear, guest cart, error 480/489 |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_TRADLY_DOMAIN` | Yes | Your workspace domain e.g. `beauty.tradly.co` |
| `VITE_TRADLY_PK_KEY` | Yes | Public key from Tradly dashboard |
| `VITE_TRADLY_ENV` | Yes | `production` / `development` / `sandbox` |
| `VITE_DEFAULT_CURRENCY` | No | Fallback currency code (default: `USD`) |
| `VITE_DEFAULT_LANGUAGE` | No | Fallback language code (default: `en`) |

---

## Starting a New Project

1. Duplicate (don't fork) this repo
2. Run `npm install`
3. Copy `.env.example` → `.env.local` and fill in your workspace values
4. Wrap your app with `<Provider>` + `<PersistGate>` (see Quick Start above)
5. Add `AppInitializer` at the root
6. Build your screens using the flow guides in `flows/`

For adding a new API domain (e.g. reviews, accounts), follow the new domain checklist in `flows/project-setup.mdc`.

---

## License

MIT
