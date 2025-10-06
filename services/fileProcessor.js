/**
 * @fileoverview Enhanced File Processing with MULTIPLE PDF Extraction Methods
 * @version 5.0.0 - pdf-parse + pdf2json (NO OCR)
 */

const pdfParse = require("pdf-parse");
const PDFParser = require("pdf2json");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

// ✅ Better text cleaning that PRESERVES email/phone
function cleanExtractedText(rawText) {
  if (!rawText) return "";

  console.log("🧹 Starting FIXED text cleaning...");

  let text = rawText;

  // ✅ CRITICAL: Protect emails and phones FIRST (before any other processing)
  const emailPlaceholders = [];
  const phonePlaceholders = [];

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
  const phoneRegex = /(\+?91[\s\-]?)?([6-9]\d{9})/g;

  let emailIndex = 0;
  let phoneIndex = 0;

  // Protect emails
  text = text.replace(emailRegex, (match) => {
    const placeholder = `__EMAIL_${emailIndex}__`;
    emailPlaceholders.push({ placeholder, value: match });
    emailIndex++;
    return placeholder;
  });

  // Protect phones
  text = text.replace(phoneRegex, (match) => {
    const placeholder = `__PHONE_${phoneIndex}__`;
    phonePlaceholders.push({ placeholder, value: match });
    phoneIndex++;
    return placeholder;
  });

  // ✅ NOW SAFE: Do text normalization (emails/phones are protected)
  text = text
    .replace(/\r\n/g, "\n") // normalize line breaks
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ") // tabs to spaces
    .replace(/ {2,}/g, " ") // multiple spaces to single
    .replace(/\n +/g, "\n") // remove spaces after newlines
    .replace(/ +\n/g, "\n") // remove spaces before newlines
    .replace(/\n{3,}/g, "\n\n") // limit consecutive newlines
    .trim();

  // ✅ RESTORE: Put back emails and phones
  emailPlaceholders.forEach(({ placeholder, value }) => {
    text = text.replace(new RegExp(placeholder, "g"), value);
  });

  phonePlaceholders.forEach(({ placeholder, value }) => {
    text = text.replace(new RegExp(placeholder, "g"), value);
  });

  console.log(`✅ Text cleaned: ${text.length} characters`);
  return text;
}

// ✅ PDF2JSON Alternative Extraction
async function extractTextFromPDFAlternative(buffer) {
  console.log("🔄 Trying PDF2JSON extraction...");

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(`PDF2JSON Error: ${errData.parserError}`));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        let text = "";

        // Extract text from all pages
        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const run of textItem.R) {
                    if (run.T) {
                      // Decode URI component and add space
                      text += decodeURIComponent(run.T) + " ";
                    }
                  }
                }
              }
              text += "\n"; // New line after each page
            }
          }
        }

        const cleanedText = text.trim();
        if (cleanedText.length > 50) {
          console.log(`✅ PDF2JSON successful: ${cleanedText.length} chars`);
          resolve(cleanedText);
        } else {
          reject(new Error("PDF2JSON: Text too short"));
        }
      } catch (error) {
        reject(error);
      }
    });

    // Parse the buffer
    pdfParser.parseBuffer(buffer);
  });
}

// ✅ Enhanced PDF extraction with multiple strategies
async function extractTextFromPDF(buffer, filename = "resume.pdf") {
  console.log("📄 Starting ENHANCED PDF extraction...");

  // ========== STRATEGY 1: pdf-parse with multiple options ==========
  const pdfParseMethods = [
    {
      name: "Standard",
      options: {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
        max: 0,
      },
    },
    {
      name: "Normalized",
      options: {
        normalizeWhitespace: true,
        disableCombineTextItems: true,
        max: 0,
      },
    },
    {
      name: "Combined",
      options: {
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        max: 0,
      },
    },
  ];

  for (const method of pdfParseMethods) {
    try {
      console.log(`🔄 Trying pdf-parse: ${method.name}`);
      const data = await pdfParse(buffer, method.options);

      if (data.text && data.text.length > 50) {
        console.log(
          `✅ pdf-parse SUCCESS with ${method.name}: ${data.text.length} chars`
        );
        return cleanExtractedText(data.text);
      }
    } catch (error) {
      console.log(`⚠️ pdf-parse ${method.name} failed:`, error.message);
    }
  }

  // ========== STRATEGY 2: PDF2JSON Alternative ==========
  try {
    const text = await extractTextFromPDFAlternative(buffer);
    if (text && text.length > 50) {
      return cleanExtractedText(text);
    }
  } catch (error) {
    console.log("⚠️ PDF2JSON failed:", error.message);
  }

  // ========== ALL METHODS FAILED ==========
  throw new Error(
    "All PDF extraction methods failed - file may be corrupted or image-based (requires OCR)"
  );
}

