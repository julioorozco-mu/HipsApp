import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import {
  ClassesClient,
  type ClassItem,
} from "@/components/features/more/classes-client";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  capacity?: number;
  duration_minutes: number;
  id: string;
  name: string;
  start_time: string;
  weekday: number;
};

const mexicoDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Mexico_City",
  year: "numeric",
});

function mexicoDate() {
  const parts = mexicoDateFormatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function ClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("classes").select("*").eq("active", true).order("start_time"),
  ]);
  if (error) throw new Error(error.message);
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");

  const classes: ClassItem[] = ((data ?? []) as ClassRow[]).map((item) => ({
    capacity: item.capacity ?? 25,
    durationMinutes: item.duration_minutes,
    id: item.id,
    name: item.name,
    startTime: item.start_time,
    weekday: item.weekday,
  }));

  return (
    <MoreShell
      title="Clases"
      menuHref="/clases/nueva"
      menuLabel="Crear nueva clase"
    >
      <ClassesClient classes={classes} today={mexicoDate()} />
      <Link
        href="/clases/nueva"
        aria-label="Nueva clase"
        className="fixed right-6 bottom-28 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl sm:right-[calc(50%-15rem)]"
      >
        <Plus className="size-7" />
      </Link>
    </MoreShell>
  );
}
