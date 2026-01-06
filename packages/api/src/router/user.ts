/**
 * User Router
 *
 * Handles user management and TikTok account assignment (admin only)
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq } from "@everylab/db";
import { tiktokAccount, user, userTiktokAccount } from "@everylab/db/schema";

import { adminProcedure } from "../trpc";

export const userRouter = {
  /**
   * List all users with their linked TikTok accounts
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.query.user.findMany({
      orderBy: desc(user.createdAt),
    });

    // Get all user-account links
    const links = await ctx.db.query.userTiktokAccount.findMany({
      with: {
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
            cloudPhoneId: true,
          },
        },
      },
    });

    // Group links by user
    const linksByUser = new Map<string, typeof links>();
    for (const link of links) {
      const existing = linksByUser.get(link.userId) ?? [];
      existing.push(link);
      linksByUser.set(link.userId, existing);
    }

    return users.map((u) => ({
      ...u,
      linkedAccounts: (linksByUser.get(u.id) ?? []).map((l) => l.tiktokAccount),
    }));
  }),

  /**
   * Get a single user by ID with linked accounts
   */
  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const foundUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.id),
      });

      if (!foundUser) {
        return null;
      }

      const links = await ctx.db.query.userTiktokAccount.findMany({
        where: eq(userTiktokAccount.userId, input.id),
        with: {
          tiktokAccount: {
            columns: {
              id: true,
              name: true,
              tiktokUsername: true,
              cloudPhoneId: true,
            },
          },
        },
      });

      return {
        ...foundUser,
        linkedAccounts: links.map((l) => l.tiktokAccount),
      };
    }),

  /**
   * Link a TikTok account to a user
   */
  linkAccount: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        tiktokAccountId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if link already exists
      const existing = await ctx.db.query.userTiktokAccount.findFirst({
        where: and(
          eq(userTiktokAccount.userId, input.userId),
          eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
        ),
      });

      if (existing) {
        throw new Error("Account is already linked to this user");
      }

      const [newLink] = await ctx.db
        .insert(userTiktokAccount)
        .values({
          userId: input.userId,
          tiktokAccountId: input.tiktokAccountId,
        })
        .returning();

      return newLink;
    }),

  /**
   * Unlink a TikTok account from a user
   */
  unlinkAccount: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        tiktokAccountId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userTiktokAccount)
        .where(
          and(
            eq(userTiktokAccount.userId, input.userId),
            eq(userTiktokAccount.tiktokAccountId, input.tiktokAccountId),
          ),
        );

      return { success: true };
    }),

  /**
   * Get available TikTok accounts (not linked to a specific user)
   */
  availableAccounts: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accounts already linked to this user
      const existingLinks = await ctx.db.query.userTiktokAccount.findMany({
        where: eq(userTiktokAccount.userId, input.userId),
      });

      const linkedAccountIds = new Set(
        existingLinks.map((l) => l.tiktokAccountId),
      );

      // Get all active accounts
      const allAccounts = await ctx.db.query.tiktokAccount.findMany({
        where: eq(tiktokAccount.isActive, true),
        orderBy: desc(tiktokAccount.createdAt),
      });

      // Filter out already linked accounts
      return allAccounts.filter((a) => !linkedAccountIds.has(a.id));
    }),
} satisfies TRPCRouterRecord;
