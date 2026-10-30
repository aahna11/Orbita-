import { useCallback, useEffect, useState } from 'react'; import { useStore } from './store';
let refreshing = null; // one shared refresh for concurrent 401s
const refresh = () => (refreshing ??= fetch('/api/auth/refresh', { method: 'POST', headers: { 'X-Requested-With': 'orbita' } })
  .then(async r => { if (!r.ok) throw new Error('refresh'); const d = await r.json(); useStore.getState().set({ token: d.token, orgs: d.orgs }); }).finally(() => { refreshing = null; }));
export async function api(path, { method = 'GET', body } = {}, retry = true) {
  const { token, orgId, logout } = useStore.getState();
  const res = await fetch('/api' + path, { method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'orbita', ...(token && { Authorization: `Bearer ${token}` }), ...(orgId && { 'X-Org-Id': orgId }) } });
  if (res.status === 401 && token && retry && !path.startsWith('/auth/')) { try { await refresh(); return api(path, { method, body }, false); } catch { logout(); } }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error?.message || 'Request failed'), { code: data.error?.code, status: res.status });
  return data;
}
export function useLoad(path) { const [data, setData] = useState(null), [error, setError] = useState(null);
  const reload = useCallback(() => api(path).then(setData).catch(setError), [path]); useEffect(() => { reload(); }, [reload]); return { data, error, reload }; }
