// The backend verifies the Firebase ID token and derives the UID itself.
export function stateClient(request) {
  return {
    async read(key) { return request(`/state/${encodeURIComponent(key)}`); },
    async update(key, change) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const current = await this.read(key);
        const value = change(current.value);
        try {
          const result = await request(`/state/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value, version: current.version }) });
          return result.value;
        } catch (error) {
          if (error.status !== 409) throw error;
        }
      }
      throw new Error('storage/conflict');
    },
  };
}
