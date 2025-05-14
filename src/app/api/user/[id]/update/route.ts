import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { logUserActivity } from '@/lib/activity-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Profile update API called');
  
  try {
    // Verify authentication
    const authResult = await verifyAuth();
    if (!authResult.success) {
      console.error('Authentication failed:', authResult);
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user ID from params
    const userId = params.id;
    
    // Check authorization - users can only update their own profiles
    if (authResult.userId !== userId) {
      console.error('Authorization failed: User attempting to update different user profile');
      return NextResponse.json(
        { success: false, message: 'Unauthorized to update this profile' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    console.log('Update data received:', data);
    
    // Connect to database
    await connectDB();
    
    // Fetch existing user data to preserve fields not being updated
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare update object
    const updateData: any = {};
    
    // Basic fields that can be updated
    if (data.name) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    
    // Handle metadata updates
    if (data.metadata) {
      // Create or update the metadata object
      updateData.metadata = {
        ...existingUser.metadata || {},
        ...data.metadata
      };
    }
    
    // Handle address update while preserving other previousRegData
    if (data.address) {
      // Create a deep copy of the existing previousRegData or initialize a new one
      const previousRegData = existingUser.previousRegData ? 
        JSON.parse(JSON.stringify(existingUser.previousRegData)) : 
        { lastUpdated: new Date() };
      
      // Update only the address part
      previousRegData.address = data.address;
      previousRegData.lastUpdated = new Date();
      
      updateData.previousRegData = previousRegData;
    }
    
    // Set the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    console.log('Updating user with data:', updateData);
    
    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to update user' },
        { status: 500 }
      );
    }
    
    // Add activity logging
    await logUserActivity({
      userId: userId,
      type: 'PROFILE_UPDATE',
      description: 'Profile information updated',
      request,
      meta: {
        updatedFields: Object.keys(updateData)
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        referralCode: updatedUser.referralCode,
        previousRegData: updatedUser.previousRegData,
        photoUrl: updatedUser.photoUrl,
        metadata: updatedUser.metadata
      }
    });
    
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
} 