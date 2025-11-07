import mongoose, { Document, Model, Schema } from 'mongoose';
import { AuditAction } from '../types/enums';

export interface IAuditLogMetadata {
  targetUserId?: string;
  targetUserEmail?: string;
  oldValue?: any;
  newValue?: any;
  bulkCount?: number;
  successCount?: number;
  failedCount?: number;
  ipAddress?: string;
  userAgent?: string;
  additionalInfo?: Record<string, any>;
}

export interface IAuditLog extends Document {
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId;
  targetResource: string;
  targetResourceId?: string;
  description: string;
  metadata?: IAuditLogMetadata;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  createdAt: Date;
}

export interface IAuditLogModel extends Model<IAuditLog> {
  findByAdmin(adminId: string): Promise<IAuditLog[]>;
  findByAction(action: AuditAction): Promise<IAuditLog[]>;
  findByTargetUser(userId: string): Promise<IAuditLog[]>;
  findRecent(limit: number): Promise<IAuditLog[]>;
}

const AuditLogMetadataSchema = new Schema<IAuditLogMetadata>(
  {
    targetUserId: { type: String },
    targetUserEmail: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    bulkCount: { type: Number },
    successCount: { type: Number },
    failedCount: { type: Number },
    ipAddress: { type: String },
    userAgent: { type: String },
    additionalInfo: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const AuditLogSchema = new Schema<IAuditLog, IAuditLogModel>(
  {
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetResource: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetResourceId: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: AuditLogMetadataSchema,
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ targetResource: 1, targetResourceId: 1 });
AuditLogSchema.index({ timestamp: -1 });

// TTL index for automatic cleanup after 90 days (7776000 seconds)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Static methods
AuditLogSchema.statics.findByAdmin = function (adminId: string) {
  return this.find({ performedBy: new mongoose.Types.ObjectId(adminId) })
    .sort({ timestamp: -1 })
    .populate('performedBy', 'email profile.firstName profile.lastName');
};

AuditLogSchema.statics.findByAction = function (action: AuditAction) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .populate('performedBy', 'email profile.firstName profile.lastName');
};

AuditLogSchema.statics.findByTargetUser = function (userId: string) {
  return this.find({ 'metadata.targetUserId': userId })
    .sort({ timestamp: -1 })
    .populate('performedBy', 'email profile.firstName profile.lastName');
};

AuditLogSchema.statics.findRecent = function (limit: number) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('performedBy', 'email profile.firstName profile.lastName');
};

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', AuditLogSchema);

export default AuditLog;

