"use client";

import { useActionState, useState } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  MonitorUp,
} from "lucide-react";

import {
  registerPayment,
  type RegisterPaymentState,
} from "@/app/actions/memberships";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Student = { id: string; nombre: string };
type Plan = {
  id: string;
  kind: "mensual" | "clase_suelta";
  name: string;
  price: number;
};

const initialState: RegisterPaymentState = { error: null };

const methods = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: MonitorUp },
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
}: {
  initialStudentId?: string;
  plans: Plan[];
  students: Student[];
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
  const selectedPlan = plans.find((plan) => plan.id === planId);
  const selectedStudent = students.find((student) => student.id === studentId);

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <div>
        <Label
          htmlFor="studentId"
          className="text-base font-normal text-muted-foreground"
        >
          Seleccionar alumno
        </Label>
        <div className="relative mt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-[oklch(0.64_0.18_150)] text-xs font-bold text-[oklch(0.985_0.006_150)]"
          >
            {selectedStudent ? initials(selectedStudent.nombre) : "—"}
          </span>
          <select
            id="studentId"
            name="studentId"
            required
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="h-12 w-full appearance-none rounded-xl border-2 border-[oklch(0.76_0.012_300)] bg-card pr-11 pl-14 text-base outline-none transition-colors focus-visible:border-[oklch(0.42_0.2_300)] focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-lg font-bold">Plan</legend>
        <div className="mt-2 grid grid-cols-2 gap-4">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`relative flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center transition-colors ${
                planId === plan.id
                  ? "border-[oklch(0.42_0.2_300)] bg-[oklch(0.97_0.02_300)]"
                  : "border-[oklch(0.76_0.012_300)] hover:bg-secondary"
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
                <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-[oklch(0.42_0.2_300)] text-primary-foreground">
                  <Check className="size-4" aria-hidden="true" />
                </span>
              ) : null}
              <span className="text-lg font-bold">{plan.name}</span>
              <span className="mt-1 text-2xl">
                ${Number(plan.price).toLocaleString("es-MX")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <Label htmlFor="amount" className="text-lg font-bold">
          Monto
        </Label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-bold">
            $
          </span>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={selectedPlan?.price ?? ""}
            readOnly
            className="h-12 rounded-xl border-2 border-[oklch(0.76_0.012_300)] pr-4 pl-8 text-2xl font-bold"
          />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-lg font-bold">Método de pago</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {methods.map(({ value, label, icon: Icon }, index) => (
            <label
              key={value}
              className="has-checked:border-[oklch(0.42_0.2_300)] has-checked:bg-[oklch(0.97_0.02_300)] has-checked:text-[oklch(0.42_0.2_300)] flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-[oklch(0.76_0.012_300)] px-1 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <input
                type="radio"
                name="method"
                value={value}
                defaultChecked={index === 0}
                className="sr-only"
              />
              <Icon className="size-7" aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <p
        aria-live="polite"
        className="mt-2 min-h-4 text-xs font-medium text-destructive"
      >
        {state.error}
      </p>

      <Button
        type="submit"
        disabled={pending || !students.length || !plans.length}
        className="mt-2 min-h-14 rounded-xl bg-[oklch(0.42_0.2_300)] text-lg font-medium hover:bg-[oklch(0.47_0.21_300)]"
      >
        {pending ? "Registrando..." : "Confirmar renovación"}
      </Button>
    </form>
  );
}
