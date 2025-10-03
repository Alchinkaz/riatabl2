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
import { BarChart3, Trophy } from "lucide-react"

export default function AnalyticsPage() {
  const { user, isAdmin } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [users, setUsers] = useState(userStorage.getAll())
  const [isLoading, setIsLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [filteredRecords, setFilteredRecords] = useState<StoredRecord[]>([])
  // Reverted: no additional filters

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) return
      try {
        let recs: StoredRecord[]
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
        // Подтягиваем имена пользователей для отображения в таблице
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
          // Для менеджера показываем только его данные
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

  useEffect(() => {
    // apply filters
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
    setFilteredRecords(list)
  }, [records, filterMonth, dateFrom, dateTo])

  const performanceByUser = (() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const r of filteredRecords) {
      const key = r.created_by || "unknown"
      const prev = map.get(key) || { total: 0, count: 0 }
      // Считаем ОБЩУЮ СУММУ ПРОДАЖ вместо дохода
      const salesTotal = r.total_selling_vat ?? 0
      map.set(key, { total: prev.total + salesTotal, count: prev.count + 1 })
    }
    return Array.from(map.entries()).map(([userId, agg]) => ({ userId, ...agg }))
  })()

  const bestManager = performanceByUser.reduce<{ userId: string; total: number } | null>((best, cur) => {
    if (!best || cur.total > best.total) return { userId: cur.userId, total: cur.total }
    return best
  }, null)

  // Reverted: no additional filters

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

  // Reverted: no extra aggregations/summary cards

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        

        {/* Удалены секции производительности и детальной статистики по пользователям */}

        {/* Фильтры (ниже сводных секций) */}
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

        {/* Reverted: no filters UI */}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Загрузка аналитики...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
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
            <SalesCharts key={`${filterMonth}-${dateFrom}-${dateTo}`} records={filteredRecords} users={users} />

            {/* Производительность пользователей */}
            {isAdmin && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Производительность пользователей</CardTitle>
                  <CardDescription>Доходы по пользователям за выбранный период</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2">Имя</th>
                          <th className="py-2">Записей</th>
                          <th className="py-2">Общий доход</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceByUser
                          .sort((a, b) => b.total - a.total)
                          .map((row) => {
                            const u = users.find((uu) => uu.id === row.userId)
                            const isBest = bestManager && bestManager.userId === row.userId
                            return (
                              <tr key={row.userId} className={isBest ? "bg-green-50" : ""}>
                                <td className="py-2 flex items-center gap-2">
                                  {isBest && <Trophy className="h-4 w-4 text-green-600" />}
                                  <span>{u?.name || u?.email || row.userId}</span>
                                </td>
                                <td className="py-2">{row.count}</td>
                                <td className="py-2 font-medium text-green-700">
                                  {new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", minimumFractionDigits: 2 }).format(row.total)}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
