"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { SalesCharts } from "@/components/analytics/sales-charts"
import { recordStorage, type StoredRecord } from "@/lib/storage"
import { userStorage } from "@/lib/user-storage"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  const { user, isAdmin } = useAuth()
  const [records, setRecords] = useState<StoredRecord[]>([])
  const [users, setUsers] = useState(userStorage.getAll())
  const [isLoading, setIsLoading] = useState(true)

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
          <SalesCharts records={records} users={users} />
        )}
      </main>
    </div>
  )
}
