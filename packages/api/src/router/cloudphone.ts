/**
 * Cloud Phone Router
 *
 * Handles cloud phone data with database caching and GeeLark API sync
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq, sql } from "@everylab/db";
import { cloudPhone, tiktokAccount } from "@everylab/db/schema";
import { GeeLarkClient, geelarkEnv } from "@everylab/geelark";

import { adminProcedure } from "../trpc";

// Create GeeLark client instance
function getGeeLarkClient() {
  return new GeeLarkClient({
    appId: geelarkEnv.GEELARK_APP_ID,
    apiKey: geelarkEnv.GEELARK_API_KEY,
  });
}

export const cloudPhoneRouter = {
  /**
   * List all cloud phones from database cache
   * Includes linked TikTok account info
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const phones = await ctx.db.query.cloudPhone.findMany({
      orderBy: (cp, { desc }) => desc(cp.lastSyncedAt),
      with: {
        tiktokAccounts: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
          },
        },
      },
    });

    return phones;
  }),

  /**
   * Get a single cloud phone by ID
   */
  byId: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const phone = await ctx.db.query.cloudPhone.findFirst({
        where: eq(cloudPhone.id, input.id),
        with: {
          tiktokAccounts: {
            columns: {
              id: true,
              name: true,
              tiktokUsername: true,
            },
          },
        },
      });

      return phone;
    }),

  /**
   * Sync cloud phones from GeeLark API to local database
   */
  sync: adminProcedure.mutation(async ({ ctx }) => {
    const client = getGeeLarkClient();

    // Fetch all cloud phones from GeeLark
    const response = await client.listCloudPhones({
      page: 1,
      pageSize: 100,
    });

    const now = new Date();
    let upsertedCount = 0;

    // Upsert each phone into the database
    for (const phone of response.items) {
      await ctx.db
        .insert(cloudPhone)
        .values({
          id: phone.id,
          serialNo: phone.serialNo,
          serialName: phone.serialName,
          status: phone.status,
          proxyServer: phone.proxy.server,
          proxyPort: phone.proxy.port,
          countryName: phone.equipmentInfo.countryName,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: cloudPhone.id,
          set: {
            serialNo: phone.serialNo,
            serialName: phone.serialName,
            status: phone.status,
            proxyServer: phone.proxy.server,
            proxyPort: phone.proxy.port,
            countryName: phone.equipmentInfo.countryName,
            lastSyncedAt: now,
            updatedAt: sql`now()`,
          },
        });
      upsertedCount++;
    }

    return {
      synced: upsertedCount,
      total: response.total,
      syncedAt: now,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update the TikTok account with the cloud phone ID
      // Explicitly set updatedAt to avoid $onUpdateFn serialization issues
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ cloudPhoneId: input.cloudPhoneId, updatedAt: new Date() })
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
      // Explicitly set updatedAt to avoid $onUpdateFn serialization issues
      const [updated] = await ctx.db
        .update(tiktokAccount)
        .set({ cloudPhoneId: null, updatedAt: new Date() })
        .where(eq(tiktokAccount.id, input.tiktokAccountId))
        .returning();

      return updated;
    }),
} satisfies TRPCRouterRecord;
