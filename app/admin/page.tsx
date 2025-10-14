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
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command"
import { AdminRecordForm } from "@/components/admin/admin-record-form"
import { FormulaEditor } from "@/components/admin/formula-editor"
import { RecordViewDialog } from "@/components/admin/record-view"
import { MigrationPanel } from "@/components/admin/migration-panel"
import { useFormulaSettings } from "@/contexts/formula-settings-context"
import { calculateSalesRecordWithSettings } from "@/lib/calculations-with-settings"
import { recordStorage, type StoredRecord } from "@/lib/storage"
// import { userStorage } from "@/lib/user-storage"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { Plus, Edit, Trash2, Filter, Users, TrendingUp, DollarSign, Target, Calculator, Eye, Search, Database } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth()
  const { config, customFormulas } = useFormulaSettings()
  const router = useRouter()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<StoredRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkManagerPercent, setBulkManagerPercent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("records")
  const [filterManager, setFilterManager] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filterCounterparty, setFilterCounterparty] = useState("all")
  const [isCounterpartySearchOpen, setIsCounterpartySearchOpen] = useState(false)
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; role: string }[]>([])
  const [sortKey, setSortKey] = useState<
    | "date"
    | "counterparty"
    | "name"
    | "quantity"
    | "purchase_price"
    | "total_client_bonus_post_tax"
    | "selling_with_bonus"
    | "total_net_income"
    | "margin_percent"
    | "author"
  >("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const loadRecords = async () => {
    // Для админа берём все записи через серверный API, чтобы обойти RLS
    const res = await fetch(`/api/admin/records?t=${Date.now()}`, { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.records)) setRecords(json.records)
    } else {
      // Fallback: клиентский fetch (может упереться в RLS)
      const allRecords = await recordStorage.getAll()
      setRecords(allRecords)
    }
    setIsLoading(false)
  }

  const loadUsers = async () => {
    // Берём список через наш серверный API (service role), чтобы обойти RLS
    const res = await fetch("/api/admin/users", { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.users)) setUsers(json.users)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadRecords()
      loadUsers()
    }
  }, [isAdmin])

  useEffect(() => {
    let filtered = [...records]

    if (filterManager !== "all") {
      filtered = filtered.filter((record) => record.created_by === filterManager)
    }

    if (filterMonth !== "all") {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === Number.parseInt(filterMonth) - 1
      })
    }

    if (filterCounterparty !== "all") {
      if (filterCounterparty === "__empty__") {
        filtered = filtered.filter((record) => !record.counterparty)
      } else {
        filtered = filtered.filter((record) => record.counterparty === filterCounterparty)
      }
    }

    if (filterDateFrom) {
      filtered = filtered.filter((record) => new Date(record.date) >= new Date(filterDateFrom))
    }
    if (filterDateTo) {
      filtered = filtered.filter((record) => new Date(record.date) <= new Date(filterDateTo))
    }

    setFilteredRecords(filtered)
  }, [records, filterManager, filterMonth, filterDateFrom, filterDateTo, filterCounterparty])

  const handleCreateRecord = () => {
    setSelectedRecord(undefined)
    setIsFormOpen(true)
  }

  const handleEditRecord = (record: StoredRecord) => {
    // Ensure view dialog is closed before opening edit
    setIsViewOpen(false)
    setSelectedRecord(record)
    setIsFormOpen(true)
  }

  const handleViewRecord = (record: StoredRecord) => {
    setSelectedRecord(record)
    setIsViewOpen(true)
  }

  const handleDeleteRecord = async (record: StoredRecord) => {
    if (!confirm("Удалить эту запись? Это действие нельзя отменить.")) return
    const res = await fetch(`/api/admin/records/${record.id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Не удалось удалить запись")
      return
    }
    await loadRecords()
  }

  const handleFormSuccess = async () => {
    await Promise.all([loadRecords(), loadUsers()])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredRecords.map((r) => r.id)))
    else setSelectedIds(new Set())
  }

  const applyBulkManagerPercent = async () => {
    const percent = Number.parseFloat(bulkManagerPercent)
    if (Number.isNaN(percent)) {
      alert("Укажите корректный % менеджера")
      return
    }
    if (selectedIds.size === 0) return

    for (const id of selectedIds) {
      const rec = records.find((r) => r.id === id)
      if (!rec) continue
      const overriddenConfig = { ...config, manager_bonus_percent: percent }
      const calc = calculateSalesRecordWithSettings(
        {
          quantity: rec.quantity,
          purchase_price: rec.purchase_price,
          total_delivery: rec.total_delivery,
          selling_with_bonus: rec.selling_with_bonus,
          client_bonus: rec.client_bonus,
        },
        overriddenConfig,
        customFormulas,
      )
      const payload = { ...rec, ...calc, manager_bonus_percent: percent }
      const res = await fetch(`/api/admin/records/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        alert(`Не удалось обновить запись ${rec.name}`)
      }
    }
    setSelectedIds(new Set())
    setBulkManagerPercent("")
    await loadRecords()
  }

  const clearFilters = () => {
    setFilterManager("all")
    setFilterMonth("all")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600 bg-green-50"
    if (margin >= 14) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getRowBgColor = (margin: number) => {
    if (margin >= 30) return "bg-green-50"
    if (margin >= 14) return "bg-yellow-50"
    return "bg-red-100"
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user ? user.name : "Неизвестный пользователь"
  }

  const totalSales = filteredRecords.reduce((sum, r) => sum + (r.total_selling_vat || 0), 0)
  const totalExpenses = filteredRecords.reduce((sum, r) => sum + (r.total_expenses || 0), 0)
  const totalManagerBonuses = filteredRecords.reduce((sum, r) => sum + (r.total_manager_bonuses || 0), 0)
  const averageMargin =
    filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / filteredRecords.length
      : 0

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const getSortableValue = (record: StoredRecord, key: typeof sortKey): string | number => {
    switch (key) {
      case "date":
        return record.date ? new Date(record.date).getTime() : 0
      case "counterparty":
        return (record.counterparty || "").toLowerCase()
      case "name":
        return (record.name || "").toLowerCase()
      case "quantity":
        return record.quantity || 0
      case "purchase_price":
        return record.purchase_price || 0
      case "total_client_bonus_post_tax":
        return record.total_client_bonus_post_tax || 0
      case "selling_with_bonus":
        return record.selling_with_bonus || 0
      case "total_net_income":
        return record.total_net_income || 0
      case "margin_percent":
        return record.margin_percent || 0
      case "author":
        return (getUserName(record.created_by) || "").toLowerCase()
      default:
        return 0
    }
  }

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const va = getSortableValue(a, sortKey)
    const vb = getSortableValue(b, sortKey)
    if (typeof va === "number" && typeof vb === "number") {
      return sortDir === "asc" ? va - vb : vb - va
    }
    const sa = String(va)
    const sb = String(vb)
    return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa)
  })

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
            <Button variant="outline" onClick={() => setIsCounterpartySearchOpen(true)}>
              <Search className="h-4 w-4 mr-2" />
              Поиск
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="records">Записи расчетов</TabsTrigger>
            <TabsTrigger value="formulas">
              <Calculator className="h-4 w-4 mr-2" />
              Настройка формул
            </TabsTrigger>
            <TabsTrigger value="migration">
              <Database className="h-4 w-4 mr-2" />
              Миграция
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push("/admin/users")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Пользователи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {users.filter((u) => u.role === "admin").length} админов, {users.filter((u) => u.role === "manager").length} менеджеров
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Общая сумма продаж
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Бонус менеджера
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalManagerBonuses)}</div>
                  <p className="text-xs text-muted-foreground">Сумма по отфильтрованным записям</p>
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
                <div className="grid gap-4 md:grid-cols-7">
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
                    <Label>Контрагент</Label>
                    <Select value={filterCounterparty} onValueChange={setFilterCounterparty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Все контрагенты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все контрагенты</SelectItem>
                        {Array.from(new Set(records.map((r) => r.counterparty || "")))
                          .map((cp) => (
                          <SelectItem key={cp || "__empty__"} value={cp || "__empty__"}>
                            {(cp && cp.trim()) ? cp : "Не указан"}
                          </SelectItem>
                        ))}
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
                {filteredRecords.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 p-3 border rounded-md bg-gray-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                        onChange={(e) => selectAllFiltered(e.target.checked)}
                      />
                      <span className="text-sm">Выбрать все</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300" />
                    <span className="text-sm text-muted-foreground">Выбрано: {selectedIds.size}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">% менеджера</label>
                      <input
                        type="number"
                        step="0.1"
                        className="h-9 px-3 py-1 border rounded-md w-24"
                        value={bulkManagerPercent}
                        onChange={(e) => setBulkManagerPercent(e.target.value)}
                      />
                      <button
                        onClick={applyBulkManagerPercent}
                        className="h-9 px-4 rounded-md border bg-background hover:bg-accent disabled:opacity-50"
                        disabled={selectedIds.size === 0 || bulkManagerPercent === ""}
                      >
                        Применить к выбранным
                      </button>
                    </div>
                  </div>
                )}
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
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <input
                              type="checkbox"
                              checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                              onChange={(e) => selectAllFiltered(e.target.checked)}
                            />
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>Дата</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("counterparty")}>Контрагент</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>Наименование</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("quantity")}>Кол-во</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("purchase_price")}>Закуп в тенге</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("total_client_bonus_post_tax")}>Бонус клиента</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("selling_with_bonus")}>Цена продажи</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("total_net_income")}>Сумма дохода</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("margin_percent")}>Маржа %</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort("author")}>Автор</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedRecords.map((record) => (
                          <TableRow key={record.id} className={getRowBgColor(record.margin_percent || 0)}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(record.id)}
                                onChange={() => toggleSelect(record.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {record.date && !isNaN(new Date(record.date).getTime())
                                ? format(new Date(record.date), "dd.MM.yyyy", { locale: ru })
                                : "Не указана"}
                            </TableCell>
                            <TableCell className="font-medium">{record.counterparty}</TableCell>
                            <TableCell>{record.name}</TableCell>
                            <TableCell>{record.quantity}</TableCell>
                            <TableCell>{formatCurrency(record.purchase_price)}</TableCell>
                            <TableCell>{formatCurrency(record.total_client_bonus_post_tax || 0)}</TableCell>
                            <TableCell>{formatCurrency(record.selling_with_bonus)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-red-600 bg-red-50">
                                {formatCurrency(record.total_net_income || 0)}
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
                                <Button variant="ghost" size="sm" onClick={() => handleViewRecord(record)}>
                                  <Eye className="h-4 w-4" />
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

          <TabsContent value="migration">
            <div className="flex justify-center">
              <MigrationPanel />
            </div>
          </TabsContent>
        </Tabs>

        <AdminRecordForm
          key={selectedRecord?.id || "new"}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          record={selectedRecord}
          onSuccess={handleFormSuccess}
        />

      <RecordViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} record={selectedRecord} onSuccess={handleFormSuccess} />

      {/* Counterparty Search Dialog */}
      <CommandDialog open={isCounterpartySearchOpen} onOpenChange={setIsCounterpartySearchOpen} title="Поиск контрагента">
        <CommandInput placeholder="Введите название контрагента..." />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          {Array.from(new Set(records.map((r) => r.counterparty || ""))).map((cp) => (
            <CommandItem
              key={cp || "__empty__"}
              onSelect={() => {
                setFilterCounterparty(cp || "__empty__")
                setIsCounterpartySearchOpen(false)
              }}
            >
              {(cp && cp.trim()) ? cp : "Не указан"}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
      </main>
    </div>
  )
}
