/**
 * Test file fixtures for integration testing
 */
const fs = require('fs');
const path = require('path');

function createMockPDF() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Sample Resume) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \n0000000185 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n279\n%%EOF');
}

function createMockResumeText() {
  return `John Smith
Senior Software Developer
Email: john.smith@email.com
Phone: (555) 123-4567

EXPERIENCE
5+ years of full-stack development experience

SKILLS
JavaScript, React, Node.js, Python, MongoDB, AWS

EDUCATION
Bachelor's Degree in Computer Science
University of Technology, 2018`;
}

function createMockDOCX() {
  return Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00');
}

const sampleResume = {
  filename: 'john-smith-resume.pdf',
  size: 1024 * 50, // 50KB
  mimetype: 'application/pdf'
};

const SAMPLE_FILES = {
  validPDF: {
    filename: 'test-resume.pdf',
    originalName: 'test-resume.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 50
  },
  validDOCX: {
    filename: 'test-resume.docx',
    originalName: 'test-resume.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 75
  },
  invalidFile: {
    filename: 'resume.txt',
    originalName: 'resume.txt',
    mimetype: 'text/plain',
    size: 1024
  },
  largeFile: {
    filename: 'large-resume.pdf',
    originalName: 'large-resume.pdf',
    mimetype: 'application/pdf',
    size: 1024 * 1024 * 12 // 12MB
  }
};

module.exports = {
  createMockPDF,
  createMockResumeText,
  createMockDOCX,
  sampleResume,
  SAMPLE_FILES
};
