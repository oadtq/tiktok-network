import { z } from "zod";

/**
 * Environment variables schema for TikTok API
 * These are optional - the package will work without them but OAuth won't function
 */
const envSchema = z.object({
  TIKTOK_CLIENT_KEY: z.string().optional().default(""),
  TIKTOK_CLIENT_SECRET: z.string().optional().default(""),
});

/**
 * Validated environment variables for TikTok API
 */
export const tiktokEnv = envSchema.parse({
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
});

export type TikTokEnv = z.infer<typeof envSchema>;

/**
 * Check if TikTok API is configured
 */
export function isTikTokConfigured(): boolean {
  return Boolean(tiktokEnv.TIKTOK_CLIENT_KEY && tiktokEnv.TIKTOK_CLIENT_SECRET);
}
