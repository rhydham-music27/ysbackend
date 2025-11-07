import { Request } from 'express';
import { createAuditLog } from '../services/adminService';
import { AuditAction } from '../types/enums';

export interface AuditLogOptions {
  action: AuditAction;
  targetResource: string;
  targetResourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

export function extractIpAddress(req: Request): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips.trim();
  }

  // Check req.ip (if Express trust proxy is enabled)
  if (req.ip) {
    return req.ip;
  }

  // Fallback to connection remote address
  if ((req as any).connection?.remoteAddress) {
    return (req as any).connection.remoteAddress;
  }

  return 'unknown';
}

export async function logAdminAction(req: Request, options: AuditLogOptions): Promise<void> {
  try {
    const adminId = (req as any).user?._id?.toString();
    if (!adminId) {
      return;
    }

    const ipAddress = extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    const metadata = {
      ...options.metadata,
      ipAddress,
      userAgent,
    };

    // Fire and forget - don't await to avoid blocking main operations
    createAuditLog({
      action: options.action,
      performedBy: adminId,
      targetResource: options.targetResource,
      targetResourceId: options.targetResourceId,
      description: options.description,
      metadata,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to create audit log:', err);
    });
  } catch (error) {
    // Silently fail - audit logging should never break main operations
    // eslint-disable-next-line no-console
    console.error('Error in logAdminAction:', error);
  }
}

