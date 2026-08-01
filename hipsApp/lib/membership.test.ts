import assert from "node:assert/strict";
import test from "node:test";

import { getMembershipExpirationDate } from "./membership.ts";

test("la mensualidad vence un mes calendario después", () => {
  assert.equal(
    getMembershipExpirationDate("2026-08-01", "mensual"),
    "2026-09-01"
  );
  assert.equal(
    getMembershipExpirationDate("2026-01-31", "mensual"),
    "2026-02-28"
  );
});

test("la clase suelta vence en su fecha de inicio", () => {
  assert.equal(
    getMembershipExpirationDate("2026-08-01", "clase_suelta"),
    "2026-08-01"
  );
});
