/**
 * GeeLark API Client
 *
 * Client for interacting with the GeeLark cloud phone platform API.
 * Handles authentication via SHA256 signing and provides methods for
 * cloud phone management and video publishing.
 *
 * @see https://open.geelark.com/api
 */

import { createHash, randomUUID } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface GeeLarkConfig {
  appId: string;
  apiKey: string;
  baseUrl?: string;
}

export interface CloudPhoneGroup {
  id: string;
  name: string;
  remark: string;
}

export interface CloudPhoneTag {
  name: string;
}

export interface CloudPhoneEquipmentInfo {
  countryName: string;
  phoneNumber: string;
  enableSim: number;
  imei: string;
  osVersion: string;
  wifiBssid: string;
  mac: string;
  bluetoothMac: string;
  timeZone: string;
  deviceBrand?: string;
  deviceModel?: string;
}

export interface CloudPhoneProxy {
  type: string;
  server: string;
  port: number;
  username: string;
  password: string;
}

export interface CloudPhone {
  id: string;
  serialName: string;
  serialNo: string;
  group: CloudPhoneGroup;
  remark: string;
  status: number; // 0: Started, 1: Starting, 2: Shut down
  tags: CloudPhoneTag[];
  equipmentInfo: CloudPhoneEquipmentInfo;
  proxy: CloudPhoneProxy;
  chargeMode: number; // 0: pay per minute, 1: monthly subscription
  hasBind: boolean;
  monthlyExpire: number;
  rpaStatus: number; // 1: running, 0: not running
}

export interface ListPhonesOptions {
  page?: number;
  pageSize?: number;
  serialName?: string;
  remark?: string;
  groupName?: string;
  tags?: string[];
  chargeMode?: number;
  openStatus?: number;
}

export interface ListPhonesResponse {
  total: number;
  page: number;
  pageSize: number;
  items: CloudPhone[];
}

export interface PublishVideoParams {
  envId: string;
  video: string;
  scheduleAt: number; // Unix timestamp in seconds
  videoDesc?: string;
  planName?: string;
  maxTryTimes?: number;
  timeoutMin?: number;
  markAI?: boolean;
  needShareLink?: boolean;
}

export type WarmupAction = "search profile" | "search video" | "browse video";

export interface WarmupTaskParams {
  envId: string;
  scheduleAt: number; // Unix timestamp in seconds
  action: WarmupAction;
  duration: number; // minutes
  keywords?: string[];
  planName?: string;
  remark?: string;
}

export interface PublishImageSetParams {
  envId: string;
  scheduleAt: number; // Unix timestamp in seconds
  images: string[];
  videoDesc?: string;
  videoTitle?: string;
  videoId?: string;
  maxTryTimes?: number;
  timeoutMin?: number;
  sameVideoVolume?: number;
  sourceVideoVolume?: number;
  markAI?: boolean;
  needShareLink?: boolean;
  planName?: string;
  remark?: string;
}

export interface TaskResult {
  taskIds: string[];
}

export interface RpaTaskResult {
  taskId: string;
}

export interface TikTokRandomStarParams {
  id: string; // cloud phone id
  scheduleAt: number; // Unix timestamp in seconds
  name?: string;
  remark?: string;
}

export interface TikTokRandomCommentParams {
  id: string; // cloud phone id
  scheduleAt: number; // Unix timestamp in seconds
  name?: string;
  remark?: string;
  useAi: 1 | 2;
  comment?: string;
}

// Task types from GeeLark API
export interface GeeLarkTask {
  id: string;
  planName: string;
  taskType: number; // 1=video, 2=warmup, 3=carousel, 4=login, 6=profile, 42=custom
  serialName: string;
  envId: string;
  scheduleAt: number; // Unix timestamp in seconds
  status: number; // 1=waiting, 2=in progress, 3=completed, 4=failed, 7=cancelled
  failCode?: number;
  failDesc?: string;
  cost?: number; // seconds
  shareLink?: string;
}

export interface QueryTasksResponse {
  total: number;
  items: GeeLarkTask[];
}

export interface BatchQueryTasksOptions {
  size?: number; // max 100
  lastId?: string; // for pagination
  ids?: string[]; // max 100
}

export interface TaskDetailResponse {
  id: string;
  planName: string;
  taskType: number;
  serialName: string;
  envId: string;
  scheduleAt: number;
  status: number;
  failCode?: number;
  failDesc?: string;
  cost?: number;
  resultImages?: string[];
  logs?: string[];
  searchAfter?: unknown[];
  logContinue?: boolean;
}

export interface TaskDetailOptions {
  id: string;
  searchAfter?: unknown[];
}

