import mongoose, { Schema, Document } from 'mongoose';

export interface IReferenceCodeUsage extends Document {
  referenceCode: string;
  userId: mongoose.Types.ObjectId;
  usedAt: Date;
}

const ReferenceCodeUsageSchema: Schema = new Schema({
  referenceCode: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for querying and reporting
ReferenceCodeUsageSchema.index({ referenceCode: 1, userId: 1 }, { unique: true });

export default mongoose.models.ReferenceCodeUsage || 
  mongoose.model<IReferenceCodeUsage>('ReferenceCodeUsage', ReferenceCodeUsageSchema); 