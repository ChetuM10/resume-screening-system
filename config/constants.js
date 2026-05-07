/**
 * @fileoverview Shared constants for the Resume Screening System.
 * Single source of truth for thresholds — no more magic numbers.
 */

module.exports = {
  /**
   * Minimum match score (0-100) for a candidate to be considered "qualified".
   * Used in: screeningController.js, resultsController.js, Screening model.
   */
  QUALIFICATION_THRESHOLD: 70,

  /**
   * Minimum match score to display in the "qualified" bucket on the results page.
   * Kept separate so the display threshold can diverge from the DB filter if needed.
   */
  QUALIFYING_SCORE: 50,

  /** Maximum files allowed per upload request. */
  MAX_FILES: 100,

  /** Maximum individual file size in bytes (10 MB). */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
};
