"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RecordForm } from "@/components/sales/record-form"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { Plus, Edit, Trash2, Calculator } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadRecords = async () => {
    if (user) {
      const userRecords = await recordStorage.getByUser(user.id)
      setRecords(userRecords)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadRecords()
  }, [user])

  const handleCreateRecord = () => {
    setSelectedRecord(undefined)
    setIsFormOpen(true)
  }

  const handleEditRecord = (record: StoredRecord) => {
    setSelectedRecord(record)
    setIsFormOpen(true)
  }

  const handleDeleteRecord = async (record: StoredRecord) => {
    if (confirm("Удалить эту запись? Это действие нельзя отменить.")) {
      await recordStorage.delete(record.id)
      await loadRecords()
    }
  }

  const handleFormSuccess = async () => {
    await loadRecords()
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600 bg-green-50"
    if (margin >= 20) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Мои записи</h1>
            <p className="text-muted-foreground">Управление расчетами продаж</p>
          </div>
          <Button onClick={handleCreateRecord}>
            <Plus className="h-4 w-4 mr-2" />
            Создать запись
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(records.reduce((sum, r) => sum + (r.total_net_income || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Средняя маржа</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {records.length > 0
                  ? formatPercent(records.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / records.length)
                  : "0%"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Общие расходы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(records.reduce((sum, r) => sum + (r.total_expenses || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Записи расчетов
            </CardTitle>
            <CardDescription>Ваши расчеты продаж с автоматическими вычислениями</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Загрузка...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет записей</h3>
                <p className="text-muted-foreground mb-4">Создайте первую запись для начала работы</p>
                <Button onClick={handleCreateRecord}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать запись
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Контрагент</TableHead>
                      <TableHead>Наименование</TableHead>
                      <TableHead>Кол-во</TableHead>
                      <TableHead>Закуп в тенге</TableHead>
                      <TableHead>Общая доставка</TableHead>
                      <TableHead>Цена с бонусом</TableHead>
                      <TableHead>Чистый доход за ед.</TableHead>
                      <TableHead>Маржа %</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {(() => {
                            if (!record.date) return "Не указана"

                            const date = new Date(record.date)
                            if (isNaN(date.getTime())) return "Не указана"

                            return format(date, "dd.MM.yyyy", { locale: ru })
                          })()}
                        </TableCell>
                        <TableCell className="font-medium">{record.counterparty}</TableCell>
                        <TableCell>{record.name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{formatCurrency(record.purchase_price)}</TableCell>
                        <TableCell>{formatCurrency(record.total_delivery)}</TableCell>
                        <TableCell>{formatCurrency(record.selling_with_bonus)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-red-600 bg-red-50">
                            {formatCurrency(record.net_income_unit || 0)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getMarginColor(record.margin_percent || 0)}>
                            {formatPercent(record.margin_percent || 0)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(record)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Form Modal */}
        <RecordForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          record={selectedRecord}
          onSuccess={handleFormSuccess}
        />
      </main>
    </div>
  )
}
