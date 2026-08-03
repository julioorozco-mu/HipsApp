import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";

import { AppNav } from "@/components/app-nav";

export function PlaylistShell({
  backHref,
  children,
  menu = false,
  title,
}: {
  backHref?: string;
  children: React.ReactNode;
  menu?: boolean;
  title: string;
}) {
  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-5 pt-6 pb-5 sm:px-8 sm:pt-9">
          <header className="grid min-h-12 grid-cols-[3rem_1fr_3rem] items-center">
            {backHref ? (
              <Link
                href={backHref}
                aria-label="Volver"
                className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary active:bg-accent"
              >
                <ArrowLeft className="size-6" />
              </Link>
            ) : (
              <span />
            )}
            <h1 className="text-center text-2xl font-bold tracking-[-0.035em]">
              {title}
            </h1>
            {menu ? (
              <button
                type="button"
                aria-label="Más opciones"
                className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary active:bg-accent"
              >
                <MoreHorizontal className="size-6" />
              </button>
            ) : (
              <span />
            )}
          </header>
          <div className="mt-5 flex flex-1 flex-col">{children}</div>
        </div>
        <AppNav />
      </div>
    </main>
  );
}

