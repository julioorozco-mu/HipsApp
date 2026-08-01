import { Plus } from "lucide-react";
import Link from "next/link";

export function AddStudentLink() {
  return (
    <Link
      href="/alumnos/nuevo"
      aria-label="Registrar alumno"
      className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75"
    >
      <Plus className="size-7" aria-hidden="true" />
    </Link>
  );
}
