import { supabase } from "./supabase"

import type { ColumnConfig } from "@/components/admin/column-visibility-control"

export async function loadAdminColumns(userId: string): Promise<ColumnConfig[] | null> {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("custom_formulas")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("loadAdminColumns error", error)
      return null
    }

    const cf = (data?.custom_formulas as Record<string, unknown>) || {}
    const stored = cf.__admin_columns as ColumnConfig[] | undefined
    if (Array.isArray(stored)) return stored
    return null
  } catch (e) {
    console.error("loadAdminColumns exception", e)
    return null
  }
}

export async function saveAdminColumns(userId: string, columns: ColumnConfig[]): Promise<boolean> {
  try {
    // Read current custom_formulas to merge
    const { data: existing, error: readErr } = await supabase
      .from("user_settings")
      .select("custom_formulas")
      .eq("user_id", userId)
      .maybeSingle()

    if (readErr) {
      console.error("saveAdminColumns read error", readErr)
      return false
    }

    const current = (existing?.custom_formulas as Record<string, unknown>) || {}
    const nextCustomFormulas = { ...current, __admin_columns: columns }

    const { error: upsertErr } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, custom_formulas: nextCustomFormulas }, { onConflict: "user_id" })

    if (upsertErr) {
      console.error("saveAdminColumns upsert error", upsertErr)
      return false
    }
    return true
  } catch (e) {
    console.error("saveAdminColumns exception", e)
    return false
  }
}


