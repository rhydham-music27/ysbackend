import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import User, { IUser } from '../models/User';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { OAuthProvider, UserRole, FileCategory } from '../types/enums';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/fileUpload';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, profile, role } = req.body as {
      email: string;
      password: string;
      profile: { firstName: string; lastName: string; phone?: string };
      role?: UserRole;
    };

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const user = new User({
      email,
      password,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      },
      role: role || UserRole.STUDENT,
      provider: OAuthProvider.LOCAL,
      isActive: true,
      isEmailVerified: false,
    }) as IUser;

    await user.save();

    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = refreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await (User as any).findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    user.refreshToken = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    return next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: providedRefreshToken } = req.body as { refreshToken: string };

    const decoded = verifyRefreshToken(providedRefreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    if (!user.refreshToken || user.refreshToken !== providedRefreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token. Please login again.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user as IUser);
    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    return res.status(200).json({ success: true, data: { user: user.toJSON() } });
  } catch (error) {
    return next(error);
  }
}

export const googleOAuthInitiate = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

export async function googleOAuthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Google authentication failed' });
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // If FRONTEND_URL is provided, redirect with tokens (optional web flow)
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(
        accessToken
      )}&refreshToken=${encodeURIComponent(refreshToken)}`;
      return res.redirect(302, redirectUrl);
    }

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (error) {
    return next(error);
  }
}

export function googleOAuthFailure(_req: Request, res: Response) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    return res.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
  }
  return res.status(401).json({ success: false, message: 'Google authentication failed or was cancelled' });
}

export async function uploadProfileAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // If user already has avatar, delete old avatar from Cloudinary
    if (user.profile.avatar) {
      const publicId = extractPublicIdFromUrl(user.profile.avatar);
      if (publicId) {
        await deleteFromCloudinary({ publicId, resourceType: 'image' });
      }
    }

    // Upload new avatar
    const uploadResult = await uploadToCloudinary({
      file: req.file!,
      category: FileCategory.PROFILE_AVATAR,
    });

    if (!uploadResult.success || !uploadResult.url) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
        error: uploadResult.error,
      });
    }

    // Update user profile
    user.profile.avatar = uploadResult.url;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile avatar uploaded successfully',
      data: { avatar: uploadResult.url, user: user.toJSON() },
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProfileAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!user.profile.avatar) {
      return res.status(400).json({ success: false, message: 'No avatar to delete' });
    }

    // Extract public ID and delete from Cloudinary
    const publicId = extractPublicIdFromUrl(user.profile.avatar);
    if (publicId) {
      await deleteFromCloudinary({ publicId, resourceType: 'image' });
    }

    // Update user profile
    user.profile.avatar = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile avatar deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as IUser | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { firstName, lastName, phone, dateOfBirth, address } = req.body;

    // Update user profile fields
    if (firstName !== undefined) {
      user.profile.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.profile.lastName = lastName;
    }
    if (phone !== undefined) {
      user.profile.phone = phone;
    }
    if (dateOfBirth !== undefined) {
      user.profile.dateOfBirth = new Date(dateOfBirth);
    }
    if (address !== undefined) {
      user.profile.address = { ...user.profile.address, ...address };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: user.toJSON() },
    });
  } catch (error) {
    return next(error);
  }
}


