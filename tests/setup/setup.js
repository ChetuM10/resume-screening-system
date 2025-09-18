/**
 * Global test setup for Resume Screening System
 * Handles database connections using MongoDB Memory Server
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set environment variable for consistency
  process.env.MONGO_URI = mongoUri;
  
  // Connect to in-memory MongoDB - REMOVE DEPRECATED OPTIONS
  await mongoose.connect(mongoUri);

  console.log('✅ Test database connected:', mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global test cleanup
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('✅ Test database disconnected');
});

// Increase timeout for database operations
jest.setTimeout(20000);
