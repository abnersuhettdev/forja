/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

interface ImportMetaEnv {
  /** Versão do app (package.json), nos relatos técnicos (API-030). */
  readonly VITE_APP_VERSION?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
