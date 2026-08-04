export type TransferDetails = {
  bank: string;
  card: string;
  clabe: string;
  holder: string;
};

export type PaymentSettings = TransferDetails & {
  monthlyPrice: number;
  singleClassPrice: number;
  updatedAt: string | null;
};

type RawPaymentSettings = {
  monthly_plan_price?: number | string | null;
  payment_settings_updated_at?: string | null;
  single_class_price?: number | string | null;
  transfer_bank?: string | null;
  transfer_card?: string | null;
  transfer_clabe?: string | null;
  transfer_holder?: string | null;
};

export function parsePaymentSettings(row: unknown): PaymentSettings {
  const settings = (row ?? {}) as RawPaymentSettings;

  return {
    bank: settings.transfer_bank?.trim() ?? "",
    card: settings.transfer_card?.replace(/\D/g, "") ?? "",
    clabe: settings.transfer_clabe?.replace(/\D/g, "") ?? "",
    holder: settings.transfer_holder?.trim() ?? "",
    monthlyPrice: Number(settings.monthly_plan_price ?? 0),
    singleClassPrice: Number(settings.single_class_price ?? 0),
    updatedAt: settings.payment_settings_updated_at ?? null,
  };
}

export function transferMessage(details: TransferDetails) {
  return [
    "Datos para transferencia HipsApp",
    `Banco: ${details.bank}`,
    `Titular: ${details.holder}`,
    `Tarjeta: ${details.card}`,
    `CLABE interbancaria: ${details.clabe}`,
  ].join("\n");
}
