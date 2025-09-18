const fs = require('fs');
const path = require('path');

const sampleResumes = [
  {
    filename: "john_smith_developer.txt",
    content: `John Smith
Email: john.smith@email.com
Phone: (555) 123-4567
Location: New York, NY

SKILLS:
JavaScript, Node.js, React, MongoDB, AWS, Git, HTML, CSS, Express

EXPERIENCE:
Software Developer - ABC Tech Company
2020 - Present (3 years)
• Developed web applications using React and Node.js
• Worked with MongoDB databases
• Implemented REST APIs

Junior Developer - XYZ Solutions
2018 - 2020 (2 years)
• Built responsive websites using HTML, CSS, JavaScript
• Collaborated with team of 5 developers

EDUCATION:
Bachelor of Science in Computer Science
State University, 2018`
  },
  {
    filename: "sarah_johnson_support.txt",
    content: `Sarah Johnson
Email: sarah.j@example.com
Phone: +1-555-987-6543

SKILLS:
Technical Support, Troubleshooting, Windows, Linux, Help Desk, Customer Service, Hardware, Network Basics

EXPERIENCE:
Technical Support Specialist - Help Solutions Inc
2019 - Present (4 years)
• Provided technical support to 50+ daily customers
• Troubleshot hardware and software issues
• Maintained 95% customer satisfaction rating

IT Support Assistant - Local Business
2017 - 2019 (2 years)
• Assisted with computer setup and maintenance
• Resolved network connectivity issues

EDUCATION:
Associate Degree in Information Technology
Community College, 2017`
  },
  {
    filename: "mike_davis_data.txt",
    content: `Mike Davis
mike.davis@gmail.com
(555) 234-5678
San Francisco, CA

TECHNICAL SKILLS:
Python, Machine Learning, Data Analysis, SQL, TensorFlow, Pandas, NumPy, Tableau, Statistics, R

PROFESSIONAL EXPERIENCE:
Data Scientist - DataCorp
2021 - Present (2 years)
• Built machine learning models for customer segmentation
• Analyzed large datasets using Python and SQL
• Created visualizations with Tableau

Data Analyst - StartupXYZ
2019 - 2021 (2 years)
• Performed statistical analysis on user behavior data
• Developed automated reporting systems

EDUCATION:
Master of Science in Data Science
Tech University, 2019

Bachelor of Mathematics
State College, 2017`
  }
];

// Create test resumes
const testDir = path.join(__dirname, '../test-resumes');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

sampleResumes.forEach(resume => {
  fs.writeFileSync(
    path.join(testDir, resume.filename), 
    resume.content,
    'utf8'
  );
});

console.log(`✅ Created ${sampleResumes.length} test resumes in ./test-resumes/`);
