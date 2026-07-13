// Exchange rates relative to BRL (1 BRL = X in target currency)
const EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.17,  // 1 BRL ≈ 0.17 USD
  EUR: 0.16,  // 1 BRL ≈ 0.16 EUR
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: "R$",
  USD: "$",
  EUR: "€",
}

const CURRENCY_LOCALES: Record<string, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
}

export function convertCurrency(amountInCents: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amountInCents
  const brlAmount = amountInCents / (EXCHANGE_RATES[fromCurrency] || 1)
  return Math.round(brlAmount * (EXCHANGE_RATES[toCurrency] || 1))
}

export function formatCurrencyConverted(amountInBRL: number, targetCurrency: string = "BRL"): string {
  const converted = convertCurrency(amountInBRL, "BRL", targetCurrency)
  const amount = converted / 100
  return new Intl.NumberFormat(CURRENCY_LOCALES[targetCurrency] || "pt-BR", {
    style: "currency",
    currency: targetCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export { EXCHANGE_RATES, CURRENCY_SYMBOLS }
