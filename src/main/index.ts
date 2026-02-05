import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { registerMobHandlers } from './ipcHandlers'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    show: false,
    frame: false,
    transparent: false,
    fullscreen: true,
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.on('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.on('window:close', () => {
    mainWindow.close()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Ouvrir DevTools en mode développement pour debug
    if (is.dev) {
      // mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Enregistrer les handlers IPC pour les mobs
  registerMobHandlers()

  ipcMain.handle('update-mob-onsen-state', async (_event, mobId: string, isInOnsen: boolean, timestamp: number | null, hpAtEntry: number | null) => {
    try {
      const mob = mobs.get(mobId)
      if (mob) {
        mob.isInOnsen = isInOnsen
        mob.lastOnsenEntryTimestamp = timestamp
        mob.hpAtOnsenEntry = hpAtEntry
        // Save automatically
        await saveMobsToDisk()
        return { success: true }
      }
      return { success: false, error: 'Mob not found' }
    } catch (error) {
      console.error('Error updating Onsen state:', error)
      return { success: false, error: String(error) }
    }
  })

  createWindow()
})
