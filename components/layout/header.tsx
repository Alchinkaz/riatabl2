"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, User, ArrowLeft, Home } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleBack = () => {
    router.back()
  }

  const handleHome = () => {
    router.push("/")
  }

  const isHomePage = pathname === "/"

  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            {!isHomePage && (
              <Button variant="outline" size="sm" onClick={handleHome}>
                <Home className="h-4 w-4 mr-2" />
                Главная
              </Button>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">Калькулятор продаж</h1>
            <p className="text-sm text-muted-foreground">
              {user?.role === "admin" ? "Панель администратора" : "Панель менеджера"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{user?.name}</span>
            <span className="text-muted-foreground">({user?.role})</span>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    </header>
  )
}
