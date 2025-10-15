"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import type { StoredRecord } from "@/lib/storage"
import { useFormulaSettings } from "@/contexts/formula-settings-context"
import { calculateSalesRecordWithSettings } from "@/lib/calculations-with-settings"

interface RecordViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: StoredRecord
  onSuccess?: () => void
}

export function RecordViewDialog({ open, onOpenChange, record, onSuccess }: RecordViewDialogProps) {
  const { config, customFormulas } = useFormulaSettings()
  const [formData, setFormData] = useState({
    date: "",
    counterparty: "",
    name: "",
    quantity: 0,
    purchase_price: 0,
    total_delivery: 0,
    selling_with_bonus: 0,
    client_bonus: 0,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (record && open) {
      setFormData({
        date: record.date ? new Date(record.date).toISOString().split("T")[0] : "",
        counterparty: record.counterparty || "",
        name: record.name || "",
        quantity: record.quantity || 0,
        purchase_price: record.purchase_price || 0,
        total_delivery: record.total_delivery || 0,
        selling_with_bonus: record.selling_with_bonus || 0,
        client_bonus: record.client_bonus || 0,
      })
    }
  }, [record, open])

  if (!record) return null

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const computed = calculateSalesRecordWithSettings(
        {
          quantity: formData.quantity,
          purchase_price: formData.purchase_price,
          total_delivery: formData.total_delivery,
          selling_with_bonus: formData.selling_with_bonus,
          client_bonus: formData.client_bonus,
        },
        config,
        customFormulas,
      )

      const payload = {
        ...record,
        ...computed,
        date: formData.date,
        counterparty: formData.counterparty,
        name: formData.name,
        quantity: formData.quantity,
        purchase_price: formData.purchase_price,
        total_delivery: formData.total_delivery,
        selling_with_bonus: formData.selling_with_bonus,
        client_bonus: formData.client_bonus,
      }

      const res = await fetch(`/api/admin/records/${record.id}` , {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Не удалось сохранить изменения")
      onSuccess && onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Просмотр записи: {record.name}</DialogTitle>
          <DialogDescription>Детальный просмотр сохраненных значений и расчетов</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic info (editable) */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Контрагент</Label>
              <Input value={formData.counterparty} onChange={(e) => setFormData((p) => ({ ...p, counterparty: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Наименование</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input type="number" value={formData.quantity} onChange={(e) => setFormData((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Закуп в тенге</Label>
              <Input type="number" value={formData.purchase_price} onChange={(e) => setFormData((p) => ({ ...p, purchase_price: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Общая сумма доставки</Label>
              <Input type="number" value={formData.total_delivery} onChange={(e) => setFormData((p) => ({ ...p, total_delivery: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Цена продажи</Label>
              <Input type="number" value={formData.selling_with_bonus} onChange={(e) => setFormData((p) => ({ ...p, selling_with_bonus: Number(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Общий бонус клиент</Label>
              <Input type="number" value={formData.client_bonus} onChange={(e) => setFormData((p) => ({ ...p, client_bonus: Number(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Calculated fields */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Дост-в за ед</Label>
              <Input value={formatCurrency(record.delivery_per_unit || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Сумма за ед. с доставкой</Label>
              <Input value={formatCurrency(record.sum_with_delivery || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Финансовая нагрузка %</Label>
              <Input value={formatPercent(record.financial_load_percent || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Финансовая нагрузка</Label>
              <Input value={formatCurrency(record.financial_load || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Сумма за ед. с доставкой и фин. нагрузкой</Label>
              <Input value={formatCurrency(record.sum_with_load || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>% накр</Label>
              <Input value={formatPercent(record.markup_percent || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Накрутка</Label>
              <Input value={formatCurrency(record.markup || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Цена продажи без НДС</Label>
              <Input value={formatCurrency(record.selling_price_no_vat || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Налоги НДС</Label>
              <Input value={formatCurrency(record.nds_tax || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Цена продажи с НДС</Label>
              <Input value={formatCurrency(record.selling_price_vat || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>% мен-ра</Label>
              <Input value={formatPercent(record.manager_bonus_percent || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>мен-ра</Label>
              <Input value={formatCurrency(record.manager_bonus_unit || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Доход с ед. без вычета КПН</Label>
              <Input value={formatCurrency(record.income_pre_kpn || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Налоги КПН</Label>
              <Input value={formatCurrency(record.kpn_tax || 0)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Чистый доход за ед.</Label>
              <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                {formatCurrency(record.net_income_unit || 0)}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Маржа в %</Label>
              <Badge variant="secondary" className="text-red-600 bg-red-50">
                {formatPercent(record.margin_percent || 0)}
              </Badge>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold mb-4">Общие суммы</h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Общая сумма продажи с НДС</Label>
                <Input value={formatCurrency(record.total_selling_vat || 0)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Общая сумма продажи с НДС с учетом бонуса клиента</Label>
                <Input value={formatCurrency(record.total_selling_bonus || 0)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Сумма чистого дохода компании</Label>
                <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                  {formatCurrency(record.total_net_income || 0)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Общая сумма закупа товара</Label>
                <Input value={formatCurrency(record.total_purchase || 0)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Сумма общих расходов</Label>
                <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                  {formatCurrency(record.total_expenses || 0)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Общая сумма бонусов менеджера</Label>
                <Badge variant="secondary" className="w-full justify-center py-2 text-red-600 bg-red-50">
                  {formatCurrency(record.total_manager_bonuses || 0)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Бонус за ед</Label>
                <Input value={formatCurrency(record.unit_bonus_client || 0)} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Общий бонус клиента</Label>
                <Input value={formatCurrency(record.client_bonus || 0)} readOnly />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Сохранение..." : "Сохранить"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


