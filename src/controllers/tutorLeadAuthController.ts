import { Request, Response } from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import TutorLeadApplication from '../models/TutorLeadApplication';
import { comparePassword } from '../utils/password';

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function updateTutorLeadMe(req: Request, res: Response) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing authorization token' });

    const decoded = jwt.verify(token, getEnv('JWT_SECRET') as Secret, {
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-tutor-leads',
    }) as any;
    const id = decoded?.sub as string | undefined;
    if (!id) return res.status(401).json({ success: false, message: 'Invalid token' });

    // Accept fields from registration form
    const {
      email,
      profile,
      tutorLead,
    } = req.body as {
      email?: string;
      profile?: { firstName?: string; lastName?: string; phone?: string; dateOfBirth?: string | Date; address?: any; avatar?: string };
      tutorLead?: { gender?: string; qualification?: string; experience?: string; subjects?: string[]; preferredAreas?: string[]; city?: string; pincode?: string; phoneNumber?: string };
    };

    const updates: any = {};
    if (email) updates.email = String(email).toLowerCase().trim();
    if (profile?.firstName || profile?.lastName) {
      updates.firstName = profile?.firstName;
      updates.lastName = profile?.lastName;
      const parts = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
      if (parts) updates.fullName = parts;
    }
    if (profile?.phone) updates.phoneNumber = profile.phone;
    if (profile?.dateOfBirth) updates.dateOfBirth = new Date(profile.dateOfBirth as any);
    if (profile?.address) {
      updates.address = {
        street: profile.address.street,
        city: profile.address.city,
        state: profile.address.state,
        zipCode: profile.address.zipCode,
        country: profile.address.country,
      };
    }
    if (profile?.avatar && typeof profile.avatar === 'string') {
      updates.avatarUrl = profile.avatar;
    }
    if (tutorLead) {
      if (tutorLead.gender) updates.gender = tutorLead.gender;
      if (tutorLead.qualification) updates.qualification = tutorLead.qualification;
      if (tutorLead.experience) updates.experience = tutorLead.experience;
      if (Array.isArray(tutorLead.subjects)) updates.subjects = tutorLead.subjects;
      if (Array.isArray(tutorLead.preferredAreas)) updates.preferredAreas = tutorLead.preferredAreas;
      if (tutorLead.city) updates.city = tutorLead.city;
      if (tutorLead.pincode) updates.pincode = tutorLead.pincode;
      if (tutorLead.phoneNumber) updates.phoneNumber = tutorLead.phoneNumber;
    }
    // Ensure verification remains pending
    updates.isVerification = false;

    const doc = await TutorLeadApplication.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Tutor lead not found' });

    return res.status(200).json({ success: true, message: 'Details updated', data: { id: doc.id } });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Update failed' });
  }
}
export async function tutorLeadMe(req: Request, res: Response) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Missing authorization token' });
    }

    const decoded = jwt.verify(token, getEnv('JWT_SECRET') as Secret, {
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-tutor-leads',
    }) as any;

    const id = decoded?.sub as string | undefined;
    if (!id) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const doc = await TutorLeadApplication.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Tutor lead not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        teacherId: doc.teacherId,
        fullName: doc.fullName,
        gender: doc.gender,
        phoneNumber: doc.phoneNumber,
        email: doc.email,
        qualification: doc.qualification,
        experience: doc.experience,
        subjects: doc.subjects,
        city: doc.city,
        preferredAreas: doc.preferredAreas,
        pincode: doc.pincode,
        isVerification: doc.isVerification === true,
      },
    });
  } catch (e: any) {
    return res.status(401).json({ success: false, message: e?.message || 'Unauthorized' });
  }
}

export async function tutorLeadLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const doc = await TutorLeadApplication.findOne({ email }).select('+password');
    if (!doc) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const ok = await comparePassword(password, doc.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        sub: String(doc._id),
        email: doc.email,
        teacherId: doc.teacherId,
        type: 'tutorLead',
      },
      getEnv('JWT_SECRET') as Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'yourshikshak-api',
        audience: 'yourshikshak-tutor-leads',
      } as SignOptions
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        teacherId: doc.teacherId,
        isVerification: doc.isVerification === true,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Login failed' });
  }
}
