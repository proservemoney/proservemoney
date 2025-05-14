import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  transactionId?: string;
  processedAt?: Date;
  adminMessage?: string;
  accountDetails?: string;
}

const WithdrawalSchema = new Schema<IWithdrawal>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  transactionId: {
    type: String
  },
  processedAt: {
    type: Date
  },
  adminMessage: {
    type: String,
    default: ''
  },
  accountDetails: {
    type: String,
    required: true
  }
});

// Create model or use existing model to prevent overwrite error
const Withdrawal = mongoose.models.Withdrawal || mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);

export default Withdrawal; 