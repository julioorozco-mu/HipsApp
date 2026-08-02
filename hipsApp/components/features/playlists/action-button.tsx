"use client";

import { useActionState } from "react";

import type { PlaylistActionState } from "@/app/actions/playlists";

export function ActionButton({
  action,
  children,
  className = "bg-primary text-primary-foreground hover:bg-primary/90",
}: {
  action: (state: PlaylistActionState, formData: FormData) => Promise<PlaylistActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction}>
      {state.error ? (
        <p role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`min-h-13 w-full rounded-xl px-4 font-semibold transition-colors disabled:opacity-60 ${className}`}
      >
        {pending ? "Procesando…" : children}
      </button>
    </form>
  );
}
