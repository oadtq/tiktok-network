/**
 * Proxy Router (GeeLark)
 *
 * Provides CRUD + sync for GeeLark proxies, and local proxy↔cloud-phone assignment.
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq, inArray, sql } from "@everylab/db";
import {
  cloudPhone,
  geelarkProxy,
  geelarkProxyAssignment,
} from "@everylab/db/schema";
import { GeeLarkClient, geelarkEnv } from "@everylab/geelark";

import { adminProcedure } from "../trpc";

function getGeeLarkClient() {
  return new GeeLarkClient({
    appId: geelarkEnv.GEELARK_APP_ID,
    apiKey: geelarkEnv.GEELARK_API_KEY,
  });
}

const ProxyCreateSchema = z.object({
  scheme: z.string().min(1).max(16),
  server: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
});

const ProxyUpdateSchema = ProxyCreateSchema.extend({
  id: z.string().min(1),
}).partial({
  username: true,
  password: true,
});

export const proxyRouter = {
  /**
   * List proxies from the DB cache (no GeeLark call).
   *
   * Password is never returned to the client.
   */
  list: adminProcedure.query(async ({ ctx }) => {
    const proxies = await ctx.db.query.geelarkProxy.findMany({
      orderBy: (p, { desc }) => desc(p.lastSyncedAt),
      columns: {
        password: false,
      },
      with: {
        assignments: {
          with: {
            cloudPhone: {
              columns: {
                id: true,
                serialName: true,
                serialNo: true,
                status: true,
                countryName: true,
              },
            },
          },
        },
      },
    });

    return proxies.map((p) => ({
      ...p,
      assignedCloudPhones: p.assignments.map((a) => a.cloudPhone),
    }));
  }),

  /**
   * Sync proxies from GeeLark into DB cache.
   */
  sync: adminProcedure.mutation(async ({ ctx }) => {
    const client = getGeeLarkClient();

    const pageSize = 100;
    let page = 1;
    let total = 0;
    const all: Awaited<ReturnType<typeof client.listProxies>>["list"] = [];

    // Paginate until we've fetched `total` or we stop getting results.
    for (;;) {
      const res = await client.listProxies({ page, pageSize });
      if (page === 1) total = res.total;
      all.push(...res.list);

      if (res.list.length === 0) break;
      if (all.length >= total) break;
      if (res.list.length < pageSize) break;
      page++;
    }

    const now = new Date();
    for (const p of all) {
      await ctx.db
        .insert(geelarkProxy)
        .values({
          id: p.id,
          serialNo: p.serialNo,
          scheme: p.scheme,
          server: p.server,
          port: p.port,
          username: p.username ?? null,
          password: p.password ?? null,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: geelarkProxy.id,
          set: {
            serialNo: p.serialNo,
            scheme: p.scheme,
            server: p.server,
            port: p.port,
            username: p.username ?? null,
            password: p.password ?? null,
            lastSyncedAt: now,
            updatedAt: sql`now()`,
          },
        });
    }

    return {
      synced: all.length,
      total,
      syncedAt: now,
    };
  }),

  /**
   * Add proxy(ies) to GeeLark and upsert them locally.
   */
  add: adminProcedure
    .input(z.object({ list: z.array(ProxyCreateSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const client = getGeeLarkClient();

      const result = await client.addProxies(input.list);

      const createdIds =
        result.successDetails?.map((s) => s.id).filter(Boolean) ?? [];

      if (createdIds.length > 0) {
        const fetched = await client.listProxies({
          page: 1,
          pageSize: Math.max(1, Math.min(100, createdIds.length)),
          ids: createdIds,
        });

        const now = new Date();
        for (const p of fetched.list) {
          await ctx.db
            .insert(geelarkProxy)
            .values({
              id: p.id,
              serialNo: p.serialNo,
              scheme: p.scheme,
              server: p.server,
              port: p.port,
              username: p.username ?? null,
              password: p.password ?? null,
              lastSyncedAt: now,
            })
            .onConflictDoUpdate({
              target: geelarkProxy.id,
              set: {
                serialNo: p.serialNo,
                scheme: p.scheme,
                server: p.server,
                port: p.port,
                username: p.username ?? null,
                password: p.password ?? null,
                lastSyncedAt: now,
                updatedAt: sql`now()`,
              },
            });
        }
      }

      return {
        ...result,
        createdIds,
      };
    }),

  /**
   * Update proxy(ies) on GeeLark and upsert them locally.
   */
  update: adminProcedure
    .input(z.object({ list: z.array(ProxyUpdateSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const client = getGeeLarkClient();

      const result = await client.updateProxies(
        input.list.map((p) => ({
          id: p.id,
          scheme: p.scheme,
          server: p.server,
          port: p.port,
          ...(p.username !== undefined ? { username: p.username } : {}),
          ...(p.password !== undefined ? { password: p.password } : {}),
        })),
      );

      const updatedIds = input.list.map((p) => p.id);
      const fetched = await client.listProxies({
        page: 1,
        pageSize: Math.max(1, Math.min(100, updatedIds.length)),
        ids: updatedIds,
      });

      const now = new Date();
      for (const p of fetched.list) {
        await ctx.db
          .insert(geelarkProxy)
          .values({
            id: p.id,
            serialNo: p.serialNo,
            scheme: p.scheme,
            server: p.server,
            port: p.port,
            username: p.username ?? null,
            password: p.password ?? null,
            lastSyncedAt: now,
          })
          .onConflictDoUpdate({
            target: geelarkProxy.id,
            set: {
              serialNo: p.serialNo,
              scheme: p.scheme,
              server: p.server,
              port: p.port,
              username: p.username ?? null,
              password: p.password ?? null,
              lastSyncedAt: now,
              updatedAt: sql`now()`,
            },
          });
      }

      return { ...result, updatedIds };
    }),

  /**
   * Delete proxies from GeeLark and remove them locally (successful ones).
   */
  delete: adminProcedure
    .input(z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const client = getGeeLarkClient();

      const result = await client.deleteProxies(input.ids);
      const failed = new Set(result.failDetails?.map((f) => f.id) ?? []);
      const deletedIds = input.ids.filter((id) => !failed.has(id));

      if (deletedIds.length > 0) {
        // Delete assignments first (cascade also covers it, but keep explicit intent)
        await ctx.db
          .delete(geelarkProxyAssignment)
          .where(inArray(geelarkProxyAssignment.proxyId, deletedIds));

        await ctx.db
          .delete(geelarkProxy)
          .where(inArray(geelarkProxy.id, deletedIds));
      }

      return { ...result, deletedIds };
    }),

  /**
   * Replace assignments for a proxy (local-only config).
   *
   * Constraints:
   * - max 3 cloud phones per proxy
   * - a cloud phone can only be assigned to one proxy
   */
  setAssignments: adminProcedure
    .input(
      z.object({
        proxyId: z.string().min(1),
        cloudPhoneIds: z.array(z.string().min(1)).max(3),
        reassign: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cloudPhoneIds = Array.from(new Set(input.cloudPhoneIds));
      if (cloudPhoneIds.length > 3) {
        throw new Error("A proxy can be assigned to at most 3 cloud phones");
      }

      const proxy = await ctx.db.query.geelarkProxy.findFirst({
        where: eq(geelarkProxy.id, input.proxyId),
      });
      if (!proxy) throw new Error("Proxy not found");

      if (cloudPhoneIds.length > 0) {
        const phones = await ctx.db.query.cloudPhone.findMany({
          where: inArray(cloudPhone.id, cloudPhoneIds),
          columns: { id: true },
        });
        const found = new Set(phones.map((p) => p.id));
        const missing = cloudPhoneIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
          throw new Error(`Unknown cloudPhoneIds: ${missing.join(", ")}`);
        }
      }

      const existingForPhones =
        cloudPhoneIds.length > 0
          ? await ctx.db.query.geelarkProxyAssignment.findMany({
              where: inArray(
                geelarkProxyAssignment.cloudPhoneId,
                cloudPhoneIds,
              ),
            })
          : [];

      const conflicts = existingForPhones.filter(
        (a) => a.proxyId !== input.proxyId,
      );
      if (conflicts.length > 0 && !input.reassign) {
        const conflictedIds = conflicts.map((c) => c.cloudPhoneId);
        throw new Error(
          `Cloud phones already assigned to another proxy: ${conflictedIds.join(", ")}`,
        );
      }

      if (conflicts.length > 0 && input.reassign) {
        await ctx.db.delete(geelarkProxyAssignment).where(
          inArray(
            geelarkProxyAssignment.cloudPhoneId,
            conflicts.map((c) => c.cloudPhoneId),
          ),
        );
      }

      // Replace assignments for this proxy
      await ctx.db
        .delete(geelarkProxyAssignment)
        .where(eq(geelarkProxyAssignment.proxyId, input.proxyId));

      if (cloudPhoneIds.length > 0) {
        await ctx.db.insert(geelarkProxyAssignment).values(
          cloudPhoneIds.map((cloudPhoneId) => ({
            proxyId: input.proxyId,
            cloudPhoneId,
          })),
        );
      }

      return { proxyId: input.proxyId, cloudPhoneIds };
    }),
} satisfies TRPCRouterRecord;
