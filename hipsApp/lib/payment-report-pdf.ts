import {
  type PDFFont,
  PDFDocument,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { formatCurrency, PAYMENT_METHOD_LABEL } from "@/lib/payment";
import type {
  PaymentReportFilters,
  PaymentReportRow,
} from "@/lib/payment-report";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 24;

const colors = {
  background: rgb(0.985, 0.98, 0.995),
  border: rgb(0.86, 0.84, 0.9),
  dark: rgb(0.08, 0.06, 0.13),
  lavender: rgb(0.95, 0.92, 1),
  muted: rgb(0.42, 0.4, 0.47),
  purple: rgb(0.45, 0.16, 0.87),
  white: rgb(1, 1, 1),
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Mexico_City",
});

const generatedAtFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/Mexico_City",
});

function fitText(font: PDFFont, text: string, width: number, size: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let value = text;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > width) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size = 9,
  color = colors.dark
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawPageHeader(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  pageNumber: number
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 74,
    width: PAGE_WIDTH,
    height: 74,
    color: colors.purple,
  });
  drawText(page, bold, "HipsApp", MARGIN, PAGE_HEIGHT - 34, 23, colors.white);
  drawText(
    page,
    bold,
    "REPORTE DE PAGOS",
    MARGIN,
    PAGE_HEIGHT - 54,
    9,
    colors.lavender
  );
  drawText(
    page,
    regular,
    `Página ${pageNumber}`,
    PAGE_WIDTH - MARGIN - 52,
    PAGE_HEIGHT - 43,
    8,
    colors.white
  );
}

function drawTableHeader(page: PDFPage, bold: PDFFont, y: number) {
  page.drawRectangle({
    x: MARGIN,
    y: y - 5,
    width: CONTENT_WIDTH,
    height: 25,
    color: colors.lavender,
    borderColor: colors.border,
    borderWidth: 0.7,
  });

  const columns = [
    ["Fecha", 0, 105],
    ["Alumno", 105, 155],
    ["Plan", 260, 80],
    ["Método", 340, 85],
    ["Importe", 425, 75],
    ["Referencia", 500, 105],
    ["Registrado por", 605, 181],
  ] as const;

  for (const [label, offset] of columns) {
    drawText(page, bold, label, MARGIN + offset + 6, y + 3, 7.5, colors.purple);
  }
}

function drawReportRow(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  row: PaymentReportRow,
  y: number,
  shaded: boolean
) {
  page.drawRectangle({
    x: MARGIN,
    y: y - 5,
    width: CONTENT_WIDTH,
    height: ROW_HEIGHT,
    color: shaded ? colors.background : colors.white,
    borderColor: colors.border,
    borderWidth: 0.35,
  });

  const values = [
    [dateTimeFormatter.format(new Date(row.paidAt)), 0, 105, regular],
    [row.studentName, 105, 155, bold],
    [row.planName, 260, 80, regular],
    [PAYMENT_METHOD_LABEL[row.method], 340, 85, regular],
    [formatCurrency(row.amount), 425, 75, bold],
    [row.reference ?? "—", 500, 105, regular],
    [row.recordedBy, 605, 181, regular],
  ] as const;

  for (const [value, offset, width, font] of values) {
    drawText(
      page,
      font,
      fitText(font, value, width - 12, 7.5),
      MARGIN + offset + 6,
      y + 2,
      7.5,
      colors.dark
    );
  }
}

export async function createPaymentReportPdf({
  filters,
  report,
}: {
  filters: PaymentReportFilters;
  report: {
    average: number;
    count: number;
    rows: PaymentReportRow[];
    total: number;
  };
}) {
  const document = await PDFDocument.create();
  document.setTitle(`Reporte de pagos ${filters.from} a ${filters.to}`);
  document.setAuthor("HipsApp");
  document.setSubject("Reporte financiero de pagos");

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let pageNumber = 0;
  let page: PDFPage;
  let y = 0;

  const addPage = (firstPage: boolean) => {
    pageNumber += 1;
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: colors.background,
    });
    drawPageHeader(page, bold, regular, pageNumber);

    if (firstPage) {
      drawText(
        page,
        regular,
        `Periodo: ${filters.from} a ${filters.to} · Generado: ${generatedAtFormatter.format(new Date())}`,
        MARGIN,
        493,
        9,
        colors.muted
      );

      const cards = [
        ["INGRESOS", formatCurrency(report.total)],
        ["PAGOS", String(report.count)],
        ["PROMEDIO", formatCurrency(report.average)],
      ] as const;
      cards.forEach(([label, value], index) => {
        const x = MARGIN + index * 184;
        page.drawRectangle({
          x,
          y: 438,
          width: 168,
          height: 42,
          color: index === 0 ? colors.purple : colors.white,
          borderColor: colors.border,
          borderWidth: 0.7,
        });
        drawText(
          page,
          bold,
          label,
          x + 12,
          464,
          7,
          index === 0 ? colors.lavender : colors.muted
        );
        drawText(
          page,
          bold,
          value,
          x + 12,
          446,
          15,
          index === 0 ? colors.white : colors.dark
        );
      });
      y = 400;
    } else {
      y = 492;
    }

    drawTableHeader(page, bold, y);
    y -= ROW_HEIGHT;
  };

  addPage(true);

  if (!report.rows.length) {
    drawText(
      page!,
      bold,
      "No hay pagos para los filtros seleccionados.",
      MARGIN + 12,
      y - 14,
      11,
      colors.muted
    );
  } else {
    report.rows.forEach((row, index) => {
      if (y < 46) addPage(false);
      drawReportRow(page!, regular, bold, row, y, index % 2 === 1);
      y -= ROW_HEIGHT;
    });
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    drawText(
      currentPage,
      regular,
      `HipsApp · Reporte de pagos · Página ${index + 1} de ${pages.length}`,
      MARGIN,
      19,
      7.5,
      colors.muted
    );
  });

  return document.save();
}
