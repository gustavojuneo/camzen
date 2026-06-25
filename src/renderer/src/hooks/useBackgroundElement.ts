import { useEffect, useState } from 'react'
import type { BackgroundAsset } from '../../../shared/types'

export function useBackgroundElement(background: BackgroundAsset): HTMLImageElement | HTMLVideoElement | null {
  const [element, setElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null)

  useEffect(() => {
    setElement(null)

    if (background.kind === 'image') {
      const image = new Image()
      image.onload = () => setElement(image)
      image.src = background.value
      return undefined
    }

    if (background.kind === 'video') {
      const video = document.createElement('video')
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.onloadeddata = () => {
        void video.play()
        setElement(video)
      }
      video.src = background.value

      return () => {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
    }

    return undefined
  }, [background])

  return element
}
