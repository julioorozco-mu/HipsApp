export type TransferAccount = {
  bank: string;
  card: string | null;
  clabe: string | null;
  holder: string;
  id: string;
  label: string;
  sortOrder: number;
};

export type PaymentSettings = {
  monthlyPrice: number;
  singleClassPrice: number;
  updatedAt: string | null;
};

type RawPaymentSettings = {
  monthly_plan_price?: number | string | null;
  payment_settings_updated_at?: string | null;
  single_class_price?: number | string | null;
};

type RawTransferAccount = {
  bank?: string | null;
  card?: string | null;
  clabe?: string | null;
  holder?: string | null;
  id?: string | null;
  label?: string | null;
  sort_order?: number | null;
};

export function parsePaymentSettings(row: unknown): PaymentSettings {
  const settings = (row ?? {}) as RawPaymentSettings;

  return {
    monthlyPrice: Number(settings.monthly_plan_price ?? 0),
    singleClassPrice: Number(settings.single_class_price ?? 0),
    updatedAt: settings.payment_settings_updated_at ?? null,
  };
}

export function parseTransferAccounts(rows: unknown): TransferAccount[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    const account = (row ?? {}) as RawTransferAccount;
    if (!account.id || !account.bank || !account.holder || !account.label) return [];

    return [{
      bank: account.bank.trim(),
      card: account.card?.replace(/\D/g, "") || null,
      clabe: account.clabe?.replace(/\D/g, "") || null,
      holder: account.holder.trim(),
      id: account.id,
      label: account.label.trim(),
      sortOrder: account.sort_order ?? 0,
    }];
  });
}

export function transferMessage(account: TransferAccount) {
  return [
    `Datos para transferencia · ${account.label}`,
    `Banco: ${account.bank}`,
    `Titular: ${account.holder}`,
    account.card ? `Tarjeta: ${account.card}` : null,
    account.clabe ? `CLABE interbancaria: ${account.clabe}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
