import { useEffect, useState } from 'react'
import type { BackgroundAsset } from '../../../shared/types'

export function useBackgroundElement(background: BackgroundAsset): HTMLImageElement | HTMLVideoElement | null {
  const [element, setElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null)

  const { kind, value } = background

  useEffect(() => {
    setElement(null)

    if (kind === 'image') {
      const image = new Image()
      image.src = value
      image.onload = () => setElement(image)
      return
    }

    if (kind === 'video') {
      const video = document.createElement('video')
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.src = value
      video.onloadeddata = () => {
        void video.play()
        setElement(video)
      }
      return () => {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }
  }, [kind, value])

  return element
}
