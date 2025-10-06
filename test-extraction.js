/**
 * @fileoverview Resume Batch Processor
 * @version 2.0.0 - Clean version without OCR tracking
 */

const fs = require("fs");
const fileProcessor = require("./services/fileProcessor");
const nlpService = require("./services/nlpService");

// ✅ Helper function to format file size
function formatSize(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

// ✅ Helper function to format time
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ✅ Process a single resume
async function processResume(filename) {
  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📄 PROCESSING: ${filename}`);
    console.log("=".repeat(80));

    const buffer = fs.readFileSync(filename);
    const stats = fs.statSync(filename);

    // Determine MIME type
    let mimetype = "application/pdf";
    if (filename.toLowerCase().endsWith(".docx")) {
      mimetype =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (filename.toLowerCase().endsWith(".doc")) {
      mimetype = "application/msword";
    }

    const file = {
      originalname: filename,
      mimetype: mimetype,
      buffer: buffer,
    };

    console.log(`📊 Size: ${formatSize(stats.size)}, Type: ${mimetype}`);
    console.log("");

    // Extract text
    const startTime = Date.now();
    const text = await fileProcessor.extractTextFromFile(file);
    const extractionTime = Date.now() - startTime;

    // Check if extraction failed
    if (text.includes("EXTRACTION_FAILED")) {
      console.log("❌ EXTRACTION FAILED");
      console.log(`⏱️ Time: ${formatTime(extractionTime)}\n`);
      return {
        filename,
        success: false,
        error: "Extraction failed",
        extractionTime,
      };
    }

    console.log(`✅ Text extracted: ${text.length} characters`);
    console.log(`⏱️ Extraction time: ${formatTime(extractionTime)}\n`);

    // Process with NLP
    const nlpStartTime = Date.now();
    const parsed = await nlpService.processResumeText(text);
    const nlpTime = Date.now() - nlpStartTime;

    console.log("📊 RESULTS:");
    console.log(`   Name: ${parsed.name}`);
    console.log(`   Email: ${parsed.email || "Not found"}`);
    console.log(`   Phone: ${parsed.phone || "Not found"}`);
    console.log(`   Skills: ${parsed.skills?.length || 0} found`);
    console.log(`   Experience: ${parsed.experience?.years || 0} years`);
    console.log(`   Education: ${parsed.education || "Not found"}`);
    console.log(`   Confidence: ${parsed.confidence}%`);
    console.log(`   ⏱️ NLP time: ${formatTime(nlpTime)}`);

    return {
      filename,
      success: true,
      data: parsed,
      extractionTime,
      nlpTime,
      totalTime: extractionTime + nlpTime,
    };
  } catch (error) {
    console.error(`\n❌ ERROR processing ${filename}:`, error.message);
    return {
      filename,
      success: false,
      error: error.message,
    };
  }
}

// ✅ Main function - Process all resumes
async function testAllResumes() {
  console.log("🔍 RESUME BATCH PROCESSOR");
  console.log("=".repeat(80));
  console.log("Starting batch extraction test...\n");

  try {
    // Find all resume files (PDF and DOCX)
    const files = fs.readdirSync(".");
    const resumeFiles = files.filter(
      (f) =>
        (f.toLowerCase().endsWith(".pdf") ||
          f.toLowerCase().endsWith(".docx") ||
          f.toLowerCase().endsWith(".doc")) &&
        !f.includes("node_modules") &&
        !f.includes("BROKEN") &&
        !f.includes("DO-NOT-USE")
    );

    if (resumeFiles.length === 0) {
      console.log("❌ No resume files (PDF/DOCX) found in current directory!");
      console.log(
        "\n💡 TIP: Place PDF or DOCX resumes in this directory and run again."
      );
      return;
    }

    console.log(`📂 Found ${resumeFiles.length} resume file(s):`);
    resumeFiles.forEach((file, index) => {
      const stats = fs.statSync(file);
      console.log(`   ${index + 1}. ${file} (${formatSize(stats.size)})`);
    });

    // Process each resume
    const results = [];
    for (let i = 0; i < resumeFiles.length; i++) {
      const result = await processResume(resumeFiles[i]);
      results.push(result);
    }

    // ========== FINAL SUMMARY ==========
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 BATCH PROCESSING SUMMARY");
    console.log("=".repeat(80));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

    if (successful.length > 0) {
      console.log("✅ SUCCESSFUL EXTRACTIONS:");
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.filename}`);
        console.log(`   Name: ${result.data.name}`);
        console.log(`   Email: ${result.data.email || "Not found"}`);
        console.log(`   Phone: ${result.data.phone || "Not found"}`);
        console.log(`   Skills: ${result.data.skills?.length || 0}`);
        console.log(`   Confidence: ${result.data.confidence}%`);
        console.log(`   Total time: ${formatTime(result.totalTime)}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n\n❌ FAILED EXTRACTIONS:");
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.filename}`);
        console.log(`   Error: ${result.error}`);
      });
    }

    // ========== PERFORMANCE STATS ==========
    if (successful.length > 0) {
      console.log("\n\n" + "=".repeat(80));
      console.log("⚡ PERFORMANCE STATISTICS");
      console.log("=".repeat(80));

      const totalTime = results.reduce((sum, r) => sum + (r.totalTime || 0), 0);
      const avgTime = totalTime / successful.length;
      const fastestFile = successful.reduce((min, r) =>
        r.totalTime < min.totalTime ? r : min
      );
      const slowestFile = successful.reduce((max, r) =>
        r.totalTime > max.totalTime ? r : max
      );

      console.log(`\n📊 Total processing time: ${formatTime(totalTime)}`);
      console.log(`📊 Average per file: ${formatTime(avgTime)}`);
      console.log(
        `⚡ Fastest: ${fastestFile.filename} (${formatTime(
          fastestFile.totalTime
        )})`
      );
      console.log(
        `🐢 Slowest: ${slowestFile.filename} (${formatTime(
          slowestFile.totalTime
        )})`
      );
    }

    // ========== EXPORT RESULTS ==========
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const outputFile = `test-results-${timestamp}.json`;

    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          totalFiles: results.length,
          successful: successful.length,
          failed: failed.length,
          results: results,
        },
        null,
        2
      )
    );

    console.log("\n" + "=".repeat(80));
    console.log(`💾 Results saved to: ${outputFile}`);
    console.log("=".repeat(80));
    console.log("\n✅ BATCH PROCESSING COMPLETE!\n");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error.message);
    console.error(error.stack);
  }
}

// Run the test
testAllResumes();
