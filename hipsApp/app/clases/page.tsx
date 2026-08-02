import Link from "next/link";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { MoreShell } from "@/components/features/more/more-shell";
import { createClient } from "@/lib/supabase/server";

const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data, error } = await supabase.from("classes").select("*").eq("active", true).order("start_time");
  if (error) throw new Error(error.message);
  const classes = (data ?? []) as Array<(typeof data)[number] & { capacity?: number }>;

  return (
    <MoreShell title="Clases">
      <div className="grid gap-3">
        {classes.map((item) => (
          <article key={item.id} className="rounded-2xl border p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><CalendarDays className="size-6" /></span>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className="truncate font-bold">{item.name}</h2><span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Activa</span></div><p className="mt-2 text-sm text-muted-foreground">{days[item.weekday]}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{String(item.start_time).slice(0, 5)} · {item.duration_minutes} min</p><p className="mt-2 text-sm">Cupo máximo: {item.capacity ?? 25}</p></div>
            </div>
          </article>
        ))}
        {!classes.length ? <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Aún no hay clases activas.</p> : null}
      </div>
      <Link href="/clases/nueva" aria-label="Nueva clase" className="fixed right-6 bottom-28 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl sm:right-[calc(50%-15rem)]"><Plus className="size-7" /></Link>
    </MoreShell>
  );
}
