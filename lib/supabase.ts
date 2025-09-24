import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Public client for browser usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createUnavailableClient(): SupabaseClient<any, any> {
  // Lazy erroring proxy to avoid throwing during build/prerender import time
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        )
      },
    }
  ) as SupabaseClient<any, any>
}

// Avoid constructing Supabase client when env vars are absent (e.g., at build time)
export const supabase: SupabaseClient<any, any> =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createUnavailableClient()


