import { z } from "zod";

const DataForSEOConfigSchema = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
  isSandbox: z.boolean().default(false),
  enableCaching: z.boolean().default(false),
  cachingDurationDays: z.number().int().positive().default(30),
  timeout: z.number().int().positive().default(60_000),
  maxRetries: z.number().int().min(0).default(3),
  rateLimitPerMinute: z.number().int().positive().default(30),
});

export type DataForSEOConfig = z.infer<typeof DataForSEOConfigSchema>;

export function createConfig(
  input: Partial<DataForSEOConfig> & Pick<DataForSEOConfig, "username" | "password">,
): DataForSEOConfig {
  const result = DataForSEOConfigSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid DataForSEO config: ${issues}`);
  }
  return result.data;
}
