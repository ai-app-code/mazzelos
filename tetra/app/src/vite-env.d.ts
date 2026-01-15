/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_MAZZEL_BASE_URL?: string
    readonly VITE_DEFAULT_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
