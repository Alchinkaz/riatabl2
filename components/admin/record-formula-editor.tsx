"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, RotateCcw, Info, Edit3, TestTube } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RecordFormulaConfig {
  [key: string]: string
}

// Формулы для записей продаж
const RECORD_FORMULA_FIELDS = [
  { key: "delivery_per_unit", letter: "F", title: "Доставка за единицу", description: "F = H / D" },
  { key: "sum_with_delivery", letter: "G", title: "Сумма за ед. с доставкой", description: "G = E + F" },
  { key: "financial_load", letter: "J", title: "Финансовая нагрузка", description: "J = G * (I / 100)" },
  { key: "sum_with_load", letter: "K", title: "Сумма с нагрузкой", description: "K = G + J" },
  { key: "markup", letter: "M", title: "Накрутка", description: "M = P - K" },
  { key: "markup_percent", letter: "L", title: "% накрутки", description: "L = (M / K) * 100" },
  { key: "selling_price_no_vat", letter: "N", title: "Цена без НДС", description: "N = P - O" },
  { key: "nds_tax", letter: "O", title: "НДС", description: "O = N * (НДС / 100)" },
  { key: "selling_price_vat", letter: "P", title: "Цена с НДС", description: "P = N + O" },
  { key: "manager_bonus_unit", letter: "S", title: "Бонус менеджера за ед.", description: "S = N * (R / 100)" },
  { key: "income_pre_kpn", letter: "T", title: "Доход без КПН", description: "T = P - E - F - J - S - O" },
  { key: "kpn_tax", letter: "U", title: "КПН", description: "U = T * (КПН / 100)" },
  { key: "net_income_unit", letter: "V", title: "Чистый доход за ед.", description: "V = T - U" },
  { key: "margin_percent", letter: "W", title: "Маржа в %", description: "W = (V / P) * 100" },
  { key: "total_selling_vat", letter: "X", title: "Общая сумма с НДС", description: "X = D * P" },
  { key: "total_selling_bonus", letter: "Y", title: "Общая сумма с бонусом", description: "Y = D * Q" },
  { key: "total_net_income", letter: "Z", title: "Сумма чистого дохода", description: "Z = D * V" },
  { key: "total_purchase", letter: "AA", title: "Общая сумма закупа", description: "AA = D * E" },
  { key: "total_expenses", letter: "AB", title: "Сумма общих расходов", description: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U)" },
  { key: "total_manager_bonuses", letter: "AC", title: "Общие бонусы менеджера", description: "AC = D * S" },
  { key: "unit_bonus_client", letter: "AD", title: "Бонус за единицу", description: "AD = AE / D" },
  { key: "total_client_bonus_post_tax", letter: "AF", title: "Бонус клиента с налогом", description: "AF = AE / (1 + налог/100)" },
]

