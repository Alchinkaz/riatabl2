"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import type { StoredRecord } from "@/lib/storage"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Calendar } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns"
import { ru } from "date-fns/locale"

interface SalesChartsProps {
  records: StoredRecord[]
  users: Array<{ id: string; name: string | null; role: string }>
}

export function SalesCharts({ records, users }: SalesChartsProps) {
  // Calculate monthly data for the last 6 months
  const now = new Date()
  const sixMonthsAgo = subMonths(now, 5)
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now })

  const monthlyData = months.map((month) => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)

    const monthRecords = records.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= monthStart && recordDate <= monthEnd
    })

    const totalIncome = monthRecords.reduce((sum, r) => sum + (r.total_net_income || 0), 0)
    const totalExpenses = monthRecords.reduce((sum, r) => sum + (r.total_expenses || 0), 0)
    const averageMargin =
      monthRecords.length > 0
        ? monthRecords.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / monthRecords.length
        : 0

    return {
      month: format(month, "MMM yyyy", { locale: ru }),
      income: totalIncome,
      expenses: totalExpenses,
      margin: averageMargin,
      recordsCount: monthRecords.length,
    }
  })

  // Calculate data by user
  const userPerformance = users
    .map((user) => {
      const userRecords = records.filter((record) => record.created_by === user.id)
      const totalIncome = userRecords.reduce((sum, r) => sum + (r.total_net_income || 0), 0)
      const averageMargin =
        userRecords.length > 0
          ? userRecords.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / userRecords.length
          : 0

      return {
        id: user.id,
        name: user.name || 'Без имени',
        role: user.role,
        income: totalIncome,
        margin: averageMargin,
        recordsCount: userRecords.length,
      }
    })
    .filter((user) => user.recordsCount > 0)

  // Margin distribution
  const marginRanges = [
    { name: "Высокая (>30%)", count: 0, color: "#22c55e" },
    { name: "Средняя (20-30%)", count: 0, color: "#eab308" },
    { name: "Низкая (<20%)", count: 0, color: "#ef4444" },
  ]

  records.forEach((record) => {
    const margin = record.margin_percent || 0
    if (margin >= 30) marginRanges[0].count++
    else if (margin >= 20) marginRanges[1].count++
    else marginRanges[2].count++
  })

  // Top products by income
  const productPerformance = records.reduce(
    (acc, record) => {
      const key = record.name
      if (!acc[key]) {
        acc[key] = {
          name: record.name,
          totalIncome: 0,
          totalQuantity: 0,
          averageMargin: 0,
          recordsCount: 0,
        }
      }
      acc[key].totalIncome += record.total_net_income || 0
      acc[key].totalQuantity += record.quantity
      acc[key].averageMargin += record.margin_percent || 0
      acc[key].recordsCount++
      return acc
    },
    {} as Record<string, any>,
  )

  const topProducts = Object.values(productPerformance)
    .map((product: any) => ({
      ...product,
      averageMargin: product.averageMargin / product.recordsCount,
    }))
    .sort((a: any, b: any) => b.totalIncome - a.totalIncome)
    .slice(0, 5)

  // Calculate totals and trends
  const currentMonth = monthlyData[monthlyData.length - 1]
  const previousMonth = monthlyData[monthlyData.length - 2]

  const incomeTrend =
    currentMonth && previousMonth ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0

  const marginTrend = currentMonth && previousMonth ? currentMonth.margin - previousMonth.margin : 0

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Доход за месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(currentMonth?.income || 0)}</div>
            <div className="flex items-center gap-1 text-xs">
              {incomeTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={incomeTrend > 0 ? "text-green-500" : "text-red-500"}>
                {formatPercent(Math.abs(incomeTrend))}
              </span>
              <span className="text-muted-foreground">к прошлому месяцу</span>
            </div>
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
            <div className="text-2xl font-bold">{formatPercent(currentMonth?.margin || 0)}</div>
            <div className="flex items-center gap-1 text-xs">
              {marginTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={marginTrend > 0 ? "text-green-500" : "text-red-500"}>
                {formatPercent(Math.abs(marginTrend))}
              </span>
              <span className="text-muted-foreground">к прошлому месяцу</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Записей за месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonth?.recordsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Всего записей: {records.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Активные пользователи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userPerformance.length}</div>
            <p className="text-xs text-muted-foreground">Из {users.length} пользователей</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Доходы и расходы по месяцам</CardTitle>
            <CardDescription>Динамика финансовых показателей за последние 6 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "income" ? "Доход" : "Расходы",
                  ]}
                />
                <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="2"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Margin Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика маржи</CardTitle>
            <CardDescription>Изменение средней маржи по месяцам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Маржа"]} />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Производительность пользователей</CardTitle>
            <CardDescription>Доходы по пользователям</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Доход"]} />
                <Bar dataKey="income" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Margin Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение маржи</CardTitle>
            <CardDescription>Количество записей по уровням маржи</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marginRanges}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  label={({ name, count, percent }) => `${name}: ${count} (${(percent * 100).toFixed(0)}%)`}
                >
                  {marginRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Топ-5 товаров по доходности</CardTitle>
          <CardDescription>Наиболее прибыльные товары</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.recordsCount} записей, {product.totalQuantity} единиц
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">{formatCurrency(product.totalIncome)}</div>
                  <div className="text-sm text-muted-foreground">Маржа: {formatPercent(product.averageMargin)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная статистика по пользователям</CardTitle>
          <CardDescription>Подробная информация о производительности каждого пользователя</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPerformance.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {user.role === "admin" ? "Администратор" : "Менеджер"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Записей</div>
                    <div className="font-semibold">{user.recordsCount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Доход</div>
                    <div className="font-semibold text-green-600">{formatCurrency(user.income)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Средняя маржа</div>
                    <div className="font-semibold">{formatPercent(user.margin)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
