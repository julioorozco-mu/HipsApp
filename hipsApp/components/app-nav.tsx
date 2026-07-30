import Link from "next/link";
import {
  House,
  Menu,
  MessageSquareMore,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const items = [
  { label: "Inicio", href: "/", icon: House },
  { label: "Alumnos", href: "/alumnos", icon: UsersRound },
  { label: "Asistencia", href: "/asistencia", icon: ShieldCheck },
  { label: "Mensajes", href: "/mensajes", icon: MessageSquareMore },
  { label: "Más", href: "/mas", icon: Menu },
] as const;

export function AppNav({ active }: { active: (typeof items)[number]["href"] }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-border/70 bg-card px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]"
    >
      {items.map(({ label, href, icon: Icon }) => {
        const isActive = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:text-xs ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-accent"
            }`}
          >
            <Icon
              className="size-5 sm:size-6"
              fill={isActive ? "currentColor" : "none"}
              strokeWidth={2.25}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
