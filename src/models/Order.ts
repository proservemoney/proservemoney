import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentId: {
    type: String
  },
  metadata: {
    type: Object,
    default: {}
  },
  items: [{
    name: String,
    description: String,
    price: Number,
    quantity: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp when a document is updated
OrderSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

// Check if the model already exists to prevent overwriting it during hot-reloading
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

export default Order; 