import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  description: string;
  ip?: string;
  device?: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

const UserActivitySchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  ip: {
    type: String
  },
  device: {
    type: String
  },
  meta: {
    type: Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create indexes for efficient querying
UserActivitySchema.index({ userId: 1, createdAt: -1 });
UserActivitySchema.index({ type: 1, createdAt: -1 });

// Create or retrieve the UserActivity model
const UserActivity = mongoose.models.UserActivity || 
  mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);

export default UserActivity; 