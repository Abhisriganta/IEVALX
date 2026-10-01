// Shared hooks
export { useAuth }                   from './useAuth';
export { default as useApi }         from './useApi';
export { default as useDebounce }    from './useDebounce';
export { default as useForm }        from './useForm';

// Role-specific hooks (currently empty — extend as needed)
export * from './jobseeker';
export * from './employer';
export * from './company';
