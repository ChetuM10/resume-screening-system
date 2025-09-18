// Load environment variables first
require('dotenv').config();

const mongoose = require('mongoose');
const Resume = require('./models/Resume');
const Screening = require('./models/Screening');

async function clearAll() {
  try {
    // Check if environment variable is loaded
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('Make sure you have a .env file with MONGODB_URI defined');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const resumeCount = await Resume.countDocuments();
    const screeningCount = await Screening.countDocuments();

    console.log(`📊 Found ${resumeCount} resumes and ${screeningCount} screenings`);

    await Resume.deleteMany({});
    await Screening.deleteMany({});

    console.log('🗑️ Cleared ' + resumeCount + ' resumes and ' + screeningCount + ' screenings');
    console.log('✅ Dashboard should now show zeros!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearAll();
