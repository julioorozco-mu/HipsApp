"use client";

import { useActionState, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
} from "lucide-react";

import {
  registerPayment,
  type RegisterPaymentState,
} from "@/app/actions/memberships";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIsoDate } from "@/lib/date";
import { getMembershipExpirationDate } from "@/lib/membership";

type Student = { id: string; nombre: string; hasMembership: boolean };
type Plan = {
  id: string;
  kind: "mensual" | "clase_suelta";
  name: string;
  price: number;
};

const initialState: RegisterPaymentState = { error: null };
const currencyFormatter = new Intl.NumberFormat("es-MX", {
  currency: "MXN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: "currency",
});

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
  initialStudentId,
  plans,
  students,
  today,
}: {
  initialStudentId?: string;
  plans: Plan[];
  students: Student[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    registerPayment,
    initialState
  );
  const [planId, setPlanId] = useState(
    plans.find(({ kind }) => kind === "mensual")?.id ?? plans[0]?.id ?? ""
  );
  const [studentId, setStudentId] = useState(
    students.some(({ id }) => id === initialStudentId)
      ? initialStudentId
      : students[0]?.id ?? ""
  );
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>(
    "efectivo"
  );
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const selectedStudent = students.find((student) => student.id === studentId);
  const expirationDate = selectedPlan
    ? getMembershipExpirationDate(today, selectedPlan.kind)
    : today;
  const actionLabel = selectedStudent?.hasMembership
    ? "Confirmar renovación"
    : "Realizar pago";

  return (
    <form action={formAction} className="flex flex-1 flex-col">
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
            name="studentId"
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
                onChange={() => setPlanId(plan.id)}
                className="sr-only"
              />
              {planId === plan.id ? (
                <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </span>
              ) : null}
              <span className="font-semibold">{plan.name}</span>
              <span className="mt-1 text-2xl">
                {currencyFormatter.format(plan.price)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div>
          <p className="text-base font-medium">Inicio</p>
          <div
            aria-label={`Inicio: ${formatIsoDate(today)}`}
            className="relative mt-2 flex h-14 items-center rounded-xl border border-input bg-card pr-2 pl-10 text-sm"
          >
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <time dateTime={today}>{formatIsoDate(today)}</time>
          </div>
        </div>
        <div>
          <p className="text-base font-medium">Vence</p>
          <div
            aria-label={`Vence: ${formatIsoDate(expirationDate)}`}
            className="relative mt-2 flex h-14 items-center rounded-xl border border-input bg-card pr-2 pl-10 text-sm"
          >
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <time dateTime={expirationDate}>
              {formatIsoDate(expirationDate)}
            </time>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="amount" className="text-base">
          Monto pagado
        </Label>
        <input name="amount" type="hidden" value={selectedPlan?.price ?? ""} />
        <Input
          id="amount"
          type="text"
          required
          value={selectedPlan ? currencyFormatter.format(selectedPlan.price) : ""}
          readOnly
          className="mt-2 h-14 rounded-xl px-4 text-xl font-semibold"
        />
      </div>

      <fieldset className="mt-6">
        <legend className="text-base font-semibold">Método de pago</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {methods.map(({ value, label, icon: Icon }) => {
            const isSelected = method === value;

            return (
              <label
                key={value}
                className="has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border px-1 text-center text-xs font-medium transition-colors hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={isSelected}
                  onChange={() => setMethod(value)}
                  className="sr-only"
                />
                {isSelected ? (
                  <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                ) : null}
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p
        aria-live="polite"
        className="mt-4 min-h-5 text-sm font-medium text-destructive"
      >
        {state.error}
      </p>

      <Button
        type="submit"
        disabled={pending || !students.length || !plans.length}
        className="mt-auto min-h-14 rounded-xl text-base"
      >
        {pending ? "Registrando..." : actionLabel}
      </Button>
    </form>
  );
}
