/**
 * Admin Dashboard Router
 *
 * Aggregated data for admin dashboard
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, gte, sql } from "@everylab/db";
import {
  clip,
  clipStats,
  clipStatusEnum,
  cloudPhone,
  geelarkTask,
  geelarkTaskStatusEnum,
  user,
} from "@everylab/db/schema";
import { GeeLarkClient, geelarkEnv } from "@everylab/geelark";

import { adminProcedure } from "../trpc";

// Valid clip status values
const clipStatusValues = clipStatusEnum.enumValues;

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
    const publishedClips = allClips.filter(
      (c) => c.status === "published",
    ).length;
    const scheduledClips = allClips.filter(
      (c) => c.status === "approved",
    ).length; // Approved are scheduled

    // Count campaigns
    const campaigns = await ctx.db.query.campaign.findMany();
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(
      (c) => c.status === "active",
    ).length;

    // Count TikTok accounts
    const accounts = await ctx.db.query.tiktokAccount.findMany();
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter((a) => a.isActive).length;

    // Get aggregate stats from all clips
    const latestStats = await ctx.db.query.clipStats.findMany({
      orderBy: desc(clipStats.recordedAt),
    });

    // Get unique clip stats (latest per clip)
    const latestPerClip = new Map<string, (typeof latestStats)[0]>();
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
      }),
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
   * Get all pending clips for review (backwards compatibility)
   */
  pendingClips: adminProcedure.query(async ({ ctx }) => {
    const pending = await ctx.db.query.clip.findMany({
      where: eq(clip.status, "pending"),
      orderBy: desc(clip.createdAt),
      with: {
        user: true,
        tiktokAccount: true,
      },
    });

    console.log(`[Admin] Found ${pending.length} pending clips`);
    return pending;
  }),

  /**
   * Get all submissions with optional status filter
   */
  submissions: adminProcedure
    .input(
      z
        .object({
          status: z.enum(clipStatusValues).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input?.status
        ? eq(clip.status, input.status)
        : undefined;

      const submissions = await ctx.db.query.clip.findMany({
        where: whereClause,
        orderBy: desc(clip.createdAt),
        with: {
          user: true,
          tiktokAccount: true,
        },
      });

      console.log(
        `[Admin] Found ${submissions.length} submissions${input?.status ? ` with status: ${input.status}` : ""}`,
      );
      return submissions;
    }),

  /**
   * Get all clips across all users for admin view
   */
  allClips: adminProcedure
    .input(
      z
        .object({
          status: z.enum(clipStatusValues).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input?.status
        ? eq(clip.status, input.status)
        : undefined;

      const clips = await ctx.db.query.clip.findMany({
        where: whereClause,
        orderBy: desc(clip.createdAt),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          user: true,
          tiktokAccount: true,
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      // Get total count for pagination
      const allClips = await ctx.db.query.clip.findMany({
        where: whereClause,
      });

      console.log(
        `[Admin] Found ${allClips.length} total clips, returning ${clips.length}`,
      );

      return {
        clips: clips.map((c) => ({
          ...c,
          latestStats: c.stats[0] ?? null,
        })),
        total: allClips.length,
      };
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the clip with its TikTok account and cloud phone
      const existingClip = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
        with: {
          tiktokAccount: {
            with: {
              cloudPhone: true,
            },
          },
        },
      });

      if (!existingClip) {
        throw new Error("Clip not found");
      }

      if (existingClip.status !== "pending") {
        throw new Error("Clip is not in pending status");
      }

      if (!existingClip.tiktokAccount) {
        throw new Error("Clip has no TikTok account assigned");
      }

      if (!existingClip.tiktokAccount.cloudPhone) {
        throw new Error("TikTok account is not linked to a cloud phone");
      }

      // Update clip with any edits
      const updateData: Partial<typeof clip.$inferInsert> = {
        status: "approved",
      };
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;

      // Get GeeLark client
      const geelark = getGeeLarkClient();

      // Calculate schedule time (now + 1 minute if not scheduled)
      const nowSec = Math.floor(Date.now() / 1000);
      const requestedSec = existingClip.scheduledAt
        ? Math.floor(existingClip.scheduledAt.getTime() / 1000)
        : null;
      const scheduleAt =
        requestedSec && requestedSec >= nowSec + 60 ? requestedSec : nowSec + 60;

      console.log(
        `[Admin] Creating GeeLark publish task for clip ${input.clipId}, scheduleAt: ${scheduleAt}`,
      );

      // Create GeeLark publish task
      const taskResult = await geelark.createPublishVideoTask({
        envId: existingClip.tiktokAccount.cloudPhone.id,
        video: existingClip.videoUrl,
        scheduleAt,
        videoDesc: input.description ?? existingClip.description ?? undefined,
        planName: `Publish: ${input.title ?? existingClip.title}`,
      });

      const taskId = taskResult.taskIds[0];
      if (!taskId) {
        throw new Error("GeeLark returned no taskId");
      }

      console.log(`[Admin] GeeLark task created, taskId: ${taskId}`);

      // Update clip with task ID and status
      const [updatedClip] = await ctx.db
        .update(clip)
        .set({
          ...updateData,
          geelarkTaskId: taskId,
        })
        .where(eq(clip.id, input.clipId))
        .returning();

      // Upsert task into local cache immediately (so it appears without requiring a refresh)
      await ctx.db
        .insert(geelarkTask)
        .values({
          id: taskId,
          planName: `Publish: ${input.title ?? existingClip.title}`,
          taskType: 1,
          cloudPhoneId: existingClip.tiktokAccount.cloudPhone.id,
          serialName: existingClip.tiktokAccount.cloudPhone.serialName,
          scheduleAt: new Date(scheduleAt * 1000),
          status: "waiting",
          clipId: input.clipId,
          lastSyncedAt: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: geelarkTask.id,
          set: {
            planName: `Publish: ${input.title ?? existingClip.title}`,
            taskType: 1,
            cloudPhoneId: existingClip.tiktokAccount.cloudPhone.id,
            serialName: existingClip.tiktokAccount.cloudPhone.serialName,
            scheduleAt: new Date(scheduleAt * 1000),
            status: "waiting",
            clipId: input.clipId,
            lastSyncedAt: new Date(),
          },
        });

      return updatedClip;
    }),

  /**
   * Return a clip to draft status (instead of reject)
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

      if (existing.status !== "pending") {
        throw new Error("Clip is not pending review");
      }

      // Return to draft instead of rejected (since rejected no longer exists)
      const [updated] = await ctx.db
        .update(clip)
        .set({ status: "draft" })
        .where(eq(clip.id, input.clipId))
        .returning();

      console.log(`[Admin] Returned clip ${input.clipId} to draft`);

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
    .input(
      z.object({
        userId: z.string(),
        dateFrom: z.string().datetime().optional(),
      }),
    )
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, limit, offset } = input;

      console.log(
        `[Admin] Getting all clips stats, dateFrom: ${dateFrom ?? "all time"}, limit: ${limit}, offset: ${offset}`,
      );

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

      console.log(
        `[Admin] Found ${allClips.length} total clips, returning ${clipsWithStats.length} clips for page`,
      );

      return {
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        totalClips: allClips.length,
        clips: clipsWithStats,
      };
    }),

  // ============================================================================
  // GEELARK TASK MANAGEMENT
  // ============================================================================

  /**
   * Get cached tasks from database
   */
  getTasks: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional().default(50),
          offset: z.number().min(0).optional().default(0),
          status: z.enum(geelarkTaskStatusEnum.enumValues).optional(),
          taskType: z.number().int().optional(),
          cloudPhoneId: z.string().optional(),
          sortBy: z
            .enum(["scheduled", "created"])
            .optional()
            .default("scheduled"),
          sortDir: z.enum(["desc", "asc"]).optional().default("desc"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.status) conditions.push(eq(geelarkTask.status, input.status));
      if (input?.taskType !== undefined)
        conditions.push(eq(geelarkTask.taskType, input.taskType));
      if (input?.cloudPhoneId)
        conditions.push(eq(geelarkTask.cloudPhoneId, input.cloudPhoneId));

      const whereConditions =
        conditions.length > 0 ? and(...conditions) : undefined;

      const orderBy =
        (input?.sortBy ?? "scheduled") === "scheduled"
          ? (input?.sortDir ?? "desc") === "asc"
            ? sql`coalesce(${geelarkTask.scheduleAt}, ${geelarkTask.createdAt}) asc`
            : sql`coalesce(${geelarkTask.scheduleAt}, ${geelarkTask.createdAt}) desc`
          : (input?.sortDir ?? "desc") === "asc"
            ? sql`${geelarkTask.createdAt} asc`
            : desc(geelarkTask.createdAt);

      const tasks = await ctx.db.query.geelarkTask.findMany({
        where: whereConditions,
        orderBy,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        with: {
          cloudPhone: true,
          clip: true,
        },
      });

      const total = await ctx.db.query.geelarkTask.findMany({
        where: whereConditions,
      });

      return {
        tasks,
        total: total.length,
      };
    }),

  /**
   * Trigger an automation task directly via GeeLark API.
   *
   * Mirrors GeeLark docs:
   * - /open/v1/task/add for post_video/warmup/carousel
   * - /open/v1/rpa/task/* for rpa automations
   */
  triggerAutomation: adminProcedure
    .input(
      z.discriminatedUnion("automationId", [
        z.object({
          automationId: z.literal("post_video"),
          cloudPhoneId: z.string(),
          scheduleAt: z.number().int().optional(),
          planName: z.string().optional(),
          videoUrl: z.url(),
          videoDesc: z.string().optional(),
          needShareLink: z.boolean().optional(),
          markAI: z.boolean().optional(),
        }),
        z
          .object({
            automationId: z.literal("warmup"),
            cloudPhoneId: z.string(),
            scheduleAt: z.number().int().optional(),
            planName: z.string().optional(),
            remark: z.string().optional(),
            action: z.enum(["search profile", "search video", "browse video"]),
            keywords: z.array(z.string()).optional(),
            duration: z.number().int().min(1),
          })
          .refine(
            (v) =>
              v.action === "browse video" ||
              (v.keywords !== undefined && v.keywords.length > 0),
            {
              message: "keywords required for search actions",
              path: ["keywords"],
            },
          ),
        z.object({
          automationId: z.literal("random_star"),
          cloudPhoneId: z.string(),
          scheduleAt: z.number().int().optional(),
          name: z.string().optional(),
          remark: z.string().optional(),
        }),
        z
          .object({
            automationId: z.literal("ai_comment"),
            cloudPhoneId: z.string(),
            scheduleAt: z.number().int().optional(),
            name: z.string().optional(),
            remark: z.string().optional(),
            useAi: z.union([z.literal(1), z.literal(2)]),
            comment: z.string().optional(),
          })
          .refine((v) => v.useAi === 1 || (v.comment?.trim().length ?? 0) > 0, {
            message: "comment required when useAi = 2",
            path: ["comment"],
          }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const geelark = getGeeLarkClient();
      const scheduleAt = input.scheduleAt ?? Math.floor(Date.now() / 1000) + 60;

      const phone = await ctx.db.query.cloudPhone.findFirst({
        where: eq(cloudPhone.id, input.cloudPhoneId),
      });

      const serialName = phone?.serialName ?? null;

      if (input.automationId === "post_video") {
        const result = await geelark.createPublishVideoTask({
          envId: input.cloudPhoneId,
          video: input.videoUrl,
          scheduleAt,
          videoDesc: input.videoDesc,
          planName: input.planName,
          needShareLink: input.needShareLink,
          markAI: input.markAI,
        });

        const taskId = result.taskIds[0] ?? "";
        if (!taskId) throw new Error("GeeLark returned no taskId");

        await ctx.db
          .insert(geelarkTask)
          .values({
            id: taskId,
            planName: input.planName ?? "Manual: Post Video",
            taskType: 1,
            cloudPhoneId: input.cloudPhoneId,
            serialName,
            scheduleAt: new Date(scheduleAt * 1000),
            status: "waiting",
            lastSyncedAt: new Date(),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: geelarkTask.id,
            set: {
              planName: input.planName ?? "Manual: Post Video",
              taskType: 1,
              cloudPhoneId: input.cloudPhoneId,
              serialName,
              scheduleAt: new Date(scheduleAt * 1000),
              status: "waiting",
              lastSyncedAt: new Date(),
            },
          });

        return { taskId };
      }

      if (input.automationId === "warmup") {
        const result = await geelark.createWarmupTask({
          envId: input.cloudPhoneId,
          scheduleAt,
          action: input.action,
          duration: input.duration,
          keywords: input.keywords,
          planName: input.planName,
          remark: input.remark,
        });

        const taskId = result.taskIds[0] ?? "";
        if (!taskId) throw new Error("GeeLark returned no taskId");

        await ctx.db
          .insert(geelarkTask)
          .values({
            id: taskId,
            planName: input.planName ?? "Manual: Warmup",
            taskType: 2,
            cloudPhoneId: input.cloudPhoneId,
            serialName,
            scheduleAt: new Date(scheduleAt * 1000),
            status: "waiting",
            lastSyncedAt: new Date(),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: geelarkTask.id,
            set: {
              planName: input.planName ?? "Manual: Warmup",
              taskType: 2,
              cloudPhoneId: input.cloudPhoneId,
              serialName,
              scheduleAt: new Date(scheduleAt * 1000),
              status: "waiting",
              lastSyncedAt: new Date(),
            },
          });

        return { taskId };
      }

      if (input.automationId === "random_star") {
        const result = await geelark.createTikTokRandomStarTask({
          id: input.cloudPhoneId,
          scheduleAt,
          name: input.name,
          remark: input.remark,
        });

        const taskId = result.taskId;
        await ctx.db
          .insert(geelarkTask)
          .values({
            id: taskId,
            planName: input.name ?? "Manual: TikTok Star",
            taskType: 42,
            cloudPhoneId: input.cloudPhoneId,
            serialName,
            scheduleAt: new Date(scheduleAt * 1000),
            status: "waiting",
            lastSyncedAt: new Date(),
            createdAt: new Date(),
          })
          .onConflictDoUpdate({
            target: geelarkTask.id,
            set: {
              planName: input.name ?? "Manual: TikTok Star",
              taskType: 42,
              cloudPhoneId: input.cloudPhoneId,
              serialName,
              scheduleAt: new Date(scheduleAt * 1000),
              status: "waiting",
              lastSyncedAt: new Date(),
            },
          });

        return { taskId };
      }

      // ai_comment
      const result = await geelark.createTikTokRandomCommentTask({
        id: input.cloudPhoneId,
        scheduleAt,
        name: input.name,
        remark: input.remark,
        useAi: input.useAi,
        comment: input.useAi === 2 ? input.comment : undefined,
      });

      const taskId = result.taskId;
      await ctx.db
        .insert(geelarkTask)
        .values({
          id: taskId,
          planName: input.name ?? "Manual: TikTok Comment",
          taskType: 42,
          cloudPhoneId: input.cloudPhoneId,
          serialName,
          scheduleAt: new Date(scheduleAt * 1000),
          status: "waiting",
          lastSyncedAt: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: geelarkTask.id,
          set: {
            planName: input.name ?? "Manual: TikTok Comment",
            taskType: 42,
            cloudPhoneId: input.cloudPhoneId,
            serialName,
            scheduleAt: new Date(scheduleAt * 1000),
            status: "waiting",
            lastSyncedAt: new Date(),
          },
        });

      return { taskId };
    }),

  /**
   * Refresh tasks from GeeLark API and update database cache
   */
  refreshTasksFromGeeLark: adminProcedure.mutation(async ({ ctx }) => {
    const geelark = getGeeLarkClient();

    console.log("[Admin] Fetching tasks from GeeLark API...");

    // Fetch all tasks from history (last 7 days)
    const result = await geelark.batchQueryTasks({ size: 100 });

    console.log(`[Admin] Got ${result.items.length} tasks from GeeLark`);

    // Map GeeLark status codes to our enum
    const mapStatus = (
      status: number,
    ): (typeof geelarkTaskStatusEnum.enumValues)[number] => {
      switch (status) {
        case 1:
          return "waiting";
        case 2:
          return "in_progress";
        case 3:
          return "completed";
        case 4:
          return "failed";
        case 7:
          return "cancelled";
        default:
          return "waiting";
      }
    };

    // Upsert tasks into database
    let updated = 0;
    let inserted = 0;

    for (const task of result.items) {
      const existing = await ctx.db.query.geelarkTask.findFirst({
        where: eq(geelarkTask.id, task.id),
      });

      const taskData = {
        id: task.id,
        planName: task.planName,
        taskType: task.taskType,
        cloudPhoneId: task.envId,
        serialName: task.serialName,
        scheduleAt: task.scheduleAt ? new Date(task.scheduleAt * 1000) : null,
        status: mapStatus(task.status),
        failCode: task.failCode ?? null,
        failDesc: task.failDesc ?? null,
        cost: task.cost ?? null,
        shareLink: task.shareLink ?? null,
        lastSyncedAt: new Date(),
      };

      if (existing) {
        await ctx.db
          .update(geelarkTask)
          .set(taskData)
          .where(eq(geelarkTask.id, task.id));
        updated++;
      } else {
        await ctx.db.insert(geelarkTask).values({
          ...taskData,
          createdAt: new Date(),
        });
        inserted++;
      }
    }

    console.log(
      `[Admin] Synced tasks: ${inserted} inserted, ${updated} updated`,
    );

    return {
      total: result.total,
      synced: result.items.length,
      inserted,
      updated,
    };
  }),

  /**
   * Get detailed task information from GeeLark
   */
  getTaskDetail: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const geelark = getGeeLarkClient();

      const detail = await geelark.getTaskDetail({ id: input.taskId });

      return {
        ...detail,
        statusName: GeeLarkClient.getTaskStatusName(detail.status),
        taskTypeName: GeeLarkClient.getTaskTypeName(detail.taskType),
      };
    }),

  /**
   * Cancel a waiting or in-progress task
   */
  cancelTask: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const geelark = getGeeLarkClient();

      console.log(`[Admin] Cancelling task ${input.taskId}`);

      const result = await geelark.cancelTasks([input.taskId]);

      // Update local cache if successful
      if (result.successAmount > 0) {
        await ctx.db
          .update(geelarkTask)
          .set({ status: "cancelled", lastSyncedAt: new Date() })
          .where(eq(geelarkTask.id, input.taskId));
      }

      return result;
    }),

  /**
   * Retry a failed or cancelled task
   */
  retryTask: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const geelark = getGeeLarkClient();

      console.log(`[Admin] Retrying task ${input.taskId}`);

      const result = await geelark.retryTasks([input.taskId]);

      // Update local cache if successful
      if (result.successAmount > 0) {
        await ctx.db
          .update(geelarkTask)
          .set({ status: "waiting", lastSyncedAt: new Date() })
          .where(eq(geelarkTask.id, input.taskId));
      }

      return result;
    }),
} satisfies TRPCRouterRecord;
