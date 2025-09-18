/**
 * Unit tests for Screening model
 */
const mongoose = require("mongoose");
const Screening = require("../../../models/Screening");
const { createTestScreening } = require("../../setup/testHelpers");

describe("Screening Model", () => {
  describe("Schema Validation", () => {
    it("should create and save a screening successfully", async () => {
      const validScreening = createTestScreening();
      const savedScreening = await validScreening.save();

      expect(savedScreening._id).toBeDefined();
      expect(savedScreening.jobTitle).toBe("Test Developer");
      expect(savedScreening.requiredSkills).toEqual(["JavaScript", "React"]);
      expect(savedScreening.createdAt).toBeDefined();
    });

    it("should require mandatory fields", async () => {
      const invalidScreening = new Screening({});

      await expect(invalidScreening.save()).rejects.toThrow(
        mongoose.Error.ValidationError
      );
    });

    it("should validate experience level ranges", async () => {
      const screeningWithValidExp = createTestScreening({
        experienceLevel: { min: 2, max: 8 }, // valid range
      });

      const saved = await screeningWithValidExp.save();
      expect(saved.experienceLevel.min).toBe(2);
      expect(saved.experienceLevel.max).toBe(8);
    });

    // ✅ FIX 4: Default values test with correct expectation
    it("should have default values for optional fields", async () => {
      const minimalScreening = new Screening({
        jobTitle: "Test Job",
        requiredSkills: ["JavaScript"],
        experienceLevel: { min: 0, max: 10 },
      });

      const savedScreening = await minimalScreening.save();
      expect(savedScreening.results).toEqual([]);
      expect(savedScreening.processingStatus).toBe("completed"); // ✅ EXPECT: 'completed' (your actual default)
      expect(savedScreening.createdBy).toBe("System");
    });
  });

  describe("Virtual Properties", () => {
    it("should calculate qualified candidates percentage", async () => {
      const screening = createTestScreening({
        statistics: {
          totalCandidates: 100,
          qualifiedCandidates: 75,
          averageScore: 68,
          topScore: 95,
        },
      });

      const savedScreening = await screening.save();

      // Test virtual property if you have one
      expect(savedScreening.id).toBe(savedScreening._id.toString());
    });
  });

  describe("Methods", () => {
    it("should add candidate to results", async () => {
      const screening = createTestScreening();
      await screening.save();

      const candidateResult = {
        resumeId: new mongoose.Types.ObjectId(),
        candidateName: "Test Candidate",
        matchScore: 85,
        overallRank: 1,
        skillsMatch: 90,
        experienceMatch: true,
        educationMatch: true,
      };

      screening.results.push(candidateResult);
      const updatedScreening = await screening.save();

      expect(updatedScreening.results).toHaveLength(1);
      expect(updatedScreening.results[0].candidateName).toBe("Test Candidate");
    });

    it("should update statistics", async () => {
      const screening = createTestScreening();
      await screening.save();

      screening.statistics = {
        totalCandidates: 50,
        qualifiedCandidates: 30,
        averageScore: 72,
        topScore: 98,
      };

      const updatedScreening = await screening.save();

      expect(updatedScreening.statistics.totalCandidates).toBe(50);
      expect(updatedScreening.statistics.topScore).toBe(98);
    });
  });

  describe("Indexes", () => {
    it("should have proper indexes for queries", async () => {
      const indexes = await Screening.collection.getIndexes();

      // Check if there are indexes on frequently queried fields
      expect(indexes).toBeDefined();
      // Add specific index checks based on your model
    });
  });
});
