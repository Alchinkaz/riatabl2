interface FormulaConfig {
  financial_load_percent: number
  vat_rate: number
  manager_bonus_percent: number
  kpn_tax_rate: number
  client_bonus_tax_rate: number
}

interface CustomFormulas {
  [key: string]: string
}

interface CachedSettings {
  config: FormulaConfig
  customFormulas: CustomFormulas
  timestamp: number
  userId: string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 минут
const settingsCache = new Map<string, CachedSettings>()

export function getCachedSettings(userId: string): { config: FormulaConfig; customFormulas: CustomFormulas } | null {
  const cached = settingsCache.get(userId)
  
  if (!cached) {
    return null
  }

  // Проверяем, не устарел ли кэш
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    settingsCache.delete(userId)
    return null
  }

  return {
    config: cached.config,
    customFormulas: cached.customFormulas,
  }
}

export function setCachedSettings(
  userId: string, 
  config: FormulaConfig, 
  customFormulas: CustomFormulas
): void {
  settingsCache.set(userId, {
    config,
    customFormulas,
    timestamp: Date.now(),
    userId,
  })
}

export function clearCache(userId?: string): void {
  if (userId) {
    settingsCache.delete(userId)
  } else {
    settingsCache.clear()
  }
}

export function isCacheValid(userId: string): boolean {
  const cached = settingsCache.get(userId)
  if (!cached) return false
  
  return Date.now() - cached.timestamp <= CACHE_DURATION
}
