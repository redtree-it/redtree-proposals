import { z } from "zod";
import { PRICE_CATEGORIES, UNIT_TYPES } from "./price-book";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const PROPOSAL_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;

export const proposalCreateSchema = z
  .object({
    clientId: z.preprocess(emptyToUndefined, z.string().optional()),
    newClientName: z.preprocess(emptyToUndefined, z.string().optional()),
    title: z.string().min(1, "Title is required"),
    templateId: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine((data) => data.clientId || data.newClientName, {
    message: "Choose an existing client or enter a name for a new one",
    path: ["clientId"],
  });

export const proposalUpdateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(PROPOSAL_STATUSES),
  validUntil: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  whatWeHeard: z.preprocess(emptyToUndefined, z.string().optional()),
  recommendation: z.preprocess(emptyToUndefined, z.string().optional()),
  vatNoteOverride: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const requirementSchema = z.object({
  requirement: z.string().min(1, "Requirement is required"),
  delivery: z.string().min(1, "Delivery is required"),
});

export const proposalBlockOverrideSchema = z.object({
  title: z.string().min(1, "Title is required"),
  bodyMarkdown: z.string().min(1, "Body is required"),
});

export const pricingLineFromBookSchema = z.object({
  priceBookItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const pricingLineCustomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  unitPricePounds: z.coerce.number().min(0),
  unitType: z.enum(UNIT_TYPES),
  category: z.enum(PRICE_CATEGORIES),
  quantity: z.coerce.number().int().min(1),
  optional: z.boolean(),
});

export const pricingLineUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  unitPricePounds: z.coerce.number().min(0),
  optional: z.boolean(),
});
