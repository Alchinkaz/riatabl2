"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, FileSpreadsheet } from "lucide-react"
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface FormulaConfig {
  financial_load_percent: number
  vat_rate: number
  manager_bonus_percent: number
  client_bonus_tax_rate: number
}

interface CustomFormulas {
  [key: string]: string
}

interface FormulaExcelExportProps {
  config: FormulaConfig
  customFormulas: CustomFormulas
  onImport: (config: FormulaConfig, formulas: CustomFormulas) => void
}

const FORMULA_FIELDS = [
  { key: "delivery_per_unit", letter: "F", title: "Доставка за единицу", formula: "F = H / D" },
  { key: "sum_with_delivery", letter: "G", title: "Сумма за ед. с доставкой", formula: "G = E + F" },
  { key: "financial_load", letter: "J", title: "Финансовая нагрузка", formula: "J = G * (I / 100)" },
  { key: "sum_with_load", letter: "K", title: "Сумма с нагрузкой", formula: "K = G + J" },
  { key: "markup", letter: "M", title: "Накрутка", formula: "M = P - K" },
  { key: "markup_percent", letter: "L", title: "% накрутки", formula: "L = (M / K) * 100" },
  { key: "selling_price_no_vat", letter: "N", title: "Цена без НДС", formula: "N = P - O" },
  { key: "nds_tax", letter: "O", title: "НДС", formula: "O = N * (НДС / 100)" },
  { key: "manager_bonus_unit", letter: "S", title: "Бонус менеджера за ед.", formula: "S = N * (R / 100)" },
  { key: "income_pre_kpn", letter: "T", title: "Доход без КПН", formula: "T = P - E - F - J - S - O" },
  { key: "kpn_tax", letter: "U", title: "КПН", formula: "U = T * (КПН / 100)" },
  { key: "net_income_unit", letter: "V", title: "Чистый доход за ед.", formula: "V = T - U" },
  { key: "margin_percent", letter: "W", title: "Маржа в %", formula: "W = (V / P) * 100" },
  { key: "total_selling_vat", letter: "X", title: "Общая сумма с НДС", formula: "X = D * P" },
  { key: "total_selling_bonus", letter: "Y", title: "Общая сумма с бонусом", formula: "Y = D * Q" },
  { key: "total_net_income", letter: "Z", title: "Сумма чистого дохода", formula: "Z = D * V" },
  { key: "total_purchase", letter: "AA", title: "Общая сумма закупа", formula: "AA = D * E" },
  { key: "total_expenses", letter: "AB", title: "Сумма общих расходов", formula: "AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U)" },
  { key: "total_manager_bonuses", letter: "AC", title: "Общая сумма бонусов менеджера", formula: "AC = D * S" },
  { key: "unit_bonus_client", letter: "AD", title: "Бонус за ед.", formula: "AD = AE / D" },
  { key: "total_client_bonus_post_tax", letter: "AF", title: "Общий бонус клиент с вычетом налога", formula: "AF = AE / (1 + налог/100)" },
]

