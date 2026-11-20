/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, p. ej. https://api.stockupsas.com/api */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
