import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import connectDB from '@/lib/db';
import { verifyEmail, isEmailValid } from '@/lib/email-verification';
import mongoose from 'mongoose';
import User from '@/models/User';
import { validateReferralCode, recordReferralCodeUsage } from '@/lib/referral-code';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/email';
import { generateToken } from '@/lib/token';
import { generateAuthTokens } from '@/lib/token-utils';
import { logUserActivity } from '@/lib/activity-logger';

// Function to generate a random reference code (5-6 characters alphanumeric)
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = Math.floor(Math.random() * 2) + 5; // Random length between 5-6
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to check if a referral code exists
async function isReferralCodeExists(code: string, UserModel: mongoose.Model<any>): Promise<boolean> {
  if (!code) return false;
  const user = await UserModel.findOne({ referralCode: code });
  return !!user;
}

// We're using the imported User model from '@/models/User'
// No need to redefine the schema here

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password, name, phone, referralCode, phoneVerified } = await request.json();

    // Get UTM parameters from request
    const url = new URL(request.url);
    const utmCampaign = url.searchParams.get('utm_campaign') || '';
    const utmMedium = url.searchParams.get('utm_medium') || '';
    const utmSource = url.searchParams.get('utm_source') || '';

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify email using multiple services
    const verificationResults = await verifyEmail(email);
    const isValidEmail = isEmailValid(verificationResults);

    if (!isValidEmail) {
      return NextResponse.json(
        { 
          error: 'Invalid email address',
          details: verificationResults.map(result => ({
            service: result.service,
            status: result.details?.status,
            reason: result.details?.reason
          }))
        },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Account already exists', field: 'email', value: email },
        { status: 400 }
      );
    }

    // Check if user already exists with this phone number (if provided)
    if (phone && phone.trim() !== '') {
      const existingUserByPhone = await User.findOne({ phone });
      if (existingUserByPhone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists', field: 'phone', value: phone, status: 'exists' },
          { status: 400 }
        );
      }
    }

    // Validate referral code if provided
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return NextResponse.json({ success: false, message: 'Invalid referral code' }, { status: 400 });
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Generate a unique referral code for the new user
    let newUserReferralCode;
    let isUnique = false;
    let attempts = 0;
    
    // Try up to 10 times to generate a unique referral code
    while (!isUnique && attempts < 10) {
      newUserReferralCode = generateReferralCode();
      isUnique = !(await isReferralCodeExists(newUserReferralCode, User));
      attempts++;
    }
    
    if (!isUnique) {
      console.error('Failed to generate unique referral code after 10 attempts');
      return NextResponse.json(
        { error: 'Failed to generate unique referral code' },
        { status: 500 }
      );
    }

    // Create user with the referral code
    const user = await User.create({
      email,
      name,
      phone: phone || null,
      password: hashedPassword,
      usedReferralCode: referralCode || null,
      referralCode: newUserReferralCode,
      emailVerified: false,
      phoneVerified: !!phoneVerified,
      verificationToken: generateToken(),
      // Store UTM parameters if available
      metadata: {
        utmCampaign: utmCampaign || undefined,
        utmMedium: utmMedium || undefined,
        utmSource: utmSource || undefined
      }
    });

    // Log the created user and its ID
    console.log('Created user with ID:', user._id.toString());
    console.log('User referral code:', newUserReferralCode);
    
    // Handle referral relationship
    if (referralCode) {
      console.log('User signed up with referral code:', referralCode);
      
      // Find the referrer user
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Update the new user to record who referred them
        user.referredBy = referrer._id;
        
        // Set up referral ancestors for multi-level tracking
        // First, add the direct referrer as a level 1 ancestor
        const referralAncestors = [{ userId: referrer._id, level: 1 }];
        
        // If the referrer has ancestors, add them as higher level ancestors
        if (referrer.referralAncestors && referrer.referralAncestors.length > 0) {
          // Add all ancestors from the referrer with their level increased by 1
          const higherLevelAncestors = referrer.referralAncestors.map(ancestor => ({
            userId: ancestor.userId,
            level: ancestor.level + 1
          }));
          
          // Combine direct referrer with higher level ancestors
          referralAncestors.push(...higherLevelAncestors);
        }
        
        // Update the user with all ancestors
        user.referralAncestors = referralAncestors;
        await user.save();
        
        // Add this user to the referrer's list of referrals and increment their referral count
        await User.findByIdAndUpdate(referrer._id, {
          $push: { referrals: user._id },
          $inc: { referralCount: 1 } // Increment referral count
        });
        
        console.log(`User was referred by: ${referrer.name} (${referrer._id})`);
        console.log(`Referral ancestors set up: ${JSON.stringify(referralAncestors)}`);
        
        // Track conversion for custom referral link if UTM parameters are provided
        if (utmCampaign || utmMedium || utmSource) {
          // Build query to find matching referral link
          const query: any = { 
            referralCode,
            userId: referrer._id
          };
          
          // Add UTM parameters to query if provided
          if (utmCampaign) query.campaign = utmCampaign;
          if (utmMedium) query.medium = utmMedium;
          if (utmSource) query.source = utmSource;
          
          // Find and update the referral link
          const ReferralLink = mongoose.model('ReferralLink');
          const referralLink = await ReferralLink.findOne(query);
          
          if (referralLink) {
            referralLink.conversions += 1;
            await referralLink.save();
            console.log(`Tracked conversion for referral link: ${referralLink.shortId}`);
          }
        }
      }
    }

    // Generate authentication tokens for the new user
    const userIdStr = user._id.toString();
    
    // Get IP address and user agent for token generation
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    let tokens = null;
    try {
      tokens = await generateAuthTokens(userIdStr, ipAddress, userAgent);
      console.log('Generated auth tokens for new user');
    } catch (tokenError) {
      console.error('Error generating tokens during signup:', tokenError);
      // Continue with signup process even if token generation fails
    }
    
    // Convert to plain object
    const userObject = user.toObject();
    
    // Ensure the _id is properly stringified
    userObject._id = user._id.toString();
    
    // Remove password from the response
    delete userObject.password;

    const response = NextResponse.json(
      { 
        user: userObject,
        message: 'User created successfully',
        emailVerification: verificationResults.map(result => ({
          service: result.service,
          status: result.details?.status
        }))
      },
      { status: 201 }
    );
    
    // Set authentication cookies if tokens were generated
    if (tokens) {
      const refreshTokenCookie = `refreshToken=${tokens.refreshToken}; path=/; max-age=${60 * 60}; SameSite=Lax; HttpOnly`;
      const expireTokenCookie = `expireToken=${tokens.expireToken}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax; HttpOnly`;
      const userIdCookie = `userId=${userIdStr}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax`;
      
      response.headers.append('Set-Cookie', refreshTokenCookie);
      response.headers.append('Set-Cookie', expireTokenCookie);
      response.headers.append('Set-Cookie', userIdCookie);
    }
    
    // Log the signup activity
    await logUserActivity({
      userId: userIdStr,
      type: 'SIGNUP',
      description: 'New user registration',
      request,
      meta: {
        name: user.name,
        email: user.email,
        referralCode: referralCode || null
      }
    });

    // Record referral code usage
    if (referralCode) {
      await recordReferralCodeUsage(referralCode, userIdStr);
    }

    return response;
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Define a more specific interface for MongoDB error
    interface MongoDBError extends mongoose.Error {
      code?: number;
      keyPattern?: Record<string, number>;
      keyValue?: Record<string, string>;
    }
    
    // Check for duplicate key error (MongoDB error code 11000)
    if (error instanceof mongoose.Error.ValidationError || 
        (error as MongoDBError).code === 11000) {
      const mongoError = error as MongoDBError;
      
      // Check key pattern (which field caused the duplicate error)
      if (mongoError.keyPattern) {
        if (mongoError.keyPattern.email) {
          // Get the duplicate email value from keyValue if available
          const emailValue = mongoError.keyValue?.email || '';
          return NextResponse.json(
            { 
              error: 'An account with this email already exists', 
              field: 'email',
              value: emailValue,
              status: 'exists'
            },
            { status: 400 }
          );
        }
        if (mongoError.keyPattern.phone) {
          // Get the duplicate phone value from keyValue if available
          const phoneValue = mongoError.keyValue?.phone || '';
          return NextResponse.json(
            { 
              error: 'An account with this phone number already exists', 
              field: 'phone',
              value: phoneValue,
              status: 'exists'
            },
            { status: 400 }
          );
        }
      }
      
      // If it's a validation error but not duplicate, return the validation error message
      return NextResponse.json(
        { error: 'Validation error', details: errorMessage },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred during signup', details: errorMessage },
      { status: 500 }
    );
  }
} 