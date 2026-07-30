import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Clock3,
  Flame,
  House,
  Menu,
  MessageSquareMore,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { label: "Inicio", href: "/", icon: House },
  { label: "Alumnos", href: "/alumnos", icon: UsersRound },
  { label: "Asistencia", href: "/asistencia", icon: ShieldCheck },
  { label: "Mensajes", href: "/mensajes", icon: MessageSquareMore },
  { label: "Más", href: "/mas", icon: Menu },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const [{ count: studentCount }, { count: expiringCount }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("estado", "por_vencer"),
  ]);

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-6 pb-7 sm:px-8 sm:pt-12">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
              Hola, Mariana <span aria-hidden="true">👋</span>
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
            <div className="mt-1 grid grid-cols-3 gap-3">
              <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.59_0.25_295)] px-2 py-2 text-center text-[oklch(0.985_0.006_300)] ring-0 shadow-[inset_0_1px_oklch(1_0_0/0.18)]">
                <CalendarDays className="size-8" strokeWidth={2.5} />
                <p className="mt-1 text-base">Clase</p>
                <p className="text-[1.65rem] leading-none font-semibold whitespace-nowrap">
                  7:00 PM
                </p>
              </Card>

              <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.91_0.08_125)] px-2 py-2 text-center ring-0">
                <UsersRound className="size-9" fill="currentColor" strokeWidth={1.5} />
                <p className="mt-1 text-[2rem] leading-none font-bold">
                  {studentCount ?? 0}
                </p>
                <p className="text-base font-medium">alumnos</p>
              </Card>

              <Card className="h-[7.25rem] items-center justify-center gap-1 rounded-3xl border-0 bg-[oklch(0.92_0.18_110)] px-2 py-2 text-center ring-0">
                <Clock3 className="size-9" strokeWidth={2.25} />
                <p className="mt-1 text-[2rem] leading-none font-bold">
                  {expiringCount ?? 0}
                </p>
                <p className="text-base font-medium">por vencer</p>
              </Card>
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
                <UserRoundCheck className="size-9" fill="currentColor" strokeWidth={1.5} />
                <span>
                  Tomar
                  <br />
                  asistencia
                </span>
              </Link>
              <Link
                href="/alumnos"
                className="flex h-[6.75rem] flex-col items-center justify-center gap-2 rounded-3xl bg-[oklch(0.965_0.035_340)] px-4 py-2 text-center text-xl font-semibold leading-tight transition-colors hover:bg-[oklch(0.94_0.055_340)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.92_0.07_340)]"
              >
                <UsersRound className="size-9" fill="currentColor" strokeWidth={1.5} />
                <span>
                  Ver
                  <br />
                  alumnos
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
              <span className="block text-5xl leading-none font-bold">5</span>
              <span className="text-lg font-semibold">días</span>
            </p>
            <div className="col-start-2 flex items-center gap-1 text-primary" aria-label="Seis de siete clases completadas">
              {Array.from({ length: 6 }, (_, index) => (
                <Flame key={index} className="size-6" fill="currentColor" />
              ))}
              <Flame className="size-6 text-[oklch(0.78_0.015_300)]" />
            </div>
          </Card>
        </div>

        <nav
          aria-label="Navegación principal"
          className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-border/70 bg-card px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = href === "/";
            return (
              <Link
                key={label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-accent"
                }`}
              >
                <Icon
                  className="size-7"
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={2.25}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