// ✅ DOCX extraction
async function extractTextFromDOCX(buffer) {
  console.log("📄 Starting enhanced DOCX extraction...");

  try {
    // Method 1: Raw text extraction
    const rawResult = await mammoth.extractRawText({ buffer });
    if (rawResult.value && rawResult.value.length > 50) {
      console.log(`✅ DOCX raw extraction: ${rawResult.value.length} chars`);
      return cleanExtractedText(rawResult.value);
    }

    // Method 2: HTML conversion fallback
    console.log("🔄 Trying DOCX HTML conversion...");
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const textFromHtml = htmlResult.value
      .replace(/<[^>]*>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ");

    if (textFromHtml && textFromHtml.length > 50) {
      console.log(`✅ DOCX HTML extraction: ${textFromHtml.length} chars`);
      return cleanExtractedText(textFromHtml);
    }

    throw new Error("DOCX content too short");
  } catch (error) {
    console.error("❌ DOCX extraction failed:", error.message);
    throw new Error(`DOCX processing failed: ${error.message}`);
  }
}

// ✅ Main extraction function
async function extractTextFromFile(file) {
  if (!file || !file.originalname) {
    throw new Error("Invalid file object provided - missing originalname");
  }

  console.log(`🔄 Processing file: ${file.originalname}`);

  let buffer;
  let fileSize;

  try {
    // Handle both buffer (memory) and path (disk storage)
    if (file.buffer) {
      console.log("📊 Using memory storage buffer");
      buffer = file.buffer;
      fileSize = file.buffer.length;
    } else if (file.path) {
      console.log(`📊 Reading from disk: ${file.path}`);
      if (!fs.existsSync(file.path)) {
        throw new Error(`File not found at path: ${file.path}`);
      }
      buffer = fs.readFileSync(file.path);
      fileSize = buffer.length;
    } else {
      throw new Error("File object must have either buffer or path property");
    }

    console.log(
      `📊 Size: ${Math.round(fileSize / 1024)}KB, Type: ${file.mimetype}`
    );

    let extractedText = "";

    // Determine extraction method based on file type
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      extractedText = await extractTextFromPDF(buffer, file.originalname);
    } else if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/msword" ||
      file.originalname.toLowerCase().endsWith(".docx") ||
      file.originalname.toLowerCase().endsWith(".doc")
    ) {
      extractedText = await extractTextFromDOCX(buffer);
    } else {
      // Unknown type - try both methods
      console.log(
        "⚠️ Unknown file type, trying multiple extraction methods..."
      );
      try {
        extractedText = await extractTextFromPDF(buffer, file.originalname);
      } catch (pdfError) {
        console.log("PDF extraction failed, trying DOCX...");
        extractedText = await extractTextFromDOCX(buffer);
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error("Extracted text is too short or empty");
    }

    console.log(
      `✅ Text extraction successful: ${extractedText.length} characters`
    );
    return extractedText;
  } catch (error) {
    console.error(
      `❌ File processing failed for ${file.originalname}:`,
      error.message
    );

    return `EXTRACTION_FAILED

Resume: ${file.originalname}

Note: Automatic text extraction failed. This file may be:
- Corrupted or damaged
- Password-protected
- Image-based/scanned (requires OCR - not currently enabled)
- In an unsupported format

Error: ${error.message}

ACTION REQUIRED: Please review this resume manually or re-upload a text-based version.`;
  }
}

module.exports = {
  extractTextFromFile,
  cleanExtractedText,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromPDFAlternative,
};
