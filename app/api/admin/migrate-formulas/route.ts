import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { calculateSalesRecordWithSettings } from '@/lib/calculations-with-settings'
import { FormulaConfig } from '@/lib/formula-config'

export const runtime = "nodejs"

// Конфигурация по умолчанию
const DEFAULT_CONFIG: FormulaConfig = {
  financial_load_percent: 5,
  manager_bonus_percent: 3,
  vat_rate: 12,
  kpn_tax_rate: 20,
  client_bonus_tax_rate: 32,
}

// Функция для получения Supabase клиента
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Запуск миграции формул через API...')
    
    const supabase = getSupabaseClient()
    
    // Получаем все записи
    const { data: records, error: fetchError } = await supabase
      .from('sales_records')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Ошибка получения записей: ${fetchError.message}` 
        }, 
        { status: 500 }
      )
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Записи не найдены',
        stats: { total: 0, updated: 0, errors: 0 }
      })
    }

    console.log(`📋 Найдено ${records.length} записей для миграции`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Обрабатываем записи пакетами по 5 (меньше для API)
    const batchSize = 5
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      console.log(`🔄 Обрабатываем пакет ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`)

      const updatePromises = batch.map(async (record) => {
        try {
          // Пересчитываем с новыми формулами
          const computed = calculateSalesRecordWithSettings(
            {
              quantity: record.quantity,
              purchase_price: record.purchase_price,
              total_delivery: record.total_delivery,
              selling_with_bonus: record.selling_with_bonus,
              client_bonus: record.client_bonus,
            },
            DEFAULT_CONFIG,
            {} // Пустые кастомные формулы
          )

          // Обновляем запись в базе данных
          const { error: updateError } = await supabase
            .from('sales_records')
            .update({
              ...computed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)

          if (updateError) {
            throw new Error(`Ошибка обновления записи ${record.id}: ${updateError.message}`)
          }

          return { success: true, id: record.id }
        } catch (error) {
          const errorMsg = `Ошибка обработки записи ${record.id}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
          errors.push(errorMsg)
          return { success: false, id: record.id, error: errorMsg }
        }
      })

      const results = await Promise.all(updatePromises)
      
      results.forEach(result => {
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      })

      // Пауза между пакетами
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    const stats = {
      total: records.length,
      updated: successCount,
      errors: errorCount
    }

    console.log('📊 Результаты миграции:', stats)

    return NextResponse.json({
      success: true,
      message: `Миграция завершена. Обновлено ${successCount} из ${records.length} записей`,
      stats,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Показываем только первые 10 ошибок
    })

  } catch (error) {
    console.error('💥 Ошибка миграции:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: `Критическая ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      }, 
      { status: 500 }
    )
  }
}
