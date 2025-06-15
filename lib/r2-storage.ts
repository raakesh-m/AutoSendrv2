import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { query } from "@/lib/db";

// R2 Configuration
const R2_CONFIG = {
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const MAX_USER_STORAGE_MB = parseInt(process.env.MAX_USER_STORAGE_MB || "50");
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10");

// Initialize S3 client for R2
const r2Client = new S3Client(R2_CONFIG);

export interface StorageQuota {
  usedBytes: number;
  maxBytes: number;
  usedMB: number;
  maxMB: number;
  remainingBytes: number;
  remainingMB: number;
  percentageUsed: number;
  canUpload: boolean;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
  size?: number;
}

class R2StorageManager {
  /**
   * Get user's current storage usage and quota
   */
  async getUserStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      const result = await query(
        "SELECT COALESCE(SUM(file_size), 0) as total_size FROM attachments WHERE user_id = $1 AND is_active = true",
        [userId]
      );

      const usedBytes = parseInt(result.rows[0]?.total_size || "0");
      const maxBytes = MAX_USER_STORAGE_MB * 1024 * 1024; // Convert MB to bytes
      const remainingBytes = Math.max(0, maxBytes - usedBytes);
      const percentageUsed = Math.round((usedBytes / maxBytes) * 100);

      return {
        usedBytes,
        maxBytes,
        usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
        maxMB: MAX_USER_STORAGE_MB,
        remainingBytes,
        remainingMB: Math.round((remainingBytes / (1024 * 1024)) * 100) / 100,
        percentageUsed,
        canUpload: remainingBytes > 0,
      };
    } catch (error) {
      console.error("Error getting storage quota:", error);
      throw new Error("Failed to get storage quota");
    }
  }

  /**
   * Check if user can upload a file of given size
   */
  async canUserUploadFile(
    userId: string,
    fileSize: number
  ): Promise<{ canUpload: boolean; reason?: string }> {
    // Check individual file size limit
    const maxFileSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileSize > maxFileSizeBytes) {
      return {
        canUpload: false,
        reason: `File size (${
          Math.round((fileSize / (1024 * 1024)) * 100) / 100
        }MB) exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
      };
    }

    // Check user's storage quota
    const quota = await this.getUserStorageQuota(userId);
    if (fileSize > quota.remainingBytes) {
      return {
        canUpload: false,
        reason: `Not enough storage space. Need ${
          Math.round((fileSize / (1024 * 1024)) * 100) / 100
        }MB but only ${quota.remainingMB}MB remaining`,
      };
    }

    return { canUpload: true };
  }

  /**
   * Generate a unique key for storing files in R2
   */
  private generateFileKey(userId: string, originalFileName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `users/${userId}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    userId: string,
    file: File,
    metadata?: { category?: string; description?: string }
  ): Promise<UploadResult> {
    try {
      // Check if user can upload this file
      const uploadCheck = await this.canUserUploadFile(userId, file.size);
      if (!uploadCheck.canUpload) {
        return {
          success: false,
          error: uploadCheck.reason,
        };
      }

      // Generate unique key
      const key = this.generateFileKey(userId, file.name);

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Prepare metadata
      const objectMetadata = {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        category: metadata?.category || "general",
        description: metadata?.description || "",
      };

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        Metadata: objectMetadata,
        ContentLength: file.size,
      });

      await r2Client.send(command);

      console.log(
        `✅ File uploaded to R2: ${key} (${
          Math.round((file.size / 1024) * 100) / 100
        } KB)`
      );

      return {
        success: true,
        key,
        size: file.size,
      };
    } catch (error) {
      console.error("Error uploading to R2:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const url = await getSignedUrl(r2Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error("Error generating download URL:", error);
      throw new Error("Failed to generate download URL");
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
      console.log(`🗑️ File deleted from R2: ${key}`);
      return true;
    } catch (error) {
      console.error("Error deleting from R2:", error);
      return false;
    }
  }

  /**
   * Check if a file exists in R2
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await r2Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata from R2
   */
  async getFileMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await r2Client.send(command);
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error("Error getting file metadata:", error);
      throw new Error("Failed to get file metadata");
    }
  }
}

// Export singleton instance
export const r2Storage = new R2StorageManager();

// Export constants for use in other files
export { MAX_USER_STORAGE_MB, MAX_FILE_SIZE_MB };
