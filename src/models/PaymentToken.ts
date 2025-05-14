import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentToken extends Document {
  token: string;
  userId: string;
  email: string;
  amount: string;
  gstAmount: string;
  planId: string;
  address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  expiresAt: number; // Timestamp when the token expires
}

const PaymentTokenSchema: Schema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
  },
  gstAmount: {
    type: String,
  },
  planId: {
    type: String,
  },
  address: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  expiresAt: {
    type: Number,
    required: true,
  }
});

// Create TTL index on expiresAt to auto-delete expired tokens
PaymentTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PaymentToken || mongoose.model<IPaymentToken>('PaymentToken', PaymentTokenSchema); 