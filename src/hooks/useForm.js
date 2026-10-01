import { useState, useCallback } from 'react';

const useForm = (initialValues = {}, validationRules = {}) => {
  const [values,  setValues]  = useState(initialValues);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldValues = values) => {
    const errs = {};
    Object.keys(validationRules).forEach((field) => {
      const rules = validationRules[field];
      const value = fieldValues[field];

      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errs[field] = rules.required === true ? `${field} is required` : rules.required;
        return;
      }
      if (rules.minLength && value?.length < rules.minLength) {
        errs[field] = `Minimum ${rules.minLength} characters required`;
        return;
      }
      if (rules.maxLength && value?.length > rules.maxLength) {
        errs[field] = `Maximum ${rules.maxLength} characters allowed`;
        return;
      }
      if (rules.pattern && !rules.pattern.value.test(value)) {
        errs[field] = rules.pattern.message || 'Invalid format';
        return;
      }
      if (rules.validate) {
        const result = rules.validate(value, fieldValues);
        if (result !== true) errs[field] = result;
      }
    });
    return errs;
  }, [values, validationRules]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;
    setValues(prev => ({ ...prev, [name]: newVal }));
    if (touched[name]) {
      const errs = validate({ ...values, [name]: newVal });
      setErrors(prev => ({ ...prev, [name]: errs[name] || '' }));
    }
  }, [values, touched, validate]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const errs = validate(values);
    setErrors(prev => ({ ...prev, [name]: errs[name] || '' }));
  }, [values, validate]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const allTouched = Object.keys(validationRules).reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(allTouched);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) await onSubmit(values);
  }, [values, validate, validationRules]);

  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.keys(validate(values)).length === 0;

  return {
    values, errors, touched, isValid,
    handleChange, handleBlur, handleSubmit, setValue, reset,
  };
};

export default useForm;