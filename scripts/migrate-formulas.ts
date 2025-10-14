#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { calculateSalesRecordWithSettings } from '../lib/calculations-with-settings'
import { FormulaConfig } from '../lib/formula-config'

// Конфигурация по умолчанию
const DEFAULT_CONFIG: FormulaConfig = {
  financial_load_percent: 5,
  manager_bonus_percent: 3,
  vat_rate: 12,
  kpn_tax_rate: 20,
  client_bonus_tax_rate: 32,
}

// Инициализация Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SalesRecord {
  id: string
  quantity: number
  purchase_price: number
  total_delivery: number
  selling_with_bonus: number
  client_bonus: number
  // ... другие поля
}

async function migrateRecords() {
  console.log('🚀 Начинаем миграцию формул...')
  
  try {
    // Получаем все записи
    console.log('📊 Получаем все записи из базы данных...')
    const { data: records, error: fetchError } = await supabase
      .from('sales_records')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Ошибка получения записей: ${fetchError.message}`)
    }

    if (!records || records.length === 0) {
      console.log('ℹ️  Записи не найдены')
      return
    }

    console.log(`📋 Найдено ${records.length} записей для миграции`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Обрабатываем записи пакетами по 10
    const batchSize = 10
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      console.log(`\n🔄 Обрабатываем пакет ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (записи ${i + 1}-${Math.min(i + batchSize, records.length)})`)

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

          console.log(`✅ Запись ${record.id} обновлена`)
          return { success: true, id: record.id }
        } catch (error) {
          const errorMsg = `Ошибка обработки записи ${record.id}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
          console.error(`❌ ${errorMsg}`)
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

      // Небольшая пауза между пакетами
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log('\n📊 Результаты миграции:')
    console.log(`✅ Успешно обновлено: ${successCount} записей`)
    console.log(`❌ Ошибок: ${errorCount} записей`)

    if (errors.length > 0) {
      console.log('\n❌ Детали ошибок:')
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`)
      })
    }

    if (errorCount === 0) {
      console.log('\n🎉 Миграция завершена успешно!')
    } else {
      console.log('\n⚠️  Миграция завершена с ошибками')
    }

  } catch (error) {
    console.error('💥 Критическая ошибка миграции:', error)
    process.exit(1)
  }
}

// Запускаем миграцию
if (require.main === module) {
  migrateRecords()
    .then(() => {
      console.log('🏁 Скрипт завершен')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Фатальная ошибка:', error)
      process.exit(1)
    })
}

export { migrateRecords }
