import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import { createPaymentReceiptPdf } from "./payment-receipt-pdf.ts";

test("genera un comprobante PDF válido", async () => {
  const pdf = await createPaymentReceiptPdf({
    amountReceived: 1000,
    change: 350,
    endDate: "2026-09-01",
    folio: "HP-2026-1B2D58AA",
    method: "transferencia",
    planName: "Mensual",
    reference: "123456789",
    startDate: "2026-08-01",
    studentName: "Andrea Elizabeth Aquino Cordova",
    total: 650,
  });

  assert.equal(Buffer.from(pdf.subarray(0, 5)).toString(), "%PDF-");
  assert.ok(pdf.byteLength > 1_000);

  const document = await PDFDocument.load(pdf);
  const [page] = document.getPages();
  assert.deepEqual(page.getSize(), { height: 595, width: 420 });
});
