import cloudinary, { CLOUDINARY_FOLDERS } from '../config/cloudinary';
import { FileCategory, FileType } from '../types/enums';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import path from 'path';

// TypeScript interfaces
export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  format?: string;
  size?: number;
  error?: string;
}

export interface UploadFileParams {
  file: Express.Multer.File;
  category: FileCategory;
  customFolder?: string;
  transformation?: object;
}

export interface DeleteFileParams {
  publicId: string;
  resourceType?: 'image' | 'raw' | 'video';
}

/**
 * Upload file to Cloudinary
 * @param params - Upload parameters
 * @returns Promise with upload result
 */
export async function uploadToCloudinary(params: UploadFileParams): Promise<UploadResult> {
  try {
    const { file, category, customFolder, transformation } = params;

    // Validate file exists and has buffer
    if (!file || !file.buffer) {
      return { success: false, error: 'No file provided' };
    }

    // Determine folder path
    const folder = customFolder || CLOUDINARY_FOLDERS[category];

    // Determine resource type based on MIME type
    let resourceType: 'image' | 'raw' | 'video' = 'image';
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw'; // Documents (PDF, DOC, etc.)
    }

    // Build upload options
    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    // Add transformations for images
    if (resourceType === 'image') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
      if (transformation) {
        uploadOptions.transformation = transformation;
      }
    }

    // Upload file using stream
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            resolve({
              success: false,
              error: error.message || 'Upload failed',
            });
          } else if (result) {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
            });
          } else {
            resolve({
              success: false,
              error: 'Unknown upload error',
            });
          }
        }
      );

      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      bufferStream.pipe(uploadStream);
    });
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Upload multiple files to Cloudinary
 * @param files - Array of files to upload
 * @param category - File category
 * @returns Promise with array of upload results
 */
export async function uploadMultipleToCloudinary(
  files: Express.Multer.File[],
  category: FileCategory
): Promise<UploadResult[]> {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    // Upload all files concurrently
    const uploadPromises = files.map((file) => uploadToCloudinary({ file, category }));
    const results = await Promise.all(uploadPromises);

    return results;
  } catch (error: any) {
    return [
      {
        success: false,
        error: error.message || 'Batch upload failed',
      },
    ];
  }
}

/**
 * Delete file from Cloudinary
 * @param params - Delete parameters
 * @returns Promise with delete result
 */
export async function deleteFromCloudinary(params: DeleteFileParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { publicId, resourceType = 'image' } = params;

    if (!publicId) {
      return { success: false, error: 'Public ID is required' };
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    if (result.result === 'ok' || result.result === 'not found') {
      return { success: true };
    }

    return { success: false, error: `Delete failed: ${result.result}` };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Delete failed',
    };
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID or null if invalid
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
    const urlParts = url.split('/upload/');
    if (urlParts.length < 2) {
      return null;
    }

    const afterUpload = urlParts[1];
    // Remove version prefix if present (v1234567890/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Remove transformations if present
    const withoutTransformations = withoutVersion.split('/').pop();
    if (!withoutTransformations) {
      return null;
    }

    // Remove file extension
    const publicId = withoutTransformations.replace(/\.[^/.]+$/, '');

    // Extract folder path if present
    const folderMatch = afterUpload.match(/^[^/]+\/(.+)\./);
    if (folderMatch) {
      return folderMatch[1].replace(/\.[^/.]+$/, '');
    }

    return publicId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate file buffer
 * @param file - Multer file object
 * @returns True if valid, false otherwise
 */
export function validateFileBuffer(file: Express.Multer.File): boolean {
  if (!file) {
    return false;
  }

  if (!file.buffer || file.buffer.length === 0) {
    return false;
  }

  if (file.size === 0) {
    return false;
  }

  if (!file.mimetype) {
    return false;
  }

  return true;
}

/**
 * Get file type from MIME type
 * @param mimetype - MIME type
 * @returns FileType enum value
 */
export function getFileTypeFromMime(mimetype: string): FileType {
  if (mimetype.startsWith('image/')) {
    return FileType.IMAGE;
  }
  if (mimetype.startsWith('video/')) {
    return FileType.VIDEO;
  }
  if (mimetype.startsWith('audio/')) {
    return FileType.AUDIO;
  }
  return FileType.DOCUMENT;
}

/**
 * Generate unique file name
 * @param originalName - Original file name
 * @returns Unique file name
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomString}${ext}`;
}


