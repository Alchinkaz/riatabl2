"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { userStorage } from "@/lib/user-storage"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts"

export default function DashboardsPage() {
  const { user, isAdmin } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [users, setUsers] = useState(userStorage.getAll())
  const [isLoading, setIsLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) return
      try {
        let recs: StoredRecord[] = []
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

        if (isAdmin) {
          try {
            const ures = await fetch("/api/admin/users", { cache: "no-store" })
            if (ures.ok) {
              const j = await ures.json()
              if (Array.isArray(j.users)) setUsers(j.users)
              else setUsers(userStorage.getAll())
            } else {
              setUsers(userStorage.getAll())
            }
          } catch {
            setUsers(userStorage.getAll())
          }
        } else {
          setUsers(userStorage.getAll().filter((u) => u.id === user.id))
        }
      } finally {
        if (!active) return
        setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user, isAdmin])

  const filtered = useMemo(() => {
    let list = [...records]
    if (filterMonth !== "all") {
      const m = Number.parseInt(filterMonth) - 1
      list = list.filter((r) => {
        const d = r.date ? new Date(r.date) : null
        return d && !isNaN(d.getTime()) && d.getMonth() === m
      })
    }
    if (dateFrom) {
      const df = new Date(dateFrom)
      list = list.filter((r) => (r.date ? new Date(r.date) >= df : false))
    }
    if (dateTo) {
      const dt = new Date(dateTo)
      list = list.filter((r) => (r.date ? new Date(r.date) <= dt : false))
    }
    return list
  }, [records, filterMonth, dateFrom, dateTo])

  const kpis = useMemo(() => {
    const initial = {
      totalSales: 0,
      totalExpenses: 0,
      netProfit: 0,
      avgMarginPct: 0,
      totalVAT: 0,
      totalCIT: 0,
      count: 0,
    }
    const acc = filtered.reduce((a, r) => {
      a.totalSales += r.total_selling_vat || 0
      a.totalExpenses += r.total_expenses || 0
      a.netProfit += r.total_net_income || 0
      a.totalVAT += r.nds_tax ? r.nds_tax * (r.quantity || 1) : 0
      a.totalCIT += r.kpn_tax ? r.kpn_tax * (r.quantity || 1) : 0
      if (typeof r.margin_percent === "number") {
        a.avgMarginPct += r.margin_percent
        a.count += 1
      }
      return a
    }, initial)
    const avgMarginPct = acc.count > 0 ? acc.avgMarginPct / acc.count : 0
    return { ...acc, avgMarginPct }
  }, [filtered])

  const performanceByUser = useMemo(() => {
    const map = new Map<string, { sales: number; count: number }>()
    for (const r of filtered) {
      const key = r.created_by || "unknown"
      const prev = map.get(key) || { sales: 0, count: 0 }
      const salesTotal = r.total_selling_vat ?? 0
      map.set(key, { sales: prev.sales + salesTotal, count: prev.count + 1 })
    }
    return Array.from(map.entries()).map(([userId, agg]) => ({ userId, ...agg }))
  }, [filtered])

  // Monthly aggregates for charts
  const monthlyData = useMemo(() => {
    const map = new Map<string, { label: string; sales: number; expenses: number; marginPctSum: number; marginCount: number }>()
    for (const r of filtered) {
      const d = r.date ? new Date(r.date) : null
      if (!d || isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleString("ru-RU", { month: "short", year: "numeric" })
      const prev = map.get(key) || { label, sales: 0, expenses: 0, marginPctSum: 0, marginCount: 0 }
      prev.sales += r.total_selling_vat || 0
      prev.expenses += r.total_expenses || 0
      if (typeof r.margin_percent === "number") {
        prev.marginPctSum += r.margin_percent
        prev.marginCount += 1
      }
      map.set(key, prev)
    }
    const result = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, v]) => ({
        label: v.label,
        sales: v.sales,
        expenses: v.expenses,
        margin: v.marginCount > 0 ? v.marginPctSum / v.marginCount : 0,
      }))
    return result
  }, [filtered])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>Войдите в систему для просмотра дашбордов.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Дашборды</h1>
          <p className="text-muted-foreground">Сводные показатели и рейтинг менеджеров</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
            <CardDescription>Ограничьте данные по месяцу и периоду</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Месяц</label>
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
                <label className="text-sm text-muted-foreground">Дата от</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Дата до</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Общие продажи</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(kpis.totalSales)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Общие расходы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">{formatCurrency(kpis.totalExpenses)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Чистая прибыль</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.netProfit)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Средняя маржа</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercent(kpis.avgMarginPct)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Общее НДС</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.totalVAT)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Общее КПН</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis.totalCIT)}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Рейтинг менеджеров</CardTitle>
                <CardDescription>По сумме общих продаж за выбранный период</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2">Менеджер</th>
                        <th className="py-2">Записей</th>
                        <th className="py-2">Общие продажи</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceByUser
                        .sort((a, b) => b.sales - a.sales)
                        .map((row) => {
                          const u = users.find((uu) => uu.id === row.userId)
                          return (
                            <tr key={row.userId}>
                              <td className="py-2">{u?.name || u?.email || row.userId}</td>
                              <td className="py-2">{row.count}</td>
                              <td className="py-2 font-medium">{formatCurrency(row.sales)}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Продажи vs Расходы по месяцам</CardTitle>
                  <CardDescription>Суммы за каждый месяц</CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="sales" name="Продажи" fill="#16a34a" />
                        <Bar dataKey="expenses" name="Расходы" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Средняя маржа по месяцам</CardTitle>
                  <CardDescription>Маржа в процентах</CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v: number) => formatPercent(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="margin" name="Маржа" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}


