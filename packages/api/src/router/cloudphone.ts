/**
 * Cloud Phone Router
 *
 * Handles fetching cloud phone data from GeeLark API for admin dashboard
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@everylab/db";
import { tiktokAccount } from "@everylab/db/schema";
import {
  GeeLarkClient,
  geelarkEnv,
} from "@everylab/geelark";
import type { CloudPhone } from "@everylab/geelark";

import { adminProcedure } from "../trpc";

// Create GeeLark client instance
function getGeeLarkClient() {
  return new GeeLarkClient({
    appId: geelarkEnv.GEELARK_APP_ID,
    apiKey: geelarkEnv.GEELARK_API_KEY,
  });
}

export interface CloudPhoneWithAccount extends CloudPhone {
  linkedTiktokAccount: {
    id: string;
    name: string;
    tiktokUsername: string;
  } | null;
}

export const cloudPhoneRouter = {
  /**
   * List all cloud phones from GeeLark API
   * Includes linked TikTok account info from local database
   */
  list: adminProcedure
    .input(
      z
        .object({
          page: z.number().min(1).optional(),
          pageSize: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const client = getGeeLarkClient();

      // Fetch cloud phones from GeeLark
      const response = await client.listCloudPhones({
        page: input?.page ?? 1,
        pageSize: input?.pageSize ?? 100,
      });

      // Get all TikTok accounts with their geelarkEnvId
      const accounts = await ctx.db.query.tiktokAccount.findMany({
        columns: {
          id: true,
          name: true,
          tiktokUsername: true,
          geelarkEnvId: true,
        },
      });

      // Create a map of envId -> account for fast lookup
      const accountsByEnvId = new Map(
        accounts
          .filter((a): a is typeof a & { geelarkEnvId: string } => !!a.geelarkEnvId)
          .map((a) => [a.geelarkEnvId, a])
      );

      // Enrich cloud phones with linked account info
      const cloudPhonesWithAccounts: CloudPhoneWithAccount[] = response.items.map(
        (phone) => ({
          ...phone,
          linkedTiktokAccount: accountsByEnvId.get(phone.id) ?? null,
        })
      );

      return {
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        items: cloudPhonesWithAccounts,
      };
    }),

  /**
   * Get a single cloud phone by ID
   */
  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = getGeeLarkClient();

      // Fetch the specific phone
      const response = await client.listCloudPhones({
        page: 1,
        pageSize: 1,
      });

      const phone = response.items.find((p) => p.id === input.id);
      if (!phone) {
        return null;
      }

      // Check if linked to a TikTok account
      const account = await ctx.db.query.tiktokAccount.findFirst({
        where: eq(tiktokAccount.geelarkEnvId, input.id),
        columns: {
          id: true,
          name: true,
          tiktokUsername: true,
        },
      });

      return {
        ...phone,
        linkedTiktokAccount: account ?? null,
      };
    }),

  /**
   * Link a cloud phone to a TikTok account
   */
  linkToAccount: adminProcedure
    .input(
      z.object({
        cloudPhoneId: z.string(),
        tiktokAccountId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update the TikTok account with the GeeLark env ID
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ geelarkEnvId: input.cloudPhoneId })
        .where(eq(tiktokAccount.id, input.tiktokAccountId))
        .returning();

      return updated;
    }),

  /**
   * Unlink a cloud phone from a TikTok account
   */
  unlinkFromAccount: adminProcedure
    .input(z.object({ tiktokAccountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ geelarkEnvId: null })
        .where(eq(tiktokAccount.id, input.tiktokAccountId))
        .returning();

      return updated;
    }),
} satisfies TRPCRouterRecord;
