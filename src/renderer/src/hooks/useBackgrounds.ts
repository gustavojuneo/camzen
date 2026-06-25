import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PREFERENCES,
  NONE_BACKGROUND,
  type BackgroundAsset,
  type UserPreferences
} from '../../../shared/types'

export function useBackgrounds(): {
  preferences: UserPreferences
  selectedBackground: BackgroundAsset
  setSelectedBackgroundId: (id: string) => void
  addBackground: (asset: BackgroundAsset) => void
  removeBackground: (id: string) => void
  setPreferences: (preferences: UserPreferences) => void
} {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    window.api.store.getPreferences().then(async (prefs) => {
      const resolved = await Promise.all(
        prefs.backgrounds.map(async (bg) => {
          if (!bg.value.startsWith('app-bg://')) return bg
          const filename = bg.value.replace('app-bg:///', '')
          try {
            const { data, mime } = await window.api.backgrounds.read(filename)
            const blobUrl = URL.createObjectURL(new Blob([data], { type: mime }))
            return { ...bg, value: blobUrl, persistedUrl: bg.value }
          } catch {
            return bg
          }
        })
      )
      setPreferencesState({ ...prefs, backgrounds: resolved })
    })
  }, [])

  const persist = useCallback((nextPreferences: UserPreferences) => {
    setPreferencesState(nextPreferences)
    // Save to store using persistedUrl when available (blob URLs don't survive restarts)
    const forStore: UserPreferences = {
      ...nextPreferences,
      backgrounds: nextPreferences.backgrounds.map((bg) =>
        bg.persistedUrl ? { ...bg, value: bg.persistedUrl } : bg
      )
    }
    void window.api.store.setPreferences(forStore)
  }, [])

  const selectedBackground = useMemo(
    () =>
      preferences.selectedBackgroundId === 'none'
        ? NONE_BACKGROUND
        : (preferences.backgrounds.find((background) => background.id === preferences.selectedBackgroundId) ??
          preferences.backgrounds[0]),
    [preferences.backgrounds, preferences.selectedBackgroundId]
  )

  const setSelectedBackgroundId = useCallback(
    (id: string) => {
      persist({ ...preferences, selectedBackgroundId: id })
    },
    [persist, preferences]
  )

  const addBackground = useCallback(
    (asset: BackgroundAsset) => {
      persist({
        ...preferences,
        backgrounds: [...preferences.backgrounds, asset],
        selectedBackgroundId: asset.id
      })
    },
    [persist, preferences]
  )

  const removeBackground = useCallback(
    (id: string) => {
      const nextBackgrounds = preferences.backgrounds.filter(
        (background) => background.id !== id || background.builtIn
      )
      persist({
        ...preferences,
        backgrounds: nextBackgrounds,
        selectedBackgroundId:
          preferences.selectedBackgroundId === id
            ? nextBackgrounds[0]?.id || DEFAULT_PREFERENCES.selectedBackgroundId
            : preferences.selectedBackgroundId
      })
    },
    [persist, preferences]
  )

  return {
    preferences,
    selectedBackground,
    setSelectedBackgroundId,
    addBackground,
    removeBackground,
    setPreferences: persist
  }
}
