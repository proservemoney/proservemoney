import mongoose from 'mongoose';

const ReferralLinkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  signups: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

// Check if model exists to prevent model overwrite during hot reloading
const ReferralLink = mongoose.models.ReferralLink || mongoose.model('ReferralLink', ReferralLinkSchema);

export default ReferralLink; 