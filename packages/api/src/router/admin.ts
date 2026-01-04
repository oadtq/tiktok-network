/**
 * Admin Dashboard Router
 *
 * Aggregated data for admin dashboard
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, gte } from "@everylab/db";
import {
  clip,
  clipStats,
  user,
} from "@everylab/db/schema";

import { adminProcedure } from "../trpc";

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
   * Get all pending clips for review
   */
  pendingClips: adminProcedure.query(async ({ ctx }) => {
    const pending = await ctx.db.query.clip.findMany({
      where: eq(clip.status, "submitted"),
      orderBy: desc(clip.createdAt),
      with: {
        user: true,
      },
    });

    console.log(`[Admin] Found ${pending.length} pending clips`);
    return pending;
  }),

  /**
   * Approve a clip for publishing
   */
  approveClip: adminProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
      });

      if (!existing) {
        throw new Error("Clip not found");
      }

      if (existing.status !== "submitted") {
        throw new Error("Clip is not pending review");
      }

      const [updated] = await ctx.db
        .update(clip)
        .set({ status: "approved" })
        .where(eq(clip.id, input.clipId))
        .returning();

      console.log(`[Admin] Approved clip ${input.clipId}`);

      // TODO: In production, trigger the publishing scheduler here
      // For now, just mark as approved

      return updated;
    }),

  /**
   * Reject a clip
   */
  rejectClip: adminProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
      });

      if (!existing) {
        throw new Error("Clip not found");
      }

      if (existing.status !== "submitted") {
        throw new Error("Clip is not pending review");
      }

      const [updated] = await ctx.db
        .update(clip)
        .set({ status: "rejected" })
        .where(eq(clip.id, input.clipId))
        .returning();

      console.log(`[Admin] Rejected clip ${input.clipId}`);

      return updated;
    }),

  /**
   * Get all users for stats selector dropdown
   */
  users: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.query.user.findMany({
      orderBy: desc(user.createdAt),
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }),

  /**
   * Get stats for a specific user's clips
   */
  getUserStats: adminProcedure
    .input(z.object({ userId: z.string(), dateFrom: z.string().datetime().optional() }))
    .query(async ({ ctx, input }) => {
      const { userId, dateFrom } = input;
      
      const dateFilter = dateFrom
        ? and(eq(clip.userId, userId), gte(clip.createdAt, new Date(dateFrom)))
        : eq(clip.userId, userId);

      const userClips = await ctx.db.query.clip.findMany({
        where: dateFilter,
        with: {
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

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
          ...c,
          latestStats: latestStats ?? null,
        };
      });

      return {
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        clips: clipsWithStats,
      };
    }),
  /**
   * Get aggregated stats for all clips with date range and pagination
   * Used for the admin "All Accounts" view
   */
  getAllClipsStats: adminProcedure
    .input(
      z.object({
        dateFrom: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, limit, offset } = input;

      console.log(`[Admin] Getting all clips stats, dateFrom: ${dateFrom ?? "all time"}, limit: ${limit}, offset: ${offset}`);

      // Build where clause for clips based on date filter
      const dateFilter = dateFrom
        ? gte(clip.createdAt, new Date(dateFrom))
        : undefined;

      // Get all clips matching the date filter (for aggregate stats)
      const allClips = await ctx.db.query.clip.findMany({
        where: dateFilter,
        with: {
          user: true,
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      // Calculate aggregate stats
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      for (const c of allClips) {
        const latestStats = c.stats[0];
        if (latestStats) {
          totalViews += latestStats.views;
          totalLikes += latestStats.likes;
          totalComments += latestStats.comments;
          totalShares += latestStats.shares;
        }
      }

      // Get paginated clips (sorted by creation date descending)
      const paginatedClips = await ctx.db.query.clip.findMany({
        where: dateFilter,
        orderBy: desc(clip.createdAt),
        limit,
        offset,
        with: {
          user: true,
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      const clipsWithStats = paginatedClips.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        createdAt: c.createdAt,
        user: { id: c.user.id, name: c.user.name, email: c.user.email },
        latestStats: c.stats[0]
          ? {
              views: c.stats[0].views,
              likes: c.stats[0].likes,
              comments: c.stats[0].comments,
              shares: c.stats[0].shares,
            }
          : null,
      }));

      console.log(`[Admin] Found ${allClips.length} total clips, returning ${clipsWithStats.length} clips for page`);

      return {
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalClips: allClips.length,
        clips: clipsWithStats,
      };
    }),
} satisfies TRPCRouterRecord;
