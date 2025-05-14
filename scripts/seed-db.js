// Seed database script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://prosever:P5w4uBEXolYGMoaJ@prosever.nhtsph1.mongodb.net/';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Define User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  createdAt: Date,
  status: String,
  paymentCompleted: Boolean,
  paymentDate: Date,
  paymentInfo: {
    amount: Number,
    currency: String,
    last4: String,
    paymentMethod: String,
    paymentDate: Date
  }
});

// Create User model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Create test users
async function seedUsers() {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');
    
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
    
    console.log('Test users created successfully:');
    console.log('1. Email: paid@example.com, Password: password123 (payment completed)');
    console.log('2. Email: unpaid@example.com, Password: password123 (payment pending)');
    
    // Close the connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

// Run the seed function
seedUsers(); 