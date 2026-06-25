import { useEffect, useState } from 'react'
import type { BackgroundAsset } from '../../../shared/types'

export function useBackgroundElement(
  background: BackgroundAsset
): HTMLImageElement | HTMLVideoElement | null {
  const [element, setElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null)

  const { kind, value } = background

  useEffect(() => {
    let disposed = false

    queueMicrotask(() => {
      if (!disposed) setElement(null)
    })

    if (kind === 'image') {
      const image = new Image()
      image.src = value
      image.onload = () => {
        if (!disposed) setElement(image)
      }
      return () => {
        disposed = true
        image.onload = null
      }
    }

    if (kind === 'video') {
      const video = document.createElement('video')
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.src = value
      video.onloadeddata = () => {
        void video.play()
        if (!disposed) setElement(video)
      }
      return () => {
        disposed = true
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }

    return () => {
      disposed = true
    }
  }, [kind, value])

  return element
}
