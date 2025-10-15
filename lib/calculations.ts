// Sales calculation formulas based on Excel logic
export interface SalesRecord {
  id?: string
  created_by?: string
  date: string
  counterparty: string
  name: string
  quantity: number
  purchase_price: number
  total_delivery: number
  selling_with_bonus: number
  client_bonus: number
  // Calculated fields
  delivery_per_unit?: number
  sum_with_delivery?: number
  financial_load_percent?: number
  financial_load?: number
  sum_with_load?: number
  markup_percent?: number
  markup?: number
  selling_price_no_vat?: number
  nds_tax?: number
  selling_price_vat?: number
  manager_bonus_percent?: number
  manager_bonus_unit?: number
  income_pre_kpn?: number
  kpn_tax?: number
  net_income_unit?: number
  margin_percent?: number
  total_selling_vat?: number
  total_selling_bonus?: number
  total_net_income?: number
  total_purchase?: number
  total_expenses?: number
  total_manager_bonuses?: number
  unit_bonus_client?: number
  created_at?: string
  updated_at?: string
}

export function calculateSalesRecord(input: {
  quantity: number
  purchase_price: number
  total_delivery: number
  selling_with_bonus: number
  client_bonus: number
}): Omit<SalesRecord, "date" | "counterparty" | "name" | "id" | "created_by" | "created_at" | "updated_at"> {
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
      financial_load_percent: 5,
      financial_load: 0,
      sum_with_load: 0,
      markup_percent: 0,
      markup: 0,
      selling_price_no_vat: 0,
      nds_tax: 0,
      selling_price_vat: 0,
      manager_bonus_percent: 3,
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

  // F = H / D (Дост-в за ед)
  const F = H / D

  // G = E + F (Сумма за ед. с доставкой)
  const G = E + F

  // I = 5% (Финансовая нагрузка %)
  const I = 5

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

  // L = (M / K) * 100 (% накр)
  const L = K !== 0 ? (M / K) * 100 : 0

  // O = P * 12 / (12 + 100) (НДС по формуле)
  const O = P * 12 / (12 + 100)

  // N = P - O (Цена продажи без НДС)
  const N = P - O

  // R = 3% (% мен-ра)
  const R = 3

  // S = N * (R / 100) (мен-ра)
  const S = N * (R / 100)

  // T = P - S - K - O (Доход с ед. без вычета КПН)
  const T = P - S - K - O

  // U = T * 0.2 (Налоги КПН)
  const U = T * 0.2

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

  // AF метрика удалена: используем только AE (Общий бонус клиента)

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
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-KZ", {
    style: "currency",
    currency: "KZT",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}
