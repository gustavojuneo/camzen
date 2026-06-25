export type DependencyKey = 'ffmpeg' | 'v4l2loopback' | 'v4l2ctl' | 'webcam'

export type DependencyState = 'ok' | 'missing' | 'warning'

export interface DependencyStatus {
  key: DependencyKey
  label: string
  state: DependencyState
  detail: string
}

export type BackgroundKind = 'solid' | 'image' | 'video' | 'blur'

export interface BackgroundAsset {
  id: string
  name: string
  kind: BackgroundKind
  value: string
  builtIn?: boolean
}

export interface VideoDeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind | 'videoinput'
}

export interface VirtualCameraSettings {
  devicePath: string
  width: number
  height: number
  fps: number
  feathering: number
}

export interface VirtualCameraState {
  active: boolean
  devicePath: string | null
  message: string
  framesWritten?: number
  lastError?: string
}

export interface FramePayload {
  width: number
  height: number
  data: ArrayBuffer
}

export interface UserPreferences {
  selectedBackgroundId: string
  backgrounds: BackgroundAsset[]
  settings: VirtualCameraSettings
  theme: 'system' | 'light' | 'dark'
}

export interface AppApi {
  dependencies: {
    check: () => Promise<DependencyStatus[]>
  }
  v4l2: {
    status: () => Promise<VirtualCameraState>
    load: (settings: VirtualCameraSettings) => Promise<VirtualCameraState>
  }
  virtualCamera: {
    start: (settings: VirtualCameraSettings) => Promise<VirtualCameraState>
    status: () => Promise<VirtualCameraState>
    stop: () => Promise<VirtualCameraState>
    pushFrame: (frame: FramePayload) => Promise<boolean>
    pushFrameRaw: (frame: FramePayload) => void
  }
  store: {
    getPreferences: () => Promise<UserPreferences>
    setPreferences: (preferences: UserPreferences) => Promise<UserPreferences>
  }
}

export const DEFAULT_SETTINGS: VirtualCameraSettings = {
  devicePath: '/dev/video10',
  width: 1280,
  height: 720,
  fps: 30,
  feathering: 4
}

export const DEFAULT_BACKGROUNDS: BackgroundAsset[] = [
  { id: 'solid-graphite', name: 'Graphite', kind: 'solid', value: '#171717', builtIn: true },
  { id: 'solid-cyan', name: 'Cyan', kind: 'solid', value: '#0f766e', builtIn: true },
  { id: 'solid-rose', name: 'Rose', kind: 'solid', value: '#be123c', builtIn: true },
  { id: 'blur-original', name: 'Blur', kind: 'blur', value: '18', builtIn: true }
]

export const DEFAULT_PREFERENCES: UserPreferences = {
  selectedBackgroundId: DEFAULT_BACKGROUNDS[0].id,
  backgrounds: DEFAULT_BACKGROUNDS,
  settings: DEFAULT_SETTINGS,
  theme: 'system'
}
