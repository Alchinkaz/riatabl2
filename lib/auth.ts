import { supabase } from "./supabase"

export interface User {
  id: string
  email: string
  name: string | null
  role: "manager" | "admin"
  createdAt: string | null
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}

async function getProfile(userId: string): Promise<Pick<User, "name" | "role" | "createdAt"> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, role, created_at")
    .eq("id", userId)
    .maybeSingle()
  if (error) {
    // eslint-disable-next-line no-console
    console.error("profiles fetch error", error)
    return null
  }
  return data
    ? { name: data.name ?? null, role: (data.role as User["role"]) || "manager", createdAt: data.created_at }
    : null
}

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      throw new Error(error?.message || "Неверный email или пароль")
    }
    const base = data.user
    const profile = await getProfile(base.id)
    const user: User = {
      id: base.id,
      email: base.email || email,
      name: profile?.name ?? base.user_metadata?.name ?? null,
      role: profile?.role || "manager",
      createdAt: profile?.createdAt ?? base.created_at ?? null,
    }
    return user
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut()
  },

  getCurrentUser: (): User | null => {
    // For client components, use auth.getUser() asynchronously in the context if needed.
    // Keep a synchronous fallback as null; context will populate via explicit call.
    return null
  },

  getCurrentUserAsync: async (): Promise<User | null> => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    const base = data.user
    const profile = await getProfile(base.id)
    return {
      id: base.id,
      email: base.email || "",
      name: profile?.name ?? base.user_metadata?.name ?? null,
      role: profile?.role || "manager",
      createdAt: profile?.createdAt ?? base.created_at ?? null,
    }
  },

  isAdmin: (user: User | null): boolean => user?.role === "admin",
  isManager: (user: User | null): boolean => user?.role === "manager",
}
