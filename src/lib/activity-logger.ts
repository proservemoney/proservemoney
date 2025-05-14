import { NextRequest } from 'next/server';
import connectDB from './db';
import UserActivity from '../models/UserActivity';

export type ActivityType = 
  | 'LOGIN' 
  | 'SIGNUP' 
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGE'
  | 'PROFILE_UPDATE'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'REFERRAL_SIGNUP'
  | 'EMAIL_VERIFICATION'
  | 'PHONE_VERIFICATION';

interface LogActivityParams {
  userId: string;
  type: ActivityType;
  description: string;
  request?: NextRequest;
  meta?: Record<string, any>;
}

/**
 * Logs user activity to the database
 * This function should not throw errors or interrupt the main flow
 */
export async function logUserActivity({
  userId,
  type,
  description,
  request,
  meta = {}
}: LogActivityParams): Promise<void> {
  try {
    // Connect to database
    await connectDB();
    
    // Extract IP and device info if request is available
    let ip: string | undefined;
    let device: string | undefined;
    
    if (request) {
      // Get IP from request
      ip = request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') ||
           'unknown';
      
      // Get user agent from request
      const userAgent = request.headers.get('user-agent') || 'unknown';
      device = userAgent;
    }
    
    // Create and save activity
    const activity = new UserActivity({
      userId,
      type,
      description,
      ip,
      device,
      meta
    });
    
    await activity.save();
    console.log(`Activity logged: ${type} for user ${userId}`);
  } catch (error) {
    // Log error but don't throw - this should not interrupt the main flow
    console.error('Failed to log user activity:', error);
  }
} 