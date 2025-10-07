/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Razorpay global declaration
declare global {
  interface Window {
    Razorpay: any;
  }
} 