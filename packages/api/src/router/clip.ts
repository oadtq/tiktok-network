/**
 * Clip Router
 *
 * Handles clip management for creators - upload, schedule, view stats
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@everylab/db";
import {
  clip,
  clipStats,
  UpdateClipSchema,
} from "@everylab/db/schema";
import { createStorageFromEnv } from "@everylab/storage";

import { protectedProcedure } from "../trpc";

// Mock stats generator for PoC
function generateMockStats() {
  return {
    views: Math.floor(Math.random() * 100000) + 1000,
    likes: Math.floor(Math.random() * 10000) + 100,
    comments: Math.floor(Math.random() * 1000) + 10,
    shares: Math.floor(Math.random() * 500) + 5,
  };
}

// Get video content type from filename
function getVideoContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return contentTypes[ext ?? ""] ?? "video/mp4";
}

export const clipRouter = {
  /**
   * Get a presigned URL for uploading a video to S3
   */
  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const storage = createStorageFromEnv();
      const key = storage.generateKey(`clips/${ctx.session.user.id}`, input.filename);
      const contentType = getVideoContentType(input.filename);
      
      const result = await storage.getPresignedUploadUrl(key, contentType, 3600);
      const publicUrl = storage.getPublicUrl(key);
      
      console.log(`[Clip] Generated presigned upload URL for user ${ctx.session.user.id}, key: ${key}`);
      
      return {
        uploadUrl: result.url,
        key,
        publicUrl,
        expiresAt: result.expiresAt,
      };
    }),

  /**
   * Get all clips for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const clips = await ctx.db.query.clip.findMany({
      where: eq(clip.userId, ctx.session.user.id),
      orderBy: desc(clip.createdAt),
      with: {
        tiktokAccount: true,
        stats: {
          orderBy: desc(clipStats.recordedAt),
          limit: 1,
        },
      },
    });

    // Enhance with latest stats for display
    return clips.map((c) => ({
      ...c,
      latestStats: c.stats[0] ?? null,
    }));
  }),

  /**
   * Get a single clip by ID (must belong to current user)
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.id),
        with: {
          tiktokAccount: true,
          stats: {
            orderBy: desc(clipStats.recordedAt),
            limit: 30, // Last 30 data points for charts
          },
        },
      });

      // Ensure user owns this clip
      if (!result || result.userId !== ctx.session.user.id) {
        return null;
      }

      return result;
    }),

  /**
   * Create a new clip and submit for review
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        videoUrl: z.url(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newClip] = await ctx.db
        .insert(clip)
        .values({
          title: input.title,
          description: input.description,
          videoUrl: input.videoUrl,
          scheduledAt: input.scheduledAt,
          userId: ctx.session.user.id,
          status: "submitted", // Auto-submit for review
        })
        .returning();

      console.log(`[Clip] Created clip ${newClip?.id} for user ${ctx.session.user.id}, status: submitted`);

      return newClip;
    }),

  /**
   * Submit a clip for review
   */
  submit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.id),
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      const [updated] = await ctx.db
        .update(clip)
        .set({ status: "submitted" })
        .where(eq(clip.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Update a clip
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateClipSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.id),
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      const [updated] = await ctx.db
        .update(clip)
        .set(input.data)
        .where(eq(clip.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Delete a clip
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.id),
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      await ctx.db.delete(clip).where(eq(clip.id, input.id));
      return { success: true };
    }),

  /**
   * Schedule a clip for publishing (only if approved)
   */
  schedule: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        scheduledAt: z.date(),
        tiktokAccountId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.id),
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      if (existing.status !== "approved") {
        throw new Error("Only approved clips can be scheduled");
      }

      const [updated] = await ctx.db
        .update(clip)
        .set({
          scheduledAt: input.scheduledAt,
          tiktokAccountId: input.tiktokAccountId,
        })
        .where(eq(clip.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Get stats for a clip (mock data for PoC)
   */
  getStats: protectedProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // First verify the user owns this clip
      const existingClip = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
      });

      if (!existingClip || existingClip.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      // Get existing stats
      const stats = await ctx.db.query.clipStats.findMany({
        where: eq(clipStats.clipId, input.clipId),
        orderBy: desc(clipStats.recordedAt),
        limit: 30,
      });

      // If no stats exist, generate mock data for PoC
      if (stats.length === 0) {
        const mockStats = generateMockStats();
        // Insert mock stats
        const [newStats] = await ctx.db
          .insert(clipStats)
          .values({
            clipId: input.clipId,
            ...mockStats,
          })
          .returning();

        return [newStats];
      }

      return stats;
    }),

  /**
   * Refresh stats from TikTok API (mock for PoC)
   */
  refreshStats: protectedProcedure
    .input(z.object({ clipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existingClip = await ctx.db.query.clip.findFirst({
        where: eq(clip.id, input.clipId),
      });

      if (!existingClip || existingClip.userId !== ctx.session.user.id) {
        throw new Error("Clip not found or access denied");
      }

      // In PoC, generate mock stats
      const mockStats = generateMockStats();

      const [newStats] = await ctx.db
        .insert(clipStats)
        .values({
          clipId: input.clipId,
          ...mockStats,
        })
        .returning();

      return newStats;
    }),
} satisfies TRPCRouterRecord;
