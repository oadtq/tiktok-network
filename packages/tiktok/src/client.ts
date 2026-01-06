/**
 * TikTok API Client
 *
 * Handles OAuth 2.0 authentication and API calls to TikTok
 */

import type {
  StoredToken,
  TikTokScope,
  TikTokTokenResponse,
  TikTokUserInfo,
  TikTokUserInfoResponse,
  TikTokVideo,
  TikTokVideoListResponse,
  TikTokVideoQueryResponse,
} from "./types";
import { DEFAULT_SCOPES } from "./types";

// TikTok API endpoints
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export interface TikTokClientConfig {
  clientKey: string;
  clientSecret: string;
}

export class TikTokClient {
  private clientKey: string;
  private clientSecret: string;

  constructor(config: TikTokClientConfig) {
    this.clientKey = config.clientKey;
    this.clientSecret = config.clientSecret;
  }

  // ============================================================================
  // PKCE Helper Methods
  // ============================================================================

  /**
   * Generate a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Generate code challenge from code verifier using SHA-256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  /**
   * Base64 URL encode (without padding)
   */
  private base64UrlEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // ============================================================================
  // OAuth 2.0 Methods
  // ============================================================================

  /**
   * Generate the OAuth authorization URL with PKCE
   * User should be redirected to this URL to authorize the app
   * Returns both the URL and the code_verifier (must be stored for token exchange)
   */
  async getAuthorizationUrl(
    redirectUri: string,
    state: string,
    scopes: TikTokScope[] = DEFAULT_SCOPES,
  ): Promise<{ url: string; codeVerifier: string }> {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    console.log("[TikTok] PKCE parameters generated:");
    console.log("  - code_verifier length:", codeVerifier.length);
    console.log("  - code_challenge:", codeChallenge);
    console.log("  - redirect_uri:", redirectUri);
    console.log("  - state:", state);
    console.log("  - scopes:", scopes.join(","));

    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(","),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const url = `${TIKTOK_AUTH_URL}?${params.toString()}`;

    console.log("[TikTok] Generated OAuth URL:");
    console.log("  - Full URL:", url);

    return {
      url,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<StoredToken> {
    console.log("[TikTok] Exchanging authorization code for token...");

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as TikTokTokenResponse;

    console.log("[TikTok] Token exchange successful, open_id:", data.open_id);

    return this.parseTokenResponse(data);
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<StoredToken> {
    console.log("[TikTok] Refreshing access token...");

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Token refresh failed:", errorText);
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as TikTokTokenResponse;

    console.log("[TikTok] Token refresh successful");

    return this.parseTokenResponse(data);
  }

  /**
   * Revoke an access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    console.log("[TikTok] Revoking access token...");

    const response = await fetch(TIKTOK_REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Token revocation failed:", errorText);
      throw new Error(
        `Token revocation failed: ${response.status} ${errorText}`,
      );
    }

    console.log("[TikTok] Token revoked successfully");
  }

  private parseTokenResponse(data: TikTokTokenResponse): StoredToken {
    const now = new Date();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(now.getTime() + data.expires_in * 1000),
      refreshExpiresAt: new Date(
        now.getTime() + data.refresh_expires_in * 1000,
      ),
      openId: data.open_id,
      scope: data.scope,
    };
  }

  // ============================================================================
  // User Info Methods
  // ============================================================================

  /**
   * Get user info for the authenticated user
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    console.log("[TikTok] Fetching user info...");

    const fields = [
      "open_id",
      "union_id",
      "avatar_url",
      "avatar_url_100",
      "avatar_large_url",
      "display_name",
      "follower_count",
      "following_count",
      "likes_count",
      "video_count",
    ].join(",");

    const response = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=${fields}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] User info fetch failed:", errorText);
      throw new Error(
        `User info fetch failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as TikTokUserInfoResponse;

    if (data.error.code !== "ok") {
      throw new Error(`TikTok API error: ${data.error.message}`);
    }

    console.log(
      "[TikTok] User info fetched successfully:",
      data.data.user.display_name,
    );

    return data.data.user;
  }

  // ============================================================================
  // Video Methods
  // ============================================================================

  /**
   * Get list of user's videos with stats
   */
  async getVideoList(
    accessToken: string,
    options: {
      cursor?: number;
      maxCount?: number;
    } = {},
  ): Promise<{ videos: TikTokVideo[]; cursor: number; hasMore: boolean }> {
    console.log("[TikTok] Fetching video list...");

    const fields = [
      "id",
      "create_time",
      "cover_image_url",
      "share_url",
      "video_description",
      "duration",
      "title",
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
    ].join(",");

    const params = new URLSearchParams({
      fields,
    });

    const body: Record<string, unknown> = {
      max_count: options.maxCount ?? 20,
    };

    if (options.cursor) {
      body.cursor = options.cursor;
    }

    const response = await fetch(
      `${TIKTOK_API_BASE}/video/list/?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Video list fetch failed:", errorText);
      throw new Error(
        `Video list fetch failed: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as TikTokVideoListResponse;

    if (data.error.code !== "ok") {
      throw new Error(`TikTok API error: ${data.error.message}`);
    }

    console.log(
      "[TikTok] Fetched",
      data.data.videos.length,
      "videos, hasMore:",
      data.data.has_more,
    );

    return {
      videos: data.data.videos,
      cursor: data.data.cursor,
      hasMore: data.data.has_more,
    };
  }

  /**
   * Query specific videos by IDs
   */
  async queryVideos(
    accessToken: string,
    videoIds: string[],
  ): Promise<TikTokVideo[]> {
    console.log("[TikTok] Querying videos by IDs:", videoIds);

    const fields = [
      "id",
      "create_time",
      "cover_image_url",
      "share_url",
      "video_description",
      "duration",
      "title",
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
    ].join(",");

    const response = await fetch(
      `${TIKTOK_API_BASE}/video/query/?fields=${fields}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            video_ids: videoIds,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TikTok] Video query failed:", errorText);
      throw new Error(`Video query failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as TikTokVideoQueryResponse;

    if (data.error.code !== "ok") {
      throw new Error(`TikTok API error: ${data.error.message}`);
    }

    console.log("[TikTok] Queried", data.data.videos.length, "videos");

    return data.data.videos;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(expiresAt: Date): boolean {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Check if refresh token is expired
   */
  isRefreshTokenExpired(refreshExpiresAt: Date): boolean {
    return refreshExpiresAt <= new Date();
  }

  /**
   * Get a valid access token, refreshing if necessary
   * Returns null if refresh token is also expired
   */
  async getValidToken(storedToken: StoredToken): Promise<StoredToken | null> {
    // If access token is still valid, return it
    if (!this.isTokenExpired(storedToken.expiresAt)) {
      return storedToken;
    }

    // If refresh token is expired, return null
    if (this.isRefreshTokenExpired(storedToken.refreshExpiresAt)) {
      console.log("[TikTok] Refresh token expired, re-authentication required");
      return null;
    }

    // Refresh the token
    try {
      return await this.refreshAccessToken(storedToken.refreshToken);
    } catch (error) {
      console.error("[TikTok] Failed to refresh token:", error);
      return null;
    }
  }
}

/**
 * Create a TikTok client instance from environment variables
 */
export function createTikTokClient(config: TikTokClientConfig): TikTokClient {
  return new TikTokClient(config);
}
