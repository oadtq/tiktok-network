/**
 * TikTok OAuth Router
 *
 * Handles TikTok OAuth 2.0 flow for account authentication
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@everylab/db";
import { clip, clipStats, tiktokAccount } from "@everylab/db/schema";
import {
  createTikTokClient,
  isTikTokConfigured,
  tiktokEnv,
} from "@everylab/tiktok";

import { adminProcedure } from "../trpc";

// Create TikTok client if configured
function getTikTokClient() {
  if (!isTikTokConfigured()) {
    throw new Error(
      "TikTok API is not configured. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables.",
    );
  }
  return createTikTokClient({
    clientKey: tiktokEnv.TIKTOK_CLIENT_KEY,
    clientSecret: tiktokEnv.TIKTOK_CLIENT_SECRET,
  });
}

export const tiktokOAuthRouter = {
  /**
   * Check if TikTok OAuth is configured
   */
  isConfigured: adminProcedure.query(() => {
    return {
      configured: isTikTokConfigured(),
    };
  }),

  /**
   * Get OAuth authorization URL
   * Admin will be redirected to TikTok to authorize the app
   */
  getAuthorizationUrl: adminProcedure
    .input(
      z.object({
        redirectUri: z.string().url(),
        state: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = getTikTokClient();

      // Generate a random state if not provided
      const state = input.state ?? Math.random().toString(36).substring(2, 15);

      const { url: authUrl, codeVerifier } = await client.getAuthorizationUrl(
        input.redirectUri,
        state,
      );

      console.log("[TikTok OAuth] Generated auth URL, state:", state);

      return {
        authUrl,
        state,
        codeVerifier,
      };
    }),

  /**
   * Exchange authorization code for tokens and save account
   */
  exchangeCode: adminProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string().url(),
        codeVerifier: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      console.log("[TikTok OAuth] Exchanging code for token...");

      // Exchange code for token
      const tokenData = await client.exchangeCodeForToken(
        input.code,
        input.redirectUri,
        input.codeVerifier,
      );

      console.log("[TikTok OAuth] Token received, openId:", tokenData.openId);

      // Get user info from TikTok
      const userInfo = await client.getUserInfo(tokenData.accessToken);

      console.log("[TikTok OAuth] User info received:", userInfo.display_name);

      // Check if account already exists
      const existingAccount = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.tiktokUserId, tokenData.openId),
      });

      if (existingAccount) {
        // Update existing account with new tokens
        console.log(
          "[TikTok OAuth] Updating existing account:",
          existingAccount.id,
        );

        const [updatedAccount] = await ctx.db
          .update(tiktokAccount)
          .set({
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt: tokenData.expiresAt,
            name: userInfo.display_name,
            followerCount: userInfo.follower_count ?? 0,
            isActive: true,
          })
          .where(eq(tiktokAccount.id, existingAccount.id))
          .returning();

        return {
          account: updatedAccount,
          isNew: false,
        };
      }

      // Create new account
      console.log(
        "[TikTok OAuth] Creating new account for:",
        userInfo.display_name,
      );

      const [newAccount] = await ctx.db
        .insert(tiktokAccount)
        .values({
          name: userInfo.display_name,
          tiktokUsername: userInfo.display_name
            .replace(/\s+/g, "_")
            .toLowerCase(),
          tiktokUserId: tokenData.openId,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          followerCount: userInfo.follower_count ?? 0,
          isActive: true,
        })
        .returning();

      console.log("[TikTok OAuth] New account created:", newAccount?.id);

      return {
        account: newAccount,
        isNew: true,
      };
    }),

  /**
   * Refresh an account's access token
   */
  refreshToken: adminProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      if (!account.refreshToken) {
        throw new Error("Account has no refresh token");
      }

      console.log("[TikTok OAuth] Refreshing token for account:", account.id);

      const newTokenData = await client.refreshAccessToken(
        account.refreshToken,
      );

      const [updatedAccount] = await ctx.db
        .update(tiktokAccount)
        .set({
          accessToken: newTokenData.accessToken,
          refreshToken: newTokenData.refreshToken,
          tokenExpiresAt: newTokenData.expiresAt,
        })
        .where(eq(tiktokAccount.id, input.accountId))
        .returning();

      console.log("[TikTok OAuth] Token refreshed for account:", account.id);

      return updatedAccount;
    }),

  /**
   * Disconnect a TikTok account (revoke token)
   */
  disconnect: adminProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      // Revoke the token if it exists
      if (account.accessToken) {
        try {
          await client.revokeToken(account.accessToken);
          console.log("[TikTok OAuth] Token revoked for account:", account.id);
        } catch (error) {
          console.error("[TikTok OAuth] Failed to revoke token:", error);
          // Continue even if revocation fails
        }
      }

      // Clear tokens and mark as inactive
      const [updatedAccount] = await ctx.db
        .update(tiktokAccount)
        .set({
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isActive: false,
        })
        .where(eq(tiktokAccount.id, input.accountId))
        .returning();

      return updatedAccount;
    }),

  /**
   * Sync account info from TikTok API
   */
  syncAccountInfo: adminProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      if (!account.accessToken) {
        throw new Error("Account is not connected");
      }

      console.log("[TikTok OAuth] Syncing account info:", account.id);

      // Check if token needs refresh
      if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date()) {
        if (!account.refreshToken) {
          throw new Error("Token expired and no refresh token available");
        }

        const newTokenData = await client.refreshAccessToken(
          account.refreshToken,
        );

        await ctx.db
          .update(tiktokAccount)
          .set({
            accessToken: newTokenData.accessToken,
            refreshToken: newTokenData.refreshToken,
            tokenExpiresAt: newTokenData.expiresAt,
          })
          .where(eq(tiktokAccount.id, input.accountId));

        // Use the new access token
        const userInfo = await client.getUserInfo(newTokenData.accessToken);

        const [updatedAccount] = await ctx.db
          .update(tiktokAccount)
          .set({
            name: userInfo.display_name,
            followerCount: userInfo.follower_count ?? 0,
          })
          .where(eq(tiktokAccount.id, input.accountId))
          .returning();

        return updatedAccount;
      }

      // Token is still valid
      const userInfo = await client.getUserInfo(account.accessToken);

      const [updatedAccount] = await ctx.db
        .update(tiktokAccount)
        .set({
          name: userInfo.display_name,
          followerCount: userInfo.follower_count ?? 0,
        })
        .where(eq(tiktokAccount.id, input.accountId))
        .returning();

      console.log("[TikTok OAuth] Account info synced:", account.id);

      // Sync videos
      try {
        console.log("[TikTok OAuth] Syncing videos for account:", account.id);
        const videoData = await client.getVideoList(account.accessToken);

        console.log(`[TikTok OAuth] Found ${videoData.videos.length} videos`);

        for (const video of videoData.videos) {
          // Check if clip exists
          const existingClip = await ctx.db.query.clip.findFirst({
            where: eq(clip.tiktokVideoId, video.id),
          });

          let clipId = existingClip?.id;

          if (existingClip) {
            // Update existing clip
            await ctx.db
              .update(clip)
              .set({
                title:
                  video.title ?? video.video_description ?? "Untitled TikTok",
                description: video.video_description,
                thumbnailUrl: video.cover_image_url,
                tiktokVideoUrl: video.share_url,
                publishedAt: new Date(video.create_time * 1000),
                status: "published",
                updatedAt: new Date(),
              })
              .where(eq(clip.id, existingClip.id));
          } else {
            // Create new clip
            // Note: Assigning to the current user (admin) as owner for now
            // since we don't know which creator this belongs to
            const [newClip] = await ctx.db
              .insert(clip)
              .values({
                userId: ctx.session.user.id,
                tiktokAccountId: account.id,
                title:
                  video.title ?? video.video_description ?? "Untitled TikTok",
                description: video.video_description,
                videoUrl: video.share_url ?? "", // We don't have the raw video URL, using share URL as placeholder
                thumbnailUrl: video.cover_image_url,
                tiktokVideoId: video.id,
                tiktokVideoUrl: video.share_url,
                durationSeconds: video.duration,
                publishedAt: new Date(video.create_time * 1000),
                status: "published",
              })
              .returning();

            clipId = newClip?.id;
          }

          if (clipId) {
            // Add stats
            await ctx.db.insert(clipStats).values({
              clipId,
              views: video.view_count ?? 0,
              likes: video.like_count ?? 0,
              comments: video.comment_count ?? 0,
              shares: video.share_count ?? 0,
            });
          }
        }

        console.log("[TikTok OAuth] Videos synced successfully");
      } catch (error) {
        console.error("[TikTok OAuth] Failed to sync videos:", error);
        // Don't fail the whole request if video sync fails
      }

      return updatedAccount;
    }),
} satisfies TRPCRouterRecord;