const DEFAULT_RECORD_FORMULAS: RecordFormulaConfig = {
  delivery_per_unit: "F = H / D",
  sum_with_delivery: "G = E + F",
  financial_load: "J = G * (I / 100)",
  sum_with_load: "K = G + J",
  markup: "M = P - K",
  markup_percent: "L = (M / K) * 100",
  selling_price_no_vat: "N = P - O",
  nds_tax: "O = N * (НДС / 100)",
  selling_price_vat: "P = N + O",
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

export function RecordFormulaEditor() {
  const { user } = useAuth()
  const [formulas, setFormulas] = useState<RecordFormulaConfig>(DEFAULT_RECORD_FORMULAS)
  const [isSaved, setIsSaved] = useState(false)
  const [testValues, setTestValues] = useState({
    D: 10, // quantity
    E: 1000, // purchase_price
    H: 500, // total_delivery
    Q: 1500, // selling_with_bonus
    AE: 100, // client_bonus
    I: 5, // financial_load_percent
    R: 3, // manager_bonus_percent
    НДС: 12, // vat_rate
    КПН: 20, // kpn_tax_rate
    налог: 32, // client_bonus_tax_rate
  })

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("user_settings")
        .select("record_formulas")
        .eq("user_id", user.id)
        .maybeSingle()
      if (!active) return
      if (!error && data?.record_formulas) {
        setFormulas(data.record_formulas as RecordFormulaConfig)
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    const payload = {
      user_id: user.id,
      record_formulas: formulas,
    }
    const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" })
    if (!error) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } else {
      // eslint-disable-next-line no-console
      console.error("save record formulas error", error)
    }
  }

  const handleReset = async () => {
    setFormulas(DEFAULT_RECORD_FORMULAS)
    if (user) {
      await supabase
        .from("user_settings")
        .update({ record_formulas: DEFAULT_RECORD_FORMULAS })
        .eq("user_id", user.id)
    }
  }

  const handleFormulaChange = (key: string, value: string) => {
    setFormulas((prev) => ({ ...prev, [key]: value }))
  }

  const handleTestValueChange = (variable: string, value: string) => {
    setTestValues((prev) => ({ ...prev, [variable]: parseFloat(value) || 0 }))
  }

  const evaluateFormula = (formula: string): number => {
    try {
      // Заменяем переменные на их значения
      let expression = formula
      Object.entries(testValues).forEach(([varName, value]) => {
        expression = expression.replace(new RegExp(`\\b${varName}\\b`, 'g'), value.toString())
      })
      
      // Вычисляем выражение
      // eslint-disable-next-line no-eval
      return eval(expression)
    } catch {
      return 0
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Редактор формул для записей
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Настройте формулы расчета для записей продаж. Формулы применяются при создании и обновлении записей.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
          <Button onClick={handleSave} className={isSaved ? "bg-green-600" : ""}>
            <Save className="h-4 w-4 mr-2" />
            {isSaved ? "Сохранено!" : "Сохранить"}
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Формулы применяются к новым записям. Существующие записи сохраняют свои расчетные значения.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="formulas" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formulas">Формулы записей</TabsTrigger>
          <TabsTrigger value="test">Тестирование</TabsTrigger>
          <TabsTrigger value="reference">Справочник</TabsTrigger>
        </TabsList>

        <TabsContent value="formulas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Формулы расчета записей
              </CardTitle>
              <CardDescription>
                Настройте формулы для автоматического расчета полей в записях продаж
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1">
                {RECORD_FORMULA_FIELDS.map(({ key, letter, title, description }) => (
                  <div key={key} className="space-y-2 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {letter}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={key} className="text-sm font-medium">
                          {title}
                        </Label>
                        <Input
                          id={key}
                          value={formulas[key] || ""}
                          onChange={(e) => handleFormulaChange(key, e.target.value)}
                          placeholder={description}
                          className="font-mono text-sm mt-1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-11">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Тестирование формул
              </CardTitle>
              <CardDescription>
                Проверьте работу формул с тестовыми данными
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Тестовые значения</Label>
                  <div className="grid gap-2 grid-cols-2">
                    {Object.entries(testValues).map(([variable, value]) => (
                      <div key={variable} className="space-y-1">
                        <Label htmlFor={variable} className="text-xs">{variable}</Label>
                        <Input
                          id={variable}
                          type="number"
                          value={value}
                          onChange={(e) => handleTestValueChange(variable, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Результаты формул</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {RECORD_FORMULA_FIELDS.map(({ key, letter, title }) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <span className="font-mono">{letter}: {formulas[key] || "не задано"}</span>
                        <Badge variant="outline">
                          {evaluateFormula(formulas[key] || "0").toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Переменные в формулах</CardTitle>
              <CardDescription>Обозначения переменных, используемых в формулах записей</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div><strong>D</strong> - Количество (quantity)</div>
                <div><strong>E</strong> - Закуп в тенге (purchase_price)</div>
                <div><strong>F</strong> - Доставка за единицу (delivery_per_unit)</div>
                <div><strong>G</strong> - Сумма за ед. с доставкой (sum_with_delivery)</div>
                <div><strong>H</strong> - Общая доставка (total_delivery)</div>
                <div><strong>I</strong> - Финансовая нагрузка % (financial_load_percent)</div>
                <div><strong>J</strong> - Финансовая нагрузка (financial_load)</div>
                <div><strong>K</strong> - Сумма с нагрузкой (sum_with_load)</div>
                <div><strong>L</strong> - % накрутки (markup_percent)</div>
                <div><strong>M</strong> - Накрутка (markup)</div>
                <div><strong>N</strong> - Цена без НДС (selling_price_no_vat)</div>
                <div><strong>O</strong> - НДС налог (nds_tax)</div>
                <div><strong>P</strong> - Цена с НДС (selling_price_vat)</div>
                <div><strong>Q</strong> - Цена с бонусом (selling_price_with_bonus)</div>
                <div><strong>R</strong> - % менеджера (manager_bonus_percent)</div>
                <div><strong>S</strong> - Бонус менеджера (manager_bonus_unit)</div>
                <div><strong>T</strong> - Доход без КПН (income_pre_kpn)</div>
                <div><strong>U</strong> - КПН налог (kpn_tax)</div>
                <div><strong>V</strong> - Чистый доход за ед. (net_income_unit)</div>
                <div><strong>W</strong> - Маржа в % (margin_percent)</div>
                <div><strong>X</strong> - Общая сумма с НДС (total_selling_vat)</div>
                <div><strong>Y</strong> - Общая сумма с бонусом (total_selling_bonus)</div>
                <div><strong>Z</strong> - Сумма чистого дохода (total_net_income)</div>
                <div><strong>AA</strong> - Общая сумма закупа (total_purchase)</div>
                <div><strong>AB</strong> - Сумма общих расходов (total_expenses)</div>
                <div><strong>AC</strong> - Общие бонусы менеджера (total_manager_bonuses)</div>
                <div><strong>AD</strong> - Бонус за единицу (unit_bonus_client)</div>
                <div><strong>AE</strong> - Бонус клиента (total_client_bonus)</div>
                <div><strong>AF</strong> - Бонус клиента с налогом (total_client_bonus_post_tax)</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
