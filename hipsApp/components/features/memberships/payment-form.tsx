"use client";

import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  MessageCircle,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIsoDate } from "@/lib/date";
import { getMembershipExpirationDate } from "@/lib/membership";
import {
  calculateChange,
  formatCurrency,
  type PaymentMethod,
} from "@/lib/payment";
import {
  transferMessage,
  type TransferAccount,
} from "@/lib/payment-settings";

type Student = { id: string; nombre: string };
type Plan = {
  id: string;
  kind: "mensual" | "clase_suelta";
  name: string;
  price: number;
};

const methods = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function PaymentForm({
  initialAmount,
  initialMethod = "efectivo",
  initialPlanId,
  initialReference = "",
  initialStartDate,
  initialStudentId,
  plans,
  students,
  today,
  transferAccounts,
}: {
  initialAmount?: string;
  initialMethod?: PaymentMethod;
  initialPlanId?: string;
  initialReference?: string;
  initialStartDate?: string;
  initialStudentId?: string;
  plans: Plan[];
  students: Student[];
  today: string;
  transferAccounts: TransferAccount[];
}) {
  const initialPlan = plans.find(({ id }) => id === initialPlanId);
  const defaultPlanId =
    initialPlan?.id ??
    plans.find(({ kind }) => kind === "mensual")?.id ??
    plans[0]?.id ??
    "";
  const transferAvailable = transferAccounts.length > 0;
  const defaultMethod =
    initialMethod === "transferencia" && !transferAvailable
      ? "efectivo"
      : initialMethod;
  const [planId, setPlanId] = useState(defaultPlanId);
  const [studentId, setStudentId] = useState(
    students.some(({ id }) => id === initialStudentId)
      ? initialStudentId
      : students[0]?.id ?? ""
  );
  const defaultPlan = plans.find(({ id }) => id === defaultPlanId);
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [amount, setAmount] = useState(
    initialAmount ??
      (defaultMethod === "efectivo"
        ? "0.00"
        : defaultPlan?.price.toFixed(2) ?? "0.00")
  );
  const [reference, setReference] = useState(initialReference);
  const [startDate, setStartDate] = useState(initialStartDate ?? today);
  const [showTransferDetails, setShowTransferDetails] = useState(false);
  const transferOpenedRef = useRef(false);
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const selectedStudent = students.find((student) => student.id === studentId);
  const expirationDate = selectedPlan
    ? getMembershipExpirationDate(startDate, selectedPlan.kind)
    : startDate;
  const amountValue = Number(amount) || 0;
  const change = calculateChange(amountValue, selectedPlan?.price ?? 0);

  function selectPlan(nextPlanId: string) {
    setPlanId(nextPlanId);
    const nextPlan = plans.find(({ id }) => id === nextPlanId);
    if (method !== "efectivo" && nextPlan) {
      setAmount(nextPlan.price.toFixed(2));
    }
  }

  function selectMethod(nextMethod: PaymentMethod) {
    if (nextMethod === "transferencia" && !transferAvailable) return;

    setMethod(nextMethod);
    setAmount(
      nextMethod === "efectivo"
        ? "0.00"
        : selectedPlan?.price.toFixed(2) ?? "0.00"
    );
    if (nextMethod !== "transferencia") {
      setReference("");
      return;
    }

    if (!transferOpenedRef.current) {
      transferOpenedRef.current = true;
      setShowTransferDetails(true);
    }
  }

  function shareTransferDetails(account: TransferAccount) {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(transferMessage(account))}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <>
      <form
        action="/membresias/revisar"
        method="get"
        className="flex flex-1 flex-col"
      >
        <div>
          <Label htmlFor="studentId" className="text-base">
            Seleccionar alumno
          </Label>
          <div className="relative mt-2">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-[oklch(0.64_0.18_150)] text-xs font-bold text-[oklch(0.985_0.006_150)]"
            >
              {selectedStudent ? initials(selectedStudent.nombre) : "—"}
            </span>
            <select
              id="studentId"
              name="student"
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="min-h-14 w-full appearance-none rounded-xl border border-input bg-card py-1 pr-12 pl-16 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-base font-semibold">Plan</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <label
                key={plan.id}
                className={`relative flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border p-3 text-center transition-colors ${
                  planId === plan.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="planId"
                  value={plan.id}
                  checked={planId === plan.id}
                  onChange={() => selectPlan(plan.id)}
                  className="sr-only"
                />
                {planId === plan.id ? (
                  <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                ) : null}
                <span className="font-semibold">{plan.name}</span>
                <span className="mt-1 text-2xl">
                  {formatCurrency(plan.price)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-base font-medium" htmlFor="start">
            Inicio
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="start"
                name="start"
                type="date"
                max={today}
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-14 rounded-xl pl-10 text-sm"
              />
            </span>
          </label>
          <div>
            <p className="text-base font-medium">Vence</p>
            <div
              aria-label={`Vence: ${formatIsoDate(expirationDate)}`}
              className="relative mt-2 flex h-14 items-center rounded-xl border border-input bg-secondary/45 pr-2 pl-10 text-sm"
            >
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <time dateTime={expirationDate}>
                {formatIsoDate(expirationDate)}
              </time>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Puedes usar una fecha anterior; el vencimiento se recalcula automáticamente.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount" className="text-base">
              Monto pagado
            </Label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg font-semibold">
                $
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min={selectedPlan?.price ?? 0}
                max="99999999.99"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-14 rounded-xl pr-3 pl-8 text-lg font-semibold"
              />
            </div>
          </div>
          <div>
            <p className="text-base font-medium">Cambio</p>
            <output
              htmlFor="amount"
              aria-live="polite"
              className="mt-2 flex h-14 items-center rounded-xl border border-input bg-secondary/45 px-4 text-lg font-semibold"
            >
              {formatCurrency(change)}
            </output>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-base font-semibold">Método de pago</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {methods.map(({ value, label, icon: Icon }) => {
              const isSelected = method === value;
              const disabled = value === "transferencia" && !transferAvailable;

              return (
                <label
                  key={value}
                  className={`has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border px-1 text-center text-xs font-medium transition-colors ${
                    disabled
                      ? "cursor-not-allowed opacity-45"
                      : "cursor-pointer hover:bg-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={value}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => selectMethod(value)}
                    className="sr-only"
                  />
                  {isSelected ? (
                    <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                  <Icon className="size-6" aria-hidden="true" />
                  {label}
                  {disabled ? <span className="text-[0.6rem]">Sin cuenta</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {method === "transferencia" ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="reference" className="text-base">
                Referencia{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowTransferDetails(true)}
                className="text-sm font-semibold text-primary"
              >
                Ver cuentas bancarias
              </button>
            </div>
            <Input
              id="reference"
              name="reference"
              maxLength={100}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ej. 1234567890"
              className="mt-2 h-14 rounded-xl px-4 text-base"
            />
          </div>
        ) : null}

        <div className="mt-auto pt-5">
          <Button
            type="submit"
            disabled={!students.length || !plans.length || !startDate}
            className="min-h-14 w-full rounded-xl text-base"
          >
            Revisar pago
          </Button>
        </div>
      </form>

      {showTransferDetails ? (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-foreground/40 p-2 sm:place-items-center sm:p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-title"
            className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-[oklch(0.93_0.07_150)] text-[oklch(0.48_0.16_150)]">
                <Landmark className="size-6" />
              </span>
              <button
                type="button"
                onClick={() => setShowTransferDetails(false)}
                aria-label="Cerrar datos de transferencia"
                className="grid size-10 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>

            <h2 id="transfer-title" className="mt-4 text-2xl font-bold tracking-tight">
              Cuentas para transferencia
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Comparte con el alumno la cuenta que prefiera utilizar.
            </p>

            <div className="mt-5 grid gap-3">
              {transferAccounts.map((account) => (
                <article key={account.id} className="rounded-2xl border bg-secondary/25 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary">
                      <Landmark className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{account.label}</h3>
                      <p className="truncate text-sm text-muted-foreground">{account.bank}</p>
                    </div>
                  </div>
                  <dl className="mt-3 overflow-hidden rounded-xl border bg-card divide-y text-sm">
                    <div className="px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Titular</dt>
                      <dd className="font-semibold">{account.holder}</dd>
                    </div>
                    {account.card ? (
                      <div className="px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Tarjeta</dt>
                        <dd className="break-all font-mono font-semibold">{account.card}</dd>
                      </div>
                    ) : null}
                    {account.clabe ? (
                      <div className="px-3 py-2">
                        <dt className="text-xs text-muted-foreground">CLABE interbancaria</dt>
                        <dd className="break-all font-mono font-semibold">{account.clabe}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <button
                    type="button"
                    onClick={() => shareTransferDetails(account)}
                    className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[oklch(0.55_0.19_150)] px-4 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="size-5" />
                    Compartir por WhatsApp
                  </button>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowTransferDetails(false)}
              className="mt-5 min-h-12 w-full rounded-xl border px-4 font-semibold hover:bg-secondary"
            >
              Continuar con el pago
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
