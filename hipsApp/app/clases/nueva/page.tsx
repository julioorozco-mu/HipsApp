import { createClass } from "@/app/actions/more";
import { ClassForm } from "@/components/features/more/class-form";
import { MoreShell } from "@/components/features/more/more-shell";

export default function NewClassPage() {
  return (
    <MoreShell title="Nueva clase" backHref="/clases">
      <ClassForm action={createClass} submitLabel="Guardar clase" />
    </MoreShell>
  );
}
