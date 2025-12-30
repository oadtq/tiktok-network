/**
 * Campaign Router
 *
 * Handles campaign management for admins
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq, sql } from "@everylab/db";
import {
  campaign,
  campaignClip,
  clip,
  clipStats,
  CreateCampaignSchema,
  UpdateCampaignSchema,
} from "@everylab/db/schema";

import { adminProcedure, protectedProcedure } from "../trpc";

export const campaignRouter = {
  /**
   * List all campaigns (admin only)
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.db.query.campaign.findMany({
      orderBy: desc(campaign.createdAt),
      with: {
        campaignClips: {
          with: {
            clip: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Calculate totals for each campaign
    return campaigns.map((c) => {
      const totalClips = c.campaignClips.length;
      const uniqueCreators = new Set(
        c.campaignClips.map((cc) => cc.clip.userId)
      ).size;

      return {
        ...c,
        totalClips,
        uniqueCreators,
      };
    });
  }),

  /**
   * Get a single campaign by ID (admin only)
   */
  byId: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.campaign.findFirst({
        where: eq(campaign.id, input.id),
        with: {
          campaignClips: {
            with: {
              clip: {
                with: {
                  user: true,
                  stats: {
                    orderBy: desc(clipStats.recordedAt),
                    limit: 1,
                  },
                },
              },
            },
          },
        },
      });
    }),

  /**
   * Create a new campaign (admin only)
   */
  create: adminProcedure
    .input(CreateCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const [newCampaign] = await ctx.db
        .insert(campaign)
        .values(input)
        .returning();

      return newCampaign;
    }),

  /**
   * Update a campaign (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateCampaignSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(campaign)
        .set(input.data)
        .where(eq(campaign.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a campaign (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(campaign).where(eq(campaign.id, input.id));
      return { success: true };
    }),

  /**
   * Add clips to a campaign (admin only)
   */
  addClips: adminProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        clipIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const values = input.clipIds.map((clipId) => ({
        campaignId: input.campaignId,
        clipId,
      }));

      await ctx.db.insert(campaignClip).values(values);
      return { success: true };
    }),

  /**
   * Remove a clip from a campaign (admin only)
   */
  removeClip: adminProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        clipId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(campaignClip)
        .where(
          sql`${campaignClip.campaignId} = ${input.campaignId} AND ${campaignClip.clipId} = ${input.clipId}`
        );
      return { success: true };
    }),

  /**
   * Get campaigns for a specific user (for creators to see their campaigns)
   */
  myList: protectedProcedure.query(async ({ ctx }) => {
    // Find all clips belonging to this user that are in campaigns
    const userClips = await ctx.db.query.clip.findMany({
      where: eq(clip.userId, ctx.session.user.id),
      with: {
        campaignClips: {
          with: {
            campaign: true,
          },
        },
      },
    });

    // Extract unique campaigns with type-safe map
    const campaignsMap = new Map<string, {
      id: string;
      name: string;
      description: string | null;
      status: string;
      myClipsCount: number;
    }>();

    for (const c of userClips) {
      for (const cc of c.campaignClips) {
        const campaignData = cc.campaign;
        let existing = campaignsMap.get(campaignData.id);
        if (!existing) {
          existing = {
            id: campaignData.id,
            name: campaignData.name,
            description: campaignData.description,
            status: campaignData.status,
            myClipsCount: 0,
          };
          campaignsMap.set(campaignData.id, existing);
        }
        existing.myClipsCount += 1;
      }
    }

    return Array.from(campaignsMap.values());
  }),
} satisfies TRPCRouterRecord;
