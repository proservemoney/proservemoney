import mongoose, { Schema, Document } from 'mongoose';

export interface IEarning extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  source: 'referral' | 'commission' | 'bonus';
  referralId?: mongoose.Types.ObjectId; // ID of the user who was referred (if source is 'referral')
  level?: number; // Level in the referral chain (1-10)
  description: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'paid';
}

const EarningSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  source: {
    type: String,
    enum: ['referral', 'commission', 'bonus'],
    required: true,
  },
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  level: {
    type: Number,
    min: 1,
    max: 10,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending',
  },
});

// Add indexes for efficient queries
EarningSchema.index({ userId: 1, createdAt: -1 });
EarningSchema.index({ source: 1 });
EarningSchema.index({ createdAt: 1 });

export default mongoose.models.Earning || mongoose.model<IEarning>('Earning', EarningSchema); 