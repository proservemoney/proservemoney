import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface PaymentInfo {
  amount: number;
  currency: string;
  last4: string;
  paymentMethod: string;
  paymentDate: Date;
}

interface AddressInfo {
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface PlanInfo {
  planId: string;
  planAmount: number;
  gstAmount: number;
}

interface WalletInfo {
  balance: number;
  currency: string;
  lastUpdated: Date;
}

interface PreviousRegData {
  address?: AddressInfo;
  plan?: PlanInfo;
  lastUpdated: Date;
}

interface MetadataInfo {
  utmCampaign?: string;
  utmMedium?: string;
  utmSource?: string;
}

export interface IUserPaymentInfo {
  cardType?: string;
  lastFour?: string;
  expMonth?: number;
  expYear?: number;
  stripeCustomerId?: string;
  default?: boolean;
}

export interface IUserSubscription {
  planId?: string;
  planName?: string;
  status?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
}

export interface INotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface IWallet {
  balance: number;
  currency: string;
  transactions?: Array<{
    amount: number;
    type: string;
    description: string;
    date: Date;
    reference?: string;
  }>;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  password: string;
  createdAt: Date;
  status: 'pending' | 'active' | 'suspended';
  paymentCompleted: boolean;
  paymentDate?: Date;
  paymentInfo?: PaymentInfo;
  previousRegData?: PreviousRegData;
  referralCode?: string;
  usedReferralCode?: string;
  referrals: mongoose.Types.ObjectId[];
  referredBy: mongoose.Types.ObjectId;
  referralAncestors: { userId: mongoose.Types.ObjectId; level: number }[];
  referralCount: number;
  totalEarnings: number;
  plan: string;
  planAmount: number;
  updatedAt: Date;
  wallet?: WalletInfo;
  role?: 'user' | 'admin' | 'superadmin';
  photoUrl?: string;
  metadata?: MetadataInfo;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorMethod?: 'sms' | 'email';
  twoFactorCode?: string;
  twoFactorCodeExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  phoneVerificationToken?: string;
  phoneVerificationExpires?: Date;
  paymentInfo?: IUserPaymentInfo[];
  subscriptions?: IUserSubscription[];
  notificationPreferences?: INotificationPreferences;
  wallet?: IWallet;
  usedPromotion?: string[];
  lastLogin?: Date;
  lastIP?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'US'
  }
});

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    trim: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  photoUrl: {
    type: String
  },
  address: {
    type: addressSchema,
    default: () => ({})
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  utm: {
    campaign: String,
    source: String,
    medium: String
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  planAmount: {
    type: Number,
    default: 0
  },
  previousRegData: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Only hash the password if it's new or modified
UserSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Password was already hashed in auth.ts
  next();
});

// Update timestamp on edit
UserSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate referral code
UserSchema.pre('save', function (next) {
  if (!this.referralCode && this.isNew) {
    this.referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
  }
  next();
});

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 