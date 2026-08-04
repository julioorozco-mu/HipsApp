"use server";

import { revalidatePath } from "next/cache";

import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type PaymentSettingsState = {
  error: string | null;
  success: boolean;
};

export type TransferAccountState = PaymentSettingsState;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function digits(formData: FormData, name: string) {
  return text(formData, name).replace(/\D/g, "");
}

function price(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) ? value : Number.NaN;
}

async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para continuar.", supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (normalizeRole(profile?.role) !== "superadmin") {
    return {
      error: "Solo el Superadmin puede cambiar la configuración de pagos.",
      supabase: null,
    };
  }

  return { error: null, supabase };
}

function settingsError(message: string) {
  if (message.includes("superadmin required")) {
    return "Solo el Superadmin puede cambiar la configuración de pagos.";
  }
  if (message.includes("invalid monthly price")) return "Revisa el costo del plan mensual.";
  if (message.includes("invalid single class price")) return "Revisa el costo de la clase suelta.";
  if (message.includes("invalid account label")) return "Ingresa un nombre para identificar la cuenta.";
  if (message.includes("invalid bank")) return "Ingresa el nombre del banco.";
  if (message.includes("invalid holder")) return "Ingresa el nombre del titular.";
  if (message.includes("invalid card")) return "La tarjeta debe tener entre 16 y 19 dígitos.";
  if (message.includes("invalid clabe")) return "La CLABE debe tener exactamente 18 dígitos.";
  if (message.includes("transfer destination required")) {
    return "Ingresa una tarjeta, una CLABE o ambas.";
  }
  if (message.includes("transfer account not found")) return "La cuenta bancaria ya no existe.";
  return "No se pudo guardar la configuración de pagos.";
}

export async function savePaymentSettings(
  _state: PaymentSettingsState,
  formData: FormData
): Promise<PaymentSettingsState> {
  const monthlyPrice = price(formData, "monthly_price");
  const singleClassPrice = price(formData, "single_class_price");

  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
    return { error: "Revisa el costo del plan mensual.", success: false };
  }
  if (!Number.isFinite(singleClassPrice) || singleClassPrice < 0) {
    return { error: "Revisa el costo de la clase suelta.", success: false };
  }

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error, success: false };

  const { error } = await auth.supabase.rpc("save_payment_settings" as never, {
    p_monthly_price: monthlyPrice,
    p_single_class_price: singleClassPrice,
  } as never);

  if (error) return { error: settingsError(error.message), success: false };

  revalidatePaymentPaths();
  return { error: null, success: true };
}

export async function saveTransferAccount(
  _state: TransferAccountState,
  formData: FormData
): Promise<TransferAccountState> {
  const id = text(formData, "account_id") || null;
  const label = text(formData, "label");
  const bank = text(formData, "bank");
  const holder = text(formData, "holder");
  const card = digits(formData, "card") || null;
  const clabe = digits(formData, "clabe") || null;

  if (!label || label.length > 80) {
    return { error: "Ingresa un nombre para identificar la cuenta.", success: false };
  }
  if (!bank || bank.length > 100) {
    return { error: "Ingresa el nombre del banco.", success: false };
  }
  if (!holder || holder.length > 150) {
    return { error: "Ingresa el nombre del titular.", success: false };
  }
  if (card && !/^\d{16,19}$/.test(card)) {
    return { error: "La tarjeta debe tener entre 16 y 19 dígitos.", success: false };
  }
  if (clabe && !/^\d{18}$/.test(clabe)) {
    return { error: "La CLABE debe tener exactamente 18 dígitos.", success: false };
  }
  if (!card && !clabe) {
    return { error: "Ingresa una tarjeta, una CLABE o ambas.", success: false };
  }

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error, success: false };

  const { error } = await auth.supabase.rpc("upsert_transfer_account" as never, {
    p_bank: bank,
    p_card: card,
    p_clabe: clabe,
    p_holder: holder,
    p_id: id,
    p_label: label,
  } as never);

  if (error) return { error: settingsError(error.message), success: false };

  revalidatePaymentPaths();
  return { error: null, success: true };
}

export async function deleteTransferAccount(
  _state: TransferAccountState,
  formData: FormData
): Promise<TransferAccountState> {
  const id = text(formData, "account_id");
  if (!id) return { error: "No se pudo identificar la cuenta.", success: false };

  const auth = await requireSuperadmin();
  if (!auth.supabase) return { error: auth.error, success: false };

  const { error } = await auth.supabase.rpc("delete_transfer_account" as never, {
    p_id: id,
  } as never);

  if (error) return { error: settingsError(error.message), success: false };

  revalidatePaymentPaths();
  return { error: null, success: true };
}

function revalidatePaymentPaths() {
  revalidatePath("/membresias");
  revalidatePath("/membresias/registrar");
  revalidatePath("/membresias/configuracion");
  revalidatePath("/reportes/pagos");
}
