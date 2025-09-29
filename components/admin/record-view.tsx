"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import type { StoredRecord } from "@/lib/storage"

interface RecordViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: StoredRecord
}

export function RecordViewDialog({ open, onOpenChange, record }: RecordViewDialogProps) {
  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Просмотр записи: {record.name}</DialogTitle>
          <DialogDescription>Детальный просмотр сохраненных значений и расчетов</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input value={record.date} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Контрагент</Label>
              <Input value={record.counterparty} readOnly />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Наименование</Label>
              <Input value={record.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input value={record.quantity} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Закуп в тенге</Label>
              <Input value={formatCurrency(record.purchase_price)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Общая сумма доставки</Label>
              <Input value={formatCurrency(record.total_delivery)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Цена продажи с бонусом клиента</Label>
              <Input value={formatCurrency(record.selling_with_bonus)} readOnly />
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
                <Label>Общий бонус клиент с вычетом налога</Label>
                <Input value={formatCurrency(record.total_client_bonus_post_tax || 0)} readOnly />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


