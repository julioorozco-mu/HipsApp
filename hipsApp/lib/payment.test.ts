import assert from "node:assert/strict";
import test from "node:test";

import { calculateChange, isPaymentMethod } from "./payment.ts";

test("calcula el cambio a partir del monto recibido", () => {
  assert.equal(calculateChange(1000, 650), 350);
  assert.equal(calculateChange(650, 650), 0);
});

test("reconoce únicamente métodos de pago permitidos", () => {
  assert.equal(isPaymentMethod("transferencia"), true);
  assert.equal(isPaymentMethod("cheque"), false);
});
