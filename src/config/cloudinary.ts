import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { FileCategory } from '../types/enums';

// Load environment variables
dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // use HTTPS URLs
});

// Validate Cloudinary credentials
const requiredCredentials = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCredentials = requiredCredentials.filter((key) => !process.env[key]);

if (missingCredentials.length > 0) {
  const warningMessage = `Cloudinary credentials not configured. File uploads will fail. Missing: ${missingCredentials.join(', ')}`;
  console.warn(warningMessage);

  if (process.env.NODE_ENV === 'production') {
    throw new Error(warningMessage);
  }
}

// Cloudinary folder structure constants
export const CLOUDINARY_FOLDERS: Record<FileCategory, string> = {
  [FileCategory.PROFILE_AVATAR]: 'yourshikshak/profiles',
  [FileCategory.ASSIGNMENT_ATTACHMENT]: 'yourshikshak/assignments/submissions',
  [FileCategory.ASSIGNMENT_MATERIAL]: 'yourshikshak/assignments/materials',
  [FileCategory.COURSE_MATERIAL]: 'yourshikshak/courses/materials',
  [FileCategory.DOCUMENT]: 'yourshikshak/documents',
};

// Upload preset configurations
export const IMAGE_UPLOAD_OPTIONS = {
  quality: 'auto' as const,
  fetch_format: 'auto' as const,
  transformation: [{ width: 500, height: 500, crop: 'limit' as const }],
};

export const DOCUMENT_UPLOAD_OPTIONS = {
  resource_type: 'raw' as const,
};

export default cloudinary;

