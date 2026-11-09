import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from './account-context.js';
import { contentRequest, writeContent } from './content-api.js';

export function useCommunity(songId, category) {
  const {user, openLogin} = useAccount();
  const [posts, setPosts] = useState([]), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), active = useRef(true), saving = useRef(false);
  const params = new URLSearchParams();
  if (songId) params.set('song_id', songId);
  if (category && category !== '全部' && category !== '推荐') params.set('category', category);
  const key = params.toString();
  const refresh = useCallback(async (append = false, offset = 0) => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const data = await contentRequest(`/posts?${key}&offset=${offset}`);
      if (!active.current || request !== generation.current) return;
      setPosts(previous => append ? [...previous, ...data.items.filter(item => !previous.some(p => p.id === item.id))] : data.items);
      setTotal(data.total);
    } catch (cause) { if (active.current && request === generation.current) setError(cause.message); }
    finally { if (active.current && request === generation.current) setLoading(false); }
  }, [key, user?.uid]);
  useEffect(() => { active.current = true; setPosts([]); setTotal(0); void refresh(); return () => {active.current = false; generation.current++;}; }, [refresh]);
  const mutate = async action => {
    if (!user || user.isAnonymous) {openLogin(); setError('请先登录账号再参与社区。'); return null;}
    if (saving.current) return null;
    const session = generation.current;
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await action();
      if (active.current && generation.current === session) await refresh();
      return result;
    } catch (cause) { if (active.current) setError(cause.message); return null; }
    finally { saving.current = false; if (active.current) setBusy(false); }
  };
  return {posts, total, loading, busy, error, refresh,
    loadMore: () => refresh(true, posts.length), mutate,
    publish: values => mutate(() => writeContent('/posts', 'POST', {...values, song_id: songId || null})),
    remove: id => mutate(() => writeContent(`/posts/${id}`, 'DELETE')),
    like: post => mutate(() => writeContent(`/posts/${post.id}/like`, 'PUT', {active: !post.liked})),
  };
}
