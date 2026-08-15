import { z } from "zod";

export const UNIT_TYPES = ["PER_USER", "PER_DEVICE", "FIXED"] as const;
export const UNIT_TYPE_LABELS: Record<(typeof UNIT_TYPES)[number], string> = {
  PER_USER: "Per user",
  PER_DEVICE: "Per device",
  FIXED: "Fixed",
};

export const PRICE_CATEGORIES = ["CORE", "PHASE_2"] as const;
export const PRICE_CATEGORY_LABELS: Record<(typeof PRICE_CATEGORIES)[number], string> = {
  CORE: "Core",
  PHASE_2: "Additional services (phase 2)",
};

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const priceBookItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  unitPricePounds: z.coerce.number().min(0),
  unitType: z.enum(UNIT_TYPES),
  category: z.enum(PRICE_CATEGORIES),
  defaultIncluded: z.boolean(),
});

export type PriceBookItemInput = z.infer<typeof priceBookItemSchema>;

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function penceToPoundsString(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
