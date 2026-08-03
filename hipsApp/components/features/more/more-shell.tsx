import Link from "next/link";
import { ArrowLeft, Ellipsis } from "lucide-react";

import { AppNav } from "@/components/app-nav";

export function MoreShell({
  title,
  backHref = "/mas",
  children,
  menuHref,
  menuLabel = "Más opciones",
}: {
  title: string;
  backHref?: string;
  children: React.ReactNode;
  menuHref?: string;
  menuLabel?: string;
}) {
  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center px-5 pt-7 sm:px-8 sm:pt-10">
          <Link
            href={backHref}
            aria-label="Volver"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-center text-2xl font-bold tracking-[-0.03em]">{title}</h1>
          {menuHref ? (
            <Link
              href={menuHref}
              aria-label={menuLabel}
              className="grid size-11 place-items-center rounded-full hover:bg-secondary"
            >
              <Ellipsis className="size-6" />
            </Link>
          ) : <span />}
        </header>
        <div className="flex flex-1 flex-col px-5 pt-6 pb-4 sm:px-8">{children}</div>
        <AppNav />
      </div>
    </main>
  );
}

