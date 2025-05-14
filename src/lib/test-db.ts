import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';

/**
 * Start an in-memory MongoDB server for testing
 */
export async function startTestDb() {
  // Start in-memory MongoDB server
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory server
  await mongoose.connect(mongoUri);
  
  console.log(`MongoDB Memory Server running at ${mongoUri}`);
  
  // Set up test data
  await createTestUsers();
  
  return {
    mongoServer,
    mongoUri,
    cleanup: async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  };
}

/**
 * Create test users for testing the payment flow
 */
async function createTestUsers() {
  // Clear existing users
  await User.deleteMany({});
  
  // Create a user with payment completed
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  // User with completed payment
  await User.create({
    name: 'Paid User',
    email: 'paid@example.com',
    password: hashedPassword,
    status: 'active',
    paymentCompleted: true,
    paymentDate: new Date(),
    paymentInfo: {
      amount: 49.99,
      currency: 'USD',
      last4: '4242',
      paymentMethod: 'credit_card',
      paymentDate: new Date()
    }
  });
  
  // User with pending payment
  await User.create({
    name: 'Unpaid User',
    email: 'unpaid@example.com',
    password: hashedPassword,
    status: 'pending',
    paymentCompleted: false
  });
  
  console.log('Test users created successfully');
}

// Run standalone if executed directly
if (require.main === module) {
  startTestDb()
    .then(() => {
      console.log('Test database started successfully');
      console.log('Test Users:');
      console.log('1. Email: paid@example.com, Password: password123 (payment completed)');
      console.log('2. Email: unpaid@example.com, Password: password123 (payment pending)');
      console.log('\nPress Ctrl+C to stop the server');
    })
    .catch(console.error);
} 