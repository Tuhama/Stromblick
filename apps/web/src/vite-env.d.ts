/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Address of the API for the assistant, for example https://stromblickapi-production.up.railway.app.
   * Unset: "/api", which the Vite proxy (development) and the Vercel rewrite (production) forward.
   */
  readonly VITE_CHAT_API_URL?: string;
}
