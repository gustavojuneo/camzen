import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PREFERENCES,
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
    void window.api.store.getPreferences().then(setPreferencesState)
  }, [])

  const persist = useCallback((nextPreferences: UserPreferences) => {
    setPreferencesState(nextPreferences)
    void window.api.store.setPreferences(nextPreferences)
  }, [])

  const selectedBackground = useMemo(
    () =>
      preferences.backgrounds.find((background) => background.id === preferences.selectedBackgroundId) ??
      preferences.backgrounds[0],
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
