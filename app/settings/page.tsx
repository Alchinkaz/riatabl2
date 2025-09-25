"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Edit, User, Eye, EyeOff } from "lucide-react"
import type { StoredUser } from "@/lib/user-storage"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [users] = useState<StoredUser[]>([])
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Удалено создание пользователей из настроек

  // Profile edit form state
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push("/")
      return
    }
    // Создание пользователей перенесено в раздел Администрирование → Пользователи
  }, [isAdmin, router])
  

  const handleUpdateProfile = () => {
    try {
      if (!profileData.name) {
        alert("Имя не может быть пустым")
        return
      }

      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          alert("Пароли не совпадают")
          return
        }
        if (profileData.newPassword.length < 6) {
          alert("Пароль должен содержать минимум 6 символов")
          return
        }
      }

      // Update user data
      const updates: Partial<StoredUser> = {
        name: profileData.name,
        email: profileData.email,
      }

      if (profileData.newPassword) {
        updates.password = profileData.newPassword
      }

      userStorage.update(user!.id, updates)

      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setIsEditProfileOpen(false)
      alert("Профиль обновлен")

      // Reload page to update user context
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка при обновлении профиля")
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Настройки системы</h1>
          <p className="text-muted-foreground">Управление пользователями и системными настройками</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Мой профиль</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Мой профиль</CardTitle>
                <CardDescription>Редактирование личных данных и смена пароля</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <User className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-lg">{user?.name}</div>
                      <div className="text-muted-foreground">{user?.email}</div>
                      <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="mt-1">
                        {user?.role === "admin" ? "Администратор" : "Менеджер"}
                      </Badge>
                    </div>
                  </div>

                  <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать профиль
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Редактировать профиль</DialogTitle>
                        <DialogDescription>Изменение личных данных и пароля</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="profile-name">Имя и фамилия</Label>
                          <Input
                            id="profile-name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="profile-email">Email</Label>
                          <Input
                            id="profile-email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          />
                        </div>
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Смена пароля (необязательно)</h4>
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="new-password">Новый пароль</Label>
                              <div className="relative">
                                <Input
                                  id="new-password"
                                  type={showPassword ? "text" : "password"}
                                  value={profileData.newPassword}
                                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                  placeholder="Оставьте пустым, если не хотите менять"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="confirm-password">Подтвердите новый пароль</Label>
                              <Input
                                id="confirm-password"
                                type={showPassword ? "text" : "password"}
                                value={profileData.confirmPassword}
                                onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                                placeholder="Повторите новый пароль"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProfileOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleUpdateProfile}>Сохранить</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
