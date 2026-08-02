import { Plus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AddStudentLink({ className }: { className?: string }) {
  return (
    <Link
      href="/alumnos/nuevo"
      aria-label="Registrar alumno"
      className={cn(
        "fixed right-6 bottom-28 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75 sm:right-[calc(50%-15rem)]",
        className
      )}
    >
      <Plus className="size-7" aria-hidden="true" />
    </Link>
  );
}
