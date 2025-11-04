import mongoose, { Document, Model, Schema } from 'mongoose';
import { OAuthProvider, UserRole } from '../types/enums';
import { comparePassword as comparePasswordUtil, hashPassword } from '../utils/password';

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  provider: OAuthProvider;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    dateOfBirth?: Date;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  googleId?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
}

const emailRegex = /^(?:[a-zA-Z0-9_'^&+\-])+(?:\.(?:[a-zA-Z0-9_'^&+\-])+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

const ProfileSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(OAuthProvider),
      default: OAuthProvider.LOCAL,
      index: true,
    },
    profile: { type: ProfileSchema, required: true },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    googleId: { type: String, sparse: true, index: true },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Custom validators / pre-save checks
UserSchema.pre('save', async function preSave(next) {
  try {
    const user = this as IUser;

    // Provider-based validations
    if (user.provider === OAuthProvider.LOCAL && !user.password) {
      return next(new Error('Password is required for local provider'));
    }
    if (user.provider === OAuthProvider.GOOGLE && !user.googleId) {
      return next(new Error('googleId is required when provider is google'));
    }

    // Hash password if modified
    if (user.isModified('password')) {
      user.password = await hashPassword(user.password);
    }

    return next();
  } catch (err) {
    return next(err as Error);
  }
});

// Unique email error message improvement
UserSchema.post('save', function postSave(error: any, _doc: any, next: (err?: any) => void) {
  if (error && error.code === 11000 && error.keyPattern && error.keyPattern.email) {
    next(new Error('Email already exists'));
  } else {
    next(error);
  }
});

// Instance methods
UserSchema.methods.comparePassword = function comparePasswordInstance(candidatePassword: string): Promise<boolean> {
  const user = this as IUser;
  return comparePasswordUtil(candidatePassword, user.password);
};

// Virtuals
UserSchema.virtual('fullName').get(function fullName(this: IUser) {
  const first = this.profile?.firstName || '';
  const last = this.profile?.lastName || '';
  return [first, last].filter(Boolean).join(' ');
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ email: 1, provider: 1 });

// Transform JSON output to hide sensitive fields
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

User.findByEmail = function findByEmail(email: string) {
  return this.findOne({ email }).select('+password');
};

User.findByGoogleId = function findByGoogleId(googleId: string) {
  return this.findOne({ googleId });
};

export default User;


