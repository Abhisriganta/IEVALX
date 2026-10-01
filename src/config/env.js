const env = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  
WEEKLY_INTERVIEW_URL:
    import.meta.env.VITE_WEEKLY_INTERVIEW_URL || "", 
  APP_NAME: import.meta.env.VITE_APP_NAME || "IEvalx",
  APP_ENV: import.meta.env.MODE || "development",
  IS_DEV: import.meta.env.DEV === true,
  IS_PROD: import.meta.env.PROD === true,
  FEATURES: {
    AI_INTERVIEW: import.meta.env.VITE_FEATURE_AI_INTERVIEW === "true",
    ASSESSMENTS: import.meta.env.VITE_FEATURE_ASSESSMENTS === "true",
    CANDIDATE_POOL: import.meta.env.VITE_FEATURE_CANDIDATE_POOL === "true",
  },
};
export default env;