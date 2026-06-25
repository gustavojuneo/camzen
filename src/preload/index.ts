import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppApi, FramePayload, UserPreferences, VirtualCameraSettings } from '../shared/types'

// Custom APIs for renderer
const api: AppApi = {
  dependencies: {
    check: () => ipcRenderer.invoke('dependencies:check')
  },
  v4l2: {
    status: () => ipcRenderer.invoke('v4l2:status'),
    load: (settings: VirtualCameraSettings) => ipcRenderer.invoke('v4l2:load', settings)
  },
  virtualCamera: {
    start: (settings: VirtualCameraSettings) => ipcRenderer.invoke('virtual-camera:start', settings),
    status: () => ipcRenderer.invoke('virtual-camera:status'),
    stop: () => ipcRenderer.invoke('virtual-camera:stop'),
    pushFrame: (frame: FramePayload) => ipcRenderer.invoke('virtual-camera:frame', frame),
    pushFrameRaw: (frame: FramePayload) => {
      ipcRenderer.send('virtual-camera:frame-raw', frame)
    }
  },
  store: {
    getPreferences: () => ipcRenderer.invoke('store:get-preferences'),
    setPreferences: (preferences: UserPreferences) =>
      ipcRenderer.invoke('store:set-preferences', preferences)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
