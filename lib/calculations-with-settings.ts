import { SalesRecord } from "./calculations"

interface FormulaConfig {
  financial_load_percent: number
  vat_rate: number
  manager_bonus_percent: number
  kpn_tax_rate: number
  client_bonus_tax_rate: number
}

interface CustomFormulas {
  [key: string]: string
}

export function calculateSalesRecordWithSettings(
  input: {
    quantity: number
    purchase_price: number
    total_delivery: number
    selling_with_bonus: number
    client_bonus: number
  },
  config: FormulaConfig,
  customFormulas: CustomFormulas
): Omit<SalesRecord, "date" | "counterparty" | "name" | "id" | "created_by" | "created_at" | "updated_at"> {
  console.log('calculateSalesRecordWithSettings: Input:', input)
  console.log('calculateSalesRecordWithSettings: Config:', config)
  const { quantity: D, purchase_price: E, total_delivery: H, selling_with_bonus: Q, client_bonus: AE } = input

  // Handle edge cases
  if (D <= 0) {
    return {
      quantity: D,
      purchase_price: E,
      total_delivery: H,
      selling_with_bonus: Q,
      client_bonus: AE,
      delivery_per_unit: 0,
      sum_with_delivery: 0,
      financial_load_percent: config.financial_load_percent,
      financial_load: 0,
      sum_with_load: 0,
      markup_percent: 0,
      markup: 0,
      selling_price_no_vat: 0,
      nds_tax: 0,
      selling_price_vat: 0,
      manager_bonus_percent: config.manager_bonus_percent,
      manager_bonus_unit: 0,
      income_pre_kpn: 0,
      kpn_tax: 0,
      net_income_unit: 0,
      margin_percent: 0,
      total_selling_vat: 0,
      total_selling_bonus: 0,
      total_net_income: 0,
      total_purchase: 0,
      total_expenses: 0,
      total_manager_bonuses: 0,
      unit_bonus_client: 0,
      total_client_bonus_post_tax: 0,
    }
  }

  // F = H / D (Доставка за единицу)
  const F = H / D

  // G = E + F (Сумма за ед. с доставкой)
  const G = E + F

  // I = financial_load_percent (Финансовая нагрузка %)
  const I = config.financial_load_percent

  // J = G * (I / 100) (Финансовая нагрузка)
  const J = G * (I / 100)

  // K = G + J (Сумма за ед. с доставкой и фин. нагрузкой)
  const K = G + J

  // AD = AE / D (Бонус за ед)
  const AD = AE / D

  // P = Q - AD (Цена продажи с НДС)
  const P = Q - AD

  // M = P - K (Накрутка)
  const M = P - K

  // L = (M / K) * 100 (% накрутки)
  const L = K !== 0 ? (M / K) * 100 : 0

  // НДС рассчитывается из цены продажи с НДС (P) по стандартной формуле «НДС включен»:
  // O = P * (НДС / (100 + НДС)), N = P - O
  const includedVatRatio = config.vat_rate / (100 + config.vat_rate)
  const O = P * includedVatRatio
  const N = P - O

  // R = manager_bonus_percent (% менеджера)
  const R = config.manager_bonus_percent

  // S = N * (R / 100) (Бонус менеджера за ед.)
  const S = N * (R / 100)

  // T = P - E - F - J - S - O (Доход с ед. без вычета КПН)
  const T = P - E - F - J - S - O

  // U = T * (kpn_tax_rate / 100) (Налоги КПН)
  const U = T * (config.kpn_tax_rate / 100)

  // V = T - U (Чистый доход за ед.)
  const V = T - U

  // W = (V / P) * 100 (Маржа в %)
  const W = P !== 0 ? (V / P) * 100 : 0

  // X = D * P (Общая сумма продажи с НДС)
  const X = D * P

  // Y = D * Q (Общая сумма продажи с НДС с учетом бонуса клиента)
  const Y = D * Q

  // Z = D * V (Сумма чистого дохода компании)
  const Z = D * V

  // AA = D * E (Общая сумма закупа товара)
  const AA = D * E

  // AB = AA + H + (D * J) + (D * S) + (D * O) + (D * U) (Сумма общих расходов)
  const AB = AA + H + D * J + D * S + D * O + D * U

  // AC = D * S (Общая сумма бонусов менеджера)
  const AC = D * S

  // AF = AE / (1 + client_bonus_tax_rate / 100) (Общий бонус клиент с вычетом налога)
  const AF = AE / (1 + config.client_bonus_tax_rate / 100)

  return {
    quantity: D,
    purchase_price: E,
    total_delivery: H,
    selling_with_bonus: Q,
    client_bonus: AE,
    delivery_per_unit: F,
    sum_with_delivery: G,
    financial_load_percent: I,
    financial_load: J,
    sum_with_load: K,
    markup_percent: L,
    markup: M,
    selling_price_no_vat: N,
    nds_tax: O,
    selling_price_vat: P,
    manager_bonus_percent: R,
    manager_bonus_unit: S,
    income_pre_kpn: T,
    kpn_tax: U,
    net_income_unit: V,
    margin_percent: W,
    total_selling_vat: X,
    total_selling_bonus: Y,
    total_net_income: Z,
    total_purchase: AA,
    total_expenses: AB,
    total_manager_bonuses: AC,
    unit_bonus_client: AD,
    total_client_bonus_post_tax: AF,
  }
}

// Функция для парсинга пользовательских формул (базовая реализация)
export function parseCustomFormula(formula: string, variables: Record<string, number>): number {
  try {
    // Заменяем переменные на их значения
    let expression = formula
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g')
      expression = expression.replace(regex, value.toString())
    })

    // Заменяем математические операторы на JavaScript эквиваленты
    expression = expression
      .replace(/\^/g, '**') // степень
      .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '($1 / $2)') // деление
      .replace(/\b(\d+)\s*\*\s*(\d+)\b/g, '($1 * $2)') // умножение

    // Удаляем "=" и пробелы
    expression = expression.replace(/^=/, '').trim()

    // Безопасное вычисление выражения
    // В реальном приложении здесь должна быть более сложная логика парсинга
    return eval(expression) || 0
  } catch (error) {
    console.error('Error parsing custom formula:', formula, error)
    return 0
  }
}
