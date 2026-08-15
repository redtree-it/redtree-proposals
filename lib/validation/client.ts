import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  sector: z.preprocess(emptyToUndefined, z.string().optional()),
  userCount: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  deviceCount: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type ClientInput = z.infer<typeof clientSchema>;
