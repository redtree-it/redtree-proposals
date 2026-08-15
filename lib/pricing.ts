export interface PricingLineLike {
  unitPricePence: number;
  quantity: number;
  category: "CORE" | "PHASE_2";
  optional: boolean;
}

export function lineTotalPence(line: PricingLineLike): number {
  return line.unitPricePence * line.quantity;
}

export interface ProposalTotals {
  coreIncludedPence: number;
  coreOptionalPence: number;
  phase2Pence: number;
}

// Core included lines are the standing monthly total; core lines marked
// optional are shown but not summed into it (the client hasn't committed to
// them yet); phase 2 lines are always kept separate, never folded into core.
export function computeTotals(lines: PricingLineLike[]): ProposalTotals {
  let coreIncludedPence = 0;
  let coreOptionalPence = 0;
  let phase2Pence = 0;

  for (const line of lines) {
    const total = lineTotalPence(line);
    if (line.category === "PHASE_2") {
      phase2Pence += total;
    } else if (line.optional) {
      coreOptionalPence += total;
    } else {
      coreIncludedPence += total;
    }
  }

  return { coreIncludedPence, coreOptionalPence, phase2Pence };
}
