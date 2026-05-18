import { z } from "zod";

export const addBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(200, "Brand name is too long"),
  websiteUrl: z
    .string()
    .min(1, "Website URL is required")
    .url("Please enter a valid URL")
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
});

export type AddBrandFormValues = z.infer<typeof addBrandSchema>;
