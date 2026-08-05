"use client";

import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CircleDot,
  Clock3,
  Inbox,
  PlayCircle,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ClassNotificationStatus =
  | "scheduled"
  | "ready"
  | "started"
  | "in_progress"
  | "closing"
  | "completed"
  | "missed";

export type HomeNotification = {
  classStatus?: ClassNotificationStatus;
  description: string;
  href: string;
  id: string;
  kind: "class" | "membership" | "system";
  title: string;
};

const classStatusMeta: Record<
  ClassNotificationStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Programada",
    className: "bg-secondary text-muted-foreground",
  },
  ready: {
    label: "Lista para iniciar",
    className: "bg-primary/10 text-primary",
  },
  started: {
    label: "Inició",
    className: "bg-[oklch(0.94_0.08_280)] text-[oklch(0.45_0.18_285)]",
  },
  in_progress: {
    label: "En curso",
    className: "bg-[oklch(0.93_0.08_145)] text-[oklch(0.37_0.13_145)]",
  },
  closing: {
    label: "Pendiente de cierre",
    className: "bg-[oklch(0.96_0.09_80)] text-[oklch(0.47_0.14_70)]",
  },
  completed: {
    label: "Finalizada",
    className: "bg-[oklch(0.92_0.09_150)] text-[oklch(0.34_0.12_150)]",
  },
  missed: {
    label: "Sin asistencia",
    className: "bg-destructive/10 text-destructive",
  },
};

function storageKey(userId: string) {
  return `hipsapp:notification-reads:${userId}`;
}

function readStoredIds(userId: string) {
  try {
    const value = window.localStorage.getItem(storageKey(userId));
    const parsed = value ? JSON.parse(value) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function writeStoredIds(userId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  } catch {
    // El centro sigue funcionando durante la sesión aunque storage no esté disponible.
  }
}

function notificationIcon(item: HomeNotification) {
  if (item.kind === "membership") return UsersRound;
  if (item.kind !== "class") return Clock3;
  if (item.classStatus === "completed") return CheckCircle2;
  if (item.classStatus === "closing" || item.classStatus === "missed") {
    return AlertTriangle;
  }
  if (item.classStatus === "in_progress") return PlayCircle;
  if (item.classStatus === "started") return CircleDot;
  return CalendarClock;
}

function notificationTone(item: HomeNotification) {
  if (item.kind === "membership") {
    return "bg-[oklch(0.94_0.12_105)] text-[oklch(0.43_0.13_90)]";
  }
  if (item.kind !== "class") return "bg-secondary text-foreground";
  if (item.classStatus === "completed") {
    return "bg-[oklch(0.92_0.09_150)] text-[oklch(0.34_0.12_150)]";
  }
  if (item.classStatus === "closing" || item.classStatus === "missed") {
    return "bg-[oklch(0.96_0.09_80)] text-[oklch(0.47_0.14_70)]";
  }
  if (item.classStatus === "in_progress") {
    return "bg-[oklch(0.93_0.08_145)] text-[oklch(0.37_0.13_145)]";
  }
  return "bg-primary/10 text-primary";
}

export function NotificationCenter({
  items,
  userId,
}: {
  items: HomeNotification[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(readStoredIds(userId));
  }, [userId]);

  const unreadCount = useMemo(
    () => items.reduce((total, item) => total + (readIds.has(item.id) ? 0 : 1), 0),
    [items, readIds]
  );

  function saveReadIds(next: Set<string>) {
    setReadIds(next);
    writeStoredIds(userId, next);
  }

  function markRead(id: string) {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
  }

  function markAllRead() {
    const next = new Set(readIds);
    items.forEach((item) => next.add(item.id));
    saveReadIds(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label={
          unreadCount
            ? `Ver notificaciones, ${unreadCount} sin leer`
            : "Ver notificaciones"
        }
        onClick={() => setOpen(true)}
        className="relative grid size-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
      >
        <Bell className="size-7" strokeWidth={2.25} />
        {unreadCount ? (
          <span className="absolute top-1 right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-none font-bold text-destructive-foreground ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <DialogContent
        showCloseButton
        className="top-auto bottom-0 left-1/2 max-h-[82dvh] w-full max-w-lg -translate-x-1/2 translate-y-0 gap-0 overflow-hidden rounded-t-[2rem] rounded-b-none p-0 sm:bottom-5 sm:max-w-lg sm:rounded-[2rem] data-open:slide-in-from-bottom-8 data-closed:slide-out-to-bottom-8"
      >
        <DialogHeader className="border-b px-5 py-5 pr-14 text-left">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-2xl font-bold tracking-[-0.03em]">
              Notificaciones
            </DialogTitle>
            {unreadCount ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {unreadCount} nueva{unreadCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <DialogDescription>
            Estado de clases, cierres pendientes y avisos de membresía.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-3">
          {items.length ? (
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = notificationIcon(item);
                const unread = !readIds.has(item.id);
                const status = item.classStatus
                  ? classStatusMeta[item.classStatus]
                  : null;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => markRead(item.id)}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border px-3.5 py-3.5 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-2xl ${notificationTone(item)}`}
                    >
                      <Icon className="size-5.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold leading-snug">
                          {item.title}
                        </span>
                        {status ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    {unread ? (
                      <span
                        aria-label="Sin leer"
                        className="mt-2 size-2.5 rounded-full bg-primary"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary">
                  <Inbox className="size-8 text-muted-foreground" />
                </span>
                <p className="mt-4 text-lg font-semibold">Todo está al día</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No hay avisos pendientes por ahora.
                </p>
              </div>
            </div>
          )}
        </div>

        {items.length ? (
          <div className="border-t bg-card px-4 py-3">
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-primary transition-colors hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent"
            >
              <CheckCheck className="size-5" />
              {unreadCount ? "Marcar todo como leído" : "Todo está leído"}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
