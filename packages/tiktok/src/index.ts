/**
 * TikTok API Package
 *
 * Provides OAuth 2.0 authentication and API client for TikTok
 */

// Client
export { TikTokClient, createTikTokClient } from "./client";
export type { TikTokClientConfig } from "./client";

// Types
export type {
  TikTokTokenResponse,
  TikTokTokenErrorResponse,
  TikTokUserInfo,
  TikTokUserInfoResponse,
  TikTokVideo,
  TikTokVideoListResponse,
  TikTokVideoQueryResponse,
  StoredToken,
  TikTokScope,
} from "./types";

export { TIKTOK_SCOPES, DEFAULT_SCOPES } from "./types";

// Environment
export { tiktokEnv, isTikTokConfigured } from "./env";
export type { TikTokEnv } from "./env";
