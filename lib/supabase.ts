import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Public client for browser usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase: SupabaseClient<any, any> = createClient(
  (supabaseUrl as string) || "",
  (supabaseAnonKey as string) || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window === "undefined" ? undefined : window.localStorage,
    },
  }
)


