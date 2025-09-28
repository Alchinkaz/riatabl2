"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
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
  total_client_bonus_post_tax: "AF = AE / (1 + налог/100)",
}

export function useFormulaSettings() {
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
    setConfig(newConfig)
    if (user) {
      setCachedSettings(user.id, newConfig, customFormulas)
    }
  }

  const updateCustomFormulas = (newFormulas: CustomFormulas) => {
    setCustomFormulas(newFormulas)
    if (user) {
      setCachedSettings(user.id, config, newFormulas)
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

  return {
    config,
    customFormulas,
    isLoading,
    error,
    updateConfig,
    updateCustomFormulas,
    resetToDefaults,
    clearSettingsCache,
  }
}
