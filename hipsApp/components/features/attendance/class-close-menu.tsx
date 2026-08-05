"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  UserX,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { closeClassManually } from "@/app/actions/classes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

const reasons = [
  {
    icon: UserX,
    label: "No asistieron alumnos",
    value: "No asistieron alumnos.",
  },
  {
    icon: AlertTriangle,
    label: "Instructor indispuesto",
    value: "La clase no se impartió porque el instructor estuvo indispuesto.",
  },
  {
    icon: Clock3,
    label: "Problema de instalaciones o servicio",
    value: "La clase no se impartió por un problema de instalaciones o servicio.",
  },
  {
    icon: MoreHorizontal,
    label: "Otro motivo",
    value: "other",
  },
] as const;

export function ClassCloseMenu({
  className,
  disabled,
  endsAt,
  sessionId,
  startsAt,
}: {
  className: string | null;
  disabled: boolean;
  endsAt: string | null;
  sessionId: string | null;
  startsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const finalReason = useMemo(() => {
    const base = selectedReason === "other" ? details.trim() : selectedReason;
    if (!base) return "";
    if (selectedReason !== "other" && details.trim()) {
      return `${base} ${details.trim()}`.slice(0, 300);
    }
    return base.slice(0, 300);
  }, [details, selectedReason]);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setError("");
    setSelectedReason("");
    setDetails("");
  }

  function submitClose() {
    if (!sessionId || finalReason.length < 5) {
      setError("Selecciona un motivo o describe por qué se cerrará la clase.");
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const result = await closeClassManually(sessionId, finalReason);
        if (!result.success) {
          setError(result.error ?? "No se pudo cerrar la clase.");
          return;
        }
        window.location.assign(`/asistencia?session=${sessionId}&closed=manual`);
      } catch {
        setError("No se pudo completar el cierre. Recarga la pantalla e inténtalo de nuevo.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <button
        type="button"
        aria-label="Opciones de la clase"
        disabled={disabled || !sessionId}
        onClick={() => setOpen(true)}
        className="grid size-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
      >
        <MoreHorizontal className="size-7" strokeWidth={2.5} />
      </button>

      <DialogContent
        showCloseButton
        className="top-auto bottom-0 left-1/2 max-h-[88dvh] w-full max-w-lg -translate-x-1/2 translate-y-0 overflow-y-auto rounded-t-[2rem] rounded-b-none p-0 sm:bottom-5 sm:rounded-[2rem] data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8"
      >
        <DialogHeader className="border-b px-5 py-5 pr-14 text-left">
          <DialogTitle className="text-2xl font-bold tracking-[-0.03em]">
            Cerrar clase manualmente
          </DialogTitle>
          <DialogDescription>
            Úsalo cuando la clase no se impartirá o deba terminar antes de su horario.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5">
          <section className="rounded-2xl bg-secondary/55 px-4 py-4">
            <p className="truncate font-bold">{className ?? "Clase seleccionada"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {startsAt && endsAt
                ? `${timeFormatter.format(new Date(startsAt))} – ${timeFormatter.format(new Date(endsAt))}`
                : "Horario no disponible"}
            </p>
          </section>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[oklch(0.82_0.12_70)] bg-[oklch(0.97_0.05_75)] px-4 py-3 text-[oklch(0.43_0.13_60)]">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Este cierre es definitivo</p>
              <p className="mt-1 text-xs leading-relaxed">
                La asistencia quedará bloqueada. Si no hay asistencia guardada, la clase no sumará a la racha.
              </p>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Motivo del cierre</legend>
            <div className="mt-2 grid gap-2">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                const selected = selectedReason === reason.value;
                return (
                  <button
                    key={reason.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedReason(reason.value);
                      setError("");
                    }}
                    className={cn(
                      "flex min-h-13 items-center gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      selected
                        ? "border-primary bg-primary/8 text-primary"
                        : "bg-card hover:bg-secondary"
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1 text-sm font-semibold">{reason.label}</span>
                    {selected ? <CheckCircle2 className="size-5" /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-4 grid gap-2 text-sm font-semibold">
            {selectedReason === "other" ? "Describe el motivo" : "Detalles adicionales (opcional)"}
            <textarea
              value={details}
              onChange={(event) => {
                setDetails(event.target.value.slice(0, 300));
                setError("");
              }}
              rows={3}
              placeholder={
                selectedReason === "other"
                  ? "Ej. falla eléctrica, lluvia intensa, cierre del local..."
                  : "Agrega información útil para el historial."
              }
              className="min-h-24 resize-none rounded-xl border bg-card px-3 py-3 font-normal outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
            />
            <span className="text-right text-xs font-normal text-muted-foreground">
              {details.length}/300
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-5 grid gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={pending || finalReason.length < 5}
              onClick={submitClose}
              className="min-h-14 rounded-xl text-base font-semibold"
            >
              {pending ? "Cerrando..." : "Cerrar clase ahora"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={closeDialog}
              className="min-h-12 rounded-xl"
            >
              Mantener clase abierta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
