# Resume Screening System

A full-stack web application that automates the process of screening resumes against job descriptions. Upload resumes in PDF or DOCX format, define job requirements, and the system extracts candidate information using NLP, scores them against your criteria, and ranks them — with optional AI enhancement via Google's Gemini API.

Built with Node.js, Express, MongoDB, and EJS. Deployed on Render.

---

## Table of Contents

- [What This Project Does](#what-this-project-does)
- [Why It Was Built](#why-it-was-built)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Application Flow](#application-flow)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Scoring and Matching Logic](#scoring-and-matching-logic)
- [AI Integration (Gemini)](#ai-integration-gemini)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [Error Handling](#error-handling)
- [Security](#security)
- [Performance Considerations](#performance-considerations)
- [Limitations and Known Issues](#limitations-and-known-issues)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## What This Project Does

1. **Upload** — Accepts up to 100 resume files (PDF/DOCX) per batch. Each file goes through text extraction and NLP parsing to pull out the candidate's name, email, phone, skills, education, and experience.

2. **Screen** — You define a job description with required skills, experience range, and education level. The system scores every uploaded resume against that job description and ranks candidates from best to worst match.

3. **Multi-JD Screening** — Screen all candidates against multiple job descriptions at once (e.g., Network Engineer, Full Stack Developer, Finance Intern, Software Developer). Each candidate gets scored against every job, and their best match is highlighted.

4. **Analytics** — Visual dashboard with Chart.js showing skill distributions, experience, education statistics, monthly upload, and score distributions.

5. **Export** — Download screening results as formatted Excel files (.xlsx) for offline review or sharing with hiring teams.

6. **Search** — Search candidates by name or email within screening results or across the entire resume database.

---

## Why It Was Built

This is a 4th-semester academic project aimed at solving a real problem: manually reviewing large numbers of resumes is slow and inconsistent. The system demonstrates how NLP techniques and optional AI can automate initial resume screening, letting recruiters focus on the most relevant candidates.

---

## Core Features

| Feature----------------| Description |
|------------------------|-------------|
| Bulk Upload            | Upload up to 100 PDF/DOCX files at once (10MB each) |
| Text Extraction        | Multi-strategy PDF parsing (pdf-parse + pdf2json fallback) and DOCX extraction (mammoth) |
| NLP Parsing            | Extracts candidate name, email, phone, skills, education, and experience from raw text |
| Single-JD Screening    | Score all resumes against one job description |
| Multi-JD Screening     | Score all resumes against 4 predefined or custom job 
                           descriptions simultaneously |
| Domain Detection       | Automatically classifies jobs into categories 
                           (network engineering, full stack, finance, etc.) |
| Domain-Specific Scoring| Different scoring algorithms for different job categories with 
                           weighted skill matching |
| AI Enhancement         | Optional Gemini API integration for semantic matching, skill 
                           extraction, and match reasoning |
| Analytics Dashboard    | Interactive charts (skills frequency, experience, 
                           score distribution, uploads) |
| Excel Export           | Export screening results as styled .xlsx files |
| Candidate Search       | Search by name or email across results with pagination |
| Candidate Profiles     | Detailed view of each candidate's extracted information |
| Dark Mode              | Client-side dark mode toggle |
| Health Checks          | `/health` endpoint for monitoring |

---

## Tech Stack

| Layer                   | Technology                                           |
|-------------------------|------------------------------------------------------|
| Runtime                 | Node.js (≥18.x)                                      |
| Framework               | Express.js                                           |
| Database                | MongoDB (Mongoose ODM)                               |
| View Engine             | EJS with express-ejs-layouts                         |
| NLP                     | natural (tokenization, stemming), compromise         |
| PDF Parsing             | pdf-parse, pdf2json                                  |
| DOCX Parsing            | mammoth                                              |
| AI (Optional)           | Google Generative AI (Gemini 1.5 Flash)              |
| Validation              | Joi, express-validator                               |
| File Upload             | Multer (disk storage)                                |
| Excel Export            | ExcelJS                                              |
| Search                  | Fuse.js (client-side), MongoDB regex (server-side)   |
| Charts                  | Chart.js                                             |
| Styling                 | Bootstrap 5, custom CSS                              |
| Security                | Helmet, CORS, express-rate-limit                     |
| Logging                 | Morgan (HTTP), custom logger utility                 |
| Testing                 | Jest, Supertest, mongodb-memory-server               |
| Dev Tools               | Nodemon, cross-env                                   |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                    │
│   EJS Templates + Bootstrap + Chart.js + Client JS      │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────┐
│                    Express Server                       │
│                                                         │
│  Middleware: Helmet, CORS, Morgan, Compression,         │
│             Rate Limiters, Body Parsers                 │
│                                                         │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Routes  │ │Controllers│ │ Services │ │   Models   │  │
│  │         │→│           │→│          │→│            │  │
│  │ index   │ │ home      │ │ nlpSvc   │ │ Resume     │  │
│  │ upload  │ │ upload    │ │ fileSvc  │ │ Screening  │  │
│  │screening│ │ screening │ │ matching │ │ JobReq     │  │
│  │candidate│ │ results   │ │ gemini   │ │            │  │
│  │ api     │ │ analytics │ │ domain   │ │            │  │
│  │dashboard│ │           │ │ score    │ │            │  │
│  │analytics│ │           │ │          │ │            │  │
│  └─────────┘ └───────────┘ └──────────┘ └──────┬─────┘  │
└─────────────────────────────────────────────────┼───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │   MongoDB     │
                                          │  (Atlas or    │
                                          │   localhost)  │
                                          └───────────────┘
```

The project follows an **MVC pattern**: 
 - Routes receive requests,
 - Controllers handle business logic,
 - Services do the file parsing, NLP, scoring,
 - Models define the MongoDB schemas.

---

## Application Flow

### Resume Upload Flow

```
User drops files → Multer saves to /uploads → fileProcessor extracts text
→ nlpService parses (name, email, phone, skills, education, experience)
→ Gemini AI enhances extraction if enabled and rule-based results are weak
→ Resume document saved to MongoDB → Response sent to client
```

### Screening Flow

```
User submits job requirements → Controller validates with Joi
→ Fetches all processed resumes from DB
→ domainDetector classifies job category (AI-first, keyword fallback)
→ matchingEngine dispatches to domain-specific scorer
   (e.g., calculateNetworkEngineerScore, calculateFullStackScore)
→ Each resume gets scored (skills match, experience, education, domain penalties)
→ Results sorted by score, ranked, and saved as a Screening document
→ User redirected to results page
```

### Multi-JD Screening Flow

```
User selects predefined jobs or submits custom JDs
→ Each resume is scored against every job description
→ Best job match identified per candidate
→ Statistics calculated (category breakdown, score distribution)
→ Results saved and rendered on multi-results page
```

---

## Project Structure

```
resume-screening-system/
│
├── server.js                  # Express app setup, middleware, route mounting, startup
│
├── config/
│   ├── constants.js           # Shared thresholds (qualifying score, max files, max file size)
│   ├── database.js            # MongoDB URI export (server.js connects directly)
│   └── skills.json            # Categorized skills database (networking, dev, finance, etc.)
│
├── models/
│   ├── Resume.js              # Resume schema — candidate info, skills, experience, education
│   ├── Screening.js           # Screening session — job requirements, results array, statistics
│   └── JobRequirement.js      # Job requirement schema (used for saved JDs)
│
├── controllers/
│   ├── homeController.js      # Dashboard stats (uploaded, processed, screenings, top score)
│   ├── uploadController.js    # File processing pipeline (extract → NLP → save)
│   ├── screeningController.js # Single-JD and Multi-JD screening logic
│   ├── resultsController.js   # Results display, search, Excel export, candidate details
│   └── analyticsController.js # Analytics data aggregation for charts
│
├── services/
│   ├── fileProcessor.js       # PDF/DOCX text extraction (pdf-parse, pdf2json, mammoth)
│   ├── nlpService.js          # Name/email/phone/skills/education/experience extraction
│   ├── geminiService.js       # Google Gemini AI — skill extraction, semantic matching
│   ├── matchingEngine.js      # Orchestrator — delegates scoring to domain-specific functions
│   ├── domainDetector.js      # Job category detection (AI-first with keyword fallback)
│   └── scoreCalculator.js     # Domain-specific scoring (network, finance, full-stack, etc.)
│
├── routes/
│   ├── index.js               # / — dashboard, analytics, profile, results, stats, delete
│   ├── upload.js              # /upload — file upload form and POST handler
│   ├── screening.js           # /screening — screening form, single/multi JD, results pages
│   ├── candidate.js           # /candidate — candidate detail, JSON API, update
│   ├── api.js                 # /api — RESTful endpoints (resumes CRUD, search, stats)
│   ├── dashboard.js           # /dashboard — resume lists, screening history, top scores
│   └── analytics.js           # /analytics — analytics dashboard and data API
│
├── views/
│   ├── layouts/main.ejs       # Base HTML layout (head, navbar, content, footer)
│   ├── partials/              # Reusable EJS partials (navbar, footer, head)
│   ├── pages/                 # Main pages (index, upload, screening, results, analytics, etc.)
│   └── dashboard/             # Dashboard sub-pages (resume lists, screenings, top scores)
│
├── public/
│   ├── css/modern-dashboard.css  # All application styles (~78KB)
│   └── js/                       # Client-side scripts (upload, screening, results, analytics, etc.)
│
├── utils/
│   ├── logger.js              # Environment-aware logger (debug only in development)
│   ├── skillExtractor.js      # Advanced skill extraction with technical filtering
│   ├── objectUtils.js         # pick() utility
│   └── validationHelpers.js   # Shared validation functions
│
├── tests/
│   ├── unit/                  # Unit tests for models and services
│   ├── integration/           # Integration tests for API endpoints and workflows
│   ├── fixtures/              # Test data files
│   ├── helpers/               # Test helper utilities
│   └── setup/                 # Jest setup files
│
├── scripts/                   # Maintenance scripts (fix names, cleanup, generate test data)
├── uploads/                   # Uploaded resume files (gitignored, ephemeral on Render)
├── .env                       # Environment variables (gitignored)
├── jest.config.js             # Jest test configuration
└── package.json               # Dependencies and npm scripts
```

---

## Database Schema

### Resume

Stores parsed candidate information extracted from uploaded files.

| Field                  | Type       | Description                                                |
|------------------------|------------|------------------------------------------------------------|
| `candidateName`        | String     | Extracted or inferred candidate name (title-cased)         |
| `normalizedName`       | String     | Lowercase version for fast indexed search                  |
| `email`                | String     | Extracted email address                                    |
| `phone`                | String     | Extracted phone number (10-15 digits)                      |
| `extractedText`        | String     | Full text content extracted from the file (max 50K chars)  |
| `skills`               | [String]   | Extracted technical skills (max 50)                        |
| `experience.years`     | Number     | Years of experience (0-50)                                 |
| `experience.positions` | [String]   | Job positions found                                        |
| `education.degree`     | String     | Highest education level detected                           |
| `education.institution`| String     | Institution name                                           |
| `certifications`       | [String]   | Certifications found                                       |
| `projects`             | [Object]   | Projects with name, description, technologies              |
| `isProcessed`          | Boolean    | Whether NLP processing completed                           |
| `processingStatus`     | Enum       | pending, processing, completed, failed                     |
| `confidence`           | Number     | Extraction confidence score (0-100)                        |
| `filename`             | String     | Stored filename on disk                                    |
| `originalName`         | String     | Original uploaded filename                                 |
| `uploadDate`           | Date       | When the file was uploaded                                 |

**Indexes:** `email`, `candidateName`, `normalizedName`, `isProcessed + processingStatus`, `uploadDate`, `skills`, `experience.years`, compound text index on `normalizedName + email`.

### Screening

Stores a screening session with job requirements and all candidate results.

| Field | Type | Description |
|---|---|---|
| `jobTitle` | String | Position being screened for |
| `jobDescription` | String | Full job description text |
| `requiredSkills` | [String] | Skills required for the position |
| `experienceLevel.min/max` | Number | Experience range in years |
| `screeningType` | Enum | basic, advanced, multi-jd, ml-enhanced |
| `results` | [Object] | Array of scored candidates (resumeId, matchScore, matchedSkills, etc.) |
| `statistics` | Object | Aggregated stats (totalCandidates, qualifiedCandidates, averageScore, etc.) |
| `jobCategories` | [String] | For multi-JD: list of job titles screened against |
| `processingStatus` | Enum | pending, processing, completed, failed |
| `processingTime` | Number | Total processing time in ms |

Each entry in `results` includes: `resumeId` (ref to Resume), `candidateName`, `matchScore`, `matchedSkills`, `missingSkills`, `experienceMatch`, `educationMatch`, `reasons`, `bestJobMatch` (for multi-JD), and `allJobScores`.

### JobRequirement

Stores saved job descriptions for reuse.

| Field | Type | Description |
|---|---|---|
| `jobTitle` | String | Position title |
| `jobDescription` | String | Full description |
| `requiredSkills` | [String] | Required skills |
| `preferredSkills` | [String] | Nice-to-have skills |
| `experienceLevel.min/max` | Number | Experience range |
| `jobCategory` | Enum | network_engineer, full_stack_developer, software_developer, finance_intern, custom |
| `status` | Enum | active, inactive, draft |
| `priority` | Number | 1-5 priority ranking |

---

## API Endpoints

### Pages (HTML)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Dashboard home page |
| GET | `/upload` | Resume upload form |
| GET | `/screening` | Screening form with job templates |
| GET | `/screening/results/:id` | Single-JD results page |
| GET | `/screening/multi-results/:id` | Multi-JD results page |
| GET | `/analytics` | Analytics dashboard with charts |
| GET | `/candidate/:id` | Candidate profile page |
| GET | `/profile/:id` | Candidate profile (alternate route) |
| GET | `/dashboard/resumes/uploaded` | List all uploaded resumes |
| GET | `/dashboard/resumes/processed` | List processed resumes |
| GET | `/dashboard/resumes/top-scores` | Top scoring candidates |
| GET | `/dashboard/screenings` | Screening session history |

### REST API (JSON)

| Method | Path | Description |
|---|---|---|
| GET | `/api/resumes` | List resumes (paginated, filterable) |
| GET | `/api/resumes/:id` | Get single resume details |
| DELETE | `/api/resumes/:id` | Delete a resume |
| DELETE | `/api/resumes?confirm=all` | Delete all resumes |
| GET | `/api/search?q=name` | Search candidates by name |
| GET | `/api/results/:id` | Get screening results as JSON |
| GET | `/api/results/:id/search` | Search within screening results |
| GET | `/api/stats` | System statistics |
| GET | `/api/health` | API health check |
| POST | `/upload` | Upload resume files (multipart) |
| POST | `/screening` | Run single-JD screening |
| POST | `/screening/multi` | Run multi-JD screening |
| DELETE | `/screening/:id` | Delete a screening session |
| GET | `/results/:id/export` | Export results to Excel |
| GET | `/screening/multi-results/:id/export` | Export multi-JD results to Excel |
| GET | `/health` | Server health check |

---

## Scoring and Matching Logic

The scoring system uses a **domain-first approach**: it first detects the job category, then applies a domain-specific scoring algorithm.

### Job Category Detection

1. **AI-first** — If Gemini is available and enabled, the job title + description are sent to the AI for classification. Results are cached per-process (so 100 candidates × 4 jobs = 4 AI calls, not 400).
2. **Keyword fallback** — If AI is unavailable or confidence is below 60%, keyword matching against `JOB_DOMAINS` determines the category.

### Supported Job Categories

- `network_engineer` — Weighted scoring across protocols, tools, technologies, certifications
- `full_stack_developer` — Weighted scoring across frontend, backend, database, tools, concepts
- `software_developer` — Based on full-stack scoring with a small bonus (+10)
- `finance_intern` — Weighted scoring across finance skills, software (Tally, Excel), domain knowledge
- `general` — Falls through to AI-based semantic matching

### Score Composition (example: Network Engineer)

| Component | Weight | Description |
|---|---|---|
| Skill Match | ~35-90 pts | Weighted across skill categories (protocols 35%, tools 30%, tech 25%, certs 10%) |
| Experience | 3-20 pts | Based on how well candidate years match the required range |
| Education | 3-15 pts | Highly relevant = 15, somewhat = 10, not relevant = 3 |
| Bonuses | 0-35 pts | Exact tool matches, relevant job titles in resume |
| Domain Penalty | 0-40 pts | Subtracted if candidate has irrelevant background (e.g., finance skills for a tech role) |
| Experience Penalty | 0-25 pts | Subtracted if candidate is significantly under-experienced |

Final score is clamped to 5-100.

### Cross-Domain Penalty

A key design decision: candidates from a completely different domain get penalized. For example, a finance graduate with Tally and Excel skills screening for a Network Engineer position will receive a domain mismatch penalty of up to 40 points. This prevents unrelated candidates from ranking high just because they happen to have a few overlapping keywords.

---

## AI Integration (Gemini)

The Gemini integration is **optional** and **gracefully degrades**. If the API key is missing or invalid, or if calls time out, the system falls back to rule-based scoring with no errors.

### What Gemini Does

| Function | When Used |
|---|---|
| `extractSkills()` | When rule-based extraction finds fewer than 5 skills |
| `enhanceResumeParsing()` | When email/phone/skills are missing from rule-based extraction |
| `detectJobDomain()` | First attempt at classifying a job category (cached per screening run) |
| `calculateSemanticMatchDetailed()` | For `general` category jobs that don't fit predefined patterns |
| `generateMatchReasons()` | Generate human-readable explanations of why a candidate matched |

### Configuration

```env
USE_AI_ENHANCEMENT=true        # Toggle AI on/off
GEMINI_API_KEY=your_key_here   # Google AI Studio API key
GEMINI_MODEL=gemini-1.5-flash  # Model to use
AI_TEMPERATURE=0.1             # Low temperature for consistent results
AI_MAX_TOKENS=2000             # Max response length
AI_TIMEOUT=30000               # 30-second timeout per call
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/resume-screening

# AI (optional — system works without these)
GEMINI_API_KEY=your_gemini_api_key
USE_AI_ENHANCEMENT=true
GEMINI_MODEL=gemini-1.5-flash
AI_TEMPERATURE=0.1
AI_MAX_TOKENS=2000
AI_TIMEOUT=30000

# CORS (optional)
CORS_ORIGIN=http://localhost:3000
```

---

## Installation

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 8.x
- MongoDB (local instance or Atlas connection string)

### Steps

```bash
# Clone the repository
git clone https://github.com/yourusername/resume-screening-system.git
cd resume-screening-system

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and optional Gemini API key

# Create uploads directory (if it doesn't exist)
mkdir uploads
```

---

## Running Locally

```bash
# Development mode (with auto-restart on file changes)
npm run dev

# Production mode
npm start
```

The server starts at `http://localhost:3000` by default.

### Available npm Scripts

| Script | Command | Description |
|---|---|---|
| `npm start` | `node server.js` | Start in production mode |
| `npm run dev` | `nodemon server.js` | Start with auto-reload |
| `npm test` | `jest --runInBand` | Run all tests |
| `npm run test:unit` | `jest tests/unit` | Run unit tests only |
| `npm run test:integration` | `jest tests/integration` | Run integration tests only |
| `npm run test:coverage` | `jest --coverage` | Generate coverage report |
| `npm run test:verbose` | `jest --verbose` | Verbose test output |

---

## Testing

Tests use **Jest** with **mongodb-memory-server** (in-memory MongoDB) so no real database is needed.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit
```

### Test Structure

- `tests/unit/models/` — Schema validation, pre-save hooks, static/instance methods
- `tests/unit/services/` — NLP extraction, file processing, matching engine
- `tests/integration/` — Full API endpoint testing (upload, screening, results, search)
- `tests/fixtures/` — Sample resume files and test data
- `tests/setup/setup.js` — Jest lifecycle hooks (DB connect/disconnect/cleanup)

Tests run serially (`--runInBand`) to avoid MongoDB conflicts with `maxWorkers: 1`.

---

## Deployment

The project is configured for deployment on **Render**.

### Render Configuration

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node.js
- **Environment Variables:** Set `MONGODB_URI`, `NODE_ENV=production`, `GEMINI_API_KEY`, etc. in Render's dashboard

### Important Notes

- The `uploads/` directory is **ephemeral** on Render — files are lost on redeploys. The extracted text is stored in MongoDB, so this is not a data loss issue, but the original files won't persist.
- Rate limits are tighter in production (500 API req/15min, 50 screenings/10min, 50 uploads/hr).
- Caching is disabled everywhere (views, ETags, static files) to ensure fresh data during development and deployment.

---

## Error Handling

- **Global error handler** in `server.js` catches unhandled errors. Returns JSON for API requests, renders an error page for browser requests.
- **Specific error codes** for file uploads: `LIMIT_FILE_SIZE` (413), `LIMIT_FILE_COUNT` (413), `INVALID_FILE_TYPE`.
- **Graceful shutdown** on `SIGTERM`/`SIGINT`: closes HTTP server, waits for MongoDB to disconnect, with a 10-second force-kill timeout.
- **Request timeouts**: 10-minute timeout for large uploads, with a proper 408 response if exceeded.
- **Service fallbacks**: If fileProcessor, nlpService, or geminiService fail to load, the system logs a warning and continues with reduced functionality.

### Logging

- **Morgan** for HTTP request logging (`dev` format in development, `combined` in production).
- **Custom logger** (`utils/logger.js`): `debug()` only fires in development; `error()` and `warn()` always fire.
- Console emoji prefixes for quick visual scanning (✅ success, ❌ error, ⚠️ warning, 🔄 processing).

---

## Security

| Measure | Implementation |
|---|---|
| Helmet | Sets security headers (CSP, X-Frame-Options, etc.) |
| CORS | Restricted to specific origins with credentials |
| Rate Limiting | Separate limiters for API, screening, candidate, and upload routes |
| Input Validation | Joi schemas for job requirements; express-validator for other inputs |
| File Validation | MIME type + extension check; only PDF/DOC/DOCX allowed |
| File Size Limit | 10MB per file, 100 files max per request |
| ObjectId Validation | All MongoDB IDs validated before queries |
| Bulk Delete Safety | `DELETE /api/resumes` requires `?confirm=all` query parameter |
| CSP | Allows only specific CDN sources for scripts, styles, and fonts |
| No Auth | There is no user authentication — the system is designed for single-user/team use |

> **Note:** There is no authentication or authorization system. The app assumes it runs in a trusted environment (local network or behind an auth proxy). This is an intentional scope decision for the academic project.

---

## Performance Considerations

- **Parallel database queries** — Dashboard and analytics pages use `Promise.all()` to fetch multiple counts/aggregations simultaneously.
- **MongoDB indexes** — Indexes on frequently queried fields (email, candidateName, normalizedName, isProcessed, uploadDate, skills, experience.years).
- **Text index** — Compound text index on normalizedName + email with weights for fast search.
- **AI call caching** — Job category detection results are cached in a per-process `Map` so the same job isn't classified multiple times during a single screening run.
- **Lean queries** — `.lean()` used on read-only queries to skip Mongoose hydration overhead.
- **Compression** — gzip compression enabled via the `compression` middleware.
- **Selective field projection** — API list endpoints exclude `extractedText` (which can be 50K+ chars) from responses.
- **Pagination** — All list endpoints support `page` and `limit` parameters with sensible defaults and maximum caps.

---

## Limitations and Known Issues

- **No OCR** — Image-based/scanned PDFs cannot be processed. The system relies on text extraction and will return an error for scanned documents.
- **No authentication** — Anyone with access to the URL can upload, screen, and delete data.
- **Ephemeral file storage** — On Render, uploaded files are lost on redeploy. Only the extracted text persists in MongoDB.
- **Name extraction is heuristic** — The 4-strategy name extraction (first 10 lines → ALL CAPS → Title Case → regex fallback) works well for most resumes but can occasionally pick up section headers or project titles as names.
- **Caching fully disabled** — All caching is turned off, which simplifies development but means every page load hits the database.
- **No WebSocket/real-time updates** — Upload progress and screening progress are not streamed; the client polls or waits for the full response.
- **Single-threaded processing** — Large batches (100 resumes × 4 jobs) can take a while since everything runs on a single Node.js thread.

---

## Future Improvements

- Add user authentication and role-based access (admin, recruiter, viewer)
- Implement OCR for scanned/image-based PDFs (Tesseract.js is listed as a dependency but not currently used)
- Add WebSocket support for real-time upload and screening progress
- Implement result caching with configurable TTL
- Add resume comparison view (side-by-side candidate comparison)
- Support more file formats (plain text, RTF)
- Add email notifications for completed screenings
- Build a proper ML classifier using training data (the `mlClassifier.js` and `trainingDataService.js` service files exist but are currently empty)

---
