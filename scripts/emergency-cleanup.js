const mongoose = require('mongoose');

async function emergencyCleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-screening');
        console.log('Connected to database...');

        // Use raw MongoDB operations to bypass Mongoose validation
        const db = mongoose.connection.db;
        
        // 1. Delete ALL existing screenings (fresh start)
        const deleteResult = await db.collection('screenings').deleteMany({});
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing screenings`);

        // 2. Verify no problematic documents remain
        const remaining = await db.collection('screenings').countDocuments({});
        console.log(`✅ Remaining documents: ${remaining}`);

        console.log('✅ Emergency cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

emergencyCleanup();
