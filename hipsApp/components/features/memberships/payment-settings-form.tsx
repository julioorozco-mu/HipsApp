"use client";

import { useActionState } from "react";
import { Building2, CheckCircle2, CreditCard, Landmark } from "lucide-react";

import {
  savePaymentSettings,
  type PaymentSettingsState,
} from "@/app/actions/payment-settings";
import type { PaymentSettings } from "@/lib/payment-settings";

const initialState: PaymentSettingsState = { error: null, success: false };
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const [state, action, pending] = useActionState(savePaymentSettings, initialState);

  return (
    <form action={action} className="flex flex-1 flex-col gap-6">
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="size-6" />
          </span>
          <div>
            <h2 className="font-semibold">Costos fijos</h2>
            <p className="text-sm text-muted-foreground">
              Estos importes se aplican a todos los pagos nuevos.
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
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-[oklch(0.93_0.07_150)] text-[oklch(0.48_0.16_150)]">
            <Landmark className="size-6" />
          </span>
          <div>
            <h2 className="font-semibold">Datos para transferencia</h2>
            <p className="text-sm text-muted-foreground">
              Se mostrarán al seleccionar Transferencia.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Banco
            <span className="relative">
              <Building2 className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputClass} pl-12`}
                name="bank"
                maxLength={100}
                defaultValue={settings.bank}
                required
              />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Titular
            <input
              className={inputClass}
              name="holder"
              maxLength={150}
              defaultValue={settings.holder}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Tarjeta
            <input
              className={inputClass}
              name="card"
              type="tel"
              inputMode="numeric"
              minLength={16}
              maxLength={19}
              pattern="[0-9]{16,19}"
              defaultValue={settings.card}
              onInput={(event) => {
                event.currentTarget.value = onlyDigits(event.currentTarget.value, 19);
              }}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            CLABE interbancaria
            <input
              className={inputClass}
              name="clabe"
              type="tel"
              inputMode="numeric"
              minLength={18}
              maxLength={18}
              pattern="[0-9]{18}"
              defaultValue={settings.clabe}
              onInput={(event) => {
                event.currentTarget.value = onlyDigits(event.currentTarget.value, 18);
              }}
              required
            />
          </label>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-[oklch(0.93_0.08_145)] px-4 py-3 text-sm font-medium text-[oklch(0.38_0.12_145)]">
          <CheckCircle2 className="size-5" />
          Configuración guardada y precios actualizados.
        </p>
      ) : null}

      <button
        disabled={pending}
        className="mt-auto min-h-14 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
