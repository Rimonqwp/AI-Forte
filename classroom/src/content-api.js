import { auth } from './firebase.js';

const base = (import.meta.env.VITE_ACCOUNT_API_BASE || '/api/account') + '/content';
export async function contentRequest(path, options = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const response = await fetch(base + path, {
    ...options,
    headers: {'Content-Type': 'application/json', ...(token && {Authorization: `Bearer ${token}`}), ...options.headers},
  });
  if (auth.currentUser?.uid !== user?.uid) throw new Error('账号已切换，请重试。');
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : '数据服务暂时不可用，请稍后重试。';
    throw Object.assign(new Error(message), {status: response.status});
  }
  return data;
}

export function writeContent(path, method, body) {
  return contentRequest(path, {method, ...(body !== undefined && {body: JSON.stringify(body)})});
}
