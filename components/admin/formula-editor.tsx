"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calculator, Save, RotateCcw, Info, Edit3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

const FORMULA_DESCRIPTIONS = {
  // Базовые расчеты
  delivery_per_unit: "F = H / D (Доставка за единицу)",
  sum_with_delivery: "G = E + F (Сумма за ед. с доставкой)",
  total_delivery: "H = H (Общая сумма доставки)",
  financial_load_percent: "I = I% (Финансовая нагрузка %)",
  financial_load: "J = G * (I / 100) (Финансовая нагрузка)",
  sum_with_load: "K = G + J (Сумма за ед. с доставкой и фин. нагрузкой)",

  // Накрутка и цены
  markup_percent: "L = (M / K) * 100 (% накрутки)",
  markup: "M = P - K (Накрутка)",
  selling_price_no_vat: "N = P - O (Цена продажи без НДС)",
  nds_tax: "O = N * (НДС / 100) (НДС)",
  selling_price_vat: "P = N + O (Цена продажи с НДС)",
  selling_price_with_bonus: "Q = P + AD (Цена продажи с бонусом клиента)",

  // Менеджер и доходы
  manager_bonus_percent: "R = R% (% менеджера)",
  manager_bonus_unit: "S = N * (R / 100) (Бонус менеджера за ед.)",
  income_pre_kpn: "T = P - E - F - J - S - O (Доход с ед. без вычета КПН)",
  kpn_tax: "U = T * (КПН / 100) (КПН)",
  net_income_unit: "V = T - U (Чистый доход за ед.)",
  margin_percent: "W = (V / P) * 100 (Маржа в %)",

  // Общие суммы
  total_selling_vat: "X = D * P (Общая сумма продажи с НДС)",
  total_selling_bonus: "Y = D * Q (Общая сумма продажи с НДС с учетом бонуса клиента)",
  total_net_income: "Z = D * V (Сумма чистого дохода компании)",
  total_purchase: "AA = D * E (Общая сумма закупа товара)",
  total_expenses: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U) (Сумма общих расходов)",
  total_manager_bonuses: "AC = D * S (Общая сумма бонусов менеджера)",

  // Бонусы клиента
  unit_bonus_client: "AD = AE / D (Бонус за ед.)",
  total_client_bonus: "AE = AE (Общий бонус клиент)",
  total_client_bonus_post_tax: "AF = AE / (1 + налог/100) (Общий бонус клиент с вычетом налога)",
}

const DEFAULT_CUSTOM_FORMULAS: CustomFormulas = {
  delivery_per_unit: "F = H / D (Доставка за единицу)",
  sum_with_delivery: "G = E + F (Сумма за ед. с доставкой)",
  financial_load: "J = G * (I / 100) (Финансовая нагрузка)",
  sum_with_load: "K = G + J (Сумма с нагрузкой)",
  markup: "M = P - K (Накрутка)",
  markup_percent: "L = (M / K) * 100 (% накрутки)",
  selling_price_no_vat: "N = P - O (Цена без НДС)",
  nds_tax: "O = N * (НДС / 100) (НДС)",
  manager_bonus_unit: "S = N * (R / 100) (Бонус менеджера за ед.)",
  income_pre_kpn: "T = P - E - F - J - S - O (Доход без КПН)",
  kpn_tax: "U = T * (КПН / 100) (КПН)",
  net_income_unit: "V = T - U (Чистый доход за ед.)",
  margin_percent: "W = (V / P) * 100 (Маржа в %)",
  total_selling_vat: "X = D * P (Общая сумма с НДС)",
  total_selling_bonus: "Y = D * Q (Общая сумма с бонусом)",
  total_net_income: "Z = D * V (Сумма чистого дохода)",
  total_purchase: "AA = D * E (Общая сумма закупа)",
  total_expenses: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U) (Сумма общих расходов)",
  total_manager_bonuses: "AC = D * S (Общие бонусы менеджера)",
  unit_bonus_client: "AD = AE / D (Бонус за единицу)",
  total_client_bonus_post_tax: "AF = AE / (1 + налог/100) (Бонус клиента с налогом)",
}

