"use client";

import { useActionState, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Check,
  CreditCard,
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
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
] as const;

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
  const selectedPlan = plans.find((plan) => plan.id === planId);

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <div>
        <Label htmlFor="studentId" className="text-base">
          Seleccionar alumno
        </Label>
        <select
          id="studentId"
          name="studentId"
          required
          defaultValue={initialStudentId ?? students[0]?.id}
          className="mt-2 min-h-14 w-full rounded-xl border border-input bg-card px-4 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.nombre}
            </option>
          ))}
        </select>
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
                ${Number(plan.price).toLocaleString("es-MX")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <Label htmlFor="amount" className="text-base">
          Monto pagado
        </Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={selectedPlan?.price ?? ""}
          readOnly
          className="mt-2 h-14 rounded-xl px-4 text-xl font-semibold"
        />
      </div>

      <fieldset className="mt-6">
        <legend className="text-base font-semibold">Método de pago</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {methods.map(({ value, label, icon: Icon }, index) => (
            <label
              key={value}
              className="has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border px-1 text-center text-xs font-medium transition-colors hover:bg-secondary"
            >
              <input
                type="radio"
                name="method"
                value={value}
                defaultChecked={index === 0}
                className="sr-only"
              />
              <Icon className="size-6" aria-hidden="true" />
              {label}
            </label>
          ))}
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
        {pending ? "Registrando..." : "Confirmar renovación"}
      </Button>
    </form>
  );
}
