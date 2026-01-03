import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const geelarkEnv = createEnv({
  server: {
    GEELARK_APP_ID: z.string().min(1),
    GEELARK_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type GeeLarkEnv = typeof geelarkEnv;
