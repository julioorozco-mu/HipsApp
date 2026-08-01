import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatIsoDate } from "./date.ts";
import {
  formatCurrency,
  type PaymentMethod,
  PAYMENT_METHOD_LABEL,
} from "./payment.ts";

export type PaymentReceipt = {
  amountReceived: number;
  change: number;
  endDate: string;
  folio: string;
  method: PaymentMethod;
  planName: string;
  reference: string | null;
  startDate: string;
  studentName: string;
  total: number;
};

export async function createPaymentReceiptPdf(receipt: PaymentReceipt) {
  const document = await PDFDocument.create();
  document.setTitle(`Comprobante ${receipt.folio}`);
  document.setAuthor("HipsApp");
  document.setSubject("Comprobante de pago");

  const page = document.addPage([595.28, 841.89]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const purple = rgb(0.45, 0.16, 0.87);
  const dark = rgb(0.08, 0.06, 0.13);
  const muted = rgb(0.42, 0.4, 0.47);
  const green = rgb(0.04, 0.58, 0.28);

  page.drawRectangle({ x: 0, y: 809, width: 595.28, height: 32.89, color: purple });
  page.drawText("HipsApp", { x: 48, y: 755, size: 28, font: bold, color: purple });
  page.drawText("COMPROBANTE DE PAGO", {
    x: 48,
    y: 722,
    size: 12,
    font: bold,
    color: muted,
  });
  page.drawText(receipt.folio, {
    x: 547 - bold.widthOfTextAtSize(receipt.folio, 12),
    y: 722,
    size: 12,
    font: bold,
    color: dark,
  });

  page.drawLine({
    start: { x: 48, y: 700 },
    end: { x: 547, y: 700 },
    thickness: 1,
    color: rgb(0.88, 0.86, 0.91),
  });

  const rows: Array<[string, string]> = [
    ["Alumno", receipt.studentName],
    ["Plan", receipt.planName],
    [
      "Periodo",
      `${formatIsoDate(receipt.startDate)} - ${formatIsoDate(receipt.endDate)}`,
    ],
    ["Método de pago", PAYMENT_METHOD_LABEL[receipt.method]],
  ];
  if (receipt.method === "transferencia" && receipt.reference) {
    rows.push(["Referencia", receipt.reference]);
  }

  let y = 660;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 48, y, size: 11, font: regular, color: muted });
    const valueSize = value.length > 38 ? 9 : 11;
    page.drawText(value, {
      x: 547 - bold.widthOfTextAtSize(value, valueSize),
      y,
      size: valueSize,
      font: bold,
      color: dark,
    });
    y -= 34;
  }

  page.drawLine({
    start: { x: 48, y: y + 8 },
    end: { x: 547, y: y + 8 },
    thickness: 1,
    color: rgb(0.88, 0.86, 0.91),
  });

  const totals: Array<[string, string, boolean]> = [
    ["Total", formatCurrency(receipt.total), true],
    ["Monto pagado", formatCurrency(receipt.amountReceived), false],
    ["Cambio", formatCurrency(receipt.change), false],
  ];
  y -= 28;
  for (const [label, value, emphasized] of totals) {
    const font = emphasized ? bold : regular;
    const size = emphasized ? 16 : 12;
    page.drawText(label, { x: 48, y, size, font, color: dark });
    page.drawText(value, {
      x: 547 - bold.widthOfTextAtSize(value, size),
      y,
      size,
      font: bold,
      color: dark,
    });
    y -= 38;
  }

  page.drawRectangle({
    x: 48,
    y: y - 4,
    width: 499,
    height: 48,
    color: rgb(0.91, 0.98, 0.9),
    borderColor: rgb(0.72, 0.91, 0.61),
    borderWidth: 1,
  });
  page.drawText("Pago confirmado - Membresía activa", {
    x: 64,
    y: y + 13,
    size: 12,
    font: bold,
    color: green,
  });

  page.drawText("Comprobante generado por HipsApp", {
    x: 48,
    y: 52,
    size: 9,
    font: regular,
    color: muted,
  });

  return document.save();
}
