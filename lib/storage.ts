import type { SalesRecord } from "./calculations"
import { supabase } from "./supabase"

export interface StoredRecord extends SalesRecord {
  id: string
  created_by: string
  created_at: string
  updated_at: string
}

export const recordStorage = {
  getAll: async (): Promise<StoredRecord[]> => {
    const { data, error } = await supabase
      .from("sales_records")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error("sales_records getAll error", error)
      return []
    }
    return (data || []) as unknown as StoredRecord[]
  },

  getByUser: async (userId: string): Promise<StoredRecord[]> => {
    const { data, error } = await supabase
      .from("sales_records")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error("sales_records getByUser error", error)
      return []
    }
    return (data || []) as unknown as StoredRecord[]
  },

  create: async (
    record: Omit<StoredRecord, "id" | "created_at" | "updated_at">
  ): Promise<StoredRecord | null> => {
    const { data, error } = await supabase.from("sales_records").insert(record).select("*").single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error("sales_records create error", error)
      return null
    }
    return data as unknown as StoredRecord
  },

  update: async (id: string, updates: Partial<StoredRecord>): Promise<StoredRecord | null> => {
    const { data, error } = await supabase
      .from("sales_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    if (error) {
      // eslint-disable-next-line no-console
      console.error("sales_records update error", error)
      return null
    }
    return data as unknown as StoredRecord
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("sales_records").delete().eq("id", id)
    if (error) {
      // eslint-disable-next-line no-console
      console.error("sales_records delete error", error)
      return false
    }
    return true
  },
}
