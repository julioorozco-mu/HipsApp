export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

const paymentMethods = new Set<PaymentMethod>([
  "efectivo",
  "transferencia",
  "tarjeta",
]);

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: "currency",
});

const yearFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && paymentMethods.has(value as PaymentMethod);
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function calculateChange(amountReceived: number, total: number) {
  return Math.max(0, amountReceived - total);
}

export function getPaymentFolio(paymentId: string, paidAt: string) {
  const year = yearFormatter.format(new Date(paidAt));
  const suffix = paymentId.replaceAll("-", "").slice(0, 8).toUpperCase();
  return `HP-${year}-${suffix}`;
}
