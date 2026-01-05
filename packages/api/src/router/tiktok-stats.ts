/**
 * TikTok Stats Router
 *
 * Fetches real video statistics from TikTok API
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq, inArray } from "@everylab/db";
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
    return null;
  }
  return createTikTokClient({
    clientKey: tiktokEnv.TIKTOK_CLIENT_KEY,
    clientSecret: tiktokEnv.TIKTOK_CLIENT_SECRET,
  });
}

export const tiktokStatsRouter = {
  /**
   * Fetch and update stats for all published clips from a TikTok account
   */
  syncAccountStats: adminProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      if (!client) {
        throw new Error("TikTok API is not configured");
      }

      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      if (!account.accessToken) {
        throw new Error("Account is not connected to TikTok");
      }

      console.log("[TikTok Stats] Syncing stats for account:", account.id);

      // Get all published clips for this account
      const publishedClips = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, input.accountId),
      });

      if (publishedClips.length === 0) {
        console.log(
          "[TikTok Stats] No published clips for account:",
          account.id,
        );
        return { synced: 0 };
      }

      // Get video list from TikTok
      let videos;
      try {
        const result = await client.getVideoList(account.accessToken, {
          maxCount: 50,
        });
        videos = result.videos;
      } catch (error) {
        console.error("[TikTok Stats] Failed to fetch videos:", error);
        throw new Error("Failed to fetch videos from TikTok");
      }

      console.log(
        "[TikTok Stats] Fetched",
        videos.length,
        "videos from TikTok",
      );

      // Create a map of TikTok video ID to stats
      const videoStatsMap = new Map<
        string,
        { views: number; likes: number; comments: number; shares: number }
      >(
        videos.map((v) => [
          v.id,
          {
            views: v.view_count ?? 0,
            likes: v.like_count ?? 0,
            comments: v.comment_count ?? 0,
            shares: v.share_count ?? 0,
          },
        ]),
      );

      // Update stats for each published clip
      let syncedCount = 0;

      for (const publishedClip of publishedClips) {
        if (!publishedClip.tiktokVideoId) continue;

        const stats = videoStatsMap.get(publishedClip.tiktokVideoId);
        if (!stats) continue;

        // Insert new stats record
        await ctx.db.insert(clipStats).values({
          clipId: publishedClip.id,
          views: stats.views,
          likes: stats.likes,
          comments: stats.comments,
          shares: stats.shares,
        });

        syncedCount++;
      }

      console.log("[TikTok Stats] Synced stats for", syncedCount, "clips");

      return { synced: syncedCount };
    }),

  /**
   * Fetch stats for a specific clip
   */
  syncClipStats: adminProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const client = getTikTokClient();

      if (!client) {
        throw new Error("TikTok API is not configured");
      }

      const existingClip = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
        with: {
          tiktokAccount: true,
        },
      });

      if (!existingClip) {
        throw new Error("Clip not found");
      }

      if (!existingClip.tiktokVideoId) {
        throw new Error("Clip has no TikTok video ID");
      }

      if (!existingClip.tiktokAccount?.accessToken) {
        throw new Error("TikTok account is not connected");
      }

      console.log("[TikTok Stats] Syncing stats for clip:", input.clipId);

      // Query the specific video
      let videos;
      try {
        videos = await client.queryVideos(
          existingClip.tiktokAccount.accessToken,
          [existingClip.tiktokVideoId],
        );
      } catch (error) {
        console.error("[TikTok Stats] Failed to query video:", error);
        throw new Error("Failed to fetch video stats from TikTok");
      }

      if (videos.length === 0) {
        throw new Error("Video not found on TikTok");
      }

      const video = videos[0];

      // Insert new stats record
      const [newStats] = await ctx.db
        .insert(clipStats)
        .values({
          clipId: input.clipId,
          views: video?.view_count ?? 0,
          likes: video?.like_count ?? 0,
          comments: video?.comment_count ?? 0,
          shares: video?.share_count ?? 0,
        })
        .returning();

      console.log("[TikTok Stats] Synced stats for clip:", input.clipId);

      return newStats;
    }),

  /**
   * Get stats for a user's clips (for the statistics page)
   */
  getUserClipsStats: protectedProcedure.query(async ({ ctx }) => {
    const userClips = await ctx.db.query.clip.findMany({
      where: eq(clip.userId, ctx.session.user.id),
      orderBy: desc(clip.createdAt),
      with: {
        stats: {
          orderBy: desc(clipStats.recordedAt),
          limit: 1,
        },
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
          },
        },
      },
    });

    // Calculate totals
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    const clipsWithStats = userClips.map((c) => {
      const latestStats = c.stats[0];
      if (latestStats) {
        totalViews += latestStats.views;
        totalLikes += latestStats.likes;
        totalComments += latestStats.comments;
        totalShares += latestStats.shares;
      }

      return {
        id: c.id,
        title: c.title,
        status: c.status,
        createdAt: c.createdAt,
        publishedAt: c.publishedAt,
        tiktokAccount: c.tiktokAccount,
        stats: latestStats
          ? {
              views: latestStats.views,
              likes: latestStats.likes,
              comments: latestStats.comments,
              shares: latestStats.shares,
            }
          : null,
      };
    });

    return {
      totals: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
      clips: clipsWithStats,
    };
  }),

  /**
   * Get stats for clips published under TikTok account(s) assigned to the current user.
   * This is account-scoped (not "my uploads").
   */
  getAssignedAccountClipsStats: protectedProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.query.userTiktokAccount.findMany({
      where: eq(userTiktokAccount.userId, ctx.session.user.id),
      orderBy: desc(userTiktokAccount.createdAt),
      with: {
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
          },
        },
      },
    });

    const assignedAccounts = links.map((l) => l.tiktokAccount);
    const assignedAccountIds = assignedAccounts.map((a) => a.id);

    if (assignedAccountIds.length === 0) {
      return {
        assignedAccounts: [],
        totals: { views: 0, likes: 0, comments: 0, shares: 0 },
        clips: [],
      };
    }

    const accountClips = await ctx.db.query.clip.findMany({
      where: inArray(clip.tiktokAccountId, assignedAccountIds),
      orderBy: desc(clip.createdAt),
      with: {
        stats: {
          orderBy: desc(clipStats.recordedAt),
          limit: 1,
        },
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
          },
        },
      },
    });

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    const clipsWithStats = accountClips.map((c) => {
      const latestStats = c.stats[0];
      if (latestStats) {
        totalViews += latestStats.views;
        totalLikes += latestStats.likes;
        totalComments += latestStats.comments;
        totalShares += latestStats.shares;
      }

      return {
        id: c.id,
        title: c.title,
        status: c.status,
        createdAt: c.createdAt,
        publishedAt: c.publishedAt,
        tiktokAccount: c.tiktokAccount,
        stats: latestStats
          ? {
              views: latestStats.views,
              likes: latestStats.likes,
              comments: latestStats.comments,
              shares: latestStats.shares,
            }
          : null,
      };
    });

    return {
      assignedAccounts,
      totals: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
      clips: clipsWithStats,
    };
  }),
} satisfies TRPCRouterRecord;