// Отображаемый порядок и подписи (буква + русское название)
const FORMULA_FIELDS: Array<{ key: keyof CustomFormulas; letter: string; title: string; placeholder: string }> = [
  { key: "delivery_per_unit", letter: "F", title: "Доставка за единицу", placeholder: "F = H / D (Доставка за единицу)" },
  { key: "sum_with_delivery", letter: "G", title: "Сумма за ед. с доставкой", placeholder: "G = E + F (Сумма за ед. с доставкой)" },
  { key: "financial_load", letter: "J", title: "Финансовая нагрузка", placeholder: "J = G * (I / 100) (Финансовая нагрузка)" },
  { key: "sum_with_load", letter: "K", title: "Сумма с нагрузкой", placeholder: "K = G + J (Сумма с нагрузкой)" },
  { key: "markup", letter: "M", title: "Накрутка", placeholder: "M = P - K (Накрутка)" },
  { key: "markup_percent", letter: "L", title: "% накрутки", placeholder: "L = (M / K) * 100 (% накрутки)" },
  { key: "selling_price_no_vat", letter: "N", title: "Цена без НДС", placeholder: "N = P - O (Цена без НДС)" },
  { key: "nds_tax", letter: "O", title: "НДС", placeholder: "O = N * (НДС / 100) (НДС)" },
  { key: "manager_bonus_unit", letter: "S", title: "Бонус менеджера за ед.", placeholder: "S = N * (R / 100) (Бонус менеджера за ед.)" },
  { key: "income_pre_kpn", letter: "T", title: "Доход без КПН", placeholder: "T = P - E - F - J - S - O (Доход без КПН)" },
  { key: "kpn_tax", letter: "U", title: "КПН", placeholder: "U = T * (КПН / 100) (КПН)" },
  { key: "net_income_unit", letter: "V", title: "Чистый доход за ед.", placeholder: "V = T - U (Чистый доход за ед.)" },
  { key: "margin_percent", letter: "W", title: "Маржа в %", placeholder: "W = (V / P) * 100 (Маржа в %)" },
  { key: "total_selling_vat", letter: "X", title: "Общая сумма с НДС", placeholder: "X = D * P (Общая сумма с НДС)" },
  { key: "total_selling_bonus", letter: "Y", title: "Общая сумма с бонусом", placeholder: "Y = D * Q (Общая сумма с бонусом)" },
  { key: "total_net_income", letter: "Z", title: "Сумма чистого дохода", placeholder: "Z = D * V (Сумма чистого дохода)" },
  { key: "total_purchase", letter: "AA", title: "Общая сумма закупа", placeholder: "AA = D * E (Общая сумма закупа)" },
  { key: "total_expenses", letter: "AB", title: "Сумма общих расходов", placeholder: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U) (Сумма общих расходов)" },
  { key: "total_manager_bonuses", letter: "AC", title: "Общие бонусы менеджера", placeholder: "AC = D * S (Общие бонусы менеджера)" },
  { key: "unit_bonus_client", letter: "AD", title: "Бонус за единицу", placeholder: "AD = AE / D (Бонус за единицу)" },
  { key: "total_client_bonus_post_tax", letter: "AF", title: "Бонус клиента с налогом", placeholder: "AF = AE / (1 + налог/100) (Бонус клиента с налогом)" },
]

