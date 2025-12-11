import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { electronApp, is } from '@electron-toolkit/utils'

// Chemin du fichier de sauvegarde
const getSavePath = (): string => join(app.getPath('userData'), 'mobs-save.json')

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    transparent: true,
    frame: false,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    minimizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  // Handler pour sauvegarder les mobs
  ipcMain.handle('save-mobs', (_event, mobsData: string) => {
    try {
      const savePath = getSavePath()
      writeFileSync(savePath, mobsData, 'utf-8')
      console.log('Mobs sauvegardés dans:', savePath)
      return { success: true, path: savePath }
    } catch (error) {
      console.error('Erreur de sauvegarde:', error)
      return { success: false, error: String(error) }
    }
  })

  // Handler pour charger les mobs
  ipcMain.handle('load-mobs', () => {
    try {
      const savePath = getSavePath()
      if (!existsSync(savePath)) {
        return { success: false, error: 'Aucune sauvegarde trouvée' }
      }
      const data = readFileSync(savePath, 'utf-8')
      return { success: true, data }
    } catch (error) {
      console.error('Erreur de chargement:', error)
      return { success: false, error: String(error) }
    }
  })

  createWindow()
})
