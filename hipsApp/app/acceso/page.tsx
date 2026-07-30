import { PersonStanding } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/features/auth/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function AccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="grid min-h-dvh place-items-center bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <section className="flex min-h-[calc(100dvh-1rem)] w-full max-w-md flex-col justify-center rounded-[2.5rem] bg-card px-6 py-10 shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[44rem] sm:px-10">
        <div className="mx-auto flex items-center -space-x-2" aria-label="Hips App">
          <PersonStanding
            aria-hidden="true"
            className="size-24 -rotate-12 text-[oklch(0.58_0.27_330)]"
            strokeWidth={2.8}
          />
          <p className="font-display text-[2.35rem] leading-[0.84] font-extrabold italic tracking-[-0.08em] text-[oklch(0.31_0.18_293)]">
            Hips
            <span className="block text-[oklch(0.57_0.2_145)]">App</span>
          </p>
        </div>

        <div className="mt-5 text-center">
          <h1 className="text-3xl font-bold tracking-[-0.04em]">Bienvenido</h1>
          <p className="mt-1 text-muted-foreground">Inicia sesión para continuar</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
