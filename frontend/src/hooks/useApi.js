import { useState, useEffect, useCallback } from 'react';

/**
 * Generic data-fetching hook.
 * @param {Function} fetchFn - async function returning { data }
 * @param {boolean} immediate - fetch on mount (default true)
 */
export function useApi(fetchFn, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(...args);
      setData(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Something went wrong';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, refetch: execute };
}
