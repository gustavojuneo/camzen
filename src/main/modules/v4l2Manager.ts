import { spawn } from 'child_process'
import { access } from 'fs/promises'
import type { VirtualCameraSettings, VirtualCameraState } from '../../shared/types'
import { runCommand } from './processUtils'

export async function getVirtualCameraStatus(devicePath = '/dev/video10'): Promise<VirtualCameraState> {
  const modules = await runCommand('lsmod')

  try {
    await access(devicePath)
    return {
      active: modules.stdout.includes('v4l2loopback'),
      devicePath,
      message: modules.stdout.includes('v4l2loopback')
        ? `Camera virtual disponivel em ${devicePath}`
        : `${devicePath} existe, mas o modulo nao aparece no lsmod`
    }
  } catch {
    return {
      active: false,
      devicePath: null,
      message: `${devicePath} ainda nao foi criado`
    }
  }
}

export async function loadV4l2Loopback(settings: VirtualCameraSettings): Promise<VirtualCameraState> {
  // If the module is already loaded and the device exists, skip modprobe to
  // avoid "Conversion failed!" errors on X11 after restarting the app.
  const current = await getVirtualCameraStatus(settings.devicePath)
  if (current.active) return current

  return new Promise((resolve) => {
    const videoNumber = settings.devicePath.replace('/dev/video', '') || '10'
    const args = [
      'modprobe',
      'v4l2loopback',
      'devices=1',
      `video_nr=${videoNumber}`,
      'card_label=VirtualCam',
      'exclusive_caps=1'
    ]
    const child = spawn('pkexec', args, { stdio: 'ignore' })

    child.on('close', async () => {
      resolve(await getVirtualCameraStatus(settings.devicePath))
    })

    child.on('error', async () => {
      resolve({
        active: false,
        devicePath: null,
        message: 'Nao foi possivel abrir pkexec para carregar o modulo'
      })
    })
  })
}
