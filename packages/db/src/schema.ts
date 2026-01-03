import { relations, sql } from "drizzle-orm";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============================================================================
// ENUMS
// ============================================================================

export const clipStatusEnum = pgEnum("clip_status", [
  "draft", // Draft, not ready for review
  "submitted", // Submitted for review
  "approved", // Approved and scheduled for publishing
  "rejected", // Rejected by admin
  "publishing", // Currently being published
  "published", // Successfully published to TikTok
  "failed", // Publishing failed
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);

// ============================================================================
// AUTH SCHEMA (extended)
// ============================================================================

export * from "./auth-schema";

// Import auth tables to extend with relations
import { user as authUser } from "./auth-schema";

// ============================================================================
// TIKTOK ACCOUNTS (managed accounts for publishing)
// ============================================================================

export const tiktokAccount = pgTable("tiktok_account", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 256 }).notNull(), // Display name
  tiktokUsername: t.varchar({ length: 256 }).notNull().unique(),
  tiktokUserId: t.varchar({ length: 256 }), // TikTok's user ID
  geelarkEnvId: t.varchar({ length: 256 }), // GeeLark cloud phone ID for publishing
  accessToken: t.text(), // OAuth token for API
  refreshToken: t.text(),
  tokenExpiresAt: t.timestamp(),
  followerCount: t.integer().default(0),
  isActive: t.boolean().default(true).notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const tiktokAccountRelations = relations(tiktokAccount, ({ many }) => ({
  clips: many(clip),
}));

// ============================================================================
// CLIPS (user-uploaded content)
// ============================================================================

export const clip = pgTable("clip", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  // Owner
  userId: t
    .text()
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  // Content
  title: t.varchar({ length: 256 }).notNull(),
  description: t.text(),
  videoUrl: t.text().notNull(), // Uploaded video URL
  thumbnailUrl: t.text(),
  durationSeconds: t.integer(),
  // Publishing
  tiktokAccountId: t
    .uuid()
    .references(() => tiktokAccount.id, { onDelete: "set null" }),
  status: clipStatusEnum().default("draft").notNull(),
  scheduledAt: t.timestamp({ withTimezone: true }),
  publishedAt: t.timestamp({ withTimezone: true }),
  tiktokVideoId: t.varchar({ length: 256 }), // TikTok's video ID after publishing
  tiktokVideoUrl: t.text(), // URL to the published TikTok
  geelarkTaskId: t.varchar({ length: 256 }), // GeeLark task ID for tracking publish job
  // Metadata
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const clipRelations = relations(clip, ({ one, many }) => ({
  user: one(authUser, {
    fields: [clip.userId],
    references: [authUser.id],
  }),
  tiktokAccount: one(tiktokAccount, {
    fields: [clip.tiktokAccountId],
    references: [tiktokAccount.id],
  }),
  stats: many(clipStats),
  campaignClips: many(campaignClip),
}));

// ============================================================================
// CLIP STATS (historical stats from TikTok API)
// ============================================================================

export const clipStats = pgTable("clip_stats", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  clipId: t
    .uuid()
    .notNull()
    .references(() => clip.id, { onDelete: "cascade" }),
  // Stats from TikTok API
  views: t.integer().default(0).notNull(),
  likes: t.integer().default(0).notNull(),
  comments: t.integer().default(0).notNull(),
  shares: t.integer().default(0).notNull(),
  // Timestamp for this snapshot
  recordedAt: t.timestamp().defaultNow().notNull(),
}));

export const clipStatsRelations = relations(clipStats, ({ one }) => ({
  clip: one(clip, {
    fields: [clipStats.clipId],
    references: [clip.id],
  }),
}));

// ============================================================================
// CAMPAIGNS (admin-created groupings)
// ============================================================================

export const campaign = pgTable("campaign", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 256 }).notNull(),
  description: t.text(),
  status: campaignStatusEnum().default("draft").notNull(),
  // Timeline
  startDate: t.timestamp({ withTimezone: true }),
  endDate: t.timestamp({ withTimezone: true }),
  // Metadata
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const campaignRelations = relations(campaign, ({ many }) => ({
  campaignClips: many(campaignClip),
}));

// ============================================================================
// CAMPAIGN CLIPS (junction table)
// ============================================================================

export const campaignClip = pgTable("campaign_clip", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  campaignId: t
    .uuid()
    .notNull()
    .references(() => campaign.id, { onDelete: "cascade" }),
  clipId: t
    .uuid()
    .notNull()
    .references(() => clip.id, { onDelete: "cascade" }),
  // Metadata
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const campaignClipRelations = relations(campaignClip, ({ one }) => ({
  campaign: one(campaign, {
    fields: [campaignClip.campaignId],
    references: [campaign.id],
  }),
  clip: one(clip, {
    fields: [campaignClip.clipId],
    references: [clip.id],
  }),
}));

// ============================================================================
// USER TIKTOK ACCOUNTS (junction table for user-account assignment)
// ============================================================================

export const userTiktokAccount = pgTable("user_tiktok_account", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text()
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  tiktokAccountId: t
    .uuid()
    .notNull()
    .references(() => tiktokAccount.id, { onDelete: "cascade" }),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const userTiktokAccountRelations = relations(userTiktokAccount, ({ one }) => ({
  user: one(authUser, {
    fields: [userTiktokAccount.userId],
    references: [authUser.id],
  }),
  tiktokAccount: one(tiktokAccount, {
    fields: [userTiktokAccount.tiktokAccountId],
    references: [tiktokAccount.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

// TikTok Account
export const CreateTiktokAccountSchema = createInsertSchema(tiktokAccount, {
  name: z.string().min(1).max(256),
  tiktokUsername: z.string().min(1).max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const SelectTiktokAccountSchema = createSelectSchema(tiktokAccount);

// Clip
export const CreateClipSchema = createInsertSchema(clip, {
  title: z.string().min(1).max(256),
  videoUrl: z.url(),
}).omit({
  id: true,
  userId: true,
  status: true,
  publishedAt: true,
  tiktokVideoId: true,
  tiktokVideoUrl: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateClipSchema = CreateClipSchema.partial();

export const SelectClipSchema = createSelectSchema(clip);

// Clip Stats
export const CreateClipStatsSchema = createInsertSchema(clipStats).omit({
  id: true,
  recordedAt: true,
});

// Campaign
export const CreateCampaignSchema = createInsertSchema(campaign, {
  name: z.string().min(1).max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial();

export const SelectCampaignSchema = createSelectSchema(campaign);
