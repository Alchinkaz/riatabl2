"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminRecordForm } from "@/components/admin/admin-record-form"
import { FormulaEditor } from "@/components/admin/formula-editor"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { userStorage } from "@/lib/user-storage"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { Plus, Edit, Trash2, Filter, Users, TrendingUp, DollarSign, Target, Calculator } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<StoredRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("records")
  const [filterManager, setFilterManager] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [users, setUsers] = useState(userStorage.getAll())

  const loadRecords = () => {
    const allRecords = recordStorage.getAll()
    setRecords(allRecords)
    setIsLoading(false)
  }

  useEffect(() => {
    if (isAdmin) {
      loadRecords()
    }
  }, [isAdmin])

  useEffect(() => {
    let filtered = [...records]

    if (filterManager !== "all") {
      filtered = filtered.filter((record) => record.created_by === filterManager)
    }

    if (filterYear !== "all") {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate.getFullYear() === Number.parseInt(filterYear)
      })
    }

    if (filterMonth !== "all") {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === Number.parseInt(filterMonth) - 1
      })
    }

    if (filterDateFrom) {
      filtered = filtered.filter((record) => new Date(record.date) >= new Date(filterDateFrom))
    }
    if (filterDateTo) {
      filtered = filtered.filter((record) => new Date(record.date) <= new Date(filterDateTo))
    }

    setFilteredRecords(filtered)
  }, [records, filterManager, filterYear, filterMonth, filterDateFrom, filterDateTo])

  const handleCreateRecord = () => {
    setSelectedRecord(undefined)
    setIsFormOpen(true)
  }

  const handleEditRecord = (record: StoredRecord) => {
    setSelectedRecord(record)
    setIsFormOpen(true)
  }

  const handleDeleteRecord = (record: StoredRecord) => {
    if (confirm("Удалить эту запись? Это действие нельзя отменить.")) {
      recordStorage.delete(record.id)
      loadRecords()
    }
  }

  const handleFormSuccess = () => {
    loadRecords()
  }

  const clearFilters = () => {
    setFilterManager("all")
    setFilterYear("all")
    setFilterMonth("all")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600 bg-green-50"
    if (margin >= 20) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user ? user.name : "Неизвестный пользователь"
  }

  const totalNetIncome = filteredRecords.reduce((sum, r) => sum + (r.total_net_income || 0), 0)
  const totalExpenses = filteredRecords.reduce((sum, r) => sum + (r.total_expenses || 0), 0)
  const totalManagerBonuses = filteredRecords.reduce((sum, r) => sum + (r.total_manager_bonuses || 0), 0)
  const averageMargin =
    filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / filteredRecords.length
      : 0

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>У вас нет прав для доступа к административной панели.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Административная панель</h1>
            <p className="text-muted-foreground">Управление всеми записями и пользователями</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/admin/users")}>
              <Users className="h-4 w-4 mr-2" />
              Пользователи
            </Button>
            <Button onClick={handleCreateRecord}>
              <Plus className="h-4 w-4 mr-2" />
              Создать запись
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="records">Записи расчетов</TabsTrigger>
            <TabsTrigger value="formulas">
              <Calculator className="h-4 w-4 mr-2" />
              Настройка формул
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push("/admin/users")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Управление пользователями
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {users.filter((u) => u.role === "admin").length} админов,{" "}
                    {users.filter((u) => u.role === "manager").length} менеджеров
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Общий чистый доход
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalNetIncome)}</div>
                  <p className="text-xs text-muted-foreground">{filteredRecords.length} записей</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Средняя маржа
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercent(averageMargin)}</div>
                  <p className="text-xs text-muted-foreground">По всем записям</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Общие расходы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">Включая все налоги</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Фильтры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-6">
                  <div className="space-y-2">
                    <Label>Менеджер</Label>
                    <Select value={filterManager} onValueChange={setFilterManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все менеджеры" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все менеджеры</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Год</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все годы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все годы</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Месяц</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все месяцы" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все месяцы</SelectItem>
                        <SelectItem value="1">Январь</SelectItem>
                        <SelectItem value="2">Февраль</SelectItem>
                        <SelectItem value="3">Март</SelectItem>
                        <SelectItem value="4">Апрель</SelectItem>
                        <SelectItem value="5">Май</SelectItem>
                        <SelectItem value="6">Июнь</SelectItem>
                        <SelectItem value="7">Июль</SelectItem>
                        <SelectItem value="8">Август</SelectItem>
                        <SelectItem value="9">Сентябрь</SelectItem>
                        <SelectItem value="10">Октябрь</SelectItem>
                        <SelectItem value="11">Ноябрь</SelectItem>
                        <SelectItem value="12">Декабрь</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Дата от</Label>
                    <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Дата до</Label>
                    <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button variant="outline" onClick={clearFilters} className="w-full bg-transparent">
                      Очистить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Все записи расчетов</CardTitle>
                <CardDescription>Полный доступ ко всем записям с возможностью редактирования</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Загрузка...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет записей</h3>
                    <p className="text-muted-foreground mb-4">
                      {records.length === 0
                        ? "Создайте первую запись для начала работы"
                        : "Попробуйте изменить фильтры"}
                    </p>
                    {records.length === 0 && (
                      <Button onClick={handleCreateRecord}>
                        <Plus className="h-4 w-4 mr-2" />
                        Создать запись
                      </Button>
                    )}
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
                          <TableHead>Автор</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.date && !isNaN(new Date(record.date).getTime())
                                ? format(new Date(record.date), "dd.MM.yyyy", { locale: ru })
                                : "Не указана"}
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
                            <TableCell>{getUserName(record.created_by)}</TableCell>
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
          </TabsContent>

          <TabsContent value="formulas">
            <FormulaEditor />
          </TabsContent>
        </Tabs>

        <AdminRecordForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          record={selectedRecord}
          onSuccess={handleFormSuccess}
        />
      </main>
    </div>
  )
}
