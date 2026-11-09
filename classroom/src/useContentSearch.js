import { useEffect, useState } from 'react';
import { contentRequest } from './content-api.js';

export function useContentSearch(term, type = '全部', sort = '综合推荐', limit = 100, enabled = true, offset = 0) {
  const [result, setResult] = useState({items: [], total: 0, loading: true, error: ''});
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult({items: [], total: 0, loading: true, error: ''});
    if (!enabled) {setResult({items: [], total: 0, loading: false, error: ''}); return () => controller.abort();}
    const timer = setTimeout(() => {
      const params = new URLSearchParams({q: term, type, sort, limit, offset});
      contentRequest('/songs?' + params, {signal: controller.signal})
        .then(data => { if (!controller.signal.aborted) setResult({...data, loading: false, error: ''}); })
        .catch(error => { if (!controller.signal.aborted) setResult({items: [], total: 0, loading: false, error: error.message}); });
    }, 180);
    return () => {clearTimeout(timer); controller.abort();};
  }, [term, type, sort, limit, enabled, offset, attempt]);
  return {...result, retry: () => retry(value => value + 1)};
}