export function FormulaExcelExport({ config, customFormulas, onImport }: FormulaExcelExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const exportToExcel = async () => {
    setIsExporting(true)
    
    try {
      // Создаем рабочую книгу
      const workbook = XLSX.utils.book_new()
      
      // Лист с настройками
      const settingsData = [
        ["Параметр", "Значение", "Описание"],
        ["Финансовая нагрузка (%)", config.financial_load_percent, "Процент финансовой нагрузки"],
        ["НДС (%)", config.vat_rate, "Ставка НДС"],
        ["Бонус менеджера (%)", config.manager_bonus_percent, "Процент бонуса менеджера"],
        ["Налог на бонус клиента (%)", config.client_bonus_tax_rate, "Налог на бонус клиента"],
      ]
      
      const settingsSheet = XLSX.utils.aoa_to_sheet(settingsData)
      XLSX.utils.book_append_sheet(workbook, settingsSheet, "Настройки")
      
      // Лист с формулами
      const formulasData = [
        ["Буква", "Название", "Формула", "Кастомная формула"],
        ...FORMULA_FIELDS.map(field => [
          field.letter,
          field.title,
          field.formula,
          customFormulas[field.key] || field.formula
        ])
      ]
      
      const formulasSheet = XLSX.utils.aoa_to_sheet(formulasData)
      XLSX.utils.book_append_sheet(workbook, formulasSheet, "Формулы")
      
      // Лист с примерами расчетов
      const exampleData = [
        ["Параметр", "Обозначение", "Значение", "Описание"],
        ["Количество", "D", 100, "Количество товара"],
        ["Цена закупки", "E", 1000, "Цена закупки за единицу"],
        ["Общая доставка", "H", 5000, "Общая стоимость доставки"],
        ["Цена продажи с бонусом", "Q", 1500, "Цена продажи с учетом бонуса клиента"],
        ["Бонус клиента", "AE", 10000, "Общий бонус клиента"],
      ]
      
      const exampleSheet = XLSX.utils.aoa_to_sheet(exampleData)
      XLSX.utils.book_append_sheet(workbook, exampleSheet, "Примеры")
      
      // Экспортируем файл
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `formulas-config-${new Date().toISOString().split('T')[0]}.xlsx`)
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Читаем настройки
        const settingsSheet = workbook.Sheets['Настройки']
        const settingsData = XLSX.utils.sheet_to_json(settingsSheet, { header: 1 }) as any[][]
        
        const newConfig: FormulaConfig = {
          financial_load_percent: 5,
          vat_rate: 12,
          manager_bonus_percent: 3,
          client_bonus_tax_rate: 32,
        }
        
        // Парсим настройки
        settingsData.slice(1).forEach((row: any[]) => {
          if (row[0] === "Финансовая нагрузка (%)") newConfig.financial_load_percent = Number(row[1]) || 5
          if (row[0] === "НДС (%)") newConfig.vat_rate = Number(row[1]) || 12
          if (row[0] === "Бонус менеджера (%)") newConfig.manager_bonus_percent = Number(row[1]) || 3
          if (row[0] === "Налог на бонус клиента (%)") newConfig.client_bonus_tax_rate = Number(row[1]) || 32
        })
        
        // Читаем формулы
        const formulasSheet = workbook.Sheets['Формулы']
        const formulasData = XLSX.utils.sheet_to_json(formulasSheet, { header: 1 }) as any[][]
        
        const newFormulas: CustomFormulas = {}
        
        // Парсим формулы
        formulasData.slice(1).forEach((row: any[]) => {
          if (row[0] && row[1] && row[3]) {
            const fieldKey = FORMULA_FIELDS.find(f => f.letter === row[0])?.key
            if (fieldKey && row[3] !== row[2]) {
              newFormulas[fieldKey] = row[3]
            }
          }
        })
        
        onImport(newConfig, newFormulas)
        
      } catch (error) {
        console.error('Ошибка при импорте:', error)
        alert('Ошибка при чтении файла. Убедитесь, что файл имеет правильный формат.')
      } finally {
        setIsImporting(false)
        event.target.value = ''
      }
    }
    
    reader.readAsArrayBuffer(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Импорт/Экспорт формул в Excel
        </CardTitle>
        <CardDescription>
          Экспортируйте настройки и формулы в Excel для редактирования, затем импортируйте обратно
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Экспорт в Excel</h4>
            <p className="text-sm text-muted-foreground">
              Создайте Excel файл с текущими настройками и формулами
            </p>
            <Button 
              onClick={exportToExcel} 
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Экспорт..." : "Экспорт в Excel"}
            </Button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Импорт из Excel</h4>
            <p className="text-sm text-muted-foreground">
              Загрузите отредактированный Excel файл с формулами
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importFromExcel}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button 
                variant="outline" 
                className="w-full"
                disabled={isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Импорт..." : "Импорт из Excel"}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Инструкция:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Нажмите "Экспорт в Excel" для создания файла</li>
            <li>Откройте файл в Excel и отредактируйте формулы в листе "Формулы"</li>
            <li>Измените настройки в листе "Настройки" при необходимости</li>
            <li>Сохраните файл и нажмите "Импорт из Excel"</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
