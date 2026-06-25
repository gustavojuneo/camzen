export type LinuxDisplayServer = 'wayland' | 'x11' | 'unknown'

export type ElectronDisplayServerConfig = {
  displayServer: LinuxDisplayServer
  env: Record<string, string>
  switches: Array<{ name: string; value?: string }>
}

type DisplayServerEnv = {
  [key: string]: string | undefined
  XDG_SESSION_TYPE?: string
}

export function detectLinuxDisplayServer(
  env: DisplayServerEnv,
  platform = process.platform
): LinuxDisplayServer {
  if (platform !== 'linux') {
    return 'unknown'
  }

  const sessionType = env.XDG_SESSION_TYPE?.trim().toLowerCase()

  if (sessionType === 'wayland') {
    return 'wayland'
  }

  if (sessionType === 'x11') {
    return 'x11'
  }

  return 'unknown'
}

export function getElectronDisplayServerConfig(
  env: DisplayServerEnv,
  platform = process.platform
): ElectronDisplayServerConfig {
  const displayServer = detectLinuxDisplayServer(env, platform)

  if (displayServer === 'wayland') {
    return {
      displayServer,
      env: { ELECTRON_OZONE_PLATFORM_HINT: 'wayland' },
      switches: [
        { name: 'ozone-platform', value: 'wayland' },
        { name: 'enable-features', value: 'WaylandWindowDecorations' }
      ]
    }
  }

  if (displayServer === 'x11') {
    return {
      displayServer,
      env: { ELECTRON_OZONE_PLATFORM_HINT: 'x11' },
      switches: [{ name: 'ozone-platform', value: 'x11' }]
    }
  }

  return {
    displayServer,
    env: {},
    switches: []
  }
}