export interface BatchOperationResult {
  totalAmount: number;
  successAmount: number;
  failAmount: number;
  failDetails?: {
    id: string;
    code: string;
    msg: string;
  }[];
}

// ============================================================================
// PROXY TYPES
// ============================================================================

export type GeeLarkProxyScheme = "socks5" | "http" | "https" | (string & {});

export interface ProxyAddItem {
  scheme: GeeLarkProxyScheme;
  server: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyUpdateItem extends ProxyAddItem {
  id: string;
}

export interface ProxyListItem {
  id: string;
  serialNo: number;
  scheme: string;
  server: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ProxyListResponse {
  total: number;
  page: number;
  pageSize: number;
  list: ProxyListItem[];
}

export interface ProxyAddResult {
  totalAmount: number;
  successAmount: number;
  failAmount: number;
  failDetails?: { index: number; code: number; msg: string }[];
  successDetails?: { index: number; id: string }[];
}

export interface ProxyUpdateResult {
  totalAmount: number;
  successAmount: number;
  failAmount: number;
  failDetails?: { id: string; code: number; msg: string }[];
}

export interface ProxyDeleteResult {
  totalAmount: number;
  successAmount: number;
  failAmount: number;
  failDetails?: { id: string; code: number; msg: string }[];
}

export interface GeeLarkResponse<T> {
  traceId: string;
  code: number;
  msg: string;
  data: T;
}

// ============================================================================
// CLIENT
// ============================================================================

export class GeeLarkClient {
  private appId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GeeLarkConfig) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://openapi.geelark.com";
  }

  /**
   * Generate authentication headers for GeeLark API requests.
   * Uses SHA256 signing as per GeeLark documentation.
   */
  private generateAuthHeaders(): Record<string, string> {
    const traceId = randomUUID().toUpperCase().replace(/-/g, "");
    const timestamp = Date.now().toString();
    const nonce = traceId.substring(0, 6);

    // sign = SHA256(appId + traceId + timestamp + nonce + apiKey)
    const signString = this.appId + traceId + timestamp + nonce + this.apiKey;
    const sign = createHash("sha256")
      .update(signString)
      .digest("hex")
      .toUpperCase();

    return {
      "Content-Type": "application/json",
      appId: this.appId,
      traceId: traceId,
      ts: timestamp,
      nonce: nonce,
      sign: sign,
    };
  }

