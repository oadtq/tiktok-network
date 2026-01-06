/**
 * Upload Router
 *
 * Handles file upload operations - presigned URLs for S3
 */
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@everylab/db";
import { userTiktokAccount } from "@everylab/db/schema";
import { createStorageFromEnv } from "@everylab/storage";

import { protectedProcedure } from "../trpc";

// Allowed video extensions
const ALLOWED_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv"];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Content type mapping
const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

export const uploadRouter = {
  /**
   * Get a presigned URL for uploading a video to S3
   */
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileSize: z
          .number()
          .max(
            MAX_FILE_SIZE,
            `File size must be under ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate file extension
      const ext = input.filename.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(
          `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        );
      }

      const contentType = CONTENT_TYPES[ext] ?? "video/mp4";
      const userId = ctx.session.user.id;

      // Initialize storage
      const storage = createStorageFromEnv();

      // Generate unique key
      const key = storage.generateKey(`clips/${userId}`, input.filename);

      // Get presigned URL
      const { url, expiresAt } = await storage.getPresignedUploadUrl(
        key,
        contentType,
        3600, // 1 hour expiry
      );

      // Get public URL for after upload
      const publicUrl = storage.getPublicUrl(key);

      return {
        uploadUrl: url,
        key,
        publicUrl,
        contentType,
        expiresAt,
      };
    }),

  /**
   * Get user's linked TikTok accounts for video submission
   */
  myTiktokAccounts: protectedProcedure.query(async ({ ctx }) => {
    const links = await ctx.db.query.userTiktokAccount.findMany({
      where: eq(userTiktokAccount.userId, ctx.session.user.id),
      with: {
        tiktokAccount: {
          columns: {
            id: true,
            name: true,
            tiktokUsername: true,
            cloudPhoneId: true,
            isActive: true,
          },
        },
      },
    });

    // Filter to only accounts with cloud phone linked (required for publishing)
    return links
      .map((l) => l.tiktokAccount)
      .filter((a) => a.isActive && a.cloudPhoneId);
  }),
} satisfies TRPCRouterRecord;
