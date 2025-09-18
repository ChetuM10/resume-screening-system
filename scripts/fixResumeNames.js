const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { processResumeText } = require('../services/nlpService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');

async function fixExistingResumeNames() {
  try {
    console.log('🔄 Starting resume name correction...');
    
    const resumes = await Resume.find({});
    console.log(`📊 Found ${resumes.length} resumes to process`);
    
    for (let resume of resumes) {
      const oldName = resume.candidateName;
      
      if (resume.extractedText) {
        try {
          const parsed = await processResumeText(resume.extractedText);
          const newName = parsed.name;
          
          if (newName !== oldName && newName !== 'Unknown Candidate') {
            console.log(`🔄 Updating: "${oldName}" → "${newName}"`);
            
            await Resume.updateOne(
              { _id: resume._id },
              { 
                candidateName: newName,
                email: parsed.email || resume.email,
                phone: parsed.phone || resume.phone,
                skills: parsed.skills || resume.skills
              }
            );
          }
        } catch (error) {
          console.error(`❌ Error processing ${oldName}:`, error.message);
        }
      }
    }
    
    console.log('✅ Resume name correction completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing resume names:', error);
    process.exit(1);
  }
}

fixExistingResumeNames();
