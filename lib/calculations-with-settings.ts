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

  // Iterative calculation for N and O using user's VAT rate
  let N = P // Initial guess for selling price without VAT
  let O = 0 // VAT tax

  // Iterate to solve N = P - O and O = N * (vat_rate / 100)
  for (let i = 0; i < 10; i++) {
    O = N * (config.vat_rate / 100)
    const newN = P - O
    if (Math.abs(newN - N) < 0.01) break
    N = newN
  }

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

  const baseResult = {
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

  // Применяем пользовательские формулы если они есть
  const resultWithCustomFormulas = applyCustomFormulas(baseResult, customFormulas, config)
  
  return resultWithCustomFormulas
}

// Функция для парсинга пользовательских формул
export function parseCustomFormula(formula: string, variables: Record<string, number>): number {
  try {
    if (!formula || formula.trim() === '') return 0
    
    // Удаляем "=" в начале если есть
    let expression = formula.replace(/^=/, '').trim()
    
    // Заменяем переменные на их значения
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g')
      expression = expression.replace(regex, value.toString())
    })

    // Заменяем математические операторы
    expression = expression
      .replace(/\^/g, '**') // степень
      .replace(/\b(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\b/g, '($1 / $2)') // деление
      .replace(/\b(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\b/g, '($1 * $2)') // умножение

    // Безопасное вычисление выражения
    return eval(expression) || 0
  } catch (error) {
    console.error('Error parsing custom formula:', formula, error)
    return 0
  }
}

// Функция для применения пользовательских формул к расчетам
export function applyCustomFormulas(
  baseCalculations: Record<string, number>,
  customFormulas: CustomFormulas,
  config: FormulaConfig
): Record<string, number> {
  const result = { ...baseCalculations }
  
  // Создаем объект с переменными для формул
  const variables = {
    D: result.quantity || 0,
    E: result.purchase_price || 0,
    F: result.delivery_per_unit || 0,
    G: result.sum_with_delivery || 0,
    H: result.total_delivery || 0,
    I: result.financial_load_percent || 0,
    J: result.financial_load || 0,
    K: result.sum_with_load || 0,
    L: result.markup_percent || 0,
    M: result.markup || 0,
    N: result.selling_price_no_vat || 0,
    O: result.nds_tax || 0,
    P: result.selling_price_vat || 0,
    Q: result.selling_with_bonus || 0,
    R: result.manager_bonus_percent || 0,
    S: result.manager_bonus_unit || 0,
    T: result.income_pre_kpn || 0,
    U: result.kpn_tax || 0,
    V: result.net_income_unit || 0,
    W: result.margin_percent || 0,
    X: result.total_selling_vat || 0,
    Y: result.total_selling_bonus || 0,
    Z: result.total_net_income || 0,
    AA: result.total_purchase || 0,
    AB: result.total_expenses || 0,
    AC: result.total_manager_bonuses || 0,
    AD: result.unit_bonus_client || 0,
    AE: result.client_bonus || 0,
    AF: result.total_client_bonus_post_tax || 0,
    // Добавляем константы из конфигурации
    'НДС': config.vat_rate,
    'КПН': config.kpn_tax_rate,
    'налог': config.client_bonus_tax_rate,
  }

  // Применяем пользовательские формулы
  Object.entries(customFormulas).forEach(([key, formula]) => {
    if (formula && formula.trim() !== '') {
      try {
        const calculatedValue = parseCustomFormula(formula, variables)
        
        // Обновляем соответствующее поле
        switch (key) {
          case 'delivery_per_unit':
            result.delivery_per_unit = calculatedValue
            variables.F = calculatedValue
            break
          case 'sum_with_delivery':
            result.sum_with_delivery = calculatedValue
            variables.G = calculatedValue
            break
          case 'financial_load':
            result.financial_load = calculatedValue
            variables.J = calculatedValue
            break
          case 'sum_with_load':
            result.sum_with_load = calculatedValue
            variables.K = calculatedValue
            break
          case 'markup':
            result.markup = calculatedValue
            variables.M = calculatedValue
            break
          case 'markup_percent':
            result.markup_percent = calculatedValue
            variables.L = calculatedValue
            break
          case 'selling_price_no_vat':
            result.selling_price_no_vat = calculatedValue
            variables.N = calculatedValue
            break
          case 'nds_tax':
            result.nds_tax = calculatedValue
            variables.O = calculatedValue
            break
          case 'manager_bonus_unit':
            result.manager_bonus_unit = calculatedValue
            variables.S = calculatedValue
            break
          case 'income_pre_kpn':
            result.income_pre_kpn = calculatedValue
            variables.T = calculatedValue
            break
          case 'kpn_tax':
            result.kpn_tax = calculatedValue
            variables.U = calculatedValue
            break
          case 'net_income_unit':
            result.net_income_unit = calculatedValue
            variables.V = calculatedValue
            break
          case 'margin_percent':
            result.margin_percent = calculatedValue
            variables.W = calculatedValue
            break
          case 'total_selling_vat':
            result.total_selling_vat = calculatedValue
            variables.X = calculatedValue
            break
          case 'total_selling_bonus':
            result.total_selling_bonus = calculatedValue
            variables.Y = calculatedValue
            break
          case 'total_net_income':
            result.total_net_income = calculatedValue
            variables.Z = calculatedValue
            break
          case 'total_purchase':
            result.total_purchase = calculatedValue
            variables.AA = calculatedValue
            break
          case 'total_expenses':
            result.total_expenses = calculatedValue
            variables.AB = calculatedValue
            break
          case 'total_manager_bonuses':
            result.total_manager_bonuses = calculatedValue
            variables.AC = calculatedValue
            break
          case 'unit_bonus_client':
            result.unit_bonus_client = calculatedValue
            variables.AD = calculatedValue
            break
          case 'total_client_bonus_post_tax':
            result.total_client_bonus_post_tax = calculatedValue
            variables.AF = calculatedValue
            break
        }
      } catch (error) {
        console.error(`Error applying custom formula for ${key}:`, error)
      }
    }
  })

  return result
}
