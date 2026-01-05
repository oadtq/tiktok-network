import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { campaignRouter } from "./router/campaign";
import { clipRouter } from "./router/clip";
import { cloudPhoneRouter } from "./router/cloudphone";
import { tiktokAccountRouter } from "./router/tiktok-account";
import { tiktokOAuthRouter } from "./router/tiktok-oauth";
import { tiktokStatsRouter } from "./router/tiktok-stats";
import { uploadRouter } from "./router/upload";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  // Authentication
  auth: authRouter,

  // Creator features
  clip: clipRouter,
  upload: uploadRouter,

  // Admin features
  admin: adminRouter,
  campaign: campaignRouter,
  cloudPhone: cloudPhoneRouter,
  tiktokAccount: tiktokAccountRouter,
  tiktokOAuth: tiktokOAuthRouter,
  tiktokStats: tiktokStatsRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
