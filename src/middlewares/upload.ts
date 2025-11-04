import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request } from 'express';
import path from 'path';
import { FileType } from '../types/enums';

// TypeScript interfaces
export interface UploadOptions {
  fileType: FileType;
  maxSize: number;
  allowedMimeTypes: string[];
  maxFiles?: number;
}

// File type configuration constants
export const IMAGE_UPLOAD_CONFIG: UploadOptions = {
  fileType: FileType.IMAGE,
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxFiles: 1,
};

export const DOCUMENT_UPLOAD_CONFIG: UploadOptions = {
  fileType: FileType.DOCUMENT,
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  maxFiles: 5,
};

export const MULTIPLE_IMAGES_CONFIG: UploadOptions = {
  fileType: FileType.IMAGE,
  maxSize: 5 * 1024 * 1024, // 5MB per file
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxFiles: 10,
};

// Storage configuration - use memory storage
const storage: StorageEngine = multer.memoryStorage();

// File filter factory function
export function createFileFilter(allowedMimeTypes: string[]) {
  return (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    // Check if file MIME type is allowed
    if (allowedMimeTypes.includes(file.mimetype)) {
      // Additional validation: check file extension matches MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const mimeToExt: Record<string, string[]> = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/jpg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
      };

      const validExts = mimeToExt[file.mimetype] || [];
      if (validExts.length === 0 || validExts.includes(ext)) {
        return callback(null, true);
      }
      return callback(new Error(`File extension ${ext} does not match MIME type ${file.mimetype}`));
    }
    return callback(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
  };
}

// Multer middleware factory functions

/**
 * Upload single image middleware
 * @param fieldName - Form field name (default: 'avatar')
 * @returns Multer middleware
 */
export function uploadSingleImage(fieldName: string = 'avatar') {
  return multer({
    storage,
    fileFilter: createFileFilter(IMAGE_UPLOAD_CONFIG.allowedMimeTypes),
    limits: { fileSize: IMAGE_UPLOAD_CONFIG.maxSize },
  }).single(fieldName);
}

/**
 * Upload multiple images middleware
 * @param fieldName - Form field name (default: 'images')
 * @param maxCount - Maximum number of files (default: 10)
 * @returns Multer middleware
 */
export function uploadMultipleImages(fieldName: string = 'images', maxCount: number = 10) {
  return multer({
    storage,
    fileFilter: createFileFilter(MULTIPLE_IMAGES_CONFIG.allowedMimeTypes),
    limits: { fileSize: MULTIPLE_IMAGES_CONFIG.maxSize, files: maxCount },
  }).array(fieldName, maxCount);
}

/**
 * Upload documents middleware
 * @param fieldName - Form field name (default: 'documents')
 * @param maxCount - Maximum number of files (default: 5)
 * @returns Multer middleware
 */
export function uploadDocuments(fieldName: string = 'documents', maxCount: number = 5) {
  return multer({
    storage,
    fileFilter: createFileFilter(DOCUMENT_UPLOAD_CONFIG.allowedMimeTypes),
    limits: { fileSize: DOCUMENT_UPLOAD_CONFIG.maxSize, files: maxCount },
  }).array(fieldName, maxCount);
}

/**
 * Upload single document middleware
 * @param fieldName - Form field name (default: 'document')
 * @returns Multer middleware
 */
export function uploadSingleDocument(fieldName: string = 'document') {
  return multer({
    storage,
    fileFilter: createFileFilter(DOCUMENT_UPLOAD_CONFIG.allowedMimeTypes),
    limits: { fileSize: DOCUMENT_UPLOAD_CONFIG.maxSize },
  }).single(fieldName);
}

/**
 * Upload mixed file types middleware
 * @param fields - Array of field configurations
 * @returns Multer middleware
 */
export function uploadMixed(
  fields: Array<{ name: string; maxCount: number; type: 'image' | 'document' }>
) {
  const multerFields = fields.map((field) => ({
    name: field.name,
    maxCount: field.maxCount,
  }));

  const fileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const fieldConfig = fields.find((f) => f.name === file.fieldname);
    if (!fieldConfig) {
      return callback(new Error(`Unexpected field: ${file.fieldname}`));
    }

    const allowedTypes =
      fieldConfig.type === 'image'
        ? IMAGE_UPLOAD_CONFIG.allowedMimeTypes
        : DOCUMENT_UPLOAD_CONFIG.allowedMimeTypes;
    const maxSize = fieldConfig.type === 'image' ? IMAGE_UPLOAD_CONFIG.maxSize : DOCUMENT_UPLOAD_CONFIG.maxSize;

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error(`Invalid file type for field ${file.fieldname}`));
    }

    if (file.size && file.size > maxSize) {
      return callback(new Error(`File size exceeds limit for field ${file.fieldname}`));
    }

    return callback(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: Math.max(IMAGE_UPLOAD_CONFIG.maxSize, DOCUMENT_UPLOAD_CONFIG.maxSize),
    },
  }).fields(multerFields);
}

