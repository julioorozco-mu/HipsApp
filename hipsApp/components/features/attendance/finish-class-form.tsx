"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Grip,
  Home,
  Music2,
  Play,
  Send,
  Share2,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState, useTransition } from "react";

import {
  finishClass,
  type FinishClassState,
} from "@/app/actions/classes";
import { Button } from "@/components/ui/button";

export type FinishPlaylistTrack = {
  artist: string | null;
  durationSeconds: number | null;
  id: string;
  title: string;
};

export type FinishPlaylistOption = {
  externalUrl: string | null;
  id: string;
  name: string;
  totalSeconds: number;
  tracks: FinishPlaylistTrack[];
};

const initialState: FinishClassState = { error: null, success: false };
const finishedAtFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function totalDuration(seconds: number) {
  if (!seconds) return "0 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} h${remaining ? ` ${remaining} min` : ""}`;
}

export function FinishClassForm({
  defaultPlaylistId,
  playlists,
  presentCount,
  sessionId,
}: {
  defaultPlaylistId: string | null;
  playlists: FinishPlaylistOption[];
  presentCount: number;
  sessionId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState(defaultPlaylistId ?? "");
  const [sendPlaylist, setSendPlaylist] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<FinishClassState | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedId) ?? null,
    [playlists, selectedId]
  );
  const canShare = Boolean(selected?.externalUrl && presentCount > 0);

  function requestConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setConfirming(true);
  }

  function completeClass() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);

    startTransition(async () => {
      setError("");
      try {
        const next = await finishClass(initialState, formData);
        if (!next.success) {
          setError(next.error ?? "No se pudo finalizar la clase.");
          setConfirming(false);
          return;
        }
        setResult(next);
        setConfirming(false);
      } catch {
        setError(
          "No se pudo completar el cierre en este momento. La asistencia permanece guardada; intenta finalizar nuevamente."
        );
        setConfirming(false);
      }
    });
  }

  async function sharePlaylist() {
    if (!result?.shareUrl) return;
    const text = `${result.shareText ?? "Playlist de la clase"} ${result.shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: result.playlistName ?? "Playlist de la clase",
          text: result.shareText,
          url: result.shareUrl,
        });
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }
    }

    window.location.assign(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  if (result?.success) {
    return (
      <section className="mt-7" aria-labelledby="class-finished-title">
        <div className="rounded-[2rem] bg-[oklch(0.95_0.07_145)] px-5 py-7 text-center text-[oklch(0.32_0.1_145)]">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-card shadow-sm">
            <CheckCircle2 className="size-11" strokeWidth={2.25} />
          </span>
          <h2
            id="class-finished-title"
            className="mt-5 text-3xl font-bold tracking-[-0.04em]"
          >
            Clase finalizada
          </h2>
          <p className="mt-1 text-sm opacity-80">
            {result.className ?? "La clase"} quedó cerrada correctamente.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-card px-4 py-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Presentes</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {result.presentCount ?? presentCount}
              </p>
            </div>
            <div className="rounded-2xl bg-card px-4 py-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Cierre</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                {result.finishedAt
                  ? finishedAtFormatter.format(new Date(result.finishedAt))
                  : "Ahora"}
              </p>
            </div>
          </div>

          {result.notes ? (
            <div className="mt-3 rounded-2xl bg-card px-4 py-4 text-left shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Notas de cierre</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {result.notes}
              </p>
            </div>
          ) : null}
        </div>

        {result.shareUrl ? (
          <button
            type="button"
            onClick={sharePlaylist}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[oklch(0.57_0.17_150)] px-5 text-base font-semibold text-white transition-colors hover:bg-[oklch(0.52_0.17_150)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Share2 className="size-5" />
            Compartir playlist por WhatsApp
          </button>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/asistencia"
            className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-primary px-4 font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <UsersRound className="size-5" />
            Ver asistencia
          </Link>
          <Link
            href="/"
            className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Home className="size-5" />
            Ir a Inicio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <form ref={formRef} onSubmit={requestConfirmation} className="mt-7">
        <input name="sessionId" type="hidden" value={sessionId} />
        <input name="playlistId" type="hidden" value={selectedId} />

        <section aria-labelledby="playlist-title">
          <div>
            <h2 id="playlist-title" className="text-2xl font-semibold tracking-[-0.03em]">
              Playlist de hoy
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La asignada a la clase aparece seleccionada. El cambio solo aplica hoy.
            </p>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold">
            Seleccionar playlist
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSendPlaylist(false);
              }}
              className="min-h-12 w-full rounded-xl border bg-card px-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
            >
              <option value="">Sin playlist para esta sesión</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} · {playlist.tracks.length} canciones
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-3 border-b bg-secondary/35 px-4 py-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Music2 className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{selected.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {selected.tracks.length} canciones · {totalDuration(selected.totalSeconds)}
                  </span>
                </span>
                {selected.externalUrl ? (
                  <a
                    href={selected.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir playlist en Spotify"
                    className="grid size-10 shrink-0 place-items-center rounded-full border text-[oklch(0.48_0.17_145)] transition-colors hover:bg-[oklch(0.95_0.05_145)]"
                  >
                    <ExternalLink className="size-5" />
                  </a>
                ) : null}
              </div>

              {selected.tracks.length ? (
                <ul className="max-h-72 divide-y overflow-y-auto overscroll-contain">
                  {selected.tracks.map((track, index) => {
                    const Icon = index % 2 ? Play : Music2;
                    return (
                      <li
                        key={track.id}
                        className="grid min-h-16 grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
                      >
                        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" fill={index % 2 ? "currentColor" : "none"} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{track.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {track.artist || "Artista no disponible"}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {duration(track.durationSeconds)}
                        </span>
                        <Grip className="size-4 text-muted-foreground" />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-7 text-center text-sm text-muted-foreground">
                  Esta playlist todavía no tiene canciones.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed px-5 py-8 text-center">
              <Music2 className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 font-semibold">Sin playlist asignada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Puedes finalizar sin música o seleccionar una playlist para esta sesión.
              </p>
            </div>
          )}
        </section>

        <section className="mt-6" aria-labelledby="playlist-link-title">
          <h2 id="playlist-link-title" className="text-xl font-semibold tracking-[-0.025em]">
            Enlace de playlist
          </h2>
          <div className="mt-2 flex min-h-14 items-center gap-3 rounded-xl border px-4">
            <Send className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {selected?.externalUrl ? (
              <a
                href={selected.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
              >
                {selected.externalUrl}
              </a>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                {selected
                  ? "Sincroniza esta playlist con Spotify para obtener el enlace."
                  : "Selecciona una playlist para mostrar su enlace."}
              </p>
            )}
          </div>
        </section>

        <label
          className={`mt-5 flex min-h-20 items-center gap-3 rounded-2xl border px-4 ${
            canShare ? "cursor-pointer" : "cursor-not-allowed bg-secondary/35 opacity-65"
          }`}
        >
          <Share2 className="size-6 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">
              Preparar envío por WhatsApp
            </span>
            <span className="block text-xs text-muted-foreground">
              Después de cerrar la clase aparecerá el botón para compartir.
            </span>
          </span>
          <span className="relative inline-flex h-8 w-14 shrink-0">
            <input
              type="checkbox"
              name="sendPlaylist"
              checked={sendPlaylist}
              disabled={!canShare}
              onChange={(event) => setSendPlaylist(event.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-muted transition-colors peer-checked:bg-[oklch(0.69_0.16_155)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
            <span className="absolute top-1 left-1 size-6 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-6" />
          </span>
        </label>

        {!selected?.externalUrl && selected ? (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-[oklch(0.97_0.04_80)] px-3 py-2 text-xs text-[oklch(0.48_0.12_65)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            La clase puede finalizar, pero no podrá compartirse hasta sincronizar la playlist con Spotify.
          </p>
        ) : null}

        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Notas de cierre <span className="font-normal text-muted-foreground">(opcional)</span>
          <textarea
            name="notes"
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Incidencias, observaciones o acuerdos de la sesión."
            className="min-h-28 resize-y rounded-xl border bg-card px-4 py-3 font-normal outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
          />
          <span className="text-right text-xs font-normal text-muted-foreground">
            {notes.length}/500
          </span>
        </label>

        {error ? (
          <p aria-live="polite" className="mt-4 text-center text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-14 w-full rounded-xl text-base font-semibold"
        >
          Revisar y finalizar
        </Button>
      </form>

      {confirming ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-foreground/45 p-2 sm:place-items-center sm:p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-finish-title"
            className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                aria-label="Cerrar confirmación"
                className="grid size-10 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>

            <h2 id="confirm-finish-title" className="mt-4 text-2xl font-bold tracking-tight">
              ¿Finalizar esta clase?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              La asistencia quedará cerrada y la sesión se marcará como finalizada. Este cierre se registra en el historial.
            </p>

            <dl className="mt-5 divide-y rounded-2xl border px-4">
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-muted-foreground">Presentes</dt>
                <dd className="font-semibold">{presentCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-muted-foreground">Playlist</dt>
                <dd className="max-w-[60%] truncate text-right font-semibold">
                  {selected?.name ?? "Sin playlist"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-sm text-muted-foreground">WhatsApp</dt>
                <dd className="font-semibold">{sendPlaylist ? "Preparado" : "No"}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={completeClass}
                disabled={pending}
                className="min-h-13 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {pending ? "Finalizando..." : "Sí, finalizar clase"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="min-h-12 rounded-xl border px-5 font-semibold hover:bg-secondary disabled:opacity-60"
              >
                Volver a revisar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
