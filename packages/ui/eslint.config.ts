import { defineConfig } from "eslint/config";

import { baseConfig } from "@everylab/eslint-config/base";
import { reactConfig } from "@everylab/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
