import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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


