import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null
    // quick permission probe (read-only)
    const { error: probeErr } = await supabase.from("profiles").select("id").limit(1)
    return NextResponse.json({ ok: true, hasServiceRole: hasService, url, probeError: probeErr?.message || null })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = (await request.json()) as {
      email: string
      password: string
      name?: string
      role?: "admin" | "manager"
    }

    if (!email || !password) {
      return NextResponse.json({ message: "email and password are required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1) Create auth user (admin API)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    })
    if (createErr || !created.user) {
      return NextResponse.json({ message: createErr?.message || "Failed to create user" }, { status: 422 })
    }

    const userId = created.user.id

    // 2) Upsert profile with role
    const targetRole = role === "admin" ? "admin" : "manager"
    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        name: name || created.user.email?.split("@")[0] || "",
        role: targetRole,
      },
      { onConflict: "id" }
    )
    if (profileErr) {
      return NextResponse.json({ message: profileErr.message }, { status: 422 })
    }

    // 3) Seed user_settings if missing
    const { error: settingsErr } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        formula_config: {
          financial_load_percent: 5,
          vat_rate: 12,
          manager_bonus_percent: 3,
          kpn_tax_rate: 20,
          client_bonus_tax_rate: 32,
        },
        custom_formulas: {},
      },
      { onConflict: "user_id" }
    )

    if (settingsErr) {
      return NextResponse.json({ message: settingsErr.message }, { status: 422 })
    }

    return NextResponse.json({ id: userId, email, role: targetRole }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, email } = (await request.json()) as { id?: string; email?: string }
    if (!id && !email) {
      return NextResponse.json({ message: "id or email required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Resolve user id by email if needed
    let userId = id
    if (!userId && email) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return NextResponse.json({ message: error.message }, { status: 422 })
      const found = data.users.find((u) => u.email === email)
      if (!found) return NextResponse.json({ message: "User not found" }, { status: 404 })
      userId = found.id
    }

    // Delete auth user (will cascade if you set FK ON DELETE CASCADE; we also clean tables explicitly)
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId as string)
    if (delErr) return NextResponse.json({ message: delErr.message }, { status: 422 })

    // Best-effort cleanup (ignore RLS due to service role)
    await supabase.from("profiles").delete().eq("id", userId as string)
    await supabase.from("user_settings").delete().eq("user_id", userId as string)
    await supabase.from("sales_records").delete().eq("created_by", userId as string)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ message }, { status: 500 })
  }
}


