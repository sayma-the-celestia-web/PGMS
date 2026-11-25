import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from "fs";
import path from "path";

// 15 MB in bytes
export const MAX_SLIDE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_SLIDE_EXTENSIONS = [".pdf", ".pptx", ".ppt"];

function getCloudinaryEnv(): { cloudName?: string; apiKey?: string; apiSecret?: string; url?: string } {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;
  let url = process.env.CLOUDINARY_URL;

  if (!url && (!cloudName || !apiKey || !apiSecret)) {
    try {
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        content.split("\n").forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf("=");
            if (idx !== -1) {
              const k = trimmed.slice(0, idx).trim();
              const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
              if (k === "CLOUDINARY_CLOUD_NAME" && !cloudName) cloudName = v;
              if (k === "CLOUDINARY_API_KEY" && !apiKey) apiKey = v;
              if (k === "CLOUDINARY_API_SECRET" && !apiSecret) apiSecret = v;
              if (k === "CLOUDINARY_URL" && !url) url = v;
            }
          }
        });
      }
    } catch {}
  }

  return { cloudName, apiKey, apiSecret, url };
}

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret, url } = getCloudinaryEnv();
  return Boolean(url || (cloudName && apiKey && apiSecret));
}

let isConfigured = false;

export function configureCloudinary(): boolean {
  if (isConfigured) return true;
  const { cloudName, apiKey, apiSecret, url } = getCloudinaryEnv();

  if (url) {
    cloudinary.config({ cloudinary_url: url });
    isConfigured = true;
    return true;
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
    return true;
  }

  return false;
}

export interface UploadSlideResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

/**
 * Uploads a slide file (PDF or PPTX, max 15MB) to Cloudinary.
 * Files are stored with resource_type: "raw" in the folder `pgms/slides`
 * to ensure PPTX and PDF binaries are preserved verbatim.
 */
export async function uploadSlideToCloudinary(
  fileBuffer: Buffer,
  originalFilename: string,
  teamId: string
): Promise<UploadSlideResult> {
  if (fileBuffer.length > MAX_SLIDE_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 15 MB.`
    );
  }

  const ext = path.extname(originalFilename).toLowerCase();
  if (!ALLOWED_SLIDE_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file format "${ext}". Only PDF (.pdf) and PowerPoint (.pptx) presentations are allowed.`
    );
  }

  const configured = configureCloudinary();
  if (!configured) {
    throw new Error(
      "Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your environment variables."
    );
  }

  // Clean filename for public ID
  const baseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const publicId = `pgms/slides/team_${teamId}_${baseName}_${uniqueSuffix}${ext}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        overwrite: true,
      },
      (error: any, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(
            new Error(error?.message || "Failed to upload presentation file to Cloudinary.")
          );
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format || ext.replace(".", ""),
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}
