import { ElectronAPI } from '@electron-toolkit/preload'

interface SaveLoadResult {
  success: boolean
  path?: string
  data?: string
  error?: string
}

interface CustomAPI {
  saveMobs: (mobsData: string) => Promise<SaveLoadResult>
  loadMobs: () => Promise<SaveLoadResult>
  setIgnoreMouseEvents?: (ignore: boolean) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
