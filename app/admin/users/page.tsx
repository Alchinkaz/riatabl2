"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserForm } from "@/components/admin/user-form"
import { userStorage, type StoredUser } from "@/lib/user-storage"
import { Plus, Edit, Trash2, Users, Shield, User, Calendar } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export default function UsersManagement() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [selectedUser, setSelectedUser] = useState<StoredUser | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadUsers = () => {
    const allUsers = userStorage.getAll()
    setUsers(allUsers)
    setIsLoading(false)
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const handleCreateUser = () => {
    setSelectedUser(undefined)
    setIsFormOpen(true)
  }

  const handleEditUser = (user: StoredUser) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const handleDeleteUser = (user: StoredUser) => {
    if (user.id === currentUser?.id) {
      alert("Вы не можете удалить свой собственный аккаунт")
      return
    }

    if (confirm(`Удалить пользователя "${user.name}"? Это действие нельзя отменить.`)) {
      try {
        userStorage.delete(user.id)
        loadUsers()
      } catch (error) {
        alert(error instanceof Error ? error.message : "Ошибка при удалении пользователя")
      }
    }
  }

  const handleFormSuccess = () => {
    loadUsers()
  }

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge variant="default" className="bg-red-100 text-red-800">
          <Shield className="h-3 w-3 mr-1" />
          Администратор
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <User className="h-3 w-3 mr-1" />
        Менеджер
      </Badge>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>У вас нет прав для управления пользователями.</CardDescription>
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Управление пользователями
            </h1>
            <p className="text-muted-foreground">Создание, редактирование и удаление пользователей системы</p>
          </div>
          <Button onClick={handleCreateUser}>
            <Plus className="h-4 w-4 mr-2" />
            Создать пользователя
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Администраторы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{users.filter((u) => u.role === "admin").length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Менеджеры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{users.filter((u) => u.role === "manager").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Пользователи системы</CardTitle>
            <CardDescription>Список всех пользователей с возможностью управления</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Загрузка...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет пользователей</h3>
                <p className="text-muted-foreground mb-4">Создайте первого пользователя для начала работы</p>
                <Button onClick={handleCreateUser}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать пользователя
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className={user.id === currentUser?.id ? "bg-blue-50" : ""}>
                        <TableCell className="font-mono text-sm">{user.id}</TableCell>
                        <TableCell className="font-medium">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Вы
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(user.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Form Modal */}
        <UserForm open={isFormOpen} onOpenChange={setIsFormOpen} user={selectedUser} onSuccess={handleFormSuccess} />
      </main>
    </div>
  )
}
