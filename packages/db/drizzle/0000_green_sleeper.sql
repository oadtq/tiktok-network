CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."clip_status" AS ENUM('draft', 'pending', 'approved', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."geelark_task_status" AS ENUM('waiting', 'in_progress', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('creator', 'admin');--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campaign_clip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"clip_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"tiktok_account_id" uuid,
	"status" "clip_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"tiktok_video_id" varchar(256),
	"tiktok_video_url" text,
	"geelark_task_id" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clip_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clip_id" uuid NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_phone" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"serial_no" varchar(256),
	"serial_name" varchar(256),
	"status" integer DEFAULT 0,
	"proxy_server" varchar(256),
	"proxy_port" integer,
	"country_name" varchar(256),
	"last_synced_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "geelark_proxy" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"serial_no" integer,
	"scheme" varchar(32) NOT NULL,
	"server" varchar(256) NOT NULL,
	"port" integer NOT NULL,
	"username" text,
	"password" text,
	"last_synced_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "geelark_proxy_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proxy_id" varchar(256) NOT NULL,
	"cloud_phone_id" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geelark_proxy_assignment_cloudPhoneId_unique" UNIQUE("cloud_phone_id")
);
--> statement-breakpoint
CREATE TABLE "geelark_task" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"plan_name" varchar(256),
	"task_type" integer NOT NULL,
	"cloud_phone_id" varchar(256),
	"serial_name" varchar(256),
	"schedule_at" timestamp with time zone,
	"status" "geelark_task_status" NOT NULL,
	"fail_code" integer,
	"fail_desc" text,
	"cost" integer,
	"share_link" text,
	"clip_id" uuid,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiktok_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"tiktok_username" varchar(256) NOT NULL,
	"tiktok_user_id" varchar(256),
	"cloud_phone_id" varchar(256),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"follower_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "tiktok_account_tiktokUsername_unique" UNIQUE("tiktok_username")
);
--> statement-breakpoint
CREATE TABLE "user_tiktok_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tiktok_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'creator' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"bank_account_info" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "campaign_clip" ADD CONSTRAINT "campaign_clip_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_clip" ADD CONSTRAINT "campaign_clip_clip_id_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip" ADD CONSTRAINT "clip_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip" ADD CONSTRAINT "clip_tiktok_account_id_tiktok_account_id_fk" FOREIGN KEY ("tiktok_account_id") REFERENCES "public"."tiktok_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clip_stats" ADD CONSTRAINT "clip_stats_clip_id_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geelark_proxy_assignment" ADD CONSTRAINT "geelark_proxy_assignment_proxy_id_geelark_proxy_id_fk" FOREIGN KEY ("proxy_id") REFERENCES "public"."geelark_proxy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geelark_proxy_assignment" ADD CONSTRAINT "geelark_proxy_assignment_cloud_phone_id_cloud_phone_id_fk" FOREIGN KEY ("cloud_phone_id") REFERENCES "public"."cloud_phone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geelark_task" ADD CONSTRAINT "geelark_task_cloud_phone_id_cloud_phone_id_fk" FOREIGN KEY ("cloud_phone_id") REFERENCES "public"."cloud_phone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geelark_task" ADD CONSTRAINT "geelark_task_clip_id_clip_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clip"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiktok_account" ADD CONSTRAINT "tiktok_account_cloud_phone_id_cloud_phone_id_fk" FOREIGN KEY ("cloud_phone_id") REFERENCES "public"."cloud_phone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tiktok_account" ADD CONSTRAINT "user_tiktok_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tiktok_account" ADD CONSTRAINT "user_tiktok_account_tiktok_account_id_tiktok_account_id_fk" FOREIGN KEY ("tiktok_account_id") REFERENCES "public"."tiktok_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;