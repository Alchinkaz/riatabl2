"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Trash2, Edit, Plus, User, Eye, EyeOff } from "lucide-react"
import { userStorage, type StoredUser } from "@/lib/user-storage"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "manager" as "admin" | "manager",
    password: "",
  })

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
    loadUsers()
  }, [isAdmin, router])

  const loadUsers = () => {
    const allUsers = userStorage.getAll()
    setUsers(allUsers)
  }

  const handleCreateUser = () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        alert("Заполните все поля")
        return
      }

      userStorage.create({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        password: newUser.password,
      })

      setNewUser({ name: "", email: "", role: "manager", password: "" })
      setIsCreateUserOpen(false)
      loadUsers()
      alert("Пользователь успешно создан")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Ошибка при создании пользователя")
    }
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      try {
        userStorage.delete(userId)
        loadUsers()
        alert("Пользователь удален")
      } catch (error) {
        alert(error instanceof Error ? error.message : "Ошибка при удалении пользователя")
      }
    }
  }

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

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="profile">Мой профиль</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Управление пользователями</CardTitle>
                    <CardDescription>Создание, редактирование и удаление пользователей системы</CardDescription>
                  </div>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Создать пользователя
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Создать нового пользователя</DialogTitle>
                        <DialogDescription>Заполните данные для создания нового пользователя</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Имя и фамилия</Label>
                          <Input
                            id="name"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            placeholder="Введите имя и фамилию"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            placeholder="Введите email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Роль</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value: "admin" | "manager") => setNewUser({ ...newUser, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Менеджер</SelectItem>
                              <SelectItem value="admin">Администратор</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="password">Пароль</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showNewPassword ? "text" : "password"}
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              placeholder="Введите пароль"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleCreateUser}>Создать</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{userData.name}</div>
                          <div className="text-sm text-muted-foreground">{userData.email}</div>
                        </div>
                        <Badge variant={userData.role === "admin" ? "default" : "secondary"}>
                          {userData.role === "admin" ? "Администратор" : "Менеджер"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.id)}
                          disabled={userData.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
