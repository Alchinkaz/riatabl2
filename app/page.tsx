"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/login-form"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator, Users, BarChart3, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

function Dashboard() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Расчеты продаж
              </CardTitle>
              <CardDescription>Создание и управление расчетами продаж</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push("/manager")}>
                Перейти к расчетам
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Аналитика
              </CardTitle>
              <CardDescription>Графики и отчеты по продажам</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/analytics")}>
                Посмотреть отчеты
              </Button>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Администрирование
                  </CardTitle>
                  <CardDescription>Управление всеми записями и пользователями</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/admin")}>
                    Административная панель
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Настройки
                  </CardTitle>
                  <CardDescription>Системные настройки и конфигурация</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/settings")}>
                    Настройки системы
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Добро пожаловать, {user?.name}!</CardTitle>
              <CardDescription>
                Вы вошли как {user?.role === "admin" ? "администратор" : "менеджер"}.
                {user?.role === "manager" && " Вы можете создавать и редактировать только свои расчеты."}
                {user?.role === "admin" && " У вас есть полный доступ ко всем функциям системы."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()

  if (!user) {
    return <LoginForm />
  }

  return <Dashboard />
}
