"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import type { StoredRecord } from "@/lib/storage"

interface RecordsExcelIOProps {
    /** Все отфильтрованные записи для экспорта */
    records: StoredRecord[]
    /** Функция для получения имени пользователя по ID */
    getUserName: (userId: string) => string
    /** Колбэк после успешного импорта */
    onImportSuccess: () => void
    /** Настройки формул для расчёта при импорте */
    config: {
        financial_load_percent: number
        vat_rate: number
        manager_bonus_percent: number
        client_bonus_tax_rate: number
    }
    customFormulas: Record<string, string>
}

// Заголовки колонок в Excel
const COLUMN_HEADERS = [
    { key: "date", label: "Дата" },
    { key: "counterparty", label: "Контрагент" },
    { key: "name", label: "Наименование" },
    { key: "quantity", label: "Количество" },
    { key: "purchase_price", label: "Закуп в тенге" },
    { key: "total_delivery", label: "Общая сумма доставки" },
    { key: "selling_with_bonus", label: "Цена продажи" },
    { key: "client_bonus", label: "Общий бонус клиента" },
    // Расчётные поля
    { key: "delivery_per_unit", label: "Доставка за ед." },
    { key: "sum_with_delivery", label: "Сумма за ед. с доставкой" },
    { key: "financial_load_percent", label: "Финансовая нагрузка %" },
    { key: "financial_load", label: "Финансовая нагрузка" },
    { key: "sum_with_load", label: "Сумма с нагрузкой" },
    { key: "markup_percent", label: "% накрутки" },
    { key: "markup", label: "Накрутка" },
    { key: "selling_price_no_vat", label: "Цена без НДС" },
    { key: "nds_tax", label: "НДС" },
    { key: "selling_price_vat", label: "Цена с НДС" },
    { key: "manager_bonus_percent", label: "% менеджера" },
    { key: "manager_bonus_unit", label: "Бонус менеджера за ед." },
    { key: "income_pre_kpn", label: "Доход без КПН" },
    { key: "kpn_tax", label: "КПН" },
    { key: "net_income_unit", label: "Чистый доход за ед." },
    { key: "margin_percent", label: "Маржа %" },
    { key: "total_selling_vat", label: "Общая сумма продажи с НДС" },
    { key: "total_selling_bonus", label: "Общая сумма с бонусом" },
    { key: "total_net_income", label: "Сумма чистого дохода" },
    { key: "total_purchase", label: "Общая сумма закупа" },
    { key: "total_expenses", label: "Общие расходы" },
    { key: "total_manager_bonuses", label: "Бонусы менеджера" },
    { key: "unit_bonus_client", label: "Бонус за ед." },
    // Служебные
    { key: "author", label: "Автор" },
    { key: "created_at", label: "Дата создания" },
]

// Поля, которые используются при импорте (входные данные)
const IMPORT_FIELDS = ["date", "counterparty", "name", "quantity", "purchase_price", "total_delivery", "selling_with_bonus", "client_bonus"]

