import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import User, { IUser } from '../models/User';
import { OAuthProvider, UserRole } from '../types/enums';
import { generateRandomPassword } from '../utils/password';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function verifyGoogle(
  accessToken: string,
  _refreshToken: string,
  profile: Profile,
  done: VerifyCallback
) {
  try {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const avatar = profile.photos?.[0]?.value;

    // 1) Lookup by googleId
    let user = await (User as any).findByGoogleId(googleId);
    if (user) {
      if (!user.isActive) return done(new Error('Account is deactivated'));
      return done(null, user);
    }

    // 2) Account linking by email
    if (email) {
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        if (existingByEmail.provider && existingByEmail.provider !== OAuthProvider.LOCAL) {
          return done(new Error('Email already registered with different provider'));
        }
        existingByEmail.googleId = googleId;
        existingByEmail.provider = OAuthProvider.GOOGLE;
        await existingByEmail.save();
        return done(null, existingByEmail);
      }
    }

    // 3) Create new user
    if (!email) {
      return done(new Error('Google account has no accessible email'));
    }

    const newUser = new User({
      email,
      password: generateRandomPassword(32),
      googleId,
      provider: OAuthProvider.GOOGLE,
      profile: { firstName, lastName, avatar },
      role: UserRole.STUDENT,
      isActive: true,
      isEmailVerified: true,
    }) as IUser;
    await newUser.save();
    return done(null, newUser);
  } catch (error) {
    return done(error as Error);
  }
}

export function initializePassport(): void {
  const clientID = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const callbackURL = getEnv('GOOGLE_CALLBACK_URL');

  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
        passReqToCallback: false,
      },
      verifyGoogle
    )
  );

  // No serialize/deserialize needed since we use stateless JWT, not sessions
}

export default passport;


