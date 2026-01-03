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

export interface TaskResult {
  taskIds: string[];
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
    const sign = createHash("sha256").update(signString).digest("hex").toUpperCase();

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
  private async request<T>(endpoint: string, body: unknown): Promise<GeeLarkResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.generateAuthHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GeeLark API error: ${response.status} ${response.statusText}`);
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
  async listCloudPhones(options: ListPhonesOptions = {}): Promise<ListPhonesResponse> {
    const body = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 100,
      ...(options.serialName && { serialName: options.serialName }),
      ...(options.remark && { remark: options.remark }),
      ...(options.groupName && { groupName: options.groupName }),
      ...(options.tags && { tags: options.tags }),
      ...(options.chargeMode !== undefined && { chargeMode: options.chargeMode }),
      ...(options.openStatus !== undefined && { openStatus: options.openStatus }),
    };

    const response = await this.request<ListPhonesResponse>("/open/v1/phone/list", body);
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
  async createPublishVideoTask(params: PublishVideoParams): Promise<TaskResult> {
    const body = {
      planName: params.planName ?? `Video Publish ${new Date().toISOString()}`,
      taskType: 1, // 1 = Publish video
      list: [
        {
          envId: params.envId,
          video: params.video,
          scheduleAt: params.scheduleAt,
          ...(params.videoDesc && { videoDesc: params.videoDesc }),
          ...(params.maxTryTimes !== undefined && { maxTryTimes: params.maxTryTimes }),
          ...(params.timeoutMin !== undefined && { timeoutMin: params.timeoutMin }),
          ...(params.markAI !== undefined && { markAI: params.markAI }),
          ...(params.needShareLink !== undefined && { needShareLink: params.needShareLink }),
        },
      ],
    };

    const response = await this.request<TaskResult>("/open/v1/task/add", body);
    return response.data;
  }

  /**
   * Get the status name for a cloud phone status code.
   */
  static getStatusName(status: number): string {
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
}
