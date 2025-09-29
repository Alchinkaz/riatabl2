import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const payload = await request.json()
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("sales_records")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    if (error) return NextResponse.json({ message: error.message }, { status: 422 })
    return NextResponse.json({ record: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("sales_records").delete().eq("id", id)
    if (error) return NextResponse.json({ message: error.message }, { status: 422 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}


