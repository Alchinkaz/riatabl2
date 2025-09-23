import type { User } from "./auth"

const USERS_STORAGE_KEY = "sales_users"

export interface StoredUser extends User {
  password?: string // Only stored for demo purposes
}

// Initialize with default users
const DEFAULT_USERS: StoredUser[] = [
  {
    id: "1",
    email: "admin@company.com",
    name: "Администратор",
    role: "admin",
    createdAt: new Date().toISOString(),
    password: "password",
  },
  {
    id: "2",
    email: "manager@company.com",
    name: "Менеджер",
    role: "manager",
    createdAt: new Date().toISOString(),
    password: "password",
  },
]

export const userStorage = {
  getAll: (): StoredUser[] => {
    if (typeof window === "undefined") return DEFAULT_USERS

    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY)
      if (!stored) {
        // Initialize with default users
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS))
        return DEFAULT_USERS
      }
      return JSON.parse(stored)
    } catch {
      return DEFAULT_USERS
    }
  },

  getById: (id: string): StoredUser | null => {
    const users = userStorage.getAll()
    return users.find((user) => user.id === id) || null
  },

  getByEmail: (email: string): StoredUser | null => {
    const users = userStorage.getAll()
    return users.find((user) => user.email === email) || null
  },

  create: (userData: Omit<StoredUser, "id" | "createdAt">): StoredUser => {
    const users = userStorage.getAll()

    // Check if email already exists
    if (users.some((user) => user.email === userData.email)) {
      throw new Error("Пользователь с таким email уже существует")
    }

    const newUser: StoredUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    return newUser
  },

  update: (id: string, updates: Partial<StoredUser>): StoredUser | null => {
    const users = userStorage.getAll()
    const index = users.findIndex((user) => user.id === id)

    if (index === -1) return null

    // Check if email is being changed and already exists
    if (updates.email && updates.email !== users[index].email) {
      if (users.some((user) => user.email === updates.email && user.id !== id)) {
        throw new Error("Пользователь с таким email уже существует")
      }
    }

    users[index] = {
      ...users[index],
      ...updates,
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    return users[index]
  },

  delete: (id: string): boolean => {
    const users = userStorage.getAll()

    // Prevent deleting the last admin
    const user = users.find((u) => u.id === id)
    if (user?.role === "admin") {
      const adminCount = users.filter((u) => u.role === "admin").length
      if (adminCount <= 1) {
        throw new Error("Нельзя удалить последнего администратора")
      }
    }

    const filtered = users.filter((user) => user.id !== id)

    if (filtered.length === users.length) return false

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered))
    return true
  },

  changePassword: (id: string, newPassword: string): boolean => {
    const users = userStorage.getAll()
    const index = users.findIndex((user) => user.id === id)

    if (index === -1) return false

    users[index].password = newPassword
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    return true
  },
}
