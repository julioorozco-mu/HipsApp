"use client";

import { useActionState, useState } from "react";
import {
  AlertTriangle,
  GraduationCap,
  ShieldEllipsis,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteManagedUser,
  updateManagedUser,
  type ManageUserState,
} from "@/app/actions/users";

const initialState: ManageUserState = { error: null };
const fieldClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

function nationalPhone(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.startsWith("52") && digits.length === 12 ? digits.slice(2) : digits.slice(-10);
}

function keepTenDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export type EditableUser = {
  email: string;
  fullName: string;
  id: string;
  phone: string | null;
  role: "admin" | "alumno";
};

export function UserEditForm({ user }: { user: EditableUser }) {
  const [updateState, updateAction, updating] = useActionState(
    updateManagedUser,
    initialState
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteManagedUser,
    initialState
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const RoleIcon = user.role === "admin" ? ShieldEllipsis : GraduationCap;

  return (
    <>
      <form action={updateAction} className="flex flex-1 flex-col gap-5">
        <input name="user_id" type="hidden" value={user.id} />

        <div className="flex items-center gap-3 rounded-2xl border bg-secondary/40 px-4 py-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <RoleIcon className="size-6" />
          </span>
          <span>
            <span className="block text-xs font-medium text-muted-foreground">Tipo de usuario</span>
            <span className="font-semibold">
              {user.role === "admin" ? "Administrador" : "Alumno"}
            </span>
          </span>
        </div>

        <label className="grid gap-2 text-sm font-semibold">
          Nombre completo
          <input
            className={fieldClass}
            name="full_name"
            autoComplete="name"
            defaultValue={user.fullName}
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
            defaultValue={user.email}
            required
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
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              pattern="[0-9]{10}"
              minLength={10}
              maxLength={10}
              defaultValue={nationalPhone(user.phone)}
              onInput={(event) => {
                event.currentTarget.value = keepTenDigits(event.currentTarget.value);
              }}
              required
            />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Captura únicamente los 10 dígitos del número mexicano.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Nueva contraseña <span className="font-normal text-muted-foreground">(opcional)</span>
          <input
            className={fieldClass}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="Dejar vacío para conservarla"
          />
        </label>

        {updateState.error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {updateState.error}
          </p>
        ) : null}

        <div className="mt-auto grid gap-3 pt-3">
          <button
            disabled={updating}
            className="min-h-13 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {updating ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="min-h-12 w-full rounded-xl border border-destructive/35 px-4 font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="size-5" />
              Eliminar usuario
            </span>
          </button>
        </div>
      </form>

      {confirmDelete ? (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-foreground/35 p-2 sm:place-items-center sm:p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                aria-label="Cerrar confirmación"
                className="grid size-10 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <h2 id="delete-user-title" className="mt-4 text-2xl font-bold tracking-tight">
              ¿Eliminar a {user.fullName}?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Se eliminará su acceso a HipsApp. Los alumnos con pagos registrados no pueden eliminarse para proteger el historial financiero.
            </p>

            <form action={deleteAction} className="mt-5 grid gap-3">
              <input name="user_id" type="hidden" value={user.id} />
              {deleteState.error ? (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {deleteState.error}
                </p>
              ) : null}
              <button
                disabled={deleting}
                className="min-h-12 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Sí, eliminar usuario"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-12 rounded-xl border px-4 font-semibold hover:bg-secondary"
              >
                Cancelar
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
