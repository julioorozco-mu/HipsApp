import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  Info,
  LoaderCircle,
  MessageSquareMore,
  MoreHorizontal,
  Pause,
} from "lucide-react";

import { setMessageQueueState } from "@/app/actions/messages";
import { AppNav } from "@/components/app-nav";
import { QueueActionButton } from "@/components/features/messages/queue-action-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mexico_City",
});

type MessageStatus = "pendiente" | "enviado" | "fallido" | "cancelado";

const statusStyles: Record<
  MessageStatus,
  { label: string; text: string; icon: typeof CircleCheckBig }
> = {
  enviado: {
    icon: CircleCheckBig,
    label: "Enviado",
    text: "text-[oklch(0.5_0.16_150)]",
  },
  pendiente: {
    icon: Clock3,
    label: "En espera",
    text: "text-[oklch(0.65_0.16_110)]",
  },
  fallido: {
    icon: CircleAlert,
    label: "Falló",
    text: "text-[oklch(0.55_0.22_340)]",
  },
  cancelado: {
    icon: CircleAlert,
    label: "Cancelado",
    text: "text-muted-foreground",
  },
};

function estimatedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [batchesResult, settingsResult] = user
    ? await Promise.all([
        supabase
          .from("message_batches")
          .select(
            "id, template_id, status, min_delay_seconds, max_delay_seconds, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("academy_settings")
          .select("whatsapp_min_delay_seconds, whatsapp_max_delay_seconds")
          .eq("id", true)
          .maybeSingle(),
      ])
    : [
        { data: [], error: null },
        { data: null, error: null },
      ];

  if (batchesResult.error || settingsResult.error) {
    throw new Error(
      `No se pudo cargar la cola: ${
        batchesResult.error?.message ?? settingsResult.error?.message
      }`
    );
  }

  const batches = batchesResult.data ?? [];
  const batchIds = batches.map(({ id }) => id);
  const templateIds = batches.flatMap(({ template_id }) =>
    template_id ? [template_id] : []
  );
  const [recipientsResult, templatesResult] = await Promise.all([
    batchIds.length
      ? supabase
          .from("message_recipients")
          .select(
            "id, batch_id, student_id, status, scheduled_at, sent_at, error"
          )
          .in("batch_id", batchIds)
          .limit(60)
      : Promise.resolve({ data: [], error: null }),
    templateIds.length
      ? supabase
          .from("message_templates")
          .select("id, name")
          .in("id", templateIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (recipientsResult.error || templatesResult.error) {
    throw new Error(
      `No se pudo cargar el historial: ${
        recipientsResult.error?.message ?? templatesResult.error?.message
      }`
    );
  }

  const recipients = recipientsResult.data ?? [];
  const studentIds = recipients.flatMap(({ student_id }) =>
    student_id ? [student_id] : []
  );
  const { data: students, error: studentsError } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, nombre")
        .in("id", studentIds)
    : { data: [], error: null };

  if (studentsError) {
    throw new Error(`No se pudieron cargar los alumnos: ${studentsError.message}`);
  }

  const templateNames = new Map(
    (templatesResult.data ?? []).map((template) => [template.id, template.name])
  );
  const studentNames = new Map(
    (students ?? []).map((student) => [student.id, student.nombre])
  );
  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
  const activeBatch =
    batches.find(({ status }) =>
      ["pendiente", "procesando", "pausado"].includes(status)
    ) ?? null;
  const activeRecipients = activeBatch
    ? recipients.filter(({ batch_id }) => batch_id === activeBatch.id)
    : [];
  const sent = activeRecipients.filter(({ status }) => status === "enviado").length;
  const total = activeRecipients.length;
  const progress = total ? Math.round((sent / total) * 100) : 0;
  const averageDelay = activeBatch
    ? Math.round(
        (activeBatch.min_delay_seconds + activeBatch.max_delay_seconds) / 2
      )
    : 0;
  const remainingSeconds = Math.max(total - sent, 0) * averageDelay;
  const queueStatus = activeBatch?.status;
  const history = recipients
    .toSorted((a, b) => {
      const first = a.sent_at ?? a.scheduled_at ?? batchMap.get(a.batch_id)?.created_at;
      const second = b.sent_at ?? b.scheduled_at ?? batchMap.get(b.batch_id)?.created_at;
      return new Date(second ?? 0).getTime() - new Date(first ?? 0).getTime();
    })
    .slice(0, 12);
  const minDelay =
    activeBatch?.min_delay_seconds ??
    settingsResult.data?.whatsapp_min_delay_seconds ??
    3;
  const maxDelay =
    activeBatch?.max_delay_seconds ??
    settingsResult.data?.whatsapp_max_delay_seconds ??
    8;

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-6 pb-7 sm:px-8 sm:pt-10">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href="/"
              aria-label="Volver al inicio"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" />
            </Link>
            <h1 className="text-center text-[1.45rem] leading-tight font-bold tracking-[-0.04em] whitespace-nowrap sm:text-4xl">
              Cola de WhatsApp
            </h1>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <MoreHorizontal className="size-7" />
            </button>
          </header>

          <section
            aria-live="polite"
            className="mt-6 rounded-3xl bg-[oklch(0.95_0.035_300)] px-5 py-5"
          >
            <div className="flex items-center gap-4">
              {queueStatus === "procesando" ? (
                <LoaderCircle className="size-11 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
              ) : queueStatus === "pausado" ? (
                <Pause className="size-11 shrink-0 text-primary" fill="currentColor" />
              ) : queueStatus === "pendiente" ? (
                <Clock3 className="size-11 shrink-0 text-primary" />
              ) : (
                <CircleCheckBig className="size-11 shrink-0 text-[oklch(0.5_0.16_150)]" />
              )}
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {queueStatus === "procesando"
                    ? `Procesando ${sent} de ${total}`
                    : queueStatus === "pausado"
                      ? `Envíos pausados · ${sent} de ${total}`
                      : queueStatus === "pendiente"
                        ? `${total} mensajes preparados`
                        : "Cola al día"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeBatch
                    ? `Tiempo estimado: ${estimatedTime(remainingSeconds)}`
                    : "No hay mensajes pendientes"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-11 text-right text-sm font-semibold text-primary">
                {progress}%
              </span>
            </div>
          </section>

          <section className="mt-7" aria-labelledby="queue-history">
            <h2
              id="queue-history"
              className="text-2xl font-semibold tracking-[-0.03em]"
            >
              Mensajes en cola
            </h2>
            {history.length ? (
              <ul className="mt-3 space-y-2">
                {history.map((recipient) => {
                  const batch = batchMap.get(recipient.batch_id);
                  const status = statusStyles[recipient.status as MessageStatus];
                  const StatusIcon = status.icon;
                  const timestamp =
                    recipient.sent_at ??
                    recipient.scheduled_at ??
                    batch?.created_at;

                  return (
                    <li
                      key={recipient.id}
                      className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border px-4 py-3"
                    >
                      <StatusIcon
                        className={cn("size-8", status.text)}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold">
                          {batch?.template_id
                            ? templateNames.get(batch.template_id) ??
                              "Mensaje de WhatsApp"
                            : "Playlist de clase"}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {recipient.student_id
                            ? studentNames.get(recipient.student_id) ??
                              "Alumno"
                            : "Destinatario"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={cn("block text-sm font-semibold", status.text)}>
                          {status.label}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {timestamp ? timeFormatter.format(new Date(timestamp)) : "—"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-border px-6 py-9 text-center">
                <MessageSquareMore className="mx-auto size-9 text-muted-foreground" />
                <p className="mt-3 font-semibold">Aún no hay mensajes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los recordatorios y playlists aparecerán aquí.
                </p>
              </div>
            )}
          </section>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="flex min-h-20 items-center justify-between rounded-2xl bg-[oklch(0.95_0.035_300)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Intervalo automático</p>
                <p className="mt-1 text-lg font-bold text-primary">
                  {minDelay}–{maxDelay} s
                </p>
              </div>
              <Info className="size-5 text-primary" />
            </div>
            {activeBatch &&
            ["procesando", "pausado"].includes(activeBatch.status) ? (
              <form action={setMessageQueueState}>
                <input name="batchId" type="hidden" value={activeBatch.id} />
                <input
                  name="nextStatus"
                  type="hidden"
                  value={
                    activeBatch.status === "pausado" ? "procesando" : "pausado"
                  }
                />
                <QueueActionButton paused={activeBatch.status === "pausado"} />
              </form>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="min-h-20 rounded-2xl text-base font-semibold"
              >
                <Pause className="size-6" fill="currentColor" />
                Pausar
              </Button>
            )}
          </div>
        </div>

        <AppNav active="/mensajes" />
      </div>
    </main>
  );
}
