"use client";

import { useActionState } from "react";
import type { MoreActionState } from "@/app/actions/more";

export function ActionForm({
  action,
  children,
  label,
}: {
  action: (state: MoreActionState, formData: FormData) => Promise<MoreActionState>;
  children: React.ReactNode;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-5">
      {children}
      {state.error ? <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p> : null}
      <button disabled={pending} className="mt-auto min-h-13 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? "Guardando…" : label}
      </button>
    </form>
  );
}

export const fieldClass = "min-h-12 w-full rounded-xl border bg-card px-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25";
