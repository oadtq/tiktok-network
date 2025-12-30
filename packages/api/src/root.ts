import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { campaignRouter } from "./router/campaign";
import { clipRouter } from "./router/clip";
import { tiktokAccountRouter } from "./router/tiktok-account";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  // Authentication
  auth: authRouter,

  // Creator features
  clip: clipRouter,

  // Admin features
  admin: adminRouter,
  campaign: campaignRouter,
  tiktokAccount: tiktokAccountRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
