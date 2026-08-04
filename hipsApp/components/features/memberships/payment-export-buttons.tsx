"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";

function triggerDownload(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  const anchor = document.createElement("a");
  anchor.href = `${url}${separator}download=${Date.now()}`;
  anchor.download = "";
  anchor.rel = "noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function PaymentExportButtons({ query }: { query: string }) {
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  function download(format: "csv" | "pdf") {
    setDownloading(format);
    triggerDownload(`/api/reports/payments.${format}?${query}`);
    window.setTimeout(() => setDownloading(null), 600);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => download("csv")}
        disabled={downloading !== null}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
      >
        <FileSpreadsheet className="size-5" />
        {downloading === "csv" ? "Descargando…" : "CSV"}
      </button>
      <button
        type="button"
        onClick={() => download("pdf")}
        disabled={downloading !== null}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        <FileText className="size-5" />
        {downloading === "pdf" ? "Descargando…" : "PDF"}
      </button>
    </div>
  );
}

export function PaymentExportIconButton({ query }: { query: string }) {
  const [downloading, setDownloading] = useState(false);

  function download() {
    setDownloading(true);
    triggerDownload(`/api/reports/payments.pdf?${query}`);
    window.setTimeout(() => setDownloading(false), 600);
  }

  return (
    <button
      type="button"
      onClick={download}
      aria-label="Descargar reporte PDF"
      disabled={downloading}
      className="grid size-12 place-items-center rounded-full text-primary hover:bg-secondary disabled:opacity-60"
    >
      <Download className="size-6" />
    </button>
  );
}
