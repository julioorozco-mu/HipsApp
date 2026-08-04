"use server";

import { revalidatePath } from "next/cache";

import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type PaymentSettingsState = {
  error: string | null;
  success: boolean;
};

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

function settingsError(message: string) {
  if (message.includes("superadmin required")) {
    return "Solo el Superadmin puede cambiar la configuración de pagos.";
  }
  if (message.includes("invalid monthly price")) return "Revisa el costo del plan mensual.";
  if (message.includes("invalid single class price")) return "Revisa el costo de la clase suelta.";
  if (message.includes("invalid bank")) return "Ingresa el nombre del banco.";
  if (message.includes("invalid holder")) return "Ingresa el nombre del titular.";
  if (message.includes("invalid card")) return "La tarjeta debe tener entre 16 y 19 dígitos.";
  if (message.includes("invalid clabe")) return "La CLABE debe tener exactamente 18 dígitos.";
  return "No se pudo guardar la configuración de pagos.";
}

export async function savePaymentSettings(
  _state: PaymentSettingsState,
  formData: FormData
): Promise<PaymentSettingsState> {
  const monthlyPrice = price(formData, "monthly_price");
  const singleClassPrice = price(formData, "single_class_price");
  const bank = text(formData, "bank");
  const holder = text(formData, "holder");
  const card = digits(formData, "card");
  const clabe = digits(formData, "clabe");

  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
    return { error: "Revisa el costo del plan mensual.", success: false };
  }
  if (!Number.isFinite(singleClassPrice) || singleClassPrice < 0) {
    return { error: "Revisa el costo de la clase suelta.", success: false };
  }
  if (!bank || bank.length > 100) {
    return { error: "Ingresa el nombre del banco.", success: false };
  }
  if (!holder || holder.length > 150) {
    return { error: "Ingresa el nombre del titular.", success: false };
  }
  if (!/^\d{16,19}$/.test(card)) {
    return { error: "La tarjeta debe tener entre 16 y 19 dígitos.", success: false };
  }
  if (!/^\d{18}$/.test(clabe)) {
    return { error: "La CLABE debe tener exactamente 18 dígitos.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para continuar.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (normalizeRole(profile?.role) !== "superadmin") {
    return {
      error: "Solo el Superadmin puede cambiar la configuración de pagos.",
      success: false,
    };
  }

  const { error } = await supabase.rpc("save_payment_settings" as never, {
    p_bank: bank,
    p_card: card,
    p_clabe: clabe,
    p_holder: holder,
    p_monthly_price: monthlyPrice,
    p_single_class_price: singleClassPrice,
  } as never);

  if (error) return { error: settingsError(error.message), success: false };

  revalidatePath("/membresias");
  revalidatePath("/membresias/registrar");
  revalidatePath("/membresias/configuracion");
  revalidatePath("/reportes/pagos");

  return { error: null, success: true };
}
