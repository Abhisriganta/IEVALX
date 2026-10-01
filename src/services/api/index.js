// Shared (used by multiple roles)
export { default as api }         from './axiosInstance';
export { default as authService } from './authService';

// Role-specific barrels
export * from './jobseeker';
export * from './employer';
export * from './company';
