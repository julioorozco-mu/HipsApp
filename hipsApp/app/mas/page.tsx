import Link from "next/link";
import { CalendarDays, ChevronRight, MessageSquareText, Music2, Settings } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { LogoutDialog } from "@/components/features/more/logout-dialog";
import { PwaStatus } from "@/components/pwa-install-prompt";
import { createClient } from "@/lib/supabase/server";

const menuItems = [
  { href: "/clases", icon: CalendarDays, label: "Clases" },
  { href: "/playlists", icon: Music2, label: "Playlists" },
  { href: "/plantillas", icon: MessageSquareText, label: "Plantillas de mensajes" },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
] as const;

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile, error } = user
    ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  const name = profile?.full_name ?? "Usuario";
  const role = profile?.role === "admin" ? "Administrador" : "Instructora";

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex-1 px-5 pt-7 pb-7 sm:px-8 sm:pt-12">
          <h1 className="text-[2.2rem] leading-tight font-bold tracking-[-0.04em]">Más</h1>
          <Link href="/perfil" className="mt-7 grid min-h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border px-5 py-4 hover:bg-secondary">
            <span className="grid size-16 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{initials(name)}</span>
            <span className="min-w-0"><span className="block truncate text-xl font-semibold">{name}</span><span className="mt-1 block text-sm text-muted-foreground">{role}</span></span>
            <ChevronRight className="size-6" />
          </Link>
          <nav aria-label="Otras secciones" className="mt-7 divide-y overflow-hidden rounded-3xl border">
            {menuItems.map(({ href, icon: Icon, label }) => <Link key={href} href={href} className="grid min-h-17 grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3 font-semibold hover:bg-secondary"><Icon className="size-6" />{label}<ChevronRight className="size-5" /></Link>)}
          </nav>
          <div className="mt-7"><LogoutDialog /></div>
          <Link href="/instalar" className="block"><PwaStatus /></Link>
        </div>
        <AppNav active="/mas" />
      </div>
    </main>
  );
}
