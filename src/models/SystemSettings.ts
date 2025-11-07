import mongoose, { Document, Model, Schema } from 'mongoose';
import { SettingType } from '../types/enums';

export interface ISystemSettings extends Document {
  key: string;
  value: any;
  type: SettingType;
  category: string;
  description: string;
  isPublic: boolean;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  getTypedValue(): any;
}

export interface ISystemSettingsModel extends Model<ISystemSettings> {
  findByKey(key: string): Promise<ISystemSettings | null>;
  findByCategory(category: string): Promise<ISystemSettings[]>;
  getPublicSettings(): Promise<ISystemSettings[]>;
  getSetting(key: string, defaultValue?: any): Promise<any>;
  setSetting(key: string, value: any, updatedBy: string): Promise<ISystemSettings>;
}

const SystemSettingsSchema = new Schema<ISystemSettings, ISystemSettingsModel>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(SettingType),
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
SystemSettingsSchema.index({ key: 1 }, { unique: true });
SystemSettingsSchema.index({ category: 1, isPublic: 1 });
SystemSettingsSchema.index({ updatedAt: -1 });

// Instance method
SystemSettingsSchema.methods.getTypedValue = function () {
  const setting = this as ISystemSettings;
  switch (setting.type) {
    case SettingType.BOOLEAN:
      return Boolean(setting.value);
    case SettingType.NUMBER:
      return Number(setting.value);
    case SettingType.STRING:
      return String(setting.value);
    case SettingType.JSON:
      return setting.value;
    default:
      return setting.value;
  }
};

// Pre-save hook for type validation
SystemSettingsSchema.pre('save', function (next) {
  const setting = this as ISystemSettings;
  
  switch (setting.type) {
    case SettingType.BOOLEAN:
      if (typeof setting.value !== 'boolean') {
        return next(new Error(`Value must be a boolean for setting type ${setting.type}`));
      }
      break;
    case SettingType.NUMBER:
      if (typeof setting.value !== 'number' || isNaN(setting.value)) {
        return next(new Error(`Value must be a number for setting type ${setting.type}`));
      }
      break;
    case SettingType.STRING:
      if (typeof setting.value !== 'string') {
        return next(new Error(`Value must be a string for setting type ${setting.type}`));
      }
      break;
    case SettingType.JSON:
      if (typeof setting.value !== 'object' || setting.value === null || Array.isArray(setting.value)) {
        // Allow objects and arrays for JSON type
        if (typeof setting.value !== 'object' || setting.value === null) {
          return next(new Error(`Value must be an object or array for setting type ${setting.type}`));
        }
      }
      break;
  }
  
  next();
});

// Static methods
SystemSettingsSchema.statics.findByKey = function (key: string) {
  return this.findOne({ key: key.toUpperCase() });
};

SystemSettingsSchema.statics.findByCategory = function (category: string) {
  return this.find({ category: category.toLowerCase() }).sort({ key: 1 });
};

SystemSettingsSchema.statics.getPublicSettings = function () {
  return this.find({ isPublic: true })
    .select('-updatedBy')
    .sort({ category: 1, key: 1 });
};

SystemSettingsSchema.statics.getSetting = async function (key: string, defaultValue?: any) {
  const setting = await this.findOne({ key: key.toUpperCase() });
  if (setting) {
    return setting.value;
  }
  return defaultValue;
};

SystemSettingsSchema.statics.setSetting = async function (key: string, value: any, updatedBy: string) {
  const upperKey = key.toUpperCase();
  const existing = await this.findOne({ key: upperKey });
  
  // Infer type if not exists
  let inferredType: SettingType;
  if (typeof value === 'boolean') {
    inferredType = SettingType.BOOLEAN;
  } else if (typeof value === 'number') {
    inferredType = SettingType.NUMBER;
  } else if (typeof value === 'string') {
    inferredType = SettingType.STRING;
  } else if (typeof value === 'object' && value !== null) {
    inferredType = SettingType.JSON;
  } else {
    inferredType = SettingType.STRING;
  }

  if (existing) {
    existing.value = value;
    existing.type = existing.type || inferredType;
    existing.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    return existing.save();
  } else {
    // For new settings, require category and description
    // This will be handled in service layer, but we set defaults here
    return this.create({
      key: upperKey,
      value,
      type: inferredType,
      category: 'general',
      description: `Setting for ${upperKey}`,
      updatedBy: new mongoose.Types.ObjectId(updatedBy),
    });
  }
};

const SystemSettings = mongoose.model<ISystemSettings, ISystemSettingsModel>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;