  /**
   * Make an authenticated POST request to the GeeLark API.
   */
  private async request<T>(
    endpoint: string,
    body: unknown,
  ): Promise<GeeLarkResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.generateAuthHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `GeeLark API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GeeLarkResponse<T>;

    if (data.code !== 0) {
      throw new Error(`GeeLark API error (${data.code}): ${data.msg}`);
    }

    return data;
  }

  /**
   * List all cloud phones from GeeLark.
   *
   * @param options - Optional filtering and pagination options
   * @returns List of cloud phones with their details
   */
  async listCloudPhones(
    options: ListPhonesOptions = {},
  ): Promise<ListPhonesResponse> {
    const body = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 100,
      ...(options.serialName && { serialName: options.serialName }),
      ...(options.remark && { remark: options.remark }),
      ...(options.groupName && { groupName: options.groupName }),
      ...(options.tags && { tags: options.tags }),
      ...(options.chargeMode !== undefined && {
        chargeMode: options.chargeMode,
      }),
      ...(options.openStatus !== undefined && {
        openStatus: options.openStatus,
      }),
    };

    const response = await this.request<ListPhonesResponse>(
      "/open/v1/phone/list",
      body,
    );
    return response.data;
  }

  /**
   * Create a video publish task on GeeLark.
   *
   * This will schedule a cloud phone to publish a video to TikTok.
   *
   * @param params - Video publish parameters including video URL and schedule time
   * @returns Task IDs for tracking the publish job
   */
  async createPublishVideoTask(
    params: PublishVideoParams,
  ): Promise<TaskResult> {
    const body = {
      planName: params.planName ?? `Video Publish ${new Date().toISOString()}`,
      taskType: 1, // 1 = Publish video
      list: [
        {
          envId: params.envId,
          video: params.video,
          scheduleAt: params.scheduleAt,
          ...(params.videoDesc && { videoDesc: params.videoDesc }),
          ...(params.maxTryTimes !== undefined && {
            maxTryTimes: params.maxTryTimes,
          }),
          ...(params.timeoutMin !== undefined && {
            timeoutMin: params.timeoutMin,
          }),
          ...(params.markAI !== undefined && { markAI: params.markAI }),
          ...(params.needShareLink !== undefined && {
            needShareLink: params.needShareLink,
          }),
        },
      ],
    };

    const response = await this.request<TaskResult>("/open/v1/task/add", body);
    return response.data;
  }

  /**
   * Create a warmup task on GeeLark.
   *
   * @see /open/v1/task/add (taskType=2)
   */
  async createWarmupTask(params: WarmupTaskParams): Promise<TaskResult> {
    const body = {
      planName: params.planName ?? `Warmup ${new Date().toISOString()}`,
      ...(params.remark && { remark: params.remark }),
      taskType: 2, // 2 = Warmup
      list: [
        {
          envId: params.envId,
          scheduleAt: params.scheduleAt,
          action: params.action,
          duration: params.duration,
          ...(params.keywords && params.keywords.length > 0
            ? { keywords: params.keywords }
            : {}),
        },
      ],
    };

    const response = await this.request<TaskResult>("/open/v1/task/add", body);
    return response.data;
  }

  /**
   * Create an image set (carousel) publish task on GeeLark.
   *
   * @see /open/v1/task/add (taskType=3)
   */
  async createPublishImageSetTask(
    params: PublishImageSetParams,
  ): Promise<TaskResult> {
    const body = {
      planName:
        params.planName ?? `Carousel Publish ${new Date().toISOString()}`,
      ...(params.remark && { remark: params.remark }),
      taskType: 3, // 3 = Publish image set
      list: [
        {
          envId: params.envId,
          scheduleAt: params.scheduleAt,
          images: params.images,
          ...(params.videoDesc && { videoDesc: params.videoDesc }),
          ...(params.videoTitle && { videoTitle: params.videoTitle }),
          ...(params.videoId && { videoId: params.videoId }),
          ...(params.maxTryTimes !== undefined && {
            maxTryTimes: params.maxTryTimes,
          }),
          ...(params.timeoutMin !== undefined && {
            timeoutMin: params.timeoutMin,
          }),
          ...(params.sameVideoVolume !== undefined && {
            sameVideoVolume: params.sameVideoVolume,
          }),
          ...(params.sourceVideoVolume !== undefined && {
            sourceVideoVolume: params.sourceVideoVolume,
          }),
          ...(params.markAI !== undefined && { markAI: params.markAI }),
          ...(params.needShareLink !== undefined && {
            needShareLink: params.needShareLink,
          }),
        },
      ],
    };

    const response = await this.request<TaskResult>("/open/v1/task/add", body);
    return response.data;
  }

  /**
   * TikTok star (random like) RPA task.
   *
   * @see /open/v1/rpa/task/tiktokRandomStar
   */
  async createTikTokRandomStarTask(
    params: TikTokRandomStarParams,
  ): Promise<RpaTaskResult> {
    const body = {
      ...(params.name && { name: params.name }),
      ...(params.remark && { remark: params.remark }),
      scheduleAt: params.scheduleAt,
      id: params.id,
    };

    const response = await this.request<RpaTaskResult>(
      "/open/v1/rpa/task/tiktokRandomStar",
      body,
    );
    return response.data;
  }

  /**
   * TikTok random comment RPA task.
   *
   * @see /open/v1/rpa/task/tiktokRandomComment
   */
  async createTikTokRandomCommentTask(
    params: TikTokRandomCommentParams,
  ): Promise<RpaTaskResult> {
    const body: Record<string, unknown> = {
      ...(params.name && { name: params.name }),
      ...(params.remark && { remark: params.remark }),
      scheduleAt: params.scheduleAt,
      id: params.id,
      useAi: params.useAi,
    };
    if (params.useAi === 2) {
      body.comment = params.comment ?? "";
    }

    const response = await this.request<RpaTaskResult>(
      "/open/v1/rpa/task/tiktokRandomComment",
      body,
    );
    return response.data;
  }

  /**
   * Query tasks by IDs (up to 100).
   */
  async queryTasks(ids: string[]): Promise<QueryTasksResponse> {
    if (ids.length > 100) {
      throw new Error("Cannot query more than 100 tasks at once");
    }
    const response = await this.request<QueryTasksResponse>(
      "/open/v1/task/query",
      { ids },
    );
    return response.data;
  }

  /**
   * Batch query tasks from history (last 7 days).
   * Use lastId for pagination.
   */
  async batchQueryTasks(
    options: BatchQueryTasksOptions = {},
  ): Promise<QueryTasksResponse> {
    const body: Record<string, unknown> = {};
    if (options.size !== undefined) body.size = Math.min(options.size, 100);
    if (options.lastId) body.lastId = options.lastId;
    if (options.ids && options.ids.length > 0)
      body.ids = options.ids.slice(0, 100);

    const response = await this.request<QueryTasksResponse>(
      "/open/v1/task/historyRecords",
      body,
    );
    return response.data;
  }

  /**
   * Get detailed task information including logs.
   */
  async getTaskDetail(options: TaskDetailOptions): Promise<TaskDetailResponse> {
    const body: Record<string, unknown> = { id: options.id };
    if (options.searchAfter) body.searchAfter = options.searchAfter;

    const response = await this.request<TaskDetailResponse>(
      "/open/v1/task/detail",
      body,
    );
    return response.data;
  }

  /**
   * Cancel waiting or in-progress tasks (up to 100).
   */
  async cancelTasks(ids: string[]): Promise<BatchOperationResult> {
    if (ids.length > 100) {
      throw new Error("Cannot cancel more than 100 tasks at once");
    }
    const response = await this.request<BatchOperationResult>(
      "/open/v1/task/cancel",
      { ids },
    );
    return response.data;
  }

  /**
   * Retry failed or cancelled tasks (up to 100).
   * Each task can be retried up to 5 times.
   */
  async retryTasks(ids: string[]): Promise<BatchOperationResult> {
    if (ids.length > 100) {
      throw new Error("Cannot retry more than 100 tasks at once");
    }
    const response = await this.request<BatchOperationResult>(
      "/open/v1/task/restart",
      { ids },
    );
    return response.data;
  }

  // ============================================================================
  // PROXY MANAGEMENT
  // ============================================================================

  /**
   * Add proxies (up to 100) to GeeLark.
   *
   * @see /open/v1/proxy/add
   */
  async addProxies(list: ProxyAddItem[]): Promise<ProxyAddResult> {
    if (list.length > 100) {
      throw new Error("Cannot add more than 100 proxies at once");
    }
    const response = await this.request<ProxyAddResult>("/open/v1/proxy/add", {
      list,
    });
    return response.data;
  }

  /**
   * Update proxies (up to 100) on GeeLark.
   *
   * @see /open/v1/proxy/update
   */
  async updateProxies(list: ProxyUpdateItem[]): Promise<ProxyUpdateResult> {
    if (list.length > 100) {
      throw new Error("Cannot update more than 100 proxies at once");
    }
    const response = await this.request<ProxyUpdateResult>(
      "/open/v1/proxy/update",
      { list },
    );
    return response.data;
  }

  /**
   * Delete proxies (up to 100) from GeeLark.
   *
   * @see /open/v1/proxy/delete
   */
  async deleteProxies(ids: string[]): Promise<ProxyDeleteResult> {
    if (ids.length > 100) {
      throw new Error("Cannot delete more than 100 proxies at once");
    }
    const response = await this.request<ProxyDeleteResult>(
      "/open/v1/proxy/delete",
      { ids },
    );
    return response.data;
  }

  /**
   * List proxies from GeeLark.
   *
   * @see /open/v1/proxy/list
   */
  async listProxies(options: {
    page?: number;
    pageSize?: number;
    ids?: string[];
  }): Promise<ProxyListResponse> {
    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 100, 100);
    if (options.ids && options.ids.length > 100) {
      throw new Error("Cannot list more than 100 ids at once");
    }

    const body: Record<string, unknown> = {
      page,
      pageSize,
    };
    if (options.ids && options.ids.length > 0) body.ids = options.ids;

    const response = await this.request<ProxyListResponse>(
      "/open/v1/proxy/list",
      body,
    );
    return response.data;
  }

  /**
   * Get the status name for a cloud phone status code.
   */
  static getPhoneStatusName(status: number): string {
    switch (status) {
      case 0:
        return "Running";
      case 1:
        return "Starting";
      case 2:
        return "Stopped";
      default:
        return "Unknown";
    }
  }

  /**
   * Get the status name for a task status code.
   */
  static getTaskStatusName(status: number): string {
    switch (status) {
      case 1:
        return "Waiting";
      case 2:
        return "In Progress";
      case 3:
        return "Completed";
      case 4:
        return "Failed";
      case 7:
        return "Cancelled";
      default:
        return "Unknown";
    }
  }

  /**
   * Get the task type name.
   */
  static getTaskTypeName(taskType: number): string {
    switch (taskType) {
      case 1:
        return "Video Posting";
      case 2:
        return "Account Warmup";
      case 3:
        return "Carousel Posting";
      case 4:
        return "Account Login";
      case 6:
        return "Profile Editing";
      case 42:
        return "Custom";
      default:
        return "Unknown";
    }
  }
}
