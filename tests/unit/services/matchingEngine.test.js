/**
 * Unit tests for matchingEngine service
 * Tests candidate scoring algorithms and matching logic
 */
const matchingEngine = require('../../../services/matchingEngine');
const { createTestResume } = require('../../setup/testHelpers');

describe('Matching Engine Service', () => {
  describe('strictSkillMatch', () => {
    it('should match exact skills correctly', () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const requiredSkills = ['JavaScript', 'React'];
      
      const result = matchingEngine.strictSkillMatch(resumeSkills, requiredSkills);
      
      expect(result.matched).toEqual(['JavaScript', 'React']);
      expect(result.missing).toEqual([]);
    });

    it('should handle case-insensitive matching', () => {
      const resumeSkills = ['javascript', 'REACT', 'Node.js'];
      const requiredSkills = ['JavaScript', 'React'];
      
      const result = matchingEngine.strictSkillMatch(resumeSkills, requiredSkills);
      
      expect(result.matched).toHaveLength(2);
    });

    it('should identify missing skills', () => {
      const resumeSkills = ['JavaScript'];
      const requiredSkills = ['JavaScript', 'React', 'Vue.js'];
      
      const result = matchingEngine.strictSkillMatch(resumeSkills, requiredSkills);
      
      expect(result.matched).toEqual(['JavaScript']);
      expect(result.missing).toEqual(['React', 'Vue.js']);
    });

    it('should handle empty skill arrays', () => {
      const result = matchingEngine.strictSkillMatch([], []);
      
      expect(result.matched).toEqual([]);
      expect(result.missing).toEqual([]);
    });
  });

  describe('scoreCandidate', () => {
    it('should score candidate with perfect skill match', async () => {
      const mockResume = {
        candidateName: 'Test Candidate',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: { years: 3 },
        education: { degree: "Bachelor's" }
      };

      const jobRequirements = {
        requiredSkills: ['JavaScript', 'React'],
        minExp: 2,
        maxExp: 5,
        educationLevel: "Bachelor's",
        jobTitle: 'Frontend Developer'
      };

      const result = await matchingEngine.scoreCandidate(mockResume, jobRequirements);
      
      expect(result.matchScore).toBeGreaterThan(70);
      expect(result.skillsMatch.matched).toHaveLength(2);
      expect(result.experienceMatch).toBe(true);
    });

    it('should apply domain mismatch penalty', async () => {
      const mockResume = {
        candidateName: 'Test Candidate',
        skills: ['Accounting', 'Tally', 'GST'],
        experience: { years: 3 },
        education: { degree: "B.Com" }
      };

      const jobRequirements = {
        requiredSkills: ['JavaScript', 'React'],
        minExp: 2,
        maxExp: 5,
        jobTitle: 'Software Developer'
      };

      const result = await matchingEngine.scoreCandidate(mockResume, jobRequirements);
      
      expect(result.matchScore).toBeLessThan(30);
      expect(result.relevancePenalty).toBeGreaterThan(0);
    });

    it('should handle scoring errors gracefully', async () => {
      const invalidResume = null;
      const jobRequirements = {
        requiredSkills: ['JavaScript'],
        minExp: 2,
        maxExp: 5,
        jobTitle: 'Developer'
      };

      const result = await matchingEngine.scoreCandidate(invalidResume, jobRequirements);
      
      expect(result.matchScore).toBe(5);
      expect(result.reasons).toContain('Error in scoring - assigned minimum score');
    });
  });

  describe('validateSkillsRelevance', () => {
    it('should detect technical skills for accounting position', () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills = ['Accounting', 'Tally'];
      const jobTitle = 'Accountant';

      const result = matchingEngine._utils.validateSkillsRelevance(
        resumeSkills, jobSkills, jobTitle
      );

      expect(result.isRelevant).toBe(false);
      expect(result.penalty).toBe(0.3);
    });

    it('should allow relevant skills', () => {
      const resumeSkills = ['JavaScript', 'React', 'Node.js'];
      const jobSkills = ['JavaScript', 'React'];
      const jobTitle = 'Frontend Developer';

      const result = matchingEngine._utils.validateSkillsRelevance(
        resumeSkills, jobSkills, jobTitle
      );

      expect(result.isRelevant).toBe(true);
      expect(result.penalty).toBe(0);
    });
  });
});
