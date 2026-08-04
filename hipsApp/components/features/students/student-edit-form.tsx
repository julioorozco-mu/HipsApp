"use client";

import { useActionState } from "react";

import {
  updateStudent,
  type StudentFormState,
} from "@/app/actions/students";

const initialState: StudentFormState = { error: null };
const fieldClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

function localPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("52") && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
}

export type EditableStudent = {
  correo: string | null;
  cumpleanos: string | null;
  id: string;
  nombre: string;
  objetivoPeso: number | null;
  telefono: string;
};

export function StudentEditForm({ student }: { student: EditableStudent }) {
  const action = updateStudent.bind(null, student.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-5">
      <label className="grid gap-2 text-sm font-semibold">
        Nombre completo
        <input
          className={fieldClass}
          name="nombre"
          autoComplete="name"
          defaultValue={student.nombre}
          maxLength={120}
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Cumpleaños
        <input
          className={fieldClass}
          name="cumpleanos"
          type="date"
          defaultValue={student.cumpleanos ?? ""}
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Teléfono celular
        <span className="flex overflow-hidden rounded-xl border border-border bg-card transition focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/25">
          <span className="flex min-h-12 items-center border-r border-border bg-secondary/60 px-4 text-base font-semibold text-muted-foreground">
            +52
          </span>
          <input
            className="min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none"
            name="telefono_local"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{10}"
            minLength={10}
            maxLength={10}
            defaultValue={localPhone(student.telefono)}
            onInput={(event) => {
              event.currentTarget.value = event.currentTarget.value
                .replace(/\D/g, "")
                .slice(0, 10);
            }}
            required
          />
        </span>
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Correo
        <input
          className={fieldClass}
          name="correo"
          type="email"
          autoComplete="email"
          defaultValue={student.correo ?? ""}
          maxLength={254}
          placeholder="alumno@correo.com"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Peso ideal <span className="font-normal text-muted-foreground">(opcional)</span>
        <input
          className={fieldClass}
          name="objetivo_peso_grasa"
          type="number"
          inputMode="decimal"
          min="1"
          max="500"
          step="0.1"
          defaultValue={student.objetivoPeso ?? ""}
          placeholder="kg"
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <button
        disabled={pending}
        className="mt-auto min-h-14 w-full rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
