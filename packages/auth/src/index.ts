import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "@everylab/db/client";

export function initAuth<TExtraPlugins extends BetterAuthPlugin[] = []>(options: {
  baseUrl: string;
  secret: string | undefined;
  // Google OAuth for TikTok creators
  googleClientId?: string;
  googleClientSecret?: string;
  extraPlugins?: TExtraPlugins;
  trustedOrigins?: string[];
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      // Admin plugin for role-based access
      admin({
        defaultRole: "creator",
      }),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: {
      ...(options.googleClientId && options.googleClientSecret
        ? {
            google: {
              clientId: options.googleClientId,
              clientSecret: options.googleClientSecret,
            },
          }
        : {}),
    },
    emailAndPassword: {
      enabled: true,
    },
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
    trustedOrigins: options.trustedOrigins,
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
