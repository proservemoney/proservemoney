import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyWallet extends Document {
  walletId: string;
  balance: number;
  updatedAt: Date;
}

const CompanyWalletSchema: Schema = new Schema({
  walletId: {
    type: String,
    default: 'company',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create or retrieve the CompanyWallet model
const CompanyWallet = mongoose.models.CompanyWallet || 
  mongoose.model<ICompanyWallet>('CompanyWallet', CompanyWalletSchema);

export default CompanyWallet; 