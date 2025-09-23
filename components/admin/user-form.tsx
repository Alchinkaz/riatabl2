"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { userStorage, type StoredUser } from "@/lib/user-storage"
import { User, Mail, Shield, Key } from "lucide-react"

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: StoredUser
  onSuccess: () => void
}

export function UserForm({ open, onOpenChange, user, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "manager" as "manager" | "admin",
    password: "",
    confirmPassword: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: "",
        confirmPassword: "",
      })
    } else {
      setFormData({
        name: "",
        email: "",
        role: "manager",
        password: "",
        confirmPassword: "",
      })
    }
    setErrors({})
  }, [user, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Имя обязательно"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Имя должно содержать минимум 2 символа"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email обязателен"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Некорректный формат email"
    }

    if (!user) {
      // Creating new user - password required
      if (!formData.password) {
        newErrors.password = "Пароль обязателен"
      } else if (formData.password.length < 6) {
        newErrors.password = "Пароль должен содержать минимум 6 символов"
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Пароли не совпадают"
      }
    } else {
      // Editing user - password optional
      if (formData.password && formData.password.length < 6) {
        newErrors.password = "Пароль должен содержать минимум 6 символов"
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Пароли не совпадают"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        ...(formData.password && { password: formData.password }),
      }

      if (user) {
        userStorage.update(user.id, userData)
      } else {
        userStorage.create({ ...userData, password: formData.password })
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Произошла ошибка при сохранении",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user ? `Редактировать пользователя` : "Создать пользователя"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Измените данные пользователя. Оставьте пароль пустым, чтобы не менять его."
              : "Заполните данные для создания нового пользователя."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Имя
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Иван Иванов"
              required
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="ivan@company.com"
              required
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Роль
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: "manager" | "admin") => setFormData((prev) => ({ ...prev, role: value }))}
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

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {user ? "Новый пароль (необязательно)" : "Пароль"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder={user ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"}
              required={!user}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Повторите пароль"
              required={!user || !!formData.password}
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          {errors.submit && (
            <Alert variant="destructive">
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Сохранение..." : user ? "Сохранить изменения" : "Создать пользователя"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
