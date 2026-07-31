import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  LogOut,
  MessageSquareText,
  Music2,
  Settings,
} from "lucide-react";

import { logout } from "@/app/actions/auth";
import { AppNav } from "@/components/app-nav";
import { PwaStatus } from "@/components/pwa-install-prompt";
import { createClient } from "@/lib/supabase/server";

const menuItems = [
  { href: "/clases", icon: CalendarDays, label: "Clases" },
  { href: "/playlists", icon: Music2, label: "Playlists" },
  {
    href: "/plantillas",
    icon: MessageSquareText,
    label: "Plantillas de mensajes",
  },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile, error } = user
    ? await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  if (error) {
    throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  }

  const name = profile?.full_name ?? "Usuario";
  const role = profile?.role === "admin" ? "Administrador" : "Instructora";

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-7 pb-7 sm:px-8 sm:pt-12">
          <h1 className="text-[2.2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
            Más
          </h1>

          <Link
            href="/configuracion"
            className="mt-7 grid min-h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-border px-5 py-4 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
          >
            <span
              aria-hidden="true"
              className="grid size-16 place-items-center rounded-full bg-[oklch(0.64_0.18_150)] text-lg font-bold text-[oklch(0.985_0.006_150)]"
            >
              {initials(name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-semibold">
                {name}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {role}
              </span>
            </span>
            <ChevronRight className="size-6" />
          </Link>

          <nav
            aria-label="Otras secciones"
            className="mt-7 divide-y divide-border overflow-hidden rounded-3xl border border-border"
          >
            {menuItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="grid min-h-17 grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 text-base font-semibold transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary active:bg-accent"
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <form action={logout} className="mt-7">
            <button
              type="submit"
              className="grid min-h-17 w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl border border-border px-5 py-3 text-left text-base font-semibold text-[oklch(0.55_0.22_340)] transition-colors hover:bg-[oklch(0.97_0.025_340)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.94_0.045_340)]"
            >
              <LogOut className="size-6" aria-hidden="true" />
              Cerrar sesión
              <ChevronRight className="size-5 text-foreground" aria-hidden="true" />
            </button>
          </form>

          <PwaStatus />
        </div>

        <AppNav active="/mas" />
      </div>
    </main>
  );
}
