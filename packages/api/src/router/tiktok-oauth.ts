/**
 * TikTok OAuth Router
 *
 * Handles TikTok OAuth 2.0 flow for account authentication
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@everylab/db";
import {
  clip,
  clipStats,
  tiktokAccount,
  userTiktokAccount,
} from "@everylab/db/schema";
import {
  createTikTokClient,
  isTikTokConfigured,
  tiktokEnv,
} from "@everylab/tiktok";

import { adminProcedure, protectedProcedure } from "../trpc";

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

      const generatedUsername = userInfo.display_name
        .replace(/\s+/g, "_")
        .toLowerCase();

      // Check if account already exists by OpenID
      let existingAccount = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.tiktokUserId, tokenData.openId),
      });

      // If not found by OpenID, check by username (to handle manual -> oauth upgrade)
      if (!existingAccount) {
        existingAccount = await ctx.db.query.tiktokAccount.findFirst({
          where: eq(tiktokAccount.tiktokUsername, generatedUsername),
        });
      }

      if (existingAccount) {
        // Update existing account with new tokens
        console.log(
          "[TikTok OAuth] Updating existing account:",
          existingAccount.id,
        );

        const [updatedAccount] = await ctx.db
          .update(tiktokAccount)
          .set({
            tiktokUserId: tokenData.openId, // Update to OpenID
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
          tiktokUsername: generatedUsername,
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

  // =========================================
  // CREATOR-FACING ENDPOINTS
  // =========================================

  /**
   * Check if TikTok OAuth is configured (for creators)
   */
  creatorIsConfigured: protectedProcedure.query(() => {
    return {
      configured: isTikTokConfigured(),
    };
  }),

  /**
   * Get OAuth authorization URL for creators
   */
  creatorGetAuthorizationUrl: protectedProcedure
    .input(
      z.object({
        redirectUri: z.string().url(),
        state: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = getTikTokClient();

      const state = input.state ?? Math.random().toString(36).substring(2, 15);

      const { url: authUrl, codeVerifier } = await client.getAuthorizationUrl(
        input.redirectUri,
        state,
      );

      console.log("[TikTok OAuth Creator] Generated auth URL, state:", state);

      return {
        authUrl,
        state,
        codeVerifier,
      };
    }),

  /**
   * Exchange authorization code for tokens and link to user (creator)
   */
  creatorExchangeCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string().url(),
        codeVerifier: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      console.log("[TikTok OAuth Creator] Exchanging code for token...");

      const tokenData = await client.exchangeCodeForToken(
        input.code,
        input.redirectUri,
        input.codeVerifier,
      );

      console.log(
        "[TikTok OAuth Creator] Token received, openId:",
        tokenData.openId,
      );

      const userInfo = await client.getUserInfo(tokenData.accessToken);

      console.log(
        "[TikTok OAuth Creator] User info received:",
        userInfo.display_name,
      );

      const generatedUsername = userInfo.display_name
        .replace(/\s+/g, "_")
        .toLowerCase();

      // Check if account already exists by OpenID
      const existingAccount = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.tiktokUserId, tokenData.openId),
      });

      let account;
      let isNew = false;

      if (existingAccount) {
        // Update existing account with new tokens
        console.log(
          "[TikTok OAuth Creator] Updating existing account (by OpenID):",
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

        account = updatedAccount;
      } else {
        // Check by username (to handle manual -> oauth upgrade)
        const existingAccountByUsername =
          await ctx.db.query.tiktokAccount.findFirst({
            where: eq(tiktokAccount.tiktokUsername, generatedUsername),
          });

        if (existingAccountByUsername) {
          console.log(
            "[TikTok OAuth Creator] Updating existing account (by Username):",
            existingAccountByUsername.id,
          );

          const [updatedAccount] = await ctx.db
            .update(tiktokAccount)
            .set({
              tiktokUserId: tokenData.openId, // Update to OpenID
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              tokenExpiresAt: tokenData.expiresAt,
              name: userInfo.display_name,
              followerCount: userInfo.follower_count ?? 0,
              isActive: true,
            })
            .where(eq(tiktokAccount.id, existingAccountByUsername.id))
            .returning();

          account = updatedAccount;
        } else {
          // Create new account
          console.log(
            "[TikTok OAuth Creator] Creating new account for:",
            userInfo.display_name,
          );

          const [newAccount] = await ctx.db
            .insert(tiktokAccount)
            .values({
              name: userInfo.display_name,
              tiktokUsername: generatedUsername,
              tiktokUserId: tokenData.openId,
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              tokenExpiresAt: tokenData.expiresAt,
              followerCount: userInfo.follower_count ?? 0,
              isActive: true,
            })
            .returning();

          account = newAccount;
          isNew = true;

          console.log(
            "[TikTok OAuth Creator] New account created:",
            newAccount?.id,
          );
        }
      }

      // Link account to user if not already linked
      if (account) {
        const existingLink = await ctx.db.query.userTiktokAccount.findFirst({
          where: and(
            eq(userTiktokAccount.userId, ctx.session.user.id),
            eq(userTiktokAccount.tiktokAccountId, account.id),
          ),
        });

        if (!existingLink) {
          await ctx.db.insert(userTiktokAccount).values({
            userId: ctx.session.user.id,
            tiktokAccountId: account.id,
          });
          console.log(
            "[TikTok OAuth Creator] Linked account to user:",
            ctx.session.user.id,
          );
        }
      }

      return {
        account,
        isNew,
      };
    }),

  /**
   * Get creator's own connected TikTok accounts
   */
  creatorMyAccounts: protectedProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.query.userTiktokAccount.findMany({
      where: eq(userTiktokAccount.userId, ctx.session.user.id),
      with: {
        tiktokAccount: true,
      },
    });

    return links.map((l) => ({
      ...l.tiktokAccount,
      // Don't expose tokens to frontend
      accessToken: l.tiktokAccount.accessToken ? "[CONNECTED]" : null,
      refreshToken: undefined,
    }));
  }),

  /**
   * Disconnect a TikTok account (creator - only their own linked accounts)
   */
  creatorDisconnect: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this link
      const link = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.userId, ctx.session.user.id),
          eq(userTiktokAccount.tiktokAccountId, input.accountId),
        ),
      });

      if (!link) {
        throw new Error("Account not linked to your profile");
      }

      // Remove the link
      await ctx.db
        .delete(userTiktokAccount)
        .where(
          and(
            eq(userTiktokAccount.userId, ctx.session.user.id),
            eq(userTiktokAccount.tiktokAccountId, input.accountId),
          ),
        );

      console.log(
        "[TikTok OAuth Creator] Unlinked account:",
        input.accountId,
        "from user:",
        ctx.session.user.id,
      );

      // Check if any other users are linked to this account
      const remainingLinks = await ctx.db.query.userTiktokAccount.findMany({
        where: eq(userTiktokAccount.tiktokAccountId, input.accountId),
      });

      if (remainingLinks.length === 0) {
        console.log(
          "[TikTok OAuth Creator] No remaining users, clearing tokens for account:",
          input.accountId,
        );

        // If no users are linked, clear the tokens and deactivate the account
        // This ensures we don't keep using tokens for an "orphaned" account
        await ctx.db
          .update(tiktokAccount)
          .set({
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(tiktokAccount.id, input.accountId));
      }

      return { success: true };
    }),

  /**
   * Sync account info for creator's account (includes video sync)
   */
  creatorSyncAccount: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this link
      const link = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.userId, ctx.session.user.id),
          eq(userTiktokAccount.tiktokAccountId, input.accountId),
        ),
        with: {
          tiktokAccount: true,
        },
      });

      if (!link) {
        throw new Error("Account not linked to your profile");
      }

      const account = link.tiktokAccount;

      if (!account.accessToken) {
        throw new Error("Account is not connected");
      }

      const client = getTikTokClient();

      console.log("[TikTok OAuth Creator] Syncing account info:", account.id);

      // Check if token needs refresh
      let accessToken = account.accessToken;
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

        accessToken = newTokenData.accessToken;
      }

      const userInfo = await client.getUserInfo(accessToken);

      const [updatedAccount] = await ctx.db
        .update(tiktokAccount)
        .set({
          name: userInfo.display_name,
          followerCount: userInfo.follower_count ?? 0,
        })
        .where(eq(tiktokAccount.id, input.accountId))
        .returning();

      console.log("[TikTok OAuth Creator] Account info synced:", account.id);

      // Sync videos
      try {
        console.log(
          "[TikTok OAuth Creator] Syncing videos for account:",
          account.id,
        );
        const videoData = await client.getVideoList(accessToken);

        console.log(
          `[TikTok OAuth Creator] Found ${videoData.videos.length} videos`,
        );

        for (const video of videoData.videos) {
          console.log(`[TikTok OAuth Creator] Processing video: ${video.id}`);
          
          // Check if clip exists
          const existingClip = await ctx.db.query.clip.findFirst({
            where: eq(clip.tiktokVideoId, video.id),
          });

          let clipId = existingClip?.id;

          if (existingClip) {
            console.log(`[TikTok OAuth Creator] Updating existing clip: ${existingClip.id}, current tiktokAccountId: ${existingClip.tiktokAccountId}`);
            // Update existing clip - including tiktokAccountId to ensure it's set correctly
            await ctx.db
              .update(clip)
              .set({
                tiktokAccountId: account.id, // Ensure correct account ID is set
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
            console.log(`[TikTok OAuth Creator] Creating new clip for video: ${video.id}`);
            // Create new clip - assign to the current user as owner
            const [newClip] = await ctx.db
              .insert(clip)
              .values({
                userId: ctx.session.user.id,
                tiktokAccountId: account.id,
                title:
                  video.title ?? video.video_description ?? "Untitled TikTok",
                description: video.video_description,
                videoUrl: video.share_url ?? "",
                thumbnailUrl: video.cover_image_url,
                tiktokVideoId: video.id,
                tiktokVideoUrl: video.share_url,
                durationSeconds: video.duration,
                publishedAt: new Date(video.create_time * 1000),
                status: "published",
              })
              .returning();

            clipId = newClip?.id;
            console.log(`[TikTok OAuth Creator] Created clip: ${clipId}`);
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
            console.log(`[TikTok OAuth Creator] Added stats for clip: ${clipId}`);
          }
        }

        console.log("[TikTok OAuth Creator] Videos synced successfully");
      } catch (error) {
        console.error("[TikTok OAuth Creator] Failed to sync videos:", error);
        // Don't fail the whole request if video sync fails
      }

      return updatedAccount;
    }),
} satisfies TRPCRouterRecord;
