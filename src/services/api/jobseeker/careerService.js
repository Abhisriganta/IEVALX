

import { skillsAnalysisMock } from '@/mocks/jobseeker/career.mock';

const MOCK_DELAY_MS = 350;
const mockReturn = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(data), MOCK_DELAY_MS));

const careerService = {
  // ---- Skills Analysis ---------------------------------------------------
  getSkillsAnalysis: async () => {
    try {
      return await mockReturn(skillsAnalysisMock);
    } catch (error) {
      console.error('Error fetching skills analysis:', error);
      throw error;
    }
  },

  refreshSkillsAnalysis: async () => {
    try {
      return await mockReturn({
        ...skillsAnalysisMock,
        lastAnalyzed: new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      console.error('Error refreshing skills analysis:', error);
      throw error;
    }
  },
};

export default careerService;