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
  const videoNumber = settings.devicePath.replace('/dev/video', '') || '10'

  // Always do rmmod + modprobe in a single pkexec call to guarantee a clean
  // device state. exclusive_caps=1 is intentionally omitted — it causes
  // VIDIOC_G_FMT errors with FFmpeg 6+ when no consumer is attached.
  const script = `modprobe -r v4l2loopback 2>/dev/null; modprobe v4l2loopback devices=1 video_nr=${videoNumber} card_label=VirtualCam`

  await new Promise<void>((resolve, reject) => {
    const child = spawn('pkexec', ['bash', '-c', script], { stdio: 'ignore' })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pkexec exited ${code}`))))
    child.on('error', reject)
  }).catch(() => {
    // pkexec cancelled or failed — getVirtualCameraStatus will report the real state
  })

  return getVirtualCameraStatus(settings.devicePath)
}
