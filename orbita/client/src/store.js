import { create } from 'zustand';
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
export const useStore = create(set => ({
  token: ls('token', null), orgs: ls('orgs', []), orgId: ls('orgId', null), theme: ls('theme', 'pearl'), lastProject: ls('lastProject', null),
  simple: ls('simple', matchMedia('(prefers-reduced-motion: reduce)').matches),
  set: p => { Object.entries(p).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); set(p); },
  logout: () => { ['token', 'orgs', 'orgId'].forEach(k => localStorage.removeItem(k)); set({ token: null, orgs: [], orgId: null }); },
}));
export const useRole = () => useStore(s => s.orgs.find(o => String(o.id) === String(s.orgId))?.role);
