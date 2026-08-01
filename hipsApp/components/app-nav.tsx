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
    <>
      <div
        aria-hidden="true"
        className="h-[calc(5.25rem+env(safe-area-inset-bottom))] shrink-0"
      />
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-2 left-1/2 z-50 grid w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 grid-cols-5 rounded-b-[2.5rem] border-t border-border/70 bg-card px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:bottom-5 sm:w-[calc(100%-2.5rem)]"
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
    </>
  );
}