export function RecordsExcelIO({ records, getUserName, onImportSuccess, config, customFormulas }: RecordsExcelIOProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const exportToExcel = async () => {
        setIsExporting(true)
        try {
            const workbook = XLSX.utils.book_new()

            // --- Лист 1: Данные ---
            const headers = COLUMN_HEADERS.map((col) => col.label)
            const rows = records.map((record) =>
                COLUMN_HEADERS.map((col) => {
                    if (col.key === "author") return getUserName(record.created_by)
                    if (col.key === "date") {
                        // Форматируем дату как YYYY-MM-DD строку, чтобы Excel не конвертировал
                        return record.date ? new Date(record.date).toLocaleDateString("ru-RU") : ""
                    }
                    if (col.key === "created_at") {
                        return record.created_at ? new Date(record.created_at).toLocaleString("ru-RU") : ""
                    }
                    const val = (record as unknown as Record<string, unknown>)[col.key]
                    return val !== undefined && val !== null ? val : ""
                })
            )

            const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

            // Стили: ширина колонок
            const colWidths = COLUMN_HEADERS.map((col) => ({
                wch: Math.max(col.label.length + 2, 12),
            }))
            dataSheet["!cols"] = colWidths

            XLSX.utils.book_append_sheet(workbook, dataSheet, "Записи")

            // --- Лист 2: Инструкция по импорту ---
            const instructionData = [
                ["Инструкция по импорту"],
                [""],
                ["Для импорта создайте лист с именем 'Импорт' со следующими колонками:"],
                IMPORT_FIELDS.map((key) => COLUMN_HEADERS.find((c) => c.key === key)?.label ?? key),
                [""],
                ["Пример строки:"],
                ["2024-01-15", "ООО Ромашка", "Товар А", 100, 1000, 5000, 1500, 10000],
                [""],
                ["Примечания:"],
                ["- Дата в формате YYYY-MM-DD (например: 2024-01-15)"],
                ["- Числовые поля должны содержать только числа"],
                ["- Расчётные поля вычисляются автоматически"],
                ["- Для массового импорта добавьте несколько строк в лист 'Импорт'"],
            ]

            const instructionSheet = XLSX.utils.aoa_to_sheet(instructionData)
            instructionSheet["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }]
            XLSX.utils.book_append_sheet(workbook, instructionSheet, "Инструкция")

            // --- Лист 3: Шаблон для импорта ---
            const templateHeaders = IMPORT_FIELDS.map((key) => COLUMN_HEADERS.find((c) => c.key === key)?.label ?? key)
            const templateSheet = XLSX.utils.aoa_to_sheet([templateHeaders])
            templateSheet["!cols"] = templateHeaders.map((h) => ({ wch: Math.max(h.length + 2, 16) }))
            XLSX.utils.book_append_sheet(workbook, templateSheet, "Импорт")

            // Экспорт файла
            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
            const blob = new Blob([excelBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })
            const dateStr = new Date().toISOString().split("T")[0]
            saveAs(blob, `records-export-${dateStr}.xlsx`)
        } catch (error) {
            console.error("Ошибка при экспорте:", error)
            alert("Ошибка при создании файла экспорта")
        } finally {
            setIsExporting(false)
        }
    }

    const importFromExcel = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setImportStatus(null)

        try {
            const arrayBuffer = await file.arrayBuffer()
            const data = new Uint8Array(arrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })

            // Ищем лист "Импорт"
            const importSheetName = workbook.SheetNames.find(
                (name: string) => name === "Импорт" || name === "Import" || name === "import"
            )
            if (!importSheetName) {
                setImportStatus({
                    type: "error",
                    message: 'Лист "Импорт" не найден. Скачайте шаблон (кнопка "Экспорт") и заполните лист "Импорт".',
                })
                return
            }

            const sheet = workbook.Sheets[importSheetName]
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

            if (rows.length < 2) {
                setImportStatus({ type: "error", message: "Нет данных для импорта. Добавьте строки в лист «Импорт»." })
                return
            }

            // Первая строка — заголовки, остальные — данные
            const headerRow = rows[0] as string[]
            const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== "" && cell !== null))

            if (dataRows.length === 0) {
                setImportStatus({ type: "error", message: "Нет данных для импорта." })
                return
            }

            // Маппинг заголовков на ключи
            const labelToKey: Record<string, string> = {}
            for (const col of COLUMN_HEADERS) {
                labelToKey[col.label] = col.key
            }

            const colIndices: Record<string, number> = {}
            headerRow.forEach((header, i) => {
                const key = labelToKey[header as string] ?? null
                if (key) colIndices[key] = i
            })

            // Проверяем обязательные поля
            const missing = IMPORT_FIELDS.filter((f) => colIndices[f] === undefined)
            if (missing.length > 0) {
                const missingLabels = missing.map((key) => COLUMN_HEADERS.find((c) => c.key === key)?.label ?? key)
                setImportStatus({
                    type: "error",
                    message: `Отсутствуют обязательные колонки: ${missingLabels.join(", ")}`,
                })
                return
            }

            // Парсим строки
            type ImportRow = {
                date: string
                counterparty: string
                name: string
                quantity: number
                purchase_price: number
                total_delivery: number
                selling_with_bonus: number
                client_bonus: number
            }

            const parsedRows: ImportRow[] = []
            const parseErrors: string[] = []

            dataRows.forEach((row, rowIndex) => {
                const lineNum = rowIndex + 2 // +2 т.к. строка 1 — заголовки

                // Парсим дату
                let dateStr = ""
                const rawDate = row[colIndices["date"]]
                if (rawDate !== undefined && rawDate !== "") {
                    if (typeof rawDate === "number") {
                        // Excel serial date
                        const jsDate = XLSX.SSF.parse_date_code(rawDate)
                        if (jsDate) {
                            const y = jsDate.y
                            const m = String(jsDate.m).padStart(2, "0")
                            const d = String(jsDate.d).padStart(2, "0")
                            dateStr = `${y}-${m}-${d}`
                        }
                    } else {
                        const s = String(rawDate).trim()
                        // Пробуем разные форматы
                        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                            dateStr = s.slice(0, 10)
                        } else if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) {
                            const [dd, mm, yyyy] = s.split(".")
                            dateStr = `${yyyy}-${mm}-${dd}`
                        } else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
                            const [dd, mm, yyyy] = s.split("/")
                            dateStr = `${yyyy}-${mm}-${dd}`
                        } else {
                            const parsed = new Date(s)
                            if (!isNaN(parsed.getTime())) {
                                dateStr = parsed.toISOString().split("T")[0]
                            }
                        }
                    }
                }

                if (!dateStr) {
                    parseErrors.push(`Строка ${lineNum}: неверный формат даты`)
                    return
                }

                const quantity = Number(row[colIndices["quantity"]])
                const purchase_price = Number(row[colIndices["purchase_price"]])
                const total_delivery = Number(row[colIndices["total_delivery"]])
                const selling_with_bonus = Number(row[colIndices["selling_with_bonus"]])
                const client_bonus = Number(row[colIndices["client_bonus"]] ?? 0)

                if (isNaN(quantity) || quantity <= 0) {
                    parseErrors.push(`Строка ${lineNum}: некорректное количество`)
                    return
                }

                parsedRows.push({
                    date: dateStr,
                    counterparty: String(row[colIndices["counterparty"]] ?? "").trim(),
                    name: String(row[colIndices["name"]] ?? "").trim(),
                    quantity,
                    purchase_price,
                    total_delivery,
                    selling_with_bonus,
                    client_bonus,
                })
            })

            if (parseErrors.length > 0 && parsedRows.length === 0) {
                setImportStatus({
                    type: "error",
                    message: `Ошибки парсинга:\n${parseErrors.slice(0, 5).join("\n")}`,
                })
                return
            }

            // Отправляем данные на сервер для импорта
            const res = await fetch("/api/admin/records/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows: parsedRows }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                setImportStatus({
                    type: "error",
                    message: errorData.error ?? "Ошибка при импорте записей на сервере",
                })
                return
            }

            const result = await res.json()
            const warnings = parseErrors.length > 0 ? ` (пропущено ${parseErrors.length} строк с ошибками)` : ""
            setImportStatus({
                type: "success",
                message: `Успешно импортировано ${result.imported ?? parsedRows.length} записей${warnings}`,
            })
            onImportSuccess()
        } catch (error) {
            console.error("Ошибка при импорте:", error)
            setImportStatus({
                type: "error",
                message: "Ошибка при чтении файла. Убедитесь, что файл имеет формат .xlsx",
            })
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Экспорт */}
            <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={isExporting || records.length === 0}
                className="gap-2"
            >
                {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                <FileSpreadsheet className="h-4 w-4" />
                {isExporting ? "Экспорт..." : `Экспорт XLS (${records.length})`}
            </Button>

            {/* Импорт */}
            <div className="relative">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importFromExcel}
                    disabled={isImporting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Импорт из Excel"
                />
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isImporting}
                    className="gap-2 pointer-events-none"
                >
                    {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {isImporting ? "Импорт..." : "Импорт XLS"}
                </Button>
            </div>

            {/* Статус импорта */}
            {importStatus && (
                <div
                    className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md ${importStatus.type === "success"
                        ? "text-green-700 bg-green-50 border border-green-200"
                        : "text-red-700 bg-red-50 border border-red-200"
                        }`}
                >
                    {importStatus.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="max-w-xs truncate" title={importStatus.message}>
                        {importStatus.message}
                    </span>
                </div>
            )}
        </div>
    )
}
