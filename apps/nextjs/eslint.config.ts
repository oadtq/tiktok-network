import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@everylab/eslint-config/base";
import { nextjsConfig } from "@everylab/eslint-config/nextjs";
import { reactConfig } from "@everylab/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
