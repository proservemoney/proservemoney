import bcrypt from 'bcryptjs';
import User from '../models/User';
import ReferralLink from '../models/ReferralLink';
import connectDB from './db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { verifyToken, validateTokenEnvironment } from './token-utils';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // This is a placeholder - actual authentication happens in the custom login API
        // NextAuth is used here primarily for session management
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Return a minimal user object - the real auth is handled by our custom API
        return {
          id: 'placeholder',
          email: credentials.email,
          name: 'User',
          role: 'user'
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours to match expireToken
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.userId || 'unknown',
          role: token.role || 'user'
        };
      }
      
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};

export async function registerUser({ 
  name, 
  email, 
  password, 
  referralCode, 
  utmCampaign, 
  utmMedium
}) {
  await connectDB();

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return { success: false, message: 'User with this email already exists' };
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new user
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    role: 'user', // Default role
    utm: {
      campaign: utmCampaign,
      medium: utmMedium
    }
  });

  // Handle referral code if provided
  let referredBy = null;
  if (referralCode) {
    const referralLink = await ReferralLink.findOne({ code: referralCode });
    if (referralLink) {
      referredBy = referralLink.userId;
      newUser.referredBy = referredBy;
      // Optionally, update the referrer's stats or send a notification
    } else {
      // Optional: Handle invalid referral code case
      console.warn(`Invalid referral code used during registration: ${referralCode}`);
    }
  }

  await newUser.save();

  return { success: true, user: newUser };
}

/**
 * Verifies the authentication status based on cookies.
 * @returns {Promise<{success: boolean, message?: string, userId?: string, isAdmin?: boolean}>}
 */
export async function verifyAuth() {
  try {
    validateTokenEnvironment(); // Ensure JWT_SECRET is set
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;
    const expireToken = cookieStore.get('expireToken')?.value;

    if (!userId || !expireToken) {
      return { success: false, message: 'No valid authentication found' };
    }

    // Verify the token
    const decoded = verifyToken(expireToken);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return { success: false, message: 'Invalid or expired token' };
    }

    // Check that userId in token matches userId cookie
    if (decoded.userId !== userId) {
      // Clear potentially compromised cookies
      cookieStore.delete('userId');
      cookieStore.delete('expireToken');
      return { success: false, message: 'User ID mismatch' };
    }

    // Check if user exists in DB
    await connectDB();
    const user = await User.findById(userId).select('role').lean(); // Only fetch necessary field

    if (!user) {
      // Clear cookies if user doesn't exist
      cookieStore.delete('userId');
      cookieStore.delete('expireToken');
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      userId,
      isAdmin: user.role === 'admin' || user.role === 'superadmin'
    };
  } catch (error: any) {
    console.error('Error during auth verification:', error);
    // Clear cookies on error as well
    const cookieStore = cookies();
    cookieStore.delete('userId');
    cookieStore.delete('expireToken');
    return { success: false, message: error.message || 'Authentication verification failed' };
  }
}