export type TradlyEnv = "production" | "development" | "sandbox";

const runtimeHost =
	typeof window !== "undefined" && window.location?.host
		? window.location.host
		: "";

const apiBaseUrl = (
	import.meta.env.VITE_TRADLY_BASE_URL ?? "https://api.tradly.app"
).replace(/\/+$/, "");

export const AppConfig = {
	// Your Tradly workspace domain e.g. "beauty.tradly.co"
	domain: import.meta.env.VITE_TRADLY_DOMAIN ?? runtimeHost,

	// Public key for this workspace — set in .env, never commit the real value
	pkKey:
		import.meta.env.VITE_TRADLY_PK_KEY ??
		import.meta.env.VITE_TRADLY_PUBLISHABLE_KEY ??
		import.meta.env.VITE_TRADLY_PUBLIC_KEY ??
		"",

	// Tradly API base URL. Falls back to the public API for compatibility.
	apiBaseUrl,

	// Deployment environment
	env: (import.meta.env.VITE_TRADLY_ENV ?? "production") as TradlyEnv,

	// Default currency — hardcoded fallback, can be swapped at runtime via state/app.slice.ts
	defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY ?? "USD",

	// Default language — hardcoded fallback, can be swapped at runtime via state/app.slice.ts
	defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE ?? "en",

	// Where users land after completing external (web-channel) payment.
	// Defaults to app origin at runtime. Set VITE_REDIRECT_URI in .env for production.
	redirectUri: import.meta.env.VITE_REDIRECT_URI ?? "",

	// When true, shipping methods are fetched per-seller (account_id from first cart item)
	// instead of platform-wide tenant methods. Match your Tradly workspace's account config.
	enableShippingMethodsPreference:
		import.meta.env.VITE_ENABLE_ACCOUNT_SHIPPING === "true",
} as const;

export type AppConfigType = typeof AppConfig;
