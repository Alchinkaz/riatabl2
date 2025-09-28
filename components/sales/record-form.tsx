"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { calculateSalesRecord, formatCurrency, formatPercent, type SalesRecord } from "@/lib/calculations"
import { calculateSalesRecordWithSettings } from "@/lib/calculations-with-settings"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { useAuth } from "@/contexts/auth-context"
import { useFormulaSettings } from "@/contexts/formula-settings-context"
import { Calendar, AlertTriangle } from "lucide-react"

interface RecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: StoredRecord
  onSuccess: () => void
}

export function RecordForm({ open, onOpenChange, record, onSuccess }: RecordFormProps) {
  const { user } = useAuth()
  const { config, customFormulas, isLoading: settingsLoading } = useFormulaSettings()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    counterparty: "",
    name: "",
    quantity: 1,
    purchase_price: 0,
    total_delivery: 0,
    selling_with_bonus: 0,
    client_bonus: 0,
  })
  const [calculations, setCalculations] = useState<SalesRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (record) {
      setFormData({
        date: record.date ? new Date(record.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        counterparty: record.counterparty,
        name: record.name,
        quantity: record.quantity,
        purchase_price: record.purchase_price,
        total_delivery: record.total_delivery,
        selling_with_bonus: record.selling_with_bonus,
        client_bonus: record.client_bonus,
      })
    } else {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        counterparty: "",
        name: "",
        quantity: 1,
        purchase_price: 0,
        total_delivery: 0,
        selling_with_bonus: 0,
        client_bonus: 0,
      })
    }
  }, [record, open])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.quantity > 0 && !settingsLoading) {
        console.log('RecordForm: Using settings:', { config, customFormulas })
        const calc = calculateSalesRecordWithSettings({
          quantity: formData.quantity,
          purchase_price: formData.purchase_price,
          total_delivery: formData.total_delivery,
          selling_with_bonus: formData.selling_with_bonus,
          client_bonus: formData.client_bonus,
        }, config, customFormulas)
        console.log('RecordForm: Calculated result:', calc)
        setCalculations(calc)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [formData, config, customFormulas, settingsLoading])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) newErrors.date = "Дата обязательна"
    if (!formData.counterparty || formData.counterparty.length < 2) {
      newErrors.counterparty = "Контрагент должен содержать минимум 2 символа"
    }
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = "Наименование должно содержать минимум 3 символа"
    }
    if (formData.quantity <= 0) newErrors.quantity = "Количество должно быть больше 0"
    if (formData.purchase_price < 0) newErrors.purchase_price = "Закупочная цена не может быть отрицательной"
    if (formData.total_delivery < 0) newErrors.total_delivery = "Сумма доставки не может быть отрицательной"
    if (formData.selling_with_bonus < 0) newErrors.selling_with_bonus = "Цена продажи не может быть отрицательной"
    if (formData.client_bonus < 0) newErrors.client_bonus = "Бонус клиента не может быть отрицательным"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user || !calculations) return

    setIsSubmitting(true)
    try {
      const recordData = {
        date: formData.date,
        counterparty: formData.counterparty,
        name: formData.name,
        quantity: formData.quantity,
        purchase_price: formData.purchase_price,
        total_delivery: formData.total_delivery,
        selling_with_bonus: formData.selling_with_bonus,
        client_bonus: formData.client_bonus,
        ...calculations,
        created_by: user.id,
      }

      if (record) {
        await recordStorage.update(record.id, recordData)
      } else {
        await recordStorage.create(recordData)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving record:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "bg-green-500"
    if (margin >= 20) return "bg-yellow-500"
    return "bg-red-500"
  }

  const isLowSellingPrice = formData.selling_with_bonus < formData.purchase_price

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? `Редактировать запись: ${record.name}` : "Создать новую запись"}</DialogTitle>
          <DialogDescription>Заполните желтые поля. Расчеты обновляются автоматически.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Editable Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Дата
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="border-yellow-500"
                required
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterparty">Контрагент</Label>
              <Input
                id="counterparty"
                value={formData.counterparty}
                onChange={(e) => setFormData((prev) => ({ ...prev, counterparty: e.target.value }))}
                placeholder="например, Alchin"
                className="border-yellow-500"
                required
              />
              {errors.counterparty && <p className="text-sm text-red-500">{errors.counterparty}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Наименование</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="например, Комбинезон огнеупорный"
                className="border-yellow-500"
                required
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Количество</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 0 }))}
                placeholder="20"
                className="border-yellow-500"
                required
              />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">Закуп в тенге</Label>
              <Input
                id="purchase_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, purchase_price: Number.parseFloat(e.target.value) || 0 }))
                }
                placeholder="12500"
                className="border-yellow-500"
                required
              />
              {errors.purchase_price && <p className="text-sm text-red-500">{errors.purchase_price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_delivery">Общая сумма доставки</Label>
              <Input
                id="total_delivery"
                type="number"
                min="0"
                step="0.01"
                value={formData.total_delivery}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, total_delivery: Number.parseFloat(e.target.value) || 0 }))
                }
                placeholder="200"
                className="border-yellow-500"
                required
              />
              {errors.total_delivery && <p className="text-sm text-red-500">{errors.total_delivery}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_with_bonus">Цена продажи с бонусом клиента</Label>
              <Input
                id="selling_with_bonus"
                type="number"
                min="0"
                step="0.01"
                value={formData.selling_with_bonus}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, selling_with_bonus: Number.parseFloat(e.target.value) || 0 }))
                }
                placeholder="35000"
                className="border-yellow-500"
                required
              />
              {errors.selling_with_bonus && <p className="text-sm text-red-500">{errors.selling_with_bonus}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_bonus">Общий бонус клиент</Label>
              <Input
                id="client_bonus"
                type="number"
                min="0"
                step="0.01"
                value={formData.client_bonus}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, client_bonus: Number.parseFloat(e.target.value) || 0 }))
                }
                placeholder="200000"
                className="border-yellow-500"
                required
              />
              {errors.client_bonus && <p className="text-sm text-red-500">{errors.client_bonus}</p>}
            </div>
          </div>

          {/* Warning for low selling price */}
          {isLowSellingPrice && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Внимание: Цена продажи ниже закупочной цены!</AlertDescription>
            </Alert>
          )}

          {/* Calculated Fields Preview */}
          {calculations && (
            <Accordion type="single" collapsible defaultValue="calculations">
              <AccordionItem value="calculations">
                <AccordionTrigger>Вычисляемые значения</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Дост-в за ед</Label>
                      <Input value={formatCurrency(calculations.delivery_per_unit || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Сумма за ед. с доставкой</Label>
                      <Input value={formatCurrency(calculations.sum_with_delivery || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Финансовая нагрузка %</Label>
                      <Input value={formatPercent(calculations.financial_load_percent || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Финансовая нагрузка</Label>
                      <Input value={formatCurrency(calculations.financial_load || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Сумма за ед. с доставкой и фин. нагрузкой</Label>
                      <Input value={formatCurrency(calculations.sum_with_load || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>% накр</Label>
                      <Input value={formatPercent(calculations.markup_percent || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Накрутка</Label>
                      <Input value={formatCurrency(calculations.markup || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Цена продажи без НДС</Label>
                      <Input value={formatCurrency(calculations.selling_price_no_vat || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Налоги НДС</Label>
                      <Input value={formatCurrency(calculations.nds_tax || 0)} readOnly className="bg-green-50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Цена продажи с НДС</Label>
                      <Input value={formatCurrency(calculations.selling_price_vat || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>% мен-ра</Label>
                      <Input value={formatPercent(calculations.manager_bonus_percent || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>мен-ра</Label>
                      <Input value={formatCurrency(calculations.manager_bonus_unit || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Доход с ед. без вычета КПН</Label>
                      <Input value={formatCurrency(calculations.income_pre_kpn || 0)} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Налоги КПН</Label>
                      <Input value={formatCurrency(calculations.kpn_tax || 0)} readOnly className="bg-green-50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Чистый доход за ед.</Label>
                      <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                        {formatCurrency(calculations.net_income_unit || 0)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Маржа в %</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-red-600 bg-red-50">
                          {formatPercent(calculations.margin_percent || 0)}
                        </Badge>
                        <div className="flex-1 h-2 bg-gray-200 rounded">
                          <div
                            className={`h-full rounded ${getMarginColor(calculations.margin_percent || 0)}`}
                            style={{ width: `${Math.min(calculations.margin_percent || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total calculations */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-semibold mb-4">Общие суммы</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Общая сумма продажи с НДС</Label>
                        <Input value={formatCurrency(calculations.total_selling_vat || 0)} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Общая сумма продажи с НДС с учетом бонуса клиента</Label>
                        <Input value={formatCurrency(calculations.total_selling_bonus || 0)} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Сумма чистого дохода компании</Label>
                        <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                          {formatCurrency(calculations.total_net_income || 0)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Общая сумма закупа товара</Label>
                        <Input value={formatCurrency(calculations.total_purchase || 0)} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Сумма общих расходов</Label>
                        <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                          {formatCurrency(calculations.total_expenses || 0)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Общая сумма бонусов менеджера</Label>
                        <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                          {formatCurrency(calculations.total_manager_bonuses || 0)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Бонус за ед</Label>
                        <Input value={formatCurrency(calculations.unit_bonus_client || 0)} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Общий бонус клиент с вычетом налога</Label>
                        <Input value={formatCurrency(calculations.total_client_bonus_post_tax || 0)} readOnly />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting || Object.keys(errors).length > 0}>
              {isSubmitting ? "Сохранение..." : "Сохранить запись"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
