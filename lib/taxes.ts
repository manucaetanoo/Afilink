const DEFAULT_CHECKOUT_TAX_RATE = 0.22;

function normalizeRate(value: string | undefined) {
  if (!value) return DEFAULT_CHECKOUT_TAX_RATE;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CHECKOUT_TAX_RATE;
  }

  return parsed > 1 ? parsed / 100 : parsed;
}

export function getCheckoutTaxRate() {
  return normalizeRate(
    process.env.CHECKOUT_TAX_RATE ?? process.env.NEXT_PUBLIC_CHECKOUT_TAX_RATE
  );
}

export function calculateCheckoutTax(subtotal: number) {
  return Math.max(0, Math.round(subtotal * getCheckoutTaxRate()));
}

export function getCheckoutTotalWithTax(subtotal: number) {
  const taxAmount = calculateCheckoutTax(subtotal);

  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}
