import { createClass } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";
import { MoreShell } from "@/components/features/more/more-shell";

const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function NewClassPage() {
  return (
    <MoreShell title="Nueva clase" backHref="/clases">
      <ActionForm action={createClass} label="Guardar clase">
        <label className="grid gap-2 text-sm font-semibold">Nombre de la clase<input className={fieldClass} name="name" placeholder="Zumba 9:00 AM" required /></label>
        <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">Días</legend><div className="grid grid-cols-2 gap-2">{days.map((day, index) => <label key={day} className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm"><input type="checkbox" name="weekday" value={index} />{day}</label>)}</div></fieldset>
        <label className="grid gap-2 text-sm font-semibold">Hora<input className={fieldClass} name="start_time" type="time" defaultValue="09:00" required /></label>
        <label className="grid gap-2 text-sm font-semibold">Duración<select className={fieldClass} name="duration_minutes" defaultValue="60"><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label>
        <label className="grid gap-2 text-sm font-semibold">Cupo máximo<input className={fieldClass} name="capacity" type="number" min="1" max="500" defaultValue="25" required /></label>
      </ActionForm>
    </MoreShell>
  );
}
