import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export interface StorageEnv {
  S3_ENDPOINT?: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET: string;
  AWS_REGION: string;
  S3_PUBLIC_URL?: string;
}

export function getStorageEnv(): StorageEnv {
  return createEnv({
    server: {
      S3_ENDPOINT: z.string().url().optional(),
      AWS_ACCESS_KEY_ID: z.string().min(1),
      AWS_SECRET_ACCESS_KEY: z.string().min(1),
      AWS_S3_BUCKET: z.string().min(1),
      AWS_REGION: z.string().default("us-east-1"),
      S3_PUBLIC_URL: z.string().url().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  }) as StorageEnv;
}
