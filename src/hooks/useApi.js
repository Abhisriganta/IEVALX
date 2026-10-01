import { useState, useCallback, useRef, useEffect } from 'react';

const useApi = (apiFn, options = {}) => {
  const { immediate = false, initialData = null, deps = [] } = options;

  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      if (mountedRef.current) setData(res.data);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.Error
  || err.response?.data?.message
  || err.response?.data?.detail
  || err.message
  || 'Something went wrong';
      if (mountedRef.current) setError(message);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return { data, loading, error, execute, setData, reset };
};

export default useApi;