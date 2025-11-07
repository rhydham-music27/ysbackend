import mongoose, { Document, Model, Schema } from 'mongoose';
import { NotificationType, NotificationCategory, NotificationPriority } from '../types/enums';

export interface INotificationMetadata {
  assignmentId?: string;
  gradeId?: string;
  attendanceId?: string;
  courseId?: string;
  classId?: string;
  actionUrl?: string;
}

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: INotificationMetadata;
  isRead: boolean;
  readAt?: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // virtuals
  isExpired: boolean;
  isUnread: boolean;

  // instance methods
  markAsRead(): Promise<INotification>;
  markAsUnread(): Promise<INotification>;
}

export interface INotificationModel extends Model<INotification> {
  findByUser(userId: string): Promise<INotification[]>;
  findUnreadByUser(userId: string): Promise<INotification[]>;
  markAllAsRead(userId: string): Promise<{ modifiedCount: number }>;
  deleteExpired(): Promise<{ deletedCount: number }>;
  getUnreadCount(userId: string): Promise<number>;
}

const NotificationMetadataSchema = new Schema<INotificationMetadata>(
  {
    assignmentId: { type: String },
    gradeId: { type: String },
    attendanceId: { type: String },
    courseId: { type: String },
    classId: { type: String },
    actionUrl: { type: String },
  },
  { _id: false }
);

const NotificationSchema = new Schema<INotification, INotificationModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.IN_APP,
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    metadata: { type: NotificationMetadataSchema },
    isRead: { type: Boolean, default: false, required: true, index: true },
    readAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Indexes
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, category: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
NotificationSchema.index({ createdAt: -1 });

// Virtuals
NotificationSchema.virtual('isExpired').get(function (this: INotification) {
  return this.expiresAt ? this.expiresAt < new Date() : false;
});

NotificationSchema.virtual('isUnread').get(function (this: INotification) {
  return !this.isRead;
});

// Instance methods
NotificationSchema.methods.markAsRead = async function (this: INotification): Promise<INotification> {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

NotificationSchema.methods.markAsUnread = async function (this: INotification): Promise<INotification> {
  this.isRead = false;
  this.readAt = undefined;
  await this.save();
  return this;
};

// Static methods
NotificationSchema.statics.findByUser = function (userId: string) {
  return this.find({ user: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
};

NotificationSchema.statics.findUnreadByUser = function (userId: string) {
  return this.find({ user: new mongoose.Types.ObjectId(userId), isRead: false }).sort({ createdAt: -1 });
};

NotificationSchema.statics.markAllAsRead = async function (userId: string) {
  const result = await this.updateMany(
    { user: new mongoose.Types.ObjectId(userId), isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return { modifiedCount: result.modifiedCount };
};

NotificationSchema.statics.deleteExpired = async function () {
  const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
  return { deletedCount: result.deletedCount };
};

NotificationSchema.statics.getUnreadCount = function (userId: string) {
  return this.countDocuments({ user: new mongoose.Types.ObjectId(userId), isRead: false });
};

const Notification = mongoose.model<INotification, INotificationModel>('Notification', NotificationSchema);

export default Notification;

