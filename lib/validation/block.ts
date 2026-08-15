import { z } from "zod";

export const BLOCK_CATEGORIES = [
  "INTRODUCTION",
  "EXPERIENCE",
  "VALUES",
  "EXPERTISE",
  "ONBOARDING",
  "TESTIMONIALS",
  "LEGAL",
  "NEXT_STEPS",
  "OTHER",
] as const;

export const CATEGORY_LABELS: Record<(typeof BLOCK_CATEGORIES)[number], string> = {
  INTRODUCTION: "Introduction",
  EXPERIENCE: "Experience",
  VALUES: "Values",
  EXPERTISE: "Expertise",
  ONBOARDING: "Onboarding",
  TESTIMONIALS: "Testimonials",
  LEGAL: "Legal",
  NEXT_STEPS: "Next Steps",
  OTHER: "Other",
};

export const blockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(BLOCK_CATEGORIES),
  bodyMarkdown: z.string().min(1, "Body is required"),
});

export type BlockInput = z.infer<typeof blockSchema>;
