/**
 * TikTok Account Router
 *
 * Handles managed TikTok accounts (admin only for managing, creators can view available accounts)
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq } from "@everylab/db";
import {
  clip,
  clipStats,
  CreateTiktokAccountSchema,
  tiktokAccount,
  UpdateTiktokAccountSchema,
  userTiktokAccount,
} from "@everylab/db/schema";

import { scrapeTikTokProfileVideosViaApify } from "../services/apify-tiktok-profile-scraper";
import { adminProcedure, protectedProcedure } from "../trpc";

export const tiktokAccountRouter = {
  /**
   * Get TikTok accounts assigned to the current user (creator-facing).
   * Returns assignment metadata + basic account info (no tokens).
   */
  myAssigned: protectedProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.query.userTiktokAccount.findMany({
      where: eq(userTiktokAccount.userId, ctx.session.user.id),
      orderBy: desc(userTiktokAccount.createdAt),
      with: {
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
            followerCount: true,
            cloudPhoneId: true,
            isActive: true,
          },
        },
      },
    });

    return links.map((l) => ({
      assignedAt: l.createdAt,
      ...l.tiktokAccount,
    }));
  }),

  /**
   * List all TikTok accounts with linked cloud phone and users (admin only)
   */
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.tiktokAccount.findMany({
      orderBy: desc(tiktokAccount.createdAt),
      with: {
        cloudPhone: true,
        userTiktokAccounts: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }),

  /**
   * List available TikTok accounts for publishing (for creators)
   * Only returns public info, not tokens
   */
  available: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.db.query.tiktokAccount.findMany({
      where: eq(tiktokAccount.isActive, true),
      orderBy: desc(tiktokAccount.followerCount),
    });

    // Return only public info
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      tiktokUsername: a.tiktokUsername,
      followerCount: a.followerCount,
    }));
  }),

  /**
   * Get a single TikTok account by ID (admin only)
   */
  byId: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.id),
        with: {
          cloudPhone: true,
          userTiktokAccounts: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          clips: {
            orderBy: desc(tiktokAccount.createdAt),
            limit: 20,
          },
        },
      });
    }),

  /**
   * Create a new TikTok account (admin only)
   */
  create: adminProcedure
    .input(CreateTiktokAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const [newAccount] = await ctx.db
        .insert(tiktokAccount)
        .values(input)
        .returning();

      return newAccount;
    }),

  /**
   * Update a TikTok account (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateTiktokAccountSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(tiktokAccount.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Assign a TikTok account to a cloud phone
   */
  assignToCloudPhone: adminProcedure
    .input(
      z.object({
        tiktokAccountId: z.string().uuid(),
        cloudPhoneId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ cloudPhoneId: input.cloudPhoneId, updatedAt: new Date() })
        .where(eq(tiktokAccount.id, input.tiktokAccountId))
        .returning();

      return updated;
    }),

  /**
   * Toggle account active status (admin only)
   */
  toggleActive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.id),
      });

      if (!existing) {
        throw new Error("Account not found");
      }

      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(tiktokAccount.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a TikTok account (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(tiktokAccount).where(eq(tiktokAccount.id, input.id));
      return { success: true };
    }),

  /**
   * Get aggregated stats for a TikTok account
   */
  getStats: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const accountClips = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, input.id),
        with: {
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      const totalVideos = accountClips.length;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      for (const c of accountClips) {
        const latestStats = c.stats[0];
        if (latestStats) {
          totalLikes += latestStats.likes;
          totalComments += latestStats.comments;
          totalShares += latestStats.shares;
        }
      }

      return {
        totalVideos,
        totalLikes,
        totalComments,
        totalShares,
      };
    }),

  /**
   * Get paginated clips for a TikTok account
   */
  getClips: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { id, limit, offset } = input;

      const clips = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, id),
        orderBy: desc(clip.createdAt),
        limit,
        offset,
        with: {
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      const totalCount = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, id),
      });

      return {
        clips: clips.map((c) => ({
          ...c,
          latestStats: c.stats[0] ?? null,
        })),
        total: totalCount.length,
      };
    }),

  /**
   * Get linked users for a TikTok account
   */
  getLinkedUsers: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const linkedUsers = await ctx.db.query.userTiktokAccount.findMany({
        where: eq(userTiktokAccount.tiktokAccountId, input.id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return linkedUsers.map((u) => u.user);
    }),

  /**
   * Link a user to a TikTok account
   */
  linkUser: adminProcedure
    .input(
      z.object({
        tiktokAccountId: z.string().uuid(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already linked
      const existing = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
          eq(userTiktokAccount.userId, input.userId),
        ),
      });

      if (existing) {
        throw new Error("User is already linked to this account");
      }

      await ctx.db.insert(userTiktokAccount).values({
        tiktokAccountId: input.tiktokAccountId,
        userId: input.userId,
      });

      return { success: true };
    }),

  /**
   * Unlink a user from a TikTok account
   */
  unlinkUser: adminProcedure
    .input(
      z.object({
        tiktokAccountId: z.string().uuid(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userTiktokAccount)
        .where(
          and(
            eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
            eq(userTiktokAccount.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  // =========================================
  // CREATOR-FACING ENDPOINTS
  // =========================================

  /**
   * Get aggregated stats for a TikTok account (creator - only their linked accounts)
   */
  creatorGetStats: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // console.log("[creatorGetStats] Querying stats for account:", input.id);
      // console.log("[creatorGetStats] User ID:", ctx.session.user.id);

      // Verify user owns this link
      const link = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.userId, ctx.session.user.id),
          eq(userTiktokAccount.tiktokAccountId, input.id),
        ),
      });

      // console.log("[creatorGetStats] Link found:", !!link);

      if (!link) {
        throw new Error("Account not linked to your profile");
      }

      const accountClips = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, input.id),
        with: {
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      // console.log("[creatorGetStats] Found clips:", accountClips.length);
      // if (accountClips.length > 0) {
      //   console.log("[creatorGetStats] First clip:", accountClips[0]?.id, accountClips[0]?.title);
      //   console.log("[creatorGetStats] First clip stats:", accountClips[0]?.stats);
      // }

      const totalVideos = accountClips.length;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalViews = 0;

      for (const c of accountClips) {
        const latestStats = c.stats[0];
        if (latestStats) {
          totalLikes += latestStats.likes;
          totalComments += latestStats.comments;
          totalShares += latestStats.shares;
          totalViews += latestStats.views;
        }
      }

      // console.log("[creatorGetStats] Results:", { totalVideos, totalViews, totalLikes, totalShares, totalComments });

      return {
        totalVideos,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
      };
    }),

  /**
   * Get paginated clips for a TikTok account (creator - only their linked accounts)
   */
  creatorGetClips: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns this link
      const link = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.userId, ctx.session.user.id),
          eq(userTiktokAccount.tiktokAccountId, input.id),
        ),
      });

      if (!link) {
        throw new Error("Account not linked to your profile");
      }

      const { id, limit, offset } = input;

      const clips = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, id),
        orderBy: desc(clip.createdAt),
        limit,
        offset,
        with: {
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 1,
          },
        },
      });

      const totalCount = await ctx.db.query.clip.findMany({
        where: eq(clip.tiktokAccountId, id),
      });

      return {
        clips: clips.map((c) => ({
          ...c,
          latestStats: c.stats[0] ?? null,
        })),
        total: totalCount.length,
      };
    }),

  /**
   * Sync manual accounts via Apify (no TikTok OAuth, username-based).
   *
   * This writes into the same `clip` / `clip_stats` tables as the OAuth sync.
   */
  syncManual: adminProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        resultsPerPage: z.number().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const apifyToken = process.env.APIFY_TOKEN;
      if (!apifyToken) {
        throw new Error("APIFY_TOKEN is not set");
      }

      const items = await scrapeTikTokProfileVideosViaApify({
        token: apifyToken,
        username: account.tiktokUsername,
        resultsPerPage: input.resultsPerPage ?? 100,
      });

      // Best-effort account info update from first item.
      const firstAuthor = items[0]?.authorMeta;
      if (firstAuthor) {
        await ctx.db
          .update(tiktokAccount)
          .set({
            followerCount: firstAuthor.fans ?? account.followerCount ?? 0,
            tiktokUserId: firstAuthor.id ?? account.tiktokUserId,
            name: firstAuthor.nickName ?? firstAuthor.name ?? account.name,
            updatedAt: new Date(),
          })
          .where(eq(tiktokAccount.id, account.id));
      }

      for (const item of items) {
        const videoId = item.id;
        if (!videoId) continue;

        const views = item.playCount ?? item.stats?.playCount ?? 0;
        const likes = item.diggCount ?? item.stats?.diggCount ?? 0;
        const comments = item.commentCount ?? item.stats?.commentCount ?? 0;
        const shares = item.shareCount ?? item.stats?.shareCount ?? 0;

        const title = (item.text ?? "Untitled TikTok").slice(0, 256);
        const description = item.text ?? null;
        const thumbnailUrl =
          item.videoMeta?.coverUrl ??
          item.videoMeta?.coverImageUrl ??
          item.videoMeta?.coverImage ??
          item.covers?.[0] ??
          null;
        const tiktokVideoUrl = item.webVideoUrl ?? null;

        let publishedAt: Date | null = null;
        if (typeof item.createTime === "number") {
          const ms =
            item.createTime < 10_000_000_000
              ? item.createTime * 1000
              : item.createTime;
          publishedAt = new Date(ms);
        } else if (item.createTimeISO) {
          const ms = Date.parse(item.createTimeISO);
          if (Number.isFinite(ms)) publishedAt = new Date(ms);
        }

        // Check if clip exists
        const existingClip = await ctx.db.query.clip.findFirst({
          where: eq(clip.tiktokVideoId, videoId),
        });

        let clipId = existingClip?.id;

        if (existingClip) {
          await ctx.db
            .update(clip)
            .set({
              title,
              description,
              thumbnailUrl,
              tiktokVideoUrl,
              publishedAt: publishedAt ?? existingClip.publishedAt,
              status: "published",
              updatedAt: new Date(),
            })
            .where(eq(clip.id, existingClip.id));
        } else {
          const [newClip] = await ctx.db
            .insert(clip)
            .values({
              // Note: Assigning to the current user (admin) as owner for now,
              // consistent with TikTok OAuth sync behavior.
              userId: ctx.session.user.id,
              tiktokAccountId: account.id,
              title,
              description,
              videoUrl: tiktokVideoUrl ?? "",
              thumbnailUrl,
              tiktokVideoId: videoId,
              tiktokVideoUrl,
              durationSeconds: item.videoMeta?.duration ?? null,
              publishedAt,
              status: "published",
            })
            .returning();

          clipId = newClip?.id;
        }

        if (clipId) {
          await ctx.db.insert(clipStats).values({
            clipId,
            views,
            likes,
            comments,
            shares,
          });
        }
      }

      const updated = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.id, input.accountId),
      });

      return { account: updated, syncedVideos: items.length };
    }),
} satisfies TRPCRouterRecord;
