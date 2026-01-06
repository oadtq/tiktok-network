import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Import auth tables to extend with relations
import { user as authUser } from "./auth-schema";

// ============================================================================
// ENUMS
// ============================================================================

export const clipStatusEnum = pgEnum("clip_status", [
  "draft", // Uploaded, not yet submitted
  "pending", // Awaiting admin approval (was "submitted")
  "approved", // Approved, publishing in progress
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

// ============================================================================
// CLOUD PHONES (cached from GeeLark API)
// ============================================================================

export const cloudPhone = pgTable("cloud_phone", (t) => ({
  id: t.varchar({ length: 256 }).notNull().primaryKey(), // GeeLark envId
  serialNo: t.varchar({ length: 256 }),
  serialName: t.varchar({ length: 256 }),
  status: t.integer().default(0), // 0=running, 1=starting, 2=stopped
  proxyServer: t.varchar({ length: 256 }),
  proxyPort: t.integer(),
  countryName: t.varchar({ length: 256 }),
  lastSyncedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}));

export const cloudPhoneRelations = relations(cloudPhone, ({ many }) => ({
  tiktokAccounts: many(tiktokAccount),
  proxyAssignments: many(geelarkProxyAssignment),
}));

// ============================================================================
// GEELARK PROXIES (cached from GeeLark API)
// ============================================================================

export const geelarkProxy = pgTable("geelark_proxy", (t) => ({
  id: t.varchar({ length: 256 }).notNull().primaryKey(), // GeeLark proxy ID
  serialNo: t.integer(),
  scheme: t.varchar({ length: 32 }).notNull(), // socks5|http|https
  server: t.varchar({ length: 256 }).notNull(),
  port: t.integer().notNull(),
  username: t.text(),
  password: t.text(),
  lastSyncedAt: t.timestamp({ mode: "date", withTimezone: true }).defaultNow(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}));

export const geelarkProxyAssignment = pgTable(
  "geelark_proxy_assignment",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    proxyId: t
      .varchar({ length: 256 })
      .notNull()
      .references(() => geelarkProxy.id, { onDelete: "cascade" }),
    cloudPhoneId: t
      .varchar({ length: 256 })
      .notNull()
      .unique()
      .references(() => cloudPhone.id, { onDelete: "cascade" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
);

export const geelarkProxyRelations = relations(geelarkProxy, ({ many }) => ({
  assignments: many(geelarkProxyAssignment),
}));

export const geelarkProxyAssignmentRelations = relations(
  geelarkProxyAssignment,
  ({ one }) => ({
    proxy: one(geelarkProxy, {
      fields: [geelarkProxyAssignment.proxyId],
      references: [geelarkProxy.id],
    }),
    cloudPhone: one(cloudPhone, {
      fields: [geelarkProxyAssignment.cloudPhoneId],
      references: [cloudPhone.id],
    }),
  }),
);

// ============================================================================
// TIKTOK ACCOUNTS (managed accounts for publishing)
// ============================================================================

export const tiktokAccount = pgTable("tiktok_account", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar({ length: 256 }).notNull(), // Display name
  tiktokUsername: t.varchar({ length: 256 }).notNull().unique(),
  tiktokUserId: t.varchar({ length: 256 }), // TikTok's user ID
  cloudPhoneId: t
    .varchar({ length: 256 })
    .references(() => cloudPhone.id, { onDelete: "set null" }), // Reference to cached cloud phone
  accessToken: t.text(), // OAuth token for API
  refreshToken: t.text(),
  tokenExpiresAt: t.timestamp({ mode: "date", withTimezone: true }),
  followerCount: t.integer().default(0),
  isActive: t.boolean().default(true).notNull(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}));

export const tiktokAccountRelations = relations(
  tiktokAccount,
  ({ one, many }) => ({
    cloudPhone: one(cloudPhone, {
      fields: [tiktokAccount.cloudPhoneId],
      references: [cloudPhone.id],
    }),
    clips: many(clip),
    userTiktokAccounts: many(userTiktokAccount),
  }),
);

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
  status: clipStatusEnum("status").default("draft").notNull(),
  scheduledAt: t.timestamp({ mode: "date", withTimezone: true }),
  publishedAt: t.timestamp({ mode: "date", withTimezone: true }),
  tiktokVideoId: t.varchar({ length: 256 }), // TikTok's video ID after publishing
  tiktokVideoUrl: t.text(), // URL to the published TikTok
  geelarkTaskId: t.varchar({ length: 256 }), // GeeLark task ID for tracking publish job
  // Metadata
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
}), (table) => ({
  statusIdx: index("clip_status_idx").on(table.status),
  userIdIdx: index("clip_user_id_idx").on(table.userId),
  tiktokAccountIdIdx: index("clip_tiktok_account_id_idx").on(table.tiktokAccountId),
  createdAtIdx: index("clip_created_at_idx").on(table.createdAt),
  statusCreatedAtIdx: index("clip_status_created_at_idx").on(table.status, table.createdAt),
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
  recordedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
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
  status: campaignStatusEnum("status").default("draft").notNull(),
  // Timeline
  startDate: t.timestamp({ mode: "date", withTimezone: true }),
  endDate: t.timestamp({ mode: "date", withTimezone: true }),
  // Metadata
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => new Date()),
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
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
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
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const userTiktokAccountRelations = relations(
  userTiktokAccount,
  ({ one }) => ({
    user: one(authUser, {
      fields: [userTiktokAccount.userId],
      references: [authUser.id],
    }),
    tiktokAccount: one(tiktokAccount, {
      fields: [userTiktokAccount.tiktokAccountId],
      references: [tiktokAccount.id],
    }),
  }),
);

// ============================================================================
// GEELARK TASKS (cached from GeeLark API)
// ============================================================================

export const geelarkTaskStatusEnum = pgEnum("geelark_task_status", [
  "waiting", // 1 - Waiting
  "in_progress", // 2 - In progress
  "completed", // 3 - Completed
  "failed", // 4 - Failed
  "cancelled", // 7 - Cancelled
]);

export const geelarkTask = pgTable("geelark_task", (t) => ({
  id: t.varchar({ length: 256 }).notNull().primaryKey(), // GeeLark task ID
  planName: t.varchar({ length: 256 }),
  taskType: t.integer().notNull(), // 1=video, 2=warmup, 3=carousel, 4=login, 6=profile, 42=custom
  cloudPhoneId: t
    .varchar({ length: 256 })
    .references(() => cloudPhone.id, { onDelete: "set null" }),
  serialName: t.varchar({ length: 256 }),
  scheduleAt: t.timestamp({ mode: "date", withTimezone: true }),
  status: geelarkTaskStatusEnum("status").notNull(),
  failCode: t.integer(),
  failDesc: t.text(),
  cost: t.integer(), // seconds taken
  shareLink: t.text(),
  clipId: t.uuid().references(() => clip.id, { onDelete: "set null" }), // Link to our clip if applicable
  lastSyncedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const geelarkTaskRelations = relations(geelarkTask, ({ one }) => ({
  cloudPhone: one(cloudPhone, {
    fields: [geelarkTask.cloudPhoneId],
    references: [cloudPhone.id],
  }),
  clip: one(clip, {
    fields: [geelarkTask.clipId],
    references: [clip.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

// Cloud Phone
export const SelectCloudPhoneSchema = createSelectSchema(cloudPhone);

// GeeLark Proxy
export const SelectGeeLarkProxySchema = createSelectSchema(geelarkProxy);

// TikTok Account
export const CreateTiktokAccountSchema = createInsertSchema(tiktokAccount, {
  name: z.string().min(1).max(256),
  tiktokUsername: z.string().min(1).max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateTiktokAccountSchema = CreateTiktokAccountSchema.partial();

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
