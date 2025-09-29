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
// import { userStorage } from "@/lib/user-storage"
import { supabase } from "@/lib/supabase"
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
  const [activeTab, setActiveTab] = useState("formulas")
  const [filterManager, setFilterManager] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; role: string }[]>([])

  const loadRecords = async () => {
    // Для админа берём все записи через серверный API, чтобы обойти RLS
    const res = await fetch("/api/admin/records", { cache: "no-store" })
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
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="formulas">
              <Calculator className="h-4 w-4 mr-2" />
              Настройка формул
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formulas">
            <FormulaEditor />
          </TabsContent>
        </Tabs>

        {/* Раздел записей скрыт */}
      </main>
    </div>
  )
}
