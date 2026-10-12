import { useState, useEffect, useCallback, useRef } from 'react';
import { getErrorMessage } from '../api/client.js';

/**
 * Generic data-fetching hook.
 * @param {Function} fetchFn  — async function that returns data
 * @param {Array}    deps     — dependency array (refetch when these change)
 * @param {Object}   options  — { immediate: bool, transform: fn }
 */
export function useFetch(fetchFn, deps = [], { immediate = true, transform } = {}) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort?.();
    const controller = new AbortController();
    abortRef.current  = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (controller.signal.aborted) return;
      setData(transform ? transform(result) : result);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err?.code === 'ERR_CANCELED') return;
      setError(getErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute();
    return () => abortRef.current?.abort?.();
  }, [execute]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: execute };
}
