import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralCodeUsage extends Document {
  referralCode: string;
  userId: string;
  usedAt: Date;
}

const ReferralCodeUsageSchema: Schema = new Schema({
  referralCode: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index to ensure a user can only use a specific code once
ReferralCodeUsageSchema.index({ referralCode: 1, userId: 1 }, { unique: true });

export default mongoose.models.ReferralCodeUsage ||
  mongoose.model<IReferralCodeUsage>('ReferralCodeUsage', ReferralCodeUsageSchema); 