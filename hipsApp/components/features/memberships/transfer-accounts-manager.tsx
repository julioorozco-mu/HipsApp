"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertTriangle,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteTransferAccount,
  saveTransferAccount,
  type TransferAccountState,
} from "@/app/actions/payment-settings";
import type { TransferAccount } from "@/lib/payment-settings";

const initialState: TransferAccountState = { error: null, success: false };
const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-card px-4 outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/25";

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function masked(value: string | null) {
  if (!value) return "No configurada";
  return `•••• ${value.slice(-4)}`;
}

function AccountEditor({
  account,
  onClose,
}: {
  account: TransferAccount | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(saveTransferAccount, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-foreground/40 p-2 sm:place-items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-editor-title"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Landmark className="size-6" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar cuenta bancaria"
            className="grid size-10 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>

        <h3 id="account-editor-title" className="mt-4 text-2xl font-bold tracking-tight">
          {account ? "Editar cuenta" : "Agregar cuenta"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Usa un nombre corto para identificarla al compartir los datos.
        </p>

        <form action={action} className="mt-5 grid gap-4">
          <input type="hidden" name="account_id" value={account?.id ?? ""} />
          <label className="grid gap-2 text-sm font-semibold">
            Nombre de la cuenta
            <input
              name="label"
              className={inputClass}
              defaultValue={account?.label ?? ""}
              maxLength={80}
              placeholder="Ej. Cuenta principal"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Banco
            <input
              name="bank"
              className={inputClass}
              defaultValue={account?.bank ?? ""}
              maxLength={100}
              placeholder="Ej. BBVA BANCOMER"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Titular
            <input
              name="holder"
              className={inputClass}
              defaultValue={account?.holder ?? ""}
              maxLength={150}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Tarjeta <span className="font-normal text-muted-foreground">(opcional)</span>
            <input
              name="card"
              className={inputClass}
              type="tel"
              inputMode="numeric"
              minLength={16}
              maxLength={19}
              pattern="[0-9]{16,19}"
              defaultValue={account?.card ?? ""}
              onInput={(event) => {
                event.currentTarget.value = digits(event.currentTarget.value, 19);
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            CLABE <span className="font-normal text-muted-foreground">(opcional)</span>
            <input
              name="clabe"
              className={inputClass}
              type="tel"
              inputMode="numeric"
              minLength={18}
              maxLength={18}
              pattern="[0-9]{18}"
              defaultValue={account?.clabe ?? ""}
              onInput={(event) => {
                event.currentTarget.value = digits(event.currentTarget.value, 18);
              }}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Debes capturar al menos una tarjeta o una CLABE.
          </p>

          {state.error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}

          <button
            disabled={pending}
            className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Guardando…" : account ? "Guardar cambios" : "Agregar cuenta"}
          </button>
        </form>
      </section>
    </div>
  );
}

function DeleteAccountDialog({
  account,
  onClose,
}: {
  account: TransferAccount;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(deleteTransferAccount, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-foreground/40 p-2 sm:place-items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
      >
        <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <h3 id="delete-account-title" className="mt-4 text-2xl font-bold tracking-tight">
          ¿Eliminar {account.label}?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Dejará de aparecer al compartir datos de transferencia. Los pagos anteriores no se modifican.
        </p>

        <form action={action} className="mt-5 grid gap-3">
          <input type="hidden" name="account_id" value={account.id} />
          {state.error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          <button
            disabled={pending}
            className="min-h-12 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {pending ? "Eliminando…" : "Eliminar cuenta"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border px-4 font-semibold hover:bg-secondary"
          >
            Cancelar
          </button>
        </form>
      </section>
    </div>
  );
}

export function TransferAccountsManager({ accounts }: { accounts: TransferAccount[] }) {
  const [editing, setEditing] = useState<TransferAccount | "new" | null>(null);
  const [deleting, setDeleting] = useState<TransferAccount | null>(null);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[oklch(0.93_0.07_150)] text-[oklch(0.48_0.16_150)]">
            <Landmark className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">Datos para transferencia</h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? "cuenta disponible" : "cuentas disponibles"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          Agregar
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {accounts.length ? accounts.map((account) => (
          <article key={account.id} className="rounded-2xl border bg-secondary/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{account.label}</h3>
                <p className="truncate text-sm text-muted-foreground">{account.bank}</p>
                <p className="mt-1 truncate text-sm">{account.holder}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(account)}
                  aria-label={`Editar ${account.label}`}
                  className="grid size-10 place-items-center rounded-full text-primary hover:bg-primary/10"
                >
                  <Pencil className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(account)}
                  aria-label={`Eliminar ${account.label}`}
                  className="grid size-10 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-card px-3 py-2">
                <dt className="text-muted-foreground">Tarjeta</dt>
                <dd className="mt-0.5 font-mono font-semibold">{masked(account.card)}</dd>
              </div>
              <div className="rounded-xl bg-card px-3 py-2">
                <dt className="text-muted-foreground">CLABE</dt>
                <dd className="mt-0.5 font-mono font-semibold">{masked(account.clabe)}</dd>
              </div>
            </dl>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
            <Landmark className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 font-semibold">No hay cuentas configuradas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Agrega una para habilitar pagos por transferencia.
            </p>
          </div>
        )}
      </div>

      {editing ? (
        <AccountEditor
          key={editing === "new" ? "new" : editing.id}
          account={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteAccountDialog
          key={deleting.id}
          account={deleting}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}
