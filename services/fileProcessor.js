/**
 * @fileoverview Enhanced File Processing with Advanced Text Extraction
 * @author Resume Screening System
 * @version 3.1.0 - FIXED: Added disk storage support
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

function cleanExtractedText(rawText) {
  if (!rawText) return '';
  console.log('🧹 Starting advanced text cleaning...');
  
  let text = rawText;
  
  // Step 1: Protect emails and important data
  const emailPlaceholders = [];
  const phoneePlaceholders = [];
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
  const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;
  
  let emailIndex = 0;
  let phoneIndex = 0;
  
  // Protect emails
  text = text.replace(emailRegex, (match) => {
    const placeholder = `__EMAIL_PROTECTED_${emailIndex}__`;
    emailPlaceholders.push({ placeholder, email: match });
    emailIndex++;
    return placeholder;
  });
  
  // Protect phone numbers
  text = text.replace(phoneRegex, (match) => {
    const placeholder = `__PHONE_PROTECTED_${phoneIndex}__`;
    phoneePlaceholders.push({ placeholder, phone: match });
    phoneIndex++;
    return placeholder;
  });
  
  // Step 2: Advanced text normalization
  text = text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase spacing
    .replace(/([a-zA-Z])(\d)/g, '$1 $2') // letter-number spacing
    .replace(/(\d)([a-zA-Z])/g, '$1 $2') // number-letter spacing
    .replace(/\r\n/g, '\n') // normalize line breaks
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ') // tabs to spaces
    .replace(/ +/g, ' ') // multiple spaces to single
    .replace(/\n +/g, '\n') // remove spaces after newlines
    .replace(/ +\n/g, '\n') // remove spaces before newlines
    .replace(/\n{3,}/g, '\n\n') // limit consecutive newlines
    .trim();
  
  // Step 3: Restore protected data
  emailPlaceholders.forEach(({ placeholder, email }) => {
    text = text.replace(new RegExp(placeholder, 'g'), email);
  });
  
  phoneePlaceholders.forEach(({ placeholder, phone }) => {
    text = text.replace(new RegExp(placeholder, 'g'), phone);
  });
  
  console.log(`✅ Text cleaned: ${text.length} characters`);
  return text;
}

async function extractTextFromPDF(buffer) {
  console.log('📄 Starting enhanced PDF extraction...');
  
  const extractionMethods = [
    {
      name: 'Standard',
      options: {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
        max: 0
      }
    },
    {
      name: 'Normalized',
      options: {
        normalizeWhitespace: true,
        disableCombineTextItems: true,
        max: 0
      }
    },
    {
      name: 'Combined',
      options: {
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        max: 0
      }
    }
  ];
  
  for (const method of extractionMethods) {
    try {
      console.log(`🔄 Trying PDF method: ${method.name}`);
      const data = await pdfParse(buffer, method.options);
      if (data.text && data.text.length > 50) {
        console.log(`✅ PDF extraction successful with ${method.name}: ${data.text.length} chars`);
        return cleanExtractedText(data.text);
      }
    } catch (error) {
      console.log(`⚠️ PDF method ${method.name} failed:`, error.message);
    }
  }
  
  throw new Error('All PDF extraction methods failed');
}

async function extractTextFromDOCX(buffer) {
  console.log('📄 Starting enhanced DOCX extraction...');
  
  try {
    // Method 1: Raw text extraction
    const rawResult = await mammoth.extractRawText({ buffer });
    if (rawResult.value && rawResult.value.length > 50) {
      console.log(`✅ DOCX raw extraction: ${rawResult.value.length} chars`);
      return cleanExtractedText(rawResult.value);
    }
    
    // Method 2: HTML conversion fallback
    console.log('🔄 Trying DOCX HTML conversion...');
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const textFromHtml = htmlResult.value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ');
    
    if (textFromHtml && textFromHtml.length > 50) {
      console.log(`✅ DOCX HTML extraction: ${textFromHtml.length} chars`);
      return cleanExtractedText(textFromHtml);
    }
    
    throw new Error('DOCX content too short');
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error.message);
    throw new Error(`DOCX processing failed: ${error.message}`);
  }
}

// ✅ CRITICAL FIX: Support both memory storage (buffer) and disk storage (path)
async function extractTextFromFile(file) {
  // Validate file object
  if (!file || !file.originalname) {
    throw new Error('Invalid file object provided - missing originalname');
  }
  
  console.log(`🔄 Processing file: ${file.originalname}`);
  
  let buffer;
  let fileSize;
  
  try {
    // ✅ FIX: Handle both buffer (memory storage) and path (disk storage)
    if (file.buffer) {
      // Memory storage - file is in buffer
      console.log('📊 Using memory storage buffer');
      buffer = file.buffer;
      fileSize = file.buffer.length;
    } else if (file.path) {
      // Disk storage - read file from path
      console.log(`📊 Reading from disk: ${file.path}`);
      if (!fs.existsSync(file.path)) {
        throw new Error(`File not found at path: ${file.path}`);
      }
      buffer = fs.readFileSync(file.path);
      fileSize = buffer.length;
    } else {
      throw new Error('File object must have either buffer or path property');
    }
    
    console.log(`📊 Size: ${Math.round(fileSize / 1024)}KB, Type: ${file.mimetype}`);
    
    let extractedText = '';
    
    // Determine extraction method based on file type
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      extractedText = await extractTextFromPDF(buffer);
    } else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.originalname.toLowerCase().endsWith('.docx') ||
      file.originalname.toLowerCase().endsWith('.doc')
    ) {
      extractedText = await extractTextFromDOCX(buffer);
    } else {
      // Unknown type - try both methods
      console.log('⚠️ Unknown file type, trying multiple extraction methods...');
      try {
        extractedText = await extractTextFromPDF(buffer);
      } catch (pdfError) {
        console.log('PDF extraction failed, trying DOCX...');
        extractedText = await extractTextFromDOCX(buffer);
      }
    }
    
    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('Extracted text is too short or empty');
    }
    
    console.log(`✅ Text extraction successful: ${extractedText.length} characters`);
    return extractedText;
    
  } catch (error) {
    console.error(`❌ File processing failed for ${file.originalname}:`, error.message);
    
    // Return fallback content instead of throwing
    return `Resume File: ${file.originalname}
Size: ${Math.round(fileSize / 1024)}KB
Type: ${file.mimetype}
Upload Date: ${new Date().toISOString()}

Note: Automatic text extraction failed.
Error: ${error.message}

Please review this resume manually.`;
  }
}

module.exports = {
  extractTextFromFile,
  cleanExtractedText,
  extractTextFromPDF,
  extractTextFromDOCX
};
