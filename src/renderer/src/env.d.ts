/// <reference types="vite/client" />

import type { TodoDaysApi } from '@shared/ipc'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare global {
  interface Window {
    api: TodoDaysApi
  }
}

export {}
