import { supabase, STORAGE_BUCKETS } from "../../config/supabase.config";
import { createLogger } from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma";
import { ChartImage } from "@prisma/client";

const logger = createLogger("storage-service");

type ChartType = "analysis" | "confirmation" | "post_trade";

interface FileMetadata {
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
}

interface UploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  userId: string;
  signalId: string;
  timeframe: string;
  chartType: ChartType;
}

export class StorageService {
  private readonly CHART_BUCKET = STORAGE_BUCKETS.CHARTS;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];
  private readonly CLEANUP_THRESHOLD = 7 * 24 * 60 * 60; // 7 days in seconds

  async uploadChartImage(imageBuffer: Buffer, options: UploadOptions) {
    try {
      const { userId, signalId, timeframe, chartType } = options;
      const fileExtension = "png";
      const fileName = `${userId}/${chartType}/${timeframe}/${uuidv4()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from(this.CHART_BUCKET).upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      // Get public URL
      const { data: publicUrl } = supabase.storage.from(this.CHART_BUCKET).getPublicUrl(fileName);

      // Create chart image record
      await prisma.chartImage.create({
        data: {
          signalId,
          timeframe,
          chartType,
          storagePath: fileName,
          publicUrl: publicUrl.publicUrl,
          metadata: {
            uploadedAt: new Date(),
            fileSize: imageBuffer.length,
            mimeType: "image/png",
          },
        },
      });

      return {
        path: fileName,
        url: publicUrl.publicUrl,
      };
    } catch (error) {
      logger.error({
        message: "Error uploading chart image",
        error: error instanceof Error ? error.message : "Unknown error",
        options,
      });
      throw error;
    }
  }

  async deleteChartImage(path: string) {
    try {
      const { error } = await supabase.storage.from(this.CHART_BUCKET).remove([path]);
      if (error) throw error;

      // Delete chart image record
      await prisma.chartImage.deleteMany({
        where: { storagePath: path },
      });

      logger.info({
        message: "Chart image deleted",
        path,
      });
    } catch (error) {
      logger.error({
        message: "Error deleting chart image",
        error: error instanceof Error ? error.message : "Unknown error",
        path,
      });
      throw error;
    }
  }

  async cleanupOldChartImages() {
    try {
      const threshold = new Date(Date.now() - this.CLEANUP_THRESHOLD * 1000);

      // Find old chart images
      const oldImages = await prisma.chartImage.findMany({
        where: {
          createdAt: {
            lt: threshold,
          },
        },
        select: {
          storagePath: true,
        },
      });

      // Delete from storage and database
      for (const image of oldImages) {
        await this.deleteChartImage(image.storagePath);
      }

      logger.info({
        message: "Cleanup completed",
        imagesDeleted: oldImages.length,
      });
    } catch (error) {
      logger.error({
        message: "Error during cleanup",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createChartImage(signalId: string, timeframe: string, chartType: ChartType, storagePath: string, publicUrl: string, metadata: FileMetadata): Promise<ChartImage> {
    try {
      const chartImage = await prisma.chartImage.create({
        data: {
          signalId,
          timeframe,
          chartType,
          storagePath,
          publicUrl,
          metadata: {
            uploadedAt: metadata.uploadedAt,
            fileSize: metadata.fileSize,
            mimeType: metadata.mimeType,
          },
        },
      });
      return chartImage;
    } catch (error) {
      logger.error("Failed to create chart image record:", error);
      throw error;
    }
  }
}
