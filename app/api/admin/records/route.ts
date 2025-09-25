import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("sales_records")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) return NextResponse.json({ message: error.message }, { status: 422 })
    return NextResponse.json({ records: data || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}


