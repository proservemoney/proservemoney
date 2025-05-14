import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthToken extends Document {
  userId: string;
  refreshToken: string;
  expireToken: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string;
  refreshTokenExpiresAt: Date;
  expireTokenExpiresAt: Date;
  isValid: boolean;
  createdAt: Date;
}

const AuthTokenSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  expireToken: {
    type: String,
    required: true,
    unique: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: String,
    required: true
  },
  refreshTokenExpiresAt: {
    type: Date,
    required: true
  },
  expireTokenExpiresAt: {
    type: Date,
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create TTL indexes to auto-expire tokens
AuthTokenSchema.index({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
AuthTokenSchema.index({ expireTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AuthToken || mongoose.model<IAuthToken>('AuthToken', AuthTokenSchema); 