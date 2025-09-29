"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { SalesCharts } from "@/components/analytics/sales-charts"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { userStorage } from "@/lib/user-storage"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Percent, Wallet, Receipt, PiggyBank, ShoppingCart, ReceiptText, Users, Gift } from "lucide-react"

export default function AnalyticsPage() {
  const { user, isAdmin } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [users, setUsers] = useState(userStorage.getAll())
  const [isLoading, setIsLoading] = useState(true)
  const [filterManager, setFilterManager] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState<string>("")
  const [filterDateTo, setFilterDateTo] = useState<string>("")
  const [filteredRecords, setFilteredRecords] = useState<StoredRecord[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) return
      try {
        let recs
        if (isAdmin) {
          const res = await fetch("/api/admin/records", { cache: "no-store" })
          if (res.ok) {
            const json = await res.json()
            recs = Array.isArray(json.records) ? json.records : []
          } else {
            recs = await recordStorage.getAll()
          }
        } else {
          recs = await recordStorage.getByUser(user.id)
        }
        if (!active) return
        setRecords(recs)
        setUsers(userStorage.getAll())
      } finally {
        if (!active) return
        setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user, isAdmin])

  useEffect(() => {
    let filtered = [...records]

    if (filterManager !== "all") {
      filtered = filtered.filter((r) => r.created_by === filterManager)
    }

    if (filterYear !== "all") {
      filtered = filtered.filter((r) => new Date(r.date).getFullYear() === Number.parseInt(filterYear))
    }

    if (filterMonth !== "all") {
      filtered = filtered.filter((r) => new Date(r.date).getMonth() === Number.parseInt(filterMonth) - 1)
    }

    if (filterDateFrom) {
      const from = new Date(filterDateFrom)
      filtered = filtered.filter((r) => new Date(r.date) >= from)
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo)
      filtered = filtered.filter((r) => new Date(r.date) <= to)
    }

    setFilteredRecords(filtered)
  }, [records, filterManager, filterYear, filterMonth, filterDateFrom, filterDateTo])

  const clearFilters = () => {
    setFilterManager("all")
    setFilterYear("all")
    setFilterMonth("all")
    setFilterDateFrom("")
    setFilterDateTo("")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>Войдите в систему для просмотра аналитики.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Aggregations (all time)
  const totalAll_nds = records.reduce((sum, r) => sum + (r.nds_tax || 0) * r.quantity, 0)
  const totalAll_margin = records.length > 0 ? records.reduce((s, r) => s + (r.margin_percent || 0), 0) / records.length : 0
  const totalAll_sellingVat = records.reduce((sum, r) => sum + (r.total_selling_vat || 0), 0)
  const totalAll_netIncome = records.reduce((sum, r) => sum + (r.total_net_income || 0), 0)
  const totalAll_purchase = records.reduce((sum, r) => sum + (r.total_purchase || 0), 0)
  const totalAll_expenses = records.reduce((sum, r) => sum + (r.total_expenses || 0), 0)
  const totalAll_managerBonuses = records.reduce((sum, r) => sum + (r.total_manager_bonuses || 0), 0)
  const totalAll_clientBonus = records.reduce((sum, r) => sum + (r.client_bonus || 0), 0)

  // Aggregations (filtered)
  const total_nds = filteredRecords.reduce((sum, r) => sum + (r.nds_tax || 0) * r.quantity, 0)
  const avg_margin = filteredRecords.length > 0
    ? filteredRecords.reduce((s, r) => s + (r.margin_percent || 0), 0) / filteredRecords.length
    : 0
  const total_sellingVat = filteredRecords.reduce((sum, r) => sum + (r.total_selling_vat || 0), 0)
  const total_netIncome = filteredRecords.reduce((sum, r) => sum + (r.total_net_income || 0), 0)
  const total_purchase = filteredRecords.reduce((sum, r) => sum + (r.total_purchase || 0), 0)
  const total_expenses = filteredRecords.reduce((sum, r) => sum + (r.total_expenses || 0), 0)
  const total_managerBonuses = filteredRecords.reduce((sum, r) => sum + (r.total_manager_bonuses || 0), 0)
  const total_clientBonus = filteredRecords.reduce((sum, r) => sum + (r.client_bonus || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Аналитика продаж
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Полная аналитика по всем пользователям и записям" : "Аналитика ваших продаж и результатов"}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>Ограничьте период и сотрудников для аналитики</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="space-y-2">
                <label className="text-sm">Сотрудник</label>
                <Select value={filterManager} onValueChange={setFilterManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Год</label>
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
                <label className="text-sm">Месяц</label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все месяцы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все месяцы</SelectItem>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i + 1} value={`${i + 1}`}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Дата от</label>
                <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Дата до</label>
                <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm">&nbsp;</label>
                <button onClick={clearFilters} className="h-9 px-4 rounded-md border bg-background hover:bg-accent">
                  Сбросить
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Загрузка аналитики...</p>
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Нет данных для анализа</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "В системе пока нет записей для анализа. Создайте первые записи или попросите пользователей добавить данные."
                  : "У вас пока нет записей для анализа. Создайте первые записи продаж для просмотра аналитики."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* All-time summary */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Сводка за всё время</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Receipt className="h-4 w-4" />Налоги НДС</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(totalAll_nds)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Percent className="h-4 w-4" />Маржа в %</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{(totalAll_margin).toFixed(2)}%</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><ReceiptText className="h-4 w-4" />Общая сумма продажи с НДС</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(totalAll_sellingVat)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4" />Чистый доход компании</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(totalAll_netIncome)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Сумма закупа</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(totalAll_purchase)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><PiggyBank className="h-4 w-4" />Общие расходы</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-red-600">{formatCurrency(totalAll_expenses)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Бонусы менеджера</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(totalAll_managerBonuses)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Gift className="h-4 w-4" />Общий бонус клиент</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(totalAll_clientBonus)}</div></CardContent>
                </Card>
              </div>
            </div>

            {/* Filtered summary */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Сводка по фильтру</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Receipt className="h-4 w-4" />Налоги НДС</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(total_nds)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Percent className="h-4 w-4" />Маржа в %</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{avg_margin.toFixed(2)}%</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><ReceiptText className="h-4 w-4" />Общая сумма продажи с НДС</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(total_sellingVat)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4" />Чистый доход компании</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(total_netIncome)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Сумма закупа</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(total_purchase)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><PiggyBank className="h-4 w-4" />Общие расходы</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-red-600">{formatCurrency(total_expenses)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Бонусы менеджера</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(total_managerBonuses)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-sm font-medium flex items-center gap-2"><Gift className="h-4 w-4" />Общий бонус клиент</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold">{formatCurrency(total_clientBonus)}</div></CardContent>
                </Card>
              </div>
            </div>

            {/* Charts using filtered records */}
            <SalesCharts records={filteredRecords || []} users={(users || []).map(u => ({ ...u, name: u.name ?? 'Без имени' }))} />
          </>
        )}
      </main>
    </div>
  )
}
