import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './store'; import { api } from './api';
const M  = k => lazy(() => import('./pages/Misc.jsx').then(m => ({ default: m[k] })));
const Landing = lazy(() => import('./pages/Landing')), Auth = lazy(() => import('./pages/Auth')), Projects = lazy(() => import('./pages/Projects')), Board = lazy(() => import('./pages/Board')),
  Team = lazy(() => import('./pages/Team')), Activity = lazy(() => import('./pages/Activity')), Dashboard = lazy(() => import('./pages/Dashboard')), Task = lazy(() => import('./pages/Task')),
  Notifications = lazy(() => import('./pages/Notifications')), Settings = lazy(() => import('./pages/Settings')), DesignKit = lazy(() => import('./pages/DesignKit')),
  Onboarding = lazy(() => import('./pages/Onboarding')), Admin = lazy(() => import('./pages/Admin')), Forgot = M('Forgot'), Reset = M('Reset'), Invite = M('Invite');
export const Blob = () => <div className="blob" role="status" aria-label="Loading" />;
function Protected({ children }) { const t = useStore(s => s.token), loc = useLocation();
  return t ? children : <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />; }
function Shell() {
  const { orgs, orgId, theme, simple, set, logout } = useStore(), nav = useNavigate(), loc = useLocation(), [unread, setUnread] = useState(0);
  useEffect(() => { api('/orgs').then(o => set({ orgs: o, orgId: o.find(x => String(x.id) === String(orgId))?.id ?? o[0]?.id })).catch(() => {}); }, []);
  useEffect(() => { if (orgId) api('/notifications').then(r => setUnread(r.unread)).catch(() => {}); }, [loc.pathname, orgId]);
  return (<div className="shell">
    <header className="glass nav"><b className="brand">ORBITA</b>
      <nav><NavLink to="/app" end>Dashboard</NavLink><NavLink to="/app/projects">Projects</NavLink><NavLink to="/app/team">Team</NavLink><NavLink to="/app/activity">Activity</NavLink>
        <NavLink to="/app/notifications">Alerts {unread > 0 && <span className="chip mono">{unread}</span>}</NavLink><NavLink to="/app/settings">Settings</NavLink></nav>
      <select aria-label="Organization" value={orgId ?? ''} onChange={e => { set({ orgId: e.target.value }); nav('/app'); }}>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <button className="pill ghost" onClick={() => set({ theme: theme === 'pearl' ? 'nebula' : 'pearl' })}>{theme === 'pearl' ? 'Nebula' : 'Pearl'}</button>
      <button className="pill ghost" aria-pressed={simple} onClick={() => set({ simple: !simple })}>Simple view</button>
      <button className="pill ghost" onClick={() => { api('/auth/logout', { method: 'POST' }).catch(() => {}); logout(); nav('/'); }}>Log out</button></header>
    <main key={loc.pathname + orgId} className="page"><Suspense fallback={<Blob />}><Outlet /></Suspense></main></div>);
}
export default function App() {
  const { theme, simple } = useStore();
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('simple', simple); }, [theme, simple]);
  return (<><div className="orbs" aria-hidden="true"><i /><i /><i /></div>
    <Suspense fallback={<Blob />}><Routes>
      <Route path="/" element={<Landing />} /><Route path="/login" element={<Auth mode="login" />} /><Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/forgot" element={<Forgot />} /><Route path="/reset/:token" element={<Reset />} />
      <Route path="/invite/:token" element={<Protected><Invite /></Protected>} /><Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="/app" element={<Protected><Shell /></Protected>}>
        <Route index element={<Dashboard />} /><Route path="projects" element={<Projects />} /><Route path="projects/:id" element={<Board />} /><Route path="tasks/:id" element={<Task />} />
        <Route path="team" element={<Team />} /><Route path="activity" element={<Activity />} /><Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} /><Route path="settings/design" element={<DesignKit />} /></Route>
      <Route path="/admin" element={<Protected><Shell /></Protected>}><Route index element={<Admin />} /></Route>
      <Route path="*" element={<div className="center"><h1 className="display">404</h1><NavLink className="pill" to="/">Back home</NavLink></div>} />
    </Routes></Suspense></>);
}
