/**
 * Admin Dashboard Router
 *
 * Aggregated data for admin dashboard
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@everylab/db";
import {
  clip,
  clipStats,
  user,
} from "@everylab/db/schema";
import {
  GeeLarkClient,
  geelarkEnv,
} from "@everylab/geelark";

import { adminProcedure } from "../trpc";

// Create GeeLark client instance
function getGeeLarkClient() {
  return new GeeLarkClient({
    appId: geelarkEnv.GEELARK_APP_ID,
    apiKey: geelarkEnv.GEELARK_API_KEY,
  });
}

export const adminRouter = {
  /**
   * Get dashboard overview stats
   */
  overview: adminProcedure.query(async ({ ctx }) => {
    // Count creators
    const creators = await ctx.db.query.user.findMany({
      where: eq(user.role, "creator"),
    });
    const totalCreators = creators.length;

    // Count clips
    const allClips = await ctx.db.query.clip.findMany();
    const totalClips = allClips.length;
    const publishedClips = allClips.filter((c) => c.status === "published").length;
    const scheduledClips = allClips.filter((c) => c.status === "approved").length; // Approved are scheduled

    // Count campaigns
    const campaigns = await ctx.db.query.campaign.findMany();
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

    // Count TikTok accounts
    const accounts = await ctx.db.query.tiktokAccount.findMany();
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter((a) => a.isActive).length;

    // Get aggregate stats from all clips
    const latestStats = await ctx.db.query.clipStats.findMany({
      orderBy: desc(clipStats.recordedAt),
    });

    // Get unique clip stats (latest per clip)
    const latestPerClip = new Map<string, typeof latestStats[0]>();
    for (const stat of latestStats) {
      if (!latestPerClip.has(stat.clipId)) {
        latestPerClip.set(stat.clipId, stat);
      }
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const stat of latestPerClip.values()) {
      totalViews += stat.views;
      totalLikes += stat.likes;
      totalComments += stat.comments;
      totalShares += stat.shares;
    }

    return {
      creators: {
        total: totalCreators,
      },
      clips: {
        total: totalClips,
        published: publishedClips,
        scheduled: scheduledClips,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
      },
      accounts: {
        total: totalAccounts,
        active: activeAccounts,
      },
      stats: {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
    };
  }),

  /**
   * Get top performing clips
   */
  topClips: adminProcedure.query(async ({ ctx }) => {
    const clips = await ctx.db.query.clip.findMany({
      with: {
        user: true,
        tiktokAccount: true,
        stats: {
          orderBy: desc(clipStats.recordedAt),
          limit: 1,
        },
      },
    });

    // Sort by views
    return clips
      .map((c) => ({
        ...c,
        latestStats: c.stats[0] ?? null,
      }))
      .sort((a, b) => (b.latestStats?.views ?? 0) - (a.latestStats?.views ?? 0))
      .slice(0, 10);
  }),

  /**
   * Get top creators by performance
   */
  topCreators: adminProcedure.query(async ({ ctx }) => {
    const creators = await ctx.db.query.user.findMany({
      where: eq(user.role, "creator"),
    });

    const creatorStats = await Promise.all(
      creators.map(async (creator) => {
        const creatorClips = await ctx.db.query.clip.findMany({
          where: eq(clip.userId, creator.id),
          with: {
            stats: {
              orderBy: desc(clipStats.recordedAt),
              limit: 1,
            },
          },
        });

        let totalViews = 0;
        let totalLikes = 0;

        for (const c of creatorClips) {
          const latestStats = c.stats[0];
          if (latestStats) {
            totalViews += latestStats.views;
            totalLikes += latestStats.likes;
          }
        }

        return {
          user: creator,
          clipCount: creatorClips.length,
          totalViews,
          totalLikes,
        };
      })
    );

    // Sort by total views
    return creatorStats
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);
  }),

  /**
   * Get recent activity
   */
  recentActivity: adminProcedure.query(async ({ ctx }) => {
    const recentClips = await ctx.db.query.clip.findMany({
      orderBy: desc(clip.createdAt),
      limit: 10,
      with: {
        user: true,
      },
    });

    return {
      recentClips,
    };
  }),

  /**
   * Get pending clips (submitted for review)
   */
  pendingClips: adminProcedure.query(async ({ ctx }) => {
    const pendingClips = await ctx.db.query.clip.findMany({
      where: eq(clip.status, "submitted"),
      orderBy: desc(clip.createdAt),
      with: {
        user: true,
        tiktokAccount: true,
      },
    });

    return pendingClips;
  }),

  /**
   * Approve a clip and trigger GeeLark publishing
   */
  approveClip: adminProcedure
    .input(
      z.object({
        clipId: z.string().uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the clip with its TikTok account
      const existingClip = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
        with: {
          tiktokAccount: true,
        },
      });

      if (!existingClip) {
        throw new Error("Clip not found");
      }

      if (existingClip.status !== "submitted") {
        throw new Error("Clip is not in submitted status");
      }

      if (!existingClip.tiktokAccount) {
        throw new Error("Clip has no TikTok account assigned");
      }

      if (!existingClip.tiktokAccount.geelarkEnvId) {
        throw new Error("TikTok account is not linked to a cloud phone");
      }

      // Update clip with any edits
      const updateData: Partial<typeof clip.$inferInsert> = {
        status: "publishing",
      };
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;

      // Get GeeLark client
      const geelark = getGeeLarkClient();

      // Calculate schedule time (now + 1 minute if not scheduled)
      const scheduleAt = existingClip.scheduledAt
        ? Math.floor(existingClip.scheduledAt.getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 60;

      // Create GeeLark publish task
      const taskResult = await geelark.createPublishVideoTask({
        envId: existingClip.tiktokAccount.geelarkEnvId,
        video: existingClip.videoUrl,
        scheduleAt,
        videoDesc: input.description ?? existingClip.description ?? undefined,
        planName: `Publish: ${input.title ?? existingClip.title}`,
      });

      // Update clip with task ID and status
      const [updatedClip] = await ctx.db
        .update(clip)
        .set({
          ...updateData,
          geelarkTaskId: taskResult.taskIds[0],
        })
        .where(eq(clip.id, input.clipId))
        .returning();

      return updatedClip;
    }),
} satisfies TRPCRouterRecord;

