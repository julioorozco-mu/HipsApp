import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { PaymentSettingsForm } from "@/components/features/memberships/payment-settings-form";
import { TransferAccountsManager } from "@/components/features/memberships/transfer-accounts-manager";
import {
  parsePaymentSettings,
  parseTransferAccounts,
} from "@/lib/payment-settings";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [profileResult, settingsResult, accountsResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("academy_settings").select("*").eq("id", true).maybeSingle(),
    supabase.rpc("list_transfer_accounts" as never),
  ]);

  if (normalizeRole(profileResult.data?.role) !== "superadmin") {
    redirect("/membresias/registrar");
  }
  const loadError = settingsResult.error ?? accountsResult.error;
  if (loadError) {
    throw new Error(`No se pudo cargar la configuración: ${loadError.message}`);
  }

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center px-5 pt-7 sm:px-8 sm:pt-10">
          <Link
            href="/membresias/registrar"
            aria-label="Volver a registrar pago"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-center text-2xl font-bold tracking-[-0.03em]">
            Configurar pagos
          </h1>
          <span className="grid size-11 place-items-center text-primary" aria-hidden="true">
            <Settings2 className="size-6" />
          </span>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-6 pb-5 sm:px-8">
          <PaymentSettingsForm settings={parsePaymentSettings(settingsResult.data)} />
          <TransferAccountsManager accounts={parseTransferAccounts(accountsResult.data)} />
        </div>
        <AppNav />
      </div>
    </main>
  );
}
