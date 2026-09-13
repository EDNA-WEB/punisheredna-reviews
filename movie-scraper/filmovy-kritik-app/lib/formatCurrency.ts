export function currencySymbol(code: string): string {
  const map: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CZK: 'Kč' };
  return map[code] || code;
}

export function formatPrice(value: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const amount = value.toFixed(2).replace('.', ',');
  return symbol === '€' ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
