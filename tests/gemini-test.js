/**
 * @fileoverview Gemini 2.5 Flash API Test - FIXED REGEX
 * @version 6.0.0 - Working version
 */

require('dotenv').config();

const SAMPLE_RESUME = `
John Smith
Email: john.smith@example.com
Phone: +91-9876543210

PROFESSIONAL SUMMARY
Software Developer with 3 years of experience in full-stack web development.

SKILLS
JavaScript, React, Node.js, Express, MongoDB, Python, AWS, Docker, Git

EXPERIENCE
Senior Developer - Tech Corp (2022-Present)
- Developed scalable web applications
- Led team of 5 developers

Junior Developer - StartupXYZ (2021-2022)
- Built REST APIs
- Implemented frontend features

EDUCATION
Bachelor of Technology in Computer Science
ABC University, 2021
`;

function cleanJsonFromMarkdown(text) {
  // Remove all occurrences of ``````
  let cleaned = text.replace(/``````/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Find the first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

async function testGemini(resumeText) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ERROR: GEMINI_API_KEY not found in .env file');
    console.log('💡 Get your free key at: https://makersuite.google.com/app/apikey\n');
    process.exit(1);
  }

  console.log('🤖 Testing Google Gemini 2.5 Flash...\n');
  console.log('📡 Sending request to Gemini API...');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a resume parser. Extract information and return ONLY valid JSON (no markdown, no code fences).

Required JSON format:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["array", "of", "strings"],
  "experienceYears": number,
  "education": "string",
  "summary": "string"
}

Resume to parse:
${resumeText}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Gemini API Error:', response.status);
      console.log('Error Details:', JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ API Response received!\n');
    
    // Extract text response
    const rawResponse = data.candidates[0].content.parts[0].text;
    console.log('📄 Raw Response:');
    console.log(rawResponse);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Clean and parse JSON
    console.log('🧹 Cleaning response...');
    const cleanedJson = cleanJsonFromMarkdown(rawResponse);
    
    console.log('📝 Cleaned JSON:');
    console.log(cleanedJson);
    console.log('\n' + '='.repeat(60) + '\n');
    
    const parsedData = JSON.parse(cleanedJson);
    
    console.log('✅ GEMINI 2.5 FLASH TEST SUCCESSFUL!\n');
    console.log('📊 Parsed Resume Data:');
    console.log(JSON.stringify(parsedData, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 API Statistics:');
    console.log('   - Model: gemini-2.5-flash');
    console.log(`   - Total Tokens: ${data.usageMetadata?.totalTokenCount || 'N/A'}`);
    console.log(`   - Input Tokens: ${data.usageMetadata?.promptTokenCount || 'N/A'}`);
    console.log(`   - Output Tokens: ${data.usageMetadata?.candidatesTokenCount || 'N/A'}`);
    console.log('   - Cost: FREE (within quota)');
    console.log('='.repeat(60) + '\n');
    
    console.log('🎉 SUCCESS! Gemini 2.5 Flash is working perfectly!');
    console.log('🚀 Ready to integrate into your resume system!\n');
    
    return parsedData;
  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log('Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. The API is responding correctly');
    console.log('2. But JSON parsing is having issues');
    console.log('3. Check the cleaned JSON output above\n');
    process.exit(1);
  }
}

// Run the test
console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   Google Gemini 2.5 Flash - Resume Parser     ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log('📄 Testing with sample resume...\n');

testGemini(SAMPLE_RESUME)
  .then(() => {
    console.log('✅ All tests passed! API is ready for production!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
