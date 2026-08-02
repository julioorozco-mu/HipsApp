"use client";

import { useActionState, useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";

import {
  createManagedUser,
  type CreateUserState,
} from "@/app/actions/users";

const initialState: CreateUserState = { error: null };
const fieldClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

export function UserForm() {
  const [state, formAction, pending] = useActionState(
    createManagedUser,
    initialState
  );
  const [role, setRole] = useState<"admin" | "alumno">("admin");

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-5">
      <input name="role" type="hidden" value={role} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tipo de usuario</legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("admin")}
            aria-pressed={role === "admin"}
            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
              role === "admin"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            <ShieldCheck className="size-7" />
            Administrador
          </button>
          <button
            type="button"
            onClick={() => setRole("alumno")}
            aria-pressed={role === "alumno"}
            className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
              role === "alumno"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            <GraduationCap className="size-7" />
            Alumno
          </button>
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold">
        Nombre completo
        <input
          className={fieldClass}
          name="full_name"
          autoComplete="name"
          placeholder={role === "admin" ? "Mariana López" : "Nombre del alumno"}
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Correo
        <input
          className={fieldClass}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@hips-app.com"
          required
        />
      </label>

      {role === "alumno" ? (
        <label className="grid gap-2 text-sm font-semibold">
          Teléfono
          <input
            className={fieldClass}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+529611234567"
            required
          />
          <span className="text-xs font-normal text-muted-foreground">
            Se usará para contacto y mensajes de WhatsApp.
          </span>
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold">
        Contraseña temporal
        <input
          className={fieldClass}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          required
        />
        <span className="text-xs font-normal text-muted-foreground">
          El usuario podrá cambiarla desde su perfil.
        </span>
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
        className="mt-auto min-h-13 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
