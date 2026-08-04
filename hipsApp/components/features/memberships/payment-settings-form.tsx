"use client";

import { useActionState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react";

import {
  savePaymentSettings,
  type PaymentSettingsState,
} from "@/app/actions/payment-settings";
import type { PaymentSettings } from "@/lib/payment-settings";

const initialState: PaymentSettingsState = { error: null, success: false };
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const [state, action, pending] = useActionState(savePaymentSettings, initialState);

  return (
    <form action={action} className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <CreditCard className="size-6" />
        </span>
        <div>
          <h2 className="font-semibold">Costos fijos</h2>
          <p className="text-sm text-muted-foreground">
            Se aplicarán a todos los pagos nuevos.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm font-semibold">
          Plan mensual
          <span className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <input
              className={`${inputClass} pl-8`}
              name="monthly_price"
              type="number"
              inputMode="decimal"
              min="0"
              max="99999999.99"
              step="0.01"
              defaultValue={settings.monthlyPrice.toFixed(2)}
              required
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Clase suelta
          <span className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <input
              className={`${inputClass} pl-8`}
              name="single_class_price"
              type="number"
              inputMode="decimal"
              min="0"
              max="99999999.99"
              step="0.01"
              defaultValue={settings.singleClassPrice.toFixed(2)}
              required
            />
          </span>
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-[oklch(0.93_0.08_145)] px-4 py-3 text-sm font-medium text-[oklch(0.38_0.12_145)]">
          <CheckCircle2 className="size-5" />
          Precios actualizados.
        </p>
      ) : null}

      <button
        disabled={pending}
        className="mt-5 min-h-12 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar precios"}
      </button>
    </form>
  );
}
