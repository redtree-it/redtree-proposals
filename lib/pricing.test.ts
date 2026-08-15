import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, lineTotalPence } from "./pricing";

test("lineTotalPence multiplies unit price by quantity", () => {
  assert.equal(lineTotalPence({ unitPricePence: 350, quantity: 12, category: "CORE", optional: false }), 4200);
});

test("computeTotals sums core included lines into coreIncludedPence", () => {
  const totals = computeTotals([
    { unitPricePence: 3500, quantity: 1, category: "CORE", optional: false },
    { unitPricePence: 600, quantity: 2, category: "CORE", optional: false },
  ]);
  assert.equal(totals.coreIncludedPence, 4700);
  assert.equal(totals.coreOptionalPence, 0);
  assert.equal(totals.phase2Pence, 0);
});

test("computeTotals keeps optional core lines out of coreIncludedPence", () => {
  const totals = computeTotals([
    { unitPricePence: 3500, quantity: 1, category: "CORE", optional: false },
    { unitPricePence: 1000, quantity: 1, category: "CORE", optional: true },
  ]);
  assert.equal(totals.coreIncludedPence, 3500);
  assert.equal(totals.coreOptionalPence, 1000);
});

test("computeTotals keeps phase 2 lines separate from core, regardless of optional flag", () => {
  const totals = computeTotals([
    { unitPricePence: 941, quantity: 2, category: "PHASE_2", optional: true },
    { unitPricePence: 653, quantity: 12, category: "PHASE_2", optional: false },
  ]);
  assert.equal(totals.coreIncludedPence, 0);
  assert.equal(totals.coreOptionalPence, 0);
  assert.equal(totals.phase2Pence, 941 * 2 + 653 * 12);
});

test("computeTotals handles an empty line list", () => {
  const totals = computeTotals([]);
  assert.deepEqual(totals, { coreIncludedPence: 0, coreOptionalPence: 0, phase2Pence: 0 });
});

test("computeTotals stays exact at the pence boundary (no float drift)", () => {
  // 3 lines of 33p x 1 should sum to exactly 99p, not 98.99999999999999
  const totals = computeTotals([
    { unitPricePence: 33, quantity: 1, category: "CORE", optional: false },
    { unitPricePence: 33, quantity: 1, category: "CORE", optional: false },
    { unitPricePence: 33, quantity: 1, category: "CORE", optional: false },
  ]);
  assert.equal(totals.coreIncludedPence, 99);
  assert.ok(Number.isInteger(totals.coreIncludedPence));
});
