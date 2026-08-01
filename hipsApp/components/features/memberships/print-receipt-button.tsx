"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export function PrintReceiptButton({
  folio,
  paymentId,
}: {
  folio: string;
  paymentId: string;
}) {
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReceipt() {
      try {
        const response = await fetch(`/api/payments/${paymentId}/receipt`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo preparar el comprobante.");
        }

        const blob = await response.blob();
        setReceipt(
          new File([blob], `${folio}.pdf`, { type: "application/pdf" })
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage("No se pudo preparar el comprobante. Intenta de nuevo.");
      }
    }

    void loadReceipt();
    return () => controller.abort();
  }, [folio, paymentId]);

  async function shareOrDownloadReceipt() {
    if (!receipt) return;

    if (navigator.share && navigator.canShare?.({ files: [receipt] })) {
      try {
        await navigator.share({
          files: [receipt],
          title: `Comprobante ${folio}`,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const receiptUrl = URL.createObjectURL(receipt);
    const link = document.createElement("a");
    link.href = receiptUrl;
    link.download = receipt.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 1_000);
  }

  return (
    <div>
      <button
        type="button"
        disabled={!receipt}
        onClick={shareOrDownloadReceipt}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-card px-5 text-base font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
      >
        <Download className="size-5" aria-hidden="true" />
        {receipt ? "Descargar comprobante" : "Preparando comprobante…"}
      </button>
      {errorMessage ? (
        <p className="mt-2 text-center text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
