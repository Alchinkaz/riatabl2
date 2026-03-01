import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { calculateSalesRecord } from "@/lib/calculations"

export const runtime = "nodejs"

interface ImportRow {
    date: string
    counterparty: string
    name: string
    quantity: number
    purchase_price: number
    total_delivery: number
    selling_with_bonus: number
    client_bonus: number
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const rows: ImportRow[] = body.rows

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "Нет данных для импорта" }, { status: 400 })
        }

        const supabase = getSupabaseAdmin()

        // Получаем текущего пользователя через заголовок авторизации
        const authHeader = request.headers.get("Authorization") ?? ""
        let createdBy: string | null = null

        if (authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7)
            const { data: userData } = await supabase.auth.getUser(token)
            createdBy = userData?.user?.id ?? null
        }

        // Если не удалось получить пользователя, используем системный аккаунт
        // (для импорта администратором через UI — допустимо)

        // Вычисляем все поля для каждой строки
        const records = rows.map((row) => {
            const computed = calculateSalesRecord({
                quantity: row.quantity,
                purchase_price: row.purchase_price,
                total_delivery: row.total_delivery,
                selling_with_bonus: row.selling_with_bonus,
                client_bonus: row.client_bonus,
            })

            return {
                date: row.date,
                counterparty: row.counterparty,
                name: row.name,
                created_by: createdBy,
                ...computed,
            }
        })

        // Вставляем пакетно (чанки по 100 строк)
        const chunkSize = 100
        let totalImported = 0
        const errors: string[] = []

        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize)
            const { data, error } = await supabase.from("sales_records").insert(chunk).select("id")

            if (error) {
                errors.push(`Ошибка вставки строк ${i + 1}–${i + chunk.length}: ${error.message}`)
            } else {
                totalImported += data?.length ?? chunk.length
            }
        }

        if (errors.length > 0 && totalImported === 0) {
            return NextResponse.json({ error: errors.join("; ") }, { status: 422 })
        }

        return NextResponse.json({
            imported: totalImported,
            warnings: errors.length > 0 ? errors : undefined,
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
