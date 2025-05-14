import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
  // Who earned the commission
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Who's signup/payment generated this commission
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Amount of commission
  amount: {
    type: Number,
    required: true
  },
  // The level at which this commission was earned (1-10)
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  // Percentage applied for this commission
  percentage: {
    type: Number,
    required: true
  },
  // Transaction details
  planType: {
    type: String,
    enum: ['basic', 'premium'],
    required: true
  },
  planAmount: {
    type: Number,
    required: true
  },
  // Status of the commission payment
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  }
});

// Indexes for faster lookups
commissionSchema.index({ userId: 1 });
commissionSchema.index({ fromUserId: 1 });
commissionSchema.index({ status: 1 });

// Create or retrieve the Commission model
const Commission = 
  mongoose.models.Commission || mongoose.model('Commission', commissionSchema);

export default Commission; 