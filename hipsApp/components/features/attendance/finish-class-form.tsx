"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Send } from "lucide-react";

import {
  finishClass,
  type FinishClassState,
} from "@/app/actions/classes";
import { Button } from "@/components/ui/button";

const initialState: FinishClassState = { error: null };

export function FinishClassForm({
  playlistUrl,
  sessionId,
}: {
  playlistUrl: string | null;
  sessionId: string;
}) {
  const [state, formAction, pending] = useActionState(
    finishClass,
    initialState
  );
  const [sendPlaylist, setSendPlaylist] = useState(Boolean(playlistUrl));
  const [copied, setCopied] = useState(false);

  async function copyPlaylist() {
    if (!playlistUrl) return;
    await navigator.clipboard.writeText(playlistUrl);
    setCopied(true);
  }

  return (
    <form action={formAction} className="mt-6">
      <input name="sessionId" type="hidden" value={sessionId} />
      <input name="playlistUrl" type="hidden" value={playlistUrl ?? ""} />

      <h2 className="text-xl font-semibold tracking-[-0.025em]">
        Enlace de playlist
      </h2>
      <div className="mt-2 grid min-h-14 grid-cols-[auto_minmax(0,1fr)_3.5rem] items-center overflow-hidden rounded-xl border border-border">
        <Send className="ml-4 size-5 text-muted-foreground" aria-hidden="true" />
        {playlistUrl ? (
          <a
            href={playlistUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate px-3 text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {playlistUrl}
          </a>
        ) : (
          <p className="px-3 text-sm text-muted-foreground">
            Enlace no configurado
          </p>
        )}
        <button
          type="button"
          onClick={copyPlaylist}
          disabled={!playlistUrl}
          aria-label="Copiar enlace de playlist"
          className="grid h-full place-items-center border-l border-border transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary disabled:opacity-40"
        >
          {copied ? (
            <Check className="size-5 text-[oklch(0.48_0.14_150)]" />
          ) : (
            <Copy className="size-5" />
          )}
        </button>
      </div>

      <label
        className={`mt-5 flex min-h-20 items-center gap-3 rounded-2xl px-1 ${
          playlistUrl ? "cursor-pointer" : "cursor-not-allowed opacity-55"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">
            Enviar playlist al grupo
          </span>
          <span className="block text-sm text-muted-foreground">
            Se agregará a la cola al finalizar la clase
          </span>
        </span>
        <span className="relative inline-flex h-8 w-14 shrink-0">
          <input
            type="checkbox"
            name="sendPlaylist"
            checked={sendPlaylist}
            disabled={!playlistUrl}
            onChange={(event) => setSendPlaylist(event.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-[oklch(0.69_0.16_155)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
          <span className="absolute top-1 left-1 size-6 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-6" />
        </span>
      </label>

      <p
        aria-live="polite"
        className="mt-2 min-h-5 text-center text-sm font-medium text-destructive"
      >
        {state.error}
      </p>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 min-h-14 w-full rounded-xl text-base font-semibold"
      >
        {pending ? "Finalizando..." : "Finalizar clase"}
      </Button>
    </form>
  );
}
