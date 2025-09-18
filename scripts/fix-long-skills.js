const mongoose = require('mongoose');
const Screening = require('../models/Screening');

async function fixLongSkills() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-screening');
    console.log('Connected to database...');
    
    const screenings = await Screening.find({
      'requiredSkills': { $exists: true }
    });
    
    console.log(`Found ${screenings.length} screenings to check...`);
    
    let updated = 0;
    for (let screening of screenings) {
      let changed = false;
      
      screening.requiredSkills = screening.requiredSkills.map(skill => {
        if (skill.length > 200) {
          changed = true;
          console.log(`Truncating skill: ${skill.substring(0, 50)}...`);
          return skill.substring(0, 197) + '...';
        }
        return skill;
      });
      
      if (changed) {
        await screening.save();
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} screenings with truncated skills`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixLongSkills();
