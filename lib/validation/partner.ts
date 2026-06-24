import { z } from "zod";

export const partnerFormSchema = z
  .object({
    name: z.string().trim().min(1, "Partner name is required."),
    legalName: z.string().trim().optional(),
    website: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^https?:\/\/.+/i.test(value), {
        message: "Website must start with http:// or https://.",
      }),
    headquartersCountry: z.string().trim().optional(),
    region: z.string().trim().optional(),
    industryFocus: z.string().trim().optional(),
    status: z.enum(["draft", "active", "on_hold", "rejected"]),
    currentTierId: z.string().uuid("Tier is required."),
    allianceManagerId: z.string().uuid("Alliance manager is required."),
    executiveSponsorId: z.string().uuid().optional().or(z.literal("")),
    initialRationale: z.string().trim().optional(),
    partnerTypeIds: z.array(z.string().uuid()).min(1, "Select at least one partner type."),
    primaryPartnerTypeId: z.string().uuid("Primary partner type is required."),
  })
  .refine((data) => data.partnerTypeIds.includes(data.primaryPartnerTypeId), {
    message: "Primary partner type must be one of the selected partner types.",
    path: ["primaryPartnerTypeId"],
  });

export const requirementUpdateSchema = z.object({
  requirementId: z.string().uuid(),
  status: z.enum([
    "not_started",
    "in_progress",
    "complete",
    "blocked",
    "not_applicable",
  ]),
  notes: z.string().trim().optional(),
});
