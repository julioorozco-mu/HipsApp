"use client";

import { useActionState } from "react";

import type { PlaylistActionState } from "@/app/actions/playlists";

export function PlaylistForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: PlaylistActionState, formData: FormData) => Promise<PlaylistActionState>;
  initial?: {
    description: string;
    isPublic: boolean;
    name: string;
    useAtClassEnd: boolean;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-1 flex-col gap-5">
      <div className="mx-auto grid size-24 place-items-center rounded-2xl border border-dashed border-border bg-secondary text-center text-xs text-muted-foreground">
        Agregar<br />portada
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Nombre
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={initial?.name}
          placeholder="Zumba Energía"
          className="min-h-12 rounded-xl border bg-card px-4 text-base font-normal outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
        <textarea
          name="description"
          maxLength={300}
          defaultValue={initial?.description}
          placeholder="Ritmos intensos para la clase de las 7"
          className="min-h-24 resize-none rounded-xl border bg-card px-4 py-3 text-base font-normal outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold">Visibilidad</legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked={!initial?.isPublic}
              className="size-5 accent-primary"
            />
            Privada
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="public"
              defaultChecked={initial?.isPublic}
              className="size-5 accent-primary"
            />
            Pública
          </label>
        </div>
      </fieldset>

      <label className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border bg-secondary/55 px-4">
        <span>
          <span className="block font-semibold">Usar al finalizar clase</span>
          <span className="text-sm text-muted-foreground">Preselecciona esta playlist en el cierre</span>
        </span>
        <input
          type="checkbox"
          name="useAtClassEnd"
          defaultChecked={initial?.useAtClassEnd}
          className="size-6 accent-primary"
        />
      </label>

      <p className="rounded-xl bg-[#1ed760]/10 px-4 py-3 text-sm text-[#087c3b]">
        Se guardará también en tu cuenta de Spotify.
      </p>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-auto min-h-13 rounded-xl bg-[#14a44d] px-4 font-semibold text-white transition-colors hover:bg-[#0f8e41] disabled:opacity-60"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
