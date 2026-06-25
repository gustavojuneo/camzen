import { readdir } from 'fs/promises'
import { commandExists, runCommand } from './processUtils'
import type { DependencyStatus } from '../../shared/types'

async function hasVideoDevice(): Promise<boolean> {
  try {
    const entries = await readdir('/dev')
    return entries.some((entry) => /^video\d+$/.test(entry))
  } catch {
    return false
  }
}

export async function listV4l2Devices(): Promise<string[]> {
  try {
    const entries = await readdir('/dev')
    return entries.filter((entry) => /^video\d+$/.test(entry)).map((entry) => `/dev/${entry}`)
  } catch {
    return []
  }
}

export async function checkSystemDependencies(): Promise<DependencyStatus[]> {
  const [ffmpeg, v4l2ctl, webcam, module] = await Promise.all([
    commandExists('ffmpeg'),
    commandExists('v4l2-ctl'),
    hasVideoDevice(),
    runCommand('lsmod')
  ])

  return [
    {
      key: 'ffmpeg',
      label: 'FFmpeg',
      state: ffmpeg ? 'ok' : 'missing',
      detail: ffmpeg ? 'Disponivel no PATH' : 'Instale ffmpeg para publicar frames no v4l2loopback'
    },
    {
      key: 'v4l2ctl',
      label: 'v4l-utils',
      state: v4l2ctl ? 'ok' : 'warning',
      detail: v4l2ctl ? 'v4l2-ctl disponivel' : 'Opcional, mas recomendado para diagnostico'
    },
    {
      key: 'webcam',
      label: 'Webcam',
      state: webcam ? 'ok' : 'missing',
      detail: webcam ? 'Dispositivo /dev/video detectado' : 'Nenhum /dev/video encontrado'
    },
    {
      key: 'v4l2loopback',
      label: 'v4l2loopback',
      state: module.stdout.includes('v4l2loopback') ? 'ok' : 'warning',
      detail: module.stdout.includes('v4l2loopback')
        ? 'Modulo carregado'
        : 'Modulo ainda nao carregado; use o onboarding para carregar com polkit'
    }
  ]
}
