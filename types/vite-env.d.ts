// Ambient shim for import.meta.env — replaced by vite/client when Vite is installed.
// For Next.js projects: delete this file and update config/app.config.ts to use process.env.

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly VITE_TRADLY_DOMAIN: string
  readonly VITE_TRADLY_PK_KEY: string
  readonly VITE_TRADLY_PUBLISHABLE_KEY: string
  readonly VITE_TRADLY_PUBLIC_KEY: string
  readonly VITE_TRADLY_BASE_URL: string
  readonly VITE_TRADLY_ENV: string
  readonly VITE_DEFAULT_CURRENCY: string
  readonly VITE_DEFAULT_LANGUAGE: string
  [key: string]: string | boolean | undefined
}
