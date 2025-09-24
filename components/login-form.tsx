"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement | null>(null)

  const addLog = (msg: string) => {
    const ts = new Date().toISOString()
    setLogs((prev) => [...prev, `[${ts}] ${msg}`])
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLogs([])

    try {
      addLog("Начало авторизации…")
      addLog(`Ввод: email=${email}, длина пароля=${password.length}`)
      addLog("Вызов authService.login (supabase.auth.signInWithPassword)…")
      await login(email, password)

      addLog("Логин успешен. Проверяю текущего пользователя через supabase.auth.getUser()…")
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) addLog(`getUser error: ${userErr.message}`)
      else addLog(`getUser ok: id=${userData.user?.id}, email=${userData.user?.email}`)

      if (userData.user?.id) {
        addLog("Запрос профиля в public.profiles…")
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("id, email, role, name, created_at")
          .eq("id", userData.user.id)
          .maybeSingle()
        if (profErr) addLog(`profiles error: ${profErr.message}`)
        else if (!profile) addLog("profiles: запись не найдена (проверьте SQL вставку профиля)")
        else addLog(`profiles ok: role=${profile.role}, name=${profile.name}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка")
      addLog(`Ошибка авторизации: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Калькулятор продаж</CardTitle>
          <CardDescription>Войдите в систему для доступа к приложению</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Вход..." : "Войти"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Тестовые аккаунты:</p>
            <p>Админ: admin@company.com / password</p>
            <p>Менеджер: manager@company.com / password</p>
          </div>

          <div className="mt-6">
            <Label>Подробные логи авторизации</Label>
            <div className="mt-2 h-48 overflow-auto rounded border bg-black text-green-300 p-2 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="opacity-60">Логи появятся после попытки входа…</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    {l}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
