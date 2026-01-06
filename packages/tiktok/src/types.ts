/**
 * TikTok API Types
 */

// OAuth Types
export interface TikTokTokenResponse {
  open_id: string;
  scope: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  token_type: string;
}

export interface TikTokTokenErrorResponse {
  error: string;
  error_description: string;
  log_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokUserInfoResponse {
  data: {
    user: TikTokUserInfo;
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

// Video Types
export interface TikTokVideo {
  id: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  height?: number;
  width?: number;
  title?: string;
  embed_html?: string;
  embed_link?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

export interface TikTokVideoListResponse {
  data: {
    videos: TikTokVideo[];
    cursor: number;
    has_more: boolean;
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

// Video Query Types (for fetching specific videos)
export interface TikTokVideoQueryResponse {
  data: {
    videos: TikTokVideo[];
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

// Token storage interface
export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  openId: string;
  scope: string;
}

// OAuth scopes
export const TIKTOK_SCOPES = {
  USER_INFO_BASIC: "user.info.basic",
  USER_INFO_PROFILE: "user.info.profile",
  USER_INFO_STATS: "user.info.stats",
  VIDEO_LIST: "video.list",
  VIDEO_UPLOAD: "video.upload",
  VIDEO_PUBLISH: "video.publish",
} as const;

export type TikTokScope = (typeof TIKTOK_SCOPES)[keyof typeof TIKTOK_SCOPES];

// Default scopes for our app
export const DEFAULT_SCOPES: TikTokScope[] = [
  TIKTOK_SCOPES.USER_INFO_BASIC,
  TIKTOK_SCOPES.USER_INFO_STATS,
  TIKTOK_SCOPES.VIDEO_LIST,
];