export function FormulaEditor() {
  const { user } = useAuth()
  const [config, setConfig] = useState<FormulaConfig>(DEFAULT_CONFIG)
  const [customFormulas, setCustomFormulas] = useState<CustomFormulas>(DEFAULT_CUSTOM_FORMULAS)
  const [isSaved, setIsSaved] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importText, setImportText] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("user_settings")
        .select("formula_config, custom_formulas")
        .eq("user_id", user.id)
        .maybeSingle()
      if (!active) return
      if (!error && data) {
        if (data.formula_config) setConfig(data.formula_config as FormulaConfig)
        if (data.custom_formulas) setCustomFormulas(data.custom_formulas as CustomFormulas)
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
      formula_config: config,
      custom_formulas: customFormulas,
    }
    const { error } = await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" })
    if (!error) {
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    } else {
      // eslint-disable-next-line no-console
      console.error("save settings error", error)
    }
  }

  const handleReset = async () => {
    setConfig(DEFAULT_CONFIG)
    setCustomFormulas(DEFAULT_CUSTOM_FORMULAS)
    if (user) {
      await supabase
        .from("user_settings")
        .update({ formula_config: DEFAULT_CONFIG, custom_formulas: DEFAULT_CUSTOM_FORMULAS })
        .eq("user_id", user.id)
    }
  }

  const handleExport = () => {
    const blob = new Blob([
      JSON.stringify(
        {
          formula_config: config,
          custom_formulas: customFormulas,
        },
        null,
        2
      ),
    ], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "formula-settings.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText)
      if (parsed.formula_config) setConfig(parsed.formula_config)
      if (parsed.custom_formulas) setCustomFormulas(parsed.custom_formulas)
      setIsImportOpen(false)
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert("Некорректный JSON. Проверьте формат export файла.")
    }
  }

  const handleConfigChange = (key: keyof FormulaConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleFormulaChange = (key: string, value: string) => {
    setCustomFormulas((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Настройка формул расчетов
          </h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Изменение параметров влияет на новые расчеты. Вы можете экспортировать/импортировать настройки.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Экспорт JSON
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            Импорт JSON
          </Button>
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
          Изменения параметров влияют только на новые расчеты. Существующие записи сохраняют свои значения.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="parameters" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parameters">Параметры</TabsTrigger>
          <TabsTrigger value="formulas">Редактор формул</TabsTrigger>
          <TabsTrigger value="reference">Справочник</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="space-y-4">
          {/* Configuration Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Параметры расчетов</CardTitle>
              <CardDescription>Основные проценты и коэффициенты, используемые в формулах</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="financial_load">Финансовая нагрузка (%)</Label>
                  <Input
                    id="financial_load"
                    type="number"
                    step="0.1"
                    value={config.financial_load_percent}
                    onChange={(e) => handleConfigChange("financial_load_percent", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Используется в формуле: J = G * (I / 100)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat_rate">НДС ставка (%)</Label>
                  <Input
                    id="vat_rate"
                    type="number"
                    step="0.1"
                    value={config.vat_rate}
                    onChange={(e) => handleConfigChange("vat_rate", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Используется в формуле: O = N * (НДС / 100)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_bonus">Бонус менеджера (%)</Label>
                  <Input
                    id="manager_bonus"
                    type="number"
                    step="0.1"
                    value={config.manager_bonus_percent}
                    onChange={(e) => handleConfigChange("manager_bonus_percent", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Используется в формуле: S = N * (R / 100)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kpn_tax">КПН налог (%)</Label>
                  <Input
                    id="kpn_tax"
                    type="number"
                    step="0.1"
                    value={config.kpn_tax_rate}
                    onChange={(e) => handleConfigChange("kpn_tax_rate", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Используется в формуле: U = T * (КПН / 100)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_bonus_tax">Налог на бонус клиента (%)</Label>
                  <Input
                    id="client_bonus_tax"
                    type="number"
                    step="0.1"
                    value={config.client_bonus_tax_rate}
                    onChange={(e) => handleConfigChange("client_bonus_tax_rate", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Используется в формуле: AF = AE / (1 + налог/100)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formulas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Редактор формул в стиле Excel
              </CardTitle>
              <CardDescription>
                Редактируйте формулы в удобном формате: F = H / D (как в Excel). Каждая формула в отдельной строке.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-1">
                {FORMULA_FIELDS.map(({ key, letter, title, placeholder }) => (
                  <div key={key as string} className="space-y-2 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {letter}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={key as string} className="text-sm font-medium">
                          {title}
                        </Label>
                        <Input
                          id={key as string}
                          value={customFormulas[key] || ""}
                          onChange={(e) => handleFormulaChange(key as string, e.target.value)}
                          placeholder={placeholder}
                          className="font-mono text-sm mt-1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground ml-11">
                      {FORMULA_DESCRIPTIONS[key as keyof typeof FORMULA_DESCRIPTIONS] || "Пользовательская формула"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reference" className="space-y-4">
          {/* Formula Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Справочник формул</CardTitle>
              <CardDescription>Все формулы, используемые в системе расчетов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-1">
                {Object.entries(FORMULA_DESCRIPTIONS).map(([key, formula]) => (
                  <div key={key} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {key.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded block">{formula}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Variable Legend */}
          <Card>
            <CardHeader>
              <CardTitle>Обозначения переменных</CardTitle>
              <CardDescription>Расшифровка букв и переменных, используемых в формулах</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <strong>D / quantity</strong> - Количество
                </div>
                <div>
                  <strong>E / purchase_price</strong> - Закуп в тенге
                </div>
                <div>
                  <strong>F / delivery_per_unit</strong> - Доставка за единицу
                </div>
                <div>
                  <strong>G / sum_with_delivery</strong> - Сумма за ед. с доставкой
                </div>
                <div>
                  <strong>H / total_delivery</strong> - Общая доставка
                </div>
                <div>
                  <strong>I / financial_load_percent</strong> - Финансовая нагрузка %
                </div>
                <div>
                  <strong>J / financial_load</strong> - Финансовая нагрузка
                </div>
                <div>
                  <strong>K / sum_with_load</strong> - Сумма с нагрузкой
                </div>
                <div>
                  <strong>L / markup_percent</strong> - % накрутки
                </div>
                <div>
                  <strong>M / markup</strong> - Накрутка
                </div>
                <div>
                  <strong>N / selling_price_no_vat</strong> - Цена без НДС
                </div>
                <div>
                  <strong>O / nds_tax</strong> - НДС налог
                </div>
                <div>
                  <strong>P / selling_price_vat</strong> - Цена с НДС
                </div>
                <div>
                  <strong>Q / selling_price_with_bonus</strong> - Цена с бонусом
                </div>
                <div>
                  <strong>R / manager_bonus_percent</strong> - % менеджера
                </div>
                <div>
                  <strong>S / manager_bonus_unit</strong> - Бонус менеджера
                </div>
                <div>
                  <strong>T / income_pre_kpn</strong> - Доход без КПН
                </div>
                <div>
                  <strong>U / kpn_tax</strong> - КПН налог
                </div>
                <div>
                  <strong>V / net_income_unit</strong> - Чистый доход за ед.
                </div>
                <div>
                  <strong>W / margin_percent</strong> - Маржа в %
                </div>
                <div>
                  <strong>X / total_selling_vat</strong> - Общая сумма с НДС
                </div>
                <div>
                  <strong>Y / total_selling_bonus</strong> - Общая сумма с бонусом
                </div>
                <div>
                  <strong>Z / total_net_income</strong> - Сумма чистого дохода
                </div>
                <div>
                  <strong>AA / total_purchase</strong> - Общая сумма закупа
                </div>
                <div>
                  <strong>AB / total_expenses</strong> - Сумма общих расходов
                </div>
                <div>
                  <strong>AC / total_manager_bonuses</strong> - Общие бонусы менеджера
                </div>
                <div>
                  <strong>AD / unit_bonus_client</strong> - Бонус за единицу
                </div>
                <div>
                  <strong>AE / total_client_bonus</strong> - Бонус клиента
                </div>
                <div>
                  <strong>AF / total_client_bonus_post_tax</strong> - Бонус клиента с налогом
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Импорт настроек из JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Вставьте содержимое export файла или JSON с полями {"{ formula_config, custom_formulas }"}.
            </p>
            <Textarea rows={10} value={importText} onChange={(e) => setImportText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Отмена</Button>
              <Button onClick={handleImport}>Импортировать</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
