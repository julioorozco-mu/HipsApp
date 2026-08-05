import {
  type PDFFont,
  PDFDocument,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { formatDateTime, formatIsoDate } from "./date.ts";
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
  paidAt: string;
  planName: string;
  reference: string | null;
  startDate: string;
  studentName: string;
  total: number;
};

const PAGE_WIDTH = 420;
const PAGE_HEIGHT = 595;
const CONTENT_X = 24;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_X * 2;

const colors = {
  background: rgb(0.98, 0.97, 0.99),
  border: rgb(0.88, 0.86, 0.91),
  dark: rgb(0.08, 0.06, 0.13),
  green: rgb(0.02, 0.58, 0.29),
  greenLight: rgb(0.91, 0.98, 0.91),
  lavender: rgb(0.95, 0.92, 1),
  muted: rgb(0.42, 0.4, 0.47),
  purple: rgb(0.45, 0.16, 0.87),
  white: rgb(1, 1, 1),
};

function fitTextSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number
) {
  let size = preferredSize;
  while (size > minimumSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function drawRightAlignedText({
  font,
  page,
  right,
  size,
  text,
  y,
}: {
  font: PDFFont;
  page: PDFPage;
  right: number;
  size: number;
  text: string;
  y: number;
}) {
  page.drawText(text, {
    x: right - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color: colors.dark,
  });
}

function drawCard(page: PDFPage, y: number, height: number, color = colors.white) {
  page.drawRectangle({
    x: CONTENT_X,
    y,
    width: CONTENT_WIDTH,
    height,
    color,
    borderColor: colors.border,
    borderWidth: 0.75,
  });
}

export async function createPaymentReceiptPdf(receipt: PaymentReceipt) {
  const document = await PDFDocument.create();
  document.setTitle(`Comprobante ${receipt.folio}`);
  document.setAuthor("HipsApp");
  document.setSubject("Comprobante de pago");

  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const [regular, bold] = await Promise.all([
    document.embedFont(StandardFonts.Helvetica),
    document.embedFont(StandardFonts.HelveticaBold),
  ]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: colors.background,
  });
  page.drawRectangle({
    x: 0,
    y: 467,
    width: PAGE_WIDTH,
    height: 128,
    color: colors.purple,
  });
  page.drawCircle({
    x: 388,
    y: 580,
    size: 58,
    color: colors.white,
    opacity: 0.08,
  });
  page.drawCircle({
    x: 350,
    y: 548,
    size: 38,
    color: rgb(0.61, 0.86, 0.15),
    opacity: 0.16,
  });

  page.drawText("HipsApp", {
    x: CONTENT_X,
    y: 548,
    size: 25,
    font: bold,
    color: colors.white,
  });
  page.drawText("COMPROBANTE DE PAGO", {
    x: CONTENT_X,
    y: 527,
    size: 8.5,
    font: bold,
    color: colors.lavender,
  });

  page.drawRectangle({
    x: 267,
    y: 542,
    width: 129,
    height: 27,
    color: colors.greenLight,
  });
  page.drawCircle({ x: 281, y: 555.5, size: 4, color: colors.green });
  page.drawText("PAGO CONFIRMADO", {
    x: 292,
    y: 551.5,
    size: 7.5,
    font: bold,
    color: colors.green,
  });

  page.drawText("FOLIO", {
    x: CONTENT_X,
    y: 491,
    size: 7.5,
    font: bold,
    color: colors.lavender,
  });
  page.drawText(receipt.folio, {
    x: CONTENT_X,
    y: 476,
    size: 12,
    font: bold,
    color: colors.white,
  });
  page.drawText("FECHA Y HORA DE EMISIÓN", {
    x: 245,
    y: 491,
    size: 7.5,
    font: bold,
    color: colors.lavender,
  });
  page.drawText(formatDateTime(receipt.paidAt), {
    x: 245,
    y: 476,
    size: 9,
    font: bold,
    color: colors.white,
  });

  drawCard(page, 350, 96);
  page.drawText("ALUMNO", {
    x: 40,
    y: 425,
    size: 7.5,
    font: bold,
    color: colors.purple,
  });
  const studentSize = fitTextSize(bold, receipt.studentName, 340, 15, 10);
  page.drawText(receipt.studentName, {
    x: 40,
    y: 404,
    size: studentSize,
    font: bold,
    color: colors.dark,
  });
  page.drawText("PLAN", {
    x: 40,
    y: 379,
    size: 6.5,
    font: bold,
    color: colors.muted,
  });
  page.drawText(receipt.planName, {
    x: 40,
    y: 361,
    size: 9,
    font: bold,
    color: colors.dark,
  });
  page.drawText("FECHA DE INICIO", {
    x: 175,
    y: 379,
    size: 6.5,
    font: bold,
    color: colors.muted,
  });
  page.drawText(formatIsoDate(receipt.startDate), {
    x: 175,
    y: 361,
    size: 8.5,
    font: regular,
    color: colors.dark,
  });
  page.drawText("FECHA DE VENCIMIENTO", {
    x: 278,
    y: 379,
    size: 6.5,
    font: bold,
    color: colors.muted,
  });
  page.drawText(formatIsoDate(receipt.endDate), {
    x: 278,
    y: 361,
    size: 8.5,
    font: regular,
    color: colors.dark,
  });

  drawCard(page, 215, 116, colors.lavender);
  page.drawText("TOTAL", {
    x: 40,
    y: 307,
    size: 8,
    font: bold,
    color: colors.purple,
  });
  page.drawText(formatCurrency(receipt.total), {
    x: 40,
    y: 276,
    size: 27,
    font: bold,
    color: colors.dark,
  });
  page.drawLine({
    start: { x: 40, y: 260 },
    end: { x: 380, y: 260 },
    thickness: 0.75,
    color: rgb(0.82, 0.76, 0.9),
  });
  page.drawText("MONTO PAGADO", {
    x: 40,
    y: 242,
    size: 7.5,
    font: bold,
    color: colors.muted,
  });
  page.drawText(formatCurrency(receipt.amountReceived), {
    x: 40,
    y: 226,
    size: 11,
    font: bold,
    color: colors.dark,
  });
  page.drawText("CAMBIO", {
    x: 380 - bold.widthOfTextAtSize("CAMBIO", 7.5),
    y: 242,
    size: 7.5,
    font: bold,
    color: colors.muted,
  });
  drawRightAlignedText({
    font: bold,
    page,
    right: 380,
    size: 11,
    text: formatCurrency(receipt.change),
    y: 226,
  });

  drawCard(page, 140, 58);
  page.drawText("MÉTODO DE PAGO", {
    x: 40,
    y: 178,
    size: 7.5,
    font: bold,
    color: colors.muted,
  });
  page.drawText(PAYMENT_METHOD_LABEL[receipt.method], {
    x: 40,
    y: 158,
    size: 11,
    font: bold,
    color: colors.dark,
  });
  if (receipt.method === "transferencia" && receipt.reference) {
    page.drawText("REFERENCIA", {
      x: 230,
      y: 178,
      size: 7.5,
      font: bold,
      color: colors.muted,
    });
    drawRightAlignedText({
      font: bold,
      page,
      right: 380,
      size: fitTextSize(bold, receipt.reference, 150, 11, 8),
      text: receipt.reference,
      y: 158,
    });
  }

  page.drawRectangle({
    x: CONTENT_X,
    y: 76,
    width: CONTENT_WIDTH,
    height: 47,
    color: colors.greenLight,
    borderColor: rgb(0.69, 0.9, 0.69),
    borderWidth: 0.75,
  });
  page.drawRectangle({
    x: CONTENT_X,
    y: 76,
    width: 5,
    height: 47,
    color: colors.green,
  });
  page.drawCircle({
    x: 52,
    y: 99.5,
    size: 10,
    color: colors.green,
  });
  page.drawLine({
    start: { x: 47.5, y: 99.5 },
    end: { x: 51, y: 96 },
    thickness: 1.5,
    color: colors.white,
  });
  page.drawLine({
    start: { x: 51, y: 96 },
    end: { x: 57.5, y: 103.5 },
    thickness: 1.5,
    color: colors.white,
  });
  page.drawText("ESTATUS", {
    x: 72,
    y: 104,
    size: 7,
    font: bold,
    color: colors.green,
  });
  page.drawText("Membresía activa", {
    x: 72,
    y: 87,
    size: 11,
    font: bold,
    color: colors.dark,
  });

  page.drawText("Comprobante generado por HipsApp", {
    x: CONTENT_X,
    y: 36,
    size: 8,
    font: regular,
    color: colors.muted,
  });
  drawRightAlignedText({
    font: regular,
    page,
    right: PAGE_WIDTH - CONTENT_X,
    size: 8,
    text: receipt.folio,
    y: 36,
  });

  return document.save();
}
