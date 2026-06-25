import { describe, expect, it } from 'vitest'
import { detectLinuxDisplayServer, getElectronDisplayServerConfig } from './linuxDisplayServer'

describe('detectLinuxDisplayServer', () => {
  it('detects Wayland from XDG_SESSION_TYPE', () => {
    expect(detectLinuxDisplayServer({ XDG_SESSION_TYPE: 'wayland' }, 'linux')).toBe('wayland')
  })

  it('detects X11 from XDG_SESSION_TYPE', () => {
    expect(detectLinuxDisplayServer({ XDG_SESSION_TYPE: 'x11' }, 'linux')).toBe('x11')
  })

  it('normalizes whitespace and casing', () => {
    expect(detectLinuxDisplayServer({ XDG_SESSION_TYPE: ' Wayland ' }, 'linux')).toBe('wayland')
  })

  it('returns unknown for unsupported session types', () => {
    expect(detectLinuxDisplayServer({ XDG_SESSION_TYPE: 'tty' }, 'linux')).toBe('unknown')
  })

  it('returns unknown outside Linux', () => {
    expect(detectLinuxDisplayServer({ XDG_SESSION_TYPE: 'wayland' }, 'darwin')).toBe('unknown')
  })
})

describe('getElectronDisplayServerConfig', () => {
  it('enables Wayland-specific Electron switches', () => {
    expect(getElectronDisplayServerConfig({ XDG_SESSION_TYPE: 'wayland' }, 'linux')).toEqual({
      displayServer: 'wayland',
      env: { ELECTRON_OZONE_PLATFORM_HINT: 'wayland' },
      switches: [
        { name: 'ozone-platform', value: 'wayland' },
        { name: 'enable-features', value: 'WaylandWindowDecorations' }
      ]
    })
  })

  it('enables X11-specific Electron switches', () => {
    expect(getElectronDisplayServerConfig({ XDG_SESSION_TYPE: 'x11' }, 'linux')).toEqual({
      displayServer: 'x11',
      env: { ELECTRON_OZONE_PLATFORM_HINT: 'x11' },
      switches: [{ name: 'ozone-platform', value: 'x11' }]
    })
  })

  it('does not force an Electron backend when the session type is unknown', () => {
    expect(getElectronDisplayServerConfig({}, 'linux')).toEqual({
      displayServer: 'unknown',
      env: {},
      switches: []
    })
  })
})
