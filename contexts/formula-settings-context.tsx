"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "@/lib/supabase"
import { getCachedSettings, setCachedSettings, clearCache } from "@/lib/formula-settings-cache"

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

const DEFAULT_CONFIG: FormulaConfig = {
  financial_load_percent: 5,
  vat_rate: 12,
  manager_bonus_percent: 3,
  kpn_tax_rate: 20,
  client_bonus_tax_rate: 32,
}

const DEFAULT_CUSTOM_FORMULAS: CustomFormulas = {
  delivery_per_unit: "F = H / D",
  sum_with_delivery: "G = E + F",
  financial_load: "J = G * (I / 100)",
  sum_with_load: "K = G + J",
  markup: "M = P - K",
  markup_percent: "L = (M / K) * 100",
  selling_price_no_vat: "N = P - O",
  nds_tax: "O = N * (НДС / 100)",
  manager_bonus_unit: "S = N * (R / 100)",
  income_pre_kpn: "T = P - E - F - J - S - O",
  kpn_tax: "U = T * (КПН / 100)",
  net_income_unit: "V = T - U",
  margin_percent: "W = (V / P) * 100",
  total_selling_vat: "X = D * P",
  total_selling_bonus: "Y = D * Q",
  total_net_income: "Z = D * V",
  total_purchase: "AA = D * E",
  total_expenses: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U)",
  total_manager_bonuses: "AC = D * S",
  unit_bonus_client: "AD = AE / D",
  total_client_bonus_post_tax: "AF = AE * (1 - налог/100)",
}

interface FormulaSettingsContextType {
  config: FormulaConfig
  customFormulas: CustomFormulas
  isLoading: boolean
  error: string | null
  updateConfig: (newConfig: FormulaConfig) => void
  updateCustomFormulas: (newFormulas: CustomFormulas) => void
  saveSettings: (newConfig: FormulaConfig, newFormulas: CustomFormulas) => Promise<boolean>
  resetToDefaults: () => void
  clearSettingsCache: () => void
}

const FormulaSettingsContext = createContext<FormulaSettingsContextType | undefined>(undefined)

export function FormulaSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [config, setConfig] = useState<FormulaConfig>(DEFAULT_CONFIG)
  const [customFormulas, setCustomFormulas] = useState<CustomFormulas>(DEFAULT_CUSTOM_FORMULAS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        // Сначала проверяем кэш
        const cached = getCachedSettings(user.id)
        if (cached) {
          setConfig(cached.config)
          setCustomFormulas(cached.customFormulas)
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("user_settings")
          .select("formula_config, custom_formulas")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error("Error loading formula settings:", error)
          setError("Ошибка загрузки настроек формул")
          return
        }

        if (data) {
          const newConfig = data.formula_config as FormulaConfig || DEFAULT_CONFIG
          const newFormulas = data.custom_formulas as CustomFormulas || DEFAULT_CUSTOM_FORMULAS
          
          setConfig(newConfig)
          setCustomFormulas(newFormulas)
          
          // Сохраняем в кэш
          setCachedSettings(user.id, newConfig, newFormulas)
        } else {
          // Если настройки не найдены, создаем их
          console.log('No settings found, creating default settings for user:', user.id)
          const { error: createError } = await supabase.from("user_settings").upsert({
            user_id: user.id,
            formula_config: DEFAULT_CONFIG,
            custom_formulas: DEFAULT_CUSTOM_FORMULAS,
          }, { onConflict: "user_id" })
          
          if (!createError) {
            setConfig(DEFAULT_CONFIG)
            setCustomFormulas(DEFAULT_CUSTOM_FORMULAS)
            setCachedSettings(user.id, DEFAULT_CONFIG, DEFAULT_CUSTOM_FORMULAS)
          }
        }
      } catch (err) {
        console.error("Error loading formula settings:", err)
        setError("Ошибка загрузки настроек формул")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [user])

  const updateConfig = (newConfig: FormulaConfig) => {
    console.log('FormulaSettings: updateConfig called with:', newConfig)
    setConfig(newConfig)
    if (user) {
      setCachedSettings(user.id, newConfig, customFormulas)
    }
  }

  const updateCustomFormulas = (newFormulas: CustomFormulas) => {
    console.log('FormulaSettings: updateCustomFormulas called with:', newFormulas)
    setCustomFormulas(newFormulas)
    if (user) {
      setCachedSettings(user.id, config, newFormulas)
    }
  }

  const saveSettings = async (newConfig: FormulaConfig, newFormulas: CustomFormulas) => {
    if (!user) return false
    
    try {
      const payload = {
        user_id: user.id,
        formula_config: newConfig,
        custom_formulas: newFormulas,
      }
      const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" })
      if (!error) {
        console.log('FormulaSettings: Settings saved successfully:', { newConfig, newFormulas })
        setConfig(newConfig)
        setCustomFormulas(newFormulas)
        setCachedSettings(user.id, newConfig, newFormulas)
        return true
      } else {
        console.error("save settings error", error)
        return false
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      return false
    }
  }

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG)
    setCustomFormulas(DEFAULT_CUSTOM_FORMULAS)
    if (user) {
      setCachedSettings(user.id, DEFAULT_CONFIG, DEFAULT_CUSTOM_FORMULAS)
    }
  }

  const clearSettingsCache = () => {
    if (user) {
      clearCache(user.id)
    }
  }

  return (
    <FormulaSettingsContext.Provider
      value={{
        config,
        customFormulas,
        isLoading,
        error,
        updateConfig,
        updateCustomFormulas,
        saveSettings,
        resetToDefaults,
        clearSettingsCache,
      }}
    >
      {children}
    </FormulaSettingsContext.Provider>
  )
}

export function useFormulaSettings() {
  const context = useContext(FormulaSettingsContext)
  if (context === undefined) {
    throw new Error("useFormulaSettings must be used within a FormulaSettingsProvider")
  }
  return context
}
