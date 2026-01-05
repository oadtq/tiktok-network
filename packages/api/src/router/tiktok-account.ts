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

import { adminProcedure, protectedProcedure } from "../trpc";

export const tiktokAccountRouter = {
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
      })
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
      })
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

      let totalVideos = accountClips.length;
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
      })
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already linked
      const existing = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
          eq(userTiktokAccount.userId, input.userId)
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userTiktokAccount)
        .where(
          and(
            eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
            eq(userTiktokAccount.userId, input.userId)
          )
        );

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
