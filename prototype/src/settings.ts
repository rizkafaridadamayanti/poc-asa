export type RuntimeSettings = {
  reportToJid: string
  testGroupJid: string
}

type ChangeHandler = (next: RuntimeSettings) => void

let current: RuntimeSettings
const handlers = new Set<ChangeHandler>()

export function initSettings(initial: RuntimeSettings) {
  current = { ...initial }
}

export function getSettings(): RuntimeSettings {
  return { ...current }
}

export function updateSettings(patch: Partial<RuntimeSettings>): RuntimeSettings {
  current = { ...current, ...patch }
  handlers.forEach((h) => h(current))
  return { ...current }
}

export function onSettingsChange(handler: ChangeHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}
