import type { S3ClientConfig } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageEnv } from "./env";
import { getStorageEnv } from "./env";

export interface StorageConfig {
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  publicUrl?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

export class Storage {
  private client: S3Client;
  private bucket: string;
  private publicUrl?: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;

    const s3Config: S3ClientConfig = {
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !!config.endpoint,
    };

    this.client = new S3Client(s3Config);
  }

  /**
   * Generate a unique key for a file
   */
  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${prefix}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;
  }

  /**
   * Upload a file to S3
   */
  async upload(
    key: string,
    data: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<UploadResult> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return {
      key,
      url,
      size: buffer.length,
    };
  }

  /**
   * Upload a video file with proper content type detection
   */
  async uploadVideo(
    userId: string,
    filename: string,
    data: Buffer | Uint8Array,
  ): Promise<UploadResult> {
    const key = this.generateKey(`clips/${userId}`, filename);
    const contentType = this.getVideoContentType(filename);
    return this.upload(key, data, contentType);
  }

  /**
   * Get a pre-signed URL for uploading (direct browser upload)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return { url, expiresAt };
  }

  /**
   * Get a pre-signed URL for downloading
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return { url, expiresAt };
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  /**
   * Detect video content type from filename
   */
  private getVideoContentType(filename: string): string {
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
}

/**
 * Create a storage instance from environment variables
 */
export function createStorageFromEnv(): Storage {
  const env: StorageEnv = getStorageEnv();
  return new Storage({
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    bucket: env.AWS_S3_BUCKET,
    region: env.AWS_REGION,
    publicUrl: env.S3_PUBLIC_URL,
  });
}
