import { notFound, redirect } from "next/navigation";

import { updateClass } from "@/app/actions/more";
import { ClassForm } from "@/components/features/more/class-form";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

function endTime(start: string, duration: number) {
  const [hour, minute] = start.slice(0, 5).split(":").map(Number);
  const total = hour * 60 + minute + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type ClassRow = {
  capacity?: number;
  duration_minutes: number;
  id: string;
  name: string;
  start_time: string;
  weekday: number;
};

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("classes").select("*").eq("id", id).eq("active", true).maybeSingle(),
  ]);
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");
  if (!data) notFound();

  const item = data as ClassRow;
  const action = updateClass.bind(null, id);

  return (
    <MoreShell title="Editar clase" backHref="/clases">
      <ClassForm
        action={action}
        defaultCapacity={item.capacity ?? 25}
        defaultIntervals={[
          {
            start: item.start_time.slice(0, 5),
            end: endTime(item.start_time, item.duration_minutes),
          },
        ]}
        defaultName={item.name}
        defaultWeekdays={[item.weekday]}
        multipleIntervals={false}
        multipleWeekdays={false}
        submitLabel="Guardar cambios"
      />
    </MoreShell>
  );
}
