// One client per Firebase user: batch initial reads and reuse known CAS versions.
const copy = value => structuredClone(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function delta(before, after) {
  if (!Array.isArray(after) || !Array.isArray(before) || !after.every(x => typeof x === 'string')) return null;
  const remove = before.filter(x => !after.includes(x));
  const add = after.filter(x => !before.includes(x));
  return equal([...before.filter(x => !remove.includes(x)), ...add], after) ? {add, remove} : null;
}
export function stateClient(request) {
  const cached = new Map(), reads = new Map(), writes = new Map();
  let scheduled = false;
  const remember = (key, record) => {
    const previous = cached.get(key);
    if (!previous || record.version >= previous.version) cached.set(key, copy(record));
    const result = copy(cached.get(key));
    if (cached.size > 128) cached.delete(cached.keys().next().value);
    return result;
  };
  const fetchOne = async key => {
    const previous = cached.get(key);
    const record = await request(`/state/${encodeURIComponent(key)}`, previous?.etag ? {headers: {
      'If-None-Match': previous.etag, 'X-State-If-None-Match': previous.etag,
    }} : undefined);
    if (record.notModified) {
      if (!previous) throw new Error('storage/missing-cache');
      return copy(previous);
    }
    return remember(key, record);
  };
  const flush = async () => {
    scheduled = false;
    const pending = [...reads.entries()].filter(([, deferred]) => deferred.queued);
    pending.forEach(([, deferred]) => { deferred.queued = false; });
    for (let index = 0; index < pending.length; index += 32) {
      const group = pending.slice(index, index + 32);
      try {
        let values;
        if (group.length === 1) values = new Map([[group[0][0], await fetchOne(group[0][0])]]);
        else {
          try {
            const response = await request('/state:batchGet', {method: 'POST', body: JSON.stringify({keys: group.map(([key]) => key)})});
            values = new Map(response.states.map(({key, ...record}) => [key, record]));
          } catch (error) {
            if (![404, 405].includes(error.status)) throw error;
            values = new Map(await Promise.all(group.map(async ([key]) => [key, await fetchOne(key)])));
          }
        }
        for (const [key, deferred] of group) {
          const record = values.get(key);
          if (!record || !Number.isInteger(record.version)) throw new Error('storage/invalid-response');
          deferred.resolve(remember(key, record));
          if (reads.get(key) === deferred) reads.delete(key);
        }
      } catch (error) {
        for (const [key, deferred] of group) {
          cached.delete(key); deferred.reject(error);
          if (reads.get(key) === deferred) reads.delete(key);
        }
      }
    }
  };
  const client = {
    read(key) {
      if (reads.has(key)) return reads.get(key).promise;
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      reads.set(key, {promise, resolve, reject, queued: true});
      if (!scheduled) { scheduled = true; setTimeout(() => void flush(), 0); }
      return promise;
    },
    update(key, change) {
      const run = async () => {
        for (let attempt = 0; attempt < 8; attempt++) {
          const current = cached.has(key) ? copy(cached.get(key)) : await client.read(key);
          const value = change(copy(current.value));
          if (current.version > 0 && equal(value, current.value)) return copy(value);
          const patch = delta(current.value ?? [], value);
          try {
            let result;
            if (patch) {
              try {
                result = await request(`/state/${encodeURIComponent(key)}`, {method: 'PATCH', body: JSON.stringify({version: current.version, ...patch})});
              } catch (error) {
                if (![404, 405].includes(error.status)) throw error;
              }
            }
            result ||= await request(`/state/${encodeURIComponent(key)}`, {method: 'PUT', body: JSON.stringify({value, version: current.version})});
            remember(key, {value: copy(value), version: result.version});
            return copy(value);
          } catch (error) {
            cached.delete(key);
            if (error.status !== 409) throw error;
          }
        }
        throw new Error('storage/conflict');
      };
      const previous = writes.get(key) || Promise.resolve();
      const next = previous.catch(() => {}).then(run);
      writes.set(key, next);
      void next.finally(() => { if (writes.get(key) === next) writes.delete(key); }).catch(() => {});
      return next;
    },
  };
  return client;
}
