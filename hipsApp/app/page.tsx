import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Clock3,
  Flame,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Card } from "@/components/ui/card";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const classTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

function greetingName(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/).slice(0, 2).join(" ") ?? "";
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const results = user
    ? await Promise.all([
        supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("student_overview")
          .select("*", { count: "exact", head: true })
          .eq("membership_status", "por_vencer"),
        supabase
          .from("session_overview")
          .select("class_name, starts_at")
          .in("status", ["programada", "en_curso"])
          .order("starts_at")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, current_class_streak, role")
          .eq("id", user.id)
          .maybeSingle(),
      ])
    : null;
  const studentCount = results?.[0].count ?? 0;
  const expiringCount = results?.[1].count ?? 0;
  const nextSession = results?.[2].data ?? null;
  const profile = results?.[3].data ?? null;
  const role = normalizeRole(profile?.role);
  const isSuperadmin = role === "superadmin";
  const classStreak = profile?.current_class_streak ?? 0;
  const nextClassTime = nextSession?.starts_at
    ? classTimeFormatter.format(new Date(nextSession.starts_at))
    : null;
  const peopleHref = isSuperadmin ? "/usuarios" : "/alumnos";
  const peopleLabel = isSuperadmin ? "usuarios" : "alumnos";
  const displayName = greetingName(profile?.full_name);

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-6 pb-7 sm:px-8 sm:pt-12">
          <header className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-[clamp(1.7rem,8vw,2.25rem)] leading-tight font-bold tracking-[-0.04em]">
              Hola{displayName ? `, ${displayName}` : ""}{" "}
              <span aria-hidden="true">👋</span>
            </h1>
            <button
              type="button"
              aria-label="Ver notificaciones"
              className="grid size-12 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <Bell className="size-7" strokeWidth={2.25} />
            </button>
          </header>

          <section className="mt-1 sm:mt-3" aria-labelledby="resumen">
            <h2
              id="resumen"
              className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]"
            >
              Resumen de hoy
            </h2>
            <div className="mt-1 grid grid-cols-3 gap-2.5 sm:gap-3">
              <Card className="min-w-0 h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.59_0.25_295)] px-1.5 py-2 text-center text-[oklch(0.985_0.006_300)] ring-0 shadow-[inset_0_1px_oklch(1_0_0/0.18)] sm:px-2">
                <CalendarDays className="size-8 shrink-0" strokeWidth={2.5} />
                <p className="mt-1 max-w-full truncate px-1 text-sm sm:text-base">
                  {nextSession?.class_name ?? "Sin clase"}
                </p>
                <p className="max-w-full truncate text-[clamp(1.05rem,5.2vw,1.65rem)] leading-none font-semibold tracking-[-0.04em]">
                  {nextClassTime ?? "—"}
                </p>
              </Card>

              <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.91_0.08_125)] px-2 py-2 text-center ring-0">
                <UsersRound className="size-9" strokeWidth={2.35} />
                <p className="mt-1 text-[2rem] leading-none font-bold">
                  {studentCount}
                </p>
                <p className="text-sm font-medium sm:text-base">alumnos</p>
              </Card>

              <Link
                href="/membresias"
                aria-label={`${expiringCount} membresías por vencer`}
                className="rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.92_0.18_110)] px-2 py-2 text-center ring-0 transition-colors hover:bg-[oklch(0.89_0.19_110)]">
                  <Clock3 className="size-9" strokeWidth={2.25} />
                  <p className="mt-1 text-[2rem] leading-none font-bold">
                    {expiringCount}
                  </p>
                  <p className="text-sm font-medium sm:text-base">por vencer</p>
                </Card>
              </Link>
            </div>
          </section>

          <section className="mt-3" aria-labelledby="acciones">
            <h2
              id="acciones"
              className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.75rem]"
            >
              Acciones rápidas
            </h2>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Link
                href="/asistencia"
                className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.965_0.035_295)] px-4 py-2 text-center text-xl font-semibold leading-tight transition-colors hover:bg-[oklch(0.94_0.055_295)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.92_0.07_295)]"
              >
                <UserRoundCheck className="size-10" strokeWidth={2.35} />
                <span>
                  Tomar
                  <br />
                  asistencia
                </span>
              </Link>
              <Link
                href={peopleHref}
                className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.965_0.035_340)] px-4 py-2 text-center text-xl font-semibold leading-tight transition-colors hover:bg-[oklch(0.94_0.055_340)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.92_0.07_340)]"
              >
                <UsersRound className="size-10" strokeWidth={2.35} />
                <span>
                  Ver
                  <br />
                  {peopleLabel}
                </span>
              </Link>
            </div>
          </section>

          <Card className="mt-4 grid min-h-[7.25rem] grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 rounded-3xl border-0 bg-[oklch(0.965_0.035_340)] pr-4 pl-2 py-4 ring-0">
            <Flame
              aria-hidden="true"
              className="row-span-2 size-10 text-primary"
              fill="currentColor"
            />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Racha de clases</h2>
              <p className="text-lg font-semibold text-primary">¡Sigue así!</p>
            </div>
            <p className="row-span-2 text-center">
              <span className="block text-5xl leading-none font-bold">
                {classStreak}
              </span>
              <span className="text-lg font-semibold">clases</span>
            </p>
            <div
              className="col-start-2 flex items-center gap-1 text-primary"
              aria-label={`${classStreak} clases consecutivas`}
            >
              {Array.from({ length: 7 }, (_, index) => (
                <Flame
                  key={index}
                  className={`size-6 ${
                    index < Math.min(classStreak, 7)
                      ? "text-primary"
                      : "text-[oklch(0.78_0.015_300)]"
                  }`}
                  fill="currentColor"
                />
              ))}
            </div>
          </Card>
        </div>

        <AppNav active="/" />
      </div>
    </main>
  );
}
