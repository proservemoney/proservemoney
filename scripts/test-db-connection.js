// Script to test the MongoDB connection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proservemoney';

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Database connection successful!');
    console.log('Connection URI:', MONGODB_URI);
    console.log('Connection state:', mongoose.connection.readyState);
    
    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('Disconnected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

testConnection(); 