import Store from 'electron-store'
import {
  DEFAULT_PREFERENCES,
  type UserPreferences
} from '../../shared/types'

type StoreConstructor = new (options: { name: string; defaults: UserPreferences }) => {
  store: UserPreferences
  set: (preferences: UserPreferences) => void
}

const StoreCtor = ((Store as unknown as { default?: StoreConstructor }).default ??
  Store) as unknown as StoreConstructor

const store = new StoreCtor({
  name: 'preferences',
  defaults: DEFAULT_PREFERENCES
})

export function getPreferences(): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...store.store,
    settings: {
      ...DEFAULT_PREFERENCES.settings,
      ...store.store.settings
    },
    backgrounds: store.store.backgrounds?.length ? store.store.backgrounds : DEFAULT_PREFERENCES.backgrounds
  }
}

export function setPreferences(preferences: UserPreferences): UserPreferences {
  store.set(preferences)
  return getPreferences()
}
