import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import { join, extname } from 'path'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { UserPreferences, VirtualCameraSettings } from '../shared/types'
import { checkSystemDependencies } from './modules/deviceDetector'
import { FfmpegPipe } from './modules/ffmpegPipe'
import { getPreferences, setPreferences } from './modules/preferencesStore'
import { getVirtualCameraStatus, loadV4l2Loopback } from './modules/v4l2Manager'
import { getElectronDisplayServerConfig } from './modules/linuxDisplayServer'

const displayServerConfig = getElectronDisplayServerConfig(process.env)

Object.entries(displayServerConfig.env).forEach(([name, value]) => {
  process.env[name] = process.env[name] || value
})

displayServerConfig.switches.forEach(({ name, value }) => {
  app.commandLine.appendSwitch(name, value)
})

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-bg',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }
])

const ffmpegPipe = new FfmpegPipe()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: !is.dev
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

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const bgDir = join(app.getPath('userData'), 'backgrounds')

  // Serve persisted background files via app-bg://
  const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime'
  }

  protocol.handle('app-bg', async (request) => {
    try {
      const filename = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''))
      const filePath = join(bgDir, filename)
      const data = await readFile(filePath)
      const ext = extname(filename).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      return new Response(data, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })

  ipcMain.handle('backgrounds:save', async (_event, fileBuffer: ArrayBuffer, fileName: string) => {
    await mkdir(bgDir, { recursive: true })
    const filename = `${randomUUID()}${extname(fileName)}`
    await writeFile(join(bgDir, filename), Buffer.from(fileBuffer))
    return `app-bg:///${filename}`
  })

  ipcMain.handle('backgrounds:read', async (_event, filename: string) => {
    const filePath = join(bgDir, filename)
    const data = await readFile(filePath)
    const ext = extname(filename).toLowerCase()
    const mime = MIME_TYPES[ext] || 'application/octet-stream'
    return { data: new Uint8Array(data), mime }
  })

  ipcMain.handle('dependencies:check', () => checkSystemDependencies())
  ipcMain.handle('v4l2:status', (_event, devicePath?: string) => getVirtualCameraStatus(devicePath))
  ipcMain.handle('v4l2:load', (_event, settings: VirtualCameraSettings) =>
    loadV4l2Loopback(settings)
  )
  ipcMain.handle('virtual-camera:start', (_event, settings: VirtualCameraSettings) =>
    ffmpegPipe.start(settings)
  )
  ipcMain.handle('virtual-camera:status', () => ffmpegPipe.status())
  ipcMain.handle('virtual-camera:frame', (_event, frame) => ffmpegPipe.pushFrame(frame))
  ipcMain.on('virtual-camera:frame-raw', (_event, frame) => ffmpegPipe.pushFrame(frame))
  ipcMain.handle('virtual-camera:stop', () => ffmpegPipe.stop())
  ipcMain.handle('store:get-preferences', () => getPreferences())
  ipcMain.handle('store:set-preferences', (_event, preferences: UserPreferences) =>
    setPreferences(preferences)
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  if (ffmpegPipe.isRunning()) {
    event.preventDefault()
    ffmpegPipe.stop().then(() => app.quit())
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
