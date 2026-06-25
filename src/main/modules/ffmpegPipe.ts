import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import type { FramePayload, VirtualCameraSettings, VirtualCameraState } from '../../shared/types'

export class FfmpegPipe {
  private process: ChildProcessWithoutNullStreams | null = null
  private settings: VirtualCameraSettings | null = null
  private lastError = ''
  private framesWritten = 0

  async start(settings: VirtualCameraSettings): Promise<VirtualCameraState> {
    await this.stop()
    this.settings = settings
    this.lastError = ''
    this.framesWritten = 0

    this.process = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'info',
      '-f',
      'rawvideo',
      '-pixel_format',
      'rgba',
      '-video_size',
      `${settings.width}x${settings.height}`,
      '-framerate',
      String(settings.fps),
      '-i',
      'pipe:0',
      '-an',
      '-vf',
      'format=yuv420p',
      '-pix_fmt',
      'yuv420p',
      '-f',
      'v4l2',
      settings.devicePath
    ])

    this.process.stderr.on('data', (data) => {
      this.lastError = data.toString()
    })

    this.process.on('close', () => {
      this.process = null
    })

    return {
      active: true,
      devicePath: settings.devicePath,
      message: `FFmpeg aguardando frames para ${settings.devicePath}`,
      framesWritten: this.framesWritten
    }
  }

  pushFrame(frame: FramePayload): boolean {
    if (!this.process || !this.settings) return false
    if (frame.width !== this.settings.width || frame.height !== this.settings.height) return false

    // frame.data arrives from IPC as ArrayBuffer (structured clone).
    // Buffer.from(ArrayBuffer) creates a zero-copy view of it.
    let buf: Buffer
    if (Buffer.isBuffer(frame.data)) {
      buf = frame.data
    } else if (frame.data instanceof ArrayBuffer) {
      buf = Buffer.from(frame.data)
    } else {
      // Fallback: IPC may deserialize as a plain object with numeric keys
      buf = Buffer.from(Object.values(frame.data as unknown as Record<string, number>))
    }

    const accepted = this.process.stdin.write(buf)
    this.framesWritten += 1
    return accepted
  }

  isRunning(): boolean {
    return this.process !== null
  }

  status(): VirtualCameraState {
    return {
      active: Boolean(this.process),
      devicePath: this.settings?.devicePath ?? null,
      message: this.process
        ? `FFmpeg publicando ${this.framesWritten} frames em ${this.settings?.devicePath}`
        : this.lastError || 'Camera virtual inativa',
      framesWritten: this.framesWritten,
      lastError: this.lastError || undefined
    }
  }

  stop(): Promise<VirtualCameraState> {
    const result: VirtualCameraState = {
      active: false,
      devicePath: this.settings?.devicePath ?? null,
      message: this.lastError || 'Camera virtual inativa',
      framesWritten: this.framesWritten,
      lastError: this.lastError || undefined
    }

    if (!this.process) return Promise.resolve(result)

    return new Promise((resolve) => {
      const proc = this.process!
      this.process = null
      proc.once('close', () => resolve(result))
      proc.stdin.end()
      proc.kill('SIGTERM')
      // Force kill if it doesn't exit within 2s
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL')
      }, 2000)
    })
  }
}
