"use client"

import { useFormulaSettings } from "@/contexts/formula-settings-context"
import { Button } from "@/components/ui/button"

export function DebugFormulaSettings() {
  const { config, customFormulas, isLoading, error, updateConfig, saveSettings } = useFormulaSettings()

  const testUpdateConfig = () => {
    const newConfig = {
      ...config,
      vat_rate: config.vat_rate === 12 ? 15 : 12, // Переключаем между 12% и 15%
      financial_load_percent: config.financial_load_percent === 5 ? 7 : 5, // Переключаем между 5% и 7%
    }
    updateConfig(newConfig)
  }

  const testSaveSettings = async () => {
    const newConfig = {
      ...config,
      vat_rate: 20,
      financial_load_percent: 10,
    }
    const success = await saveSettings(newConfig, customFormulas)
    console.log('Save result:', success)
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-100">
      <h3 className="font-bold mb-2">Debug Formula Settings</h3>
      <div className="space-y-2 text-sm">
        <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {error || 'None'}</div>
        <div><strong>Config:</strong> {JSON.stringify(config, null, 2)}</div>
        <div><strong>Custom Formulas:</strong> {JSON.stringify(customFormulas, null, 2)}</div>
        <div className="flex gap-2 mt-4">
          <Button onClick={testUpdateConfig} size="sm">
            Test Update Config
          </Button>
          <Button onClick={testSaveSettings} size="sm">
            Test Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
