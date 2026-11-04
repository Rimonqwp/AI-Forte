// Local-first state with ordered, transactional writes. Pending actions are replayed
// over the server value, so a slow initial read cannot erase a new favorite.
export function createCloudState({ initial, readCache, writeCache, connect, onError = () => {} }) {
  let cached, dirty = false;
  try { const entry = readCache(); cached = entry?.value; dirty = entry?.dirty === true; } catch { /* Browser storage is optional. */ }
  let base = cached === undefined ? initial : cached;
  let snapshot = { value: base, status: 'connecting' };
  let adapter, loading, flushing;
  const pending = [], listeners = new Set();
  const publish = status => {
    const value = pending.reduce((value, action) => action.apply(value), base);
    snapshot = { value, status };
    try { writeCache({ value, dirty: pending.length > 0 }); } catch { /* Cloud storage can still work. */ }
    listeners.forEach(listener => listener());
  };
  const fail = error => {
    publish('error');
    pending.forEach(action => action.resolve(false));
    onError(error);
  };
  const flush = () => {
    if (flushing) return flushing;
    if (!pending.length) return Promise.resolve();
    flushing = (async () => {
      try {
        while (pending.length) {
          const action = pending[0];
          base = await adapter.update(value => action.apply(value === undefined ? base : value));
          pending.shift();
          action.resolve(true);
          publish(pending.length ? 'saving' : 'synced');
        }
      } catch (error) { fail(error); }
      finally { flushing = null; }
    })();
    return flushing;
  };
  const start = () => {
    if (adapter) return flush();
    if (loading) return loading;
    loading = (async () => {
      try {
        const connection = await connect();
        const remote = await connection.read();
        if (remote !== undefined) base = remote;
        // Migrate an existing browser value only when no cloud record exists.
        if (cached !== undefined && (dirty || (remote === undefined && JSON.stringify(cached) !== JSON.stringify(initial)))) {
          pending.unshift({ apply: () => cached, resolve: () => {} });
        }
        adapter = connection;
        publish(pending.length ? 'saving' : 'synced');
        await flush();
      } catch (error) { fail(error); }
      finally { loading = null; }
    })();
    return loading;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); void start(); return () => listeners.delete(listener); },
    update(next) {
      const result = new Promise(resolve => pending.push({ apply: typeof next === 'function' ? next : () => next, resolve }));
      publish('saving');
      void start();
      return result;
    },
    retry: start,
  };
}
