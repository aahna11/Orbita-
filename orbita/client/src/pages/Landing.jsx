import { lazy, Suspense } from 'react'; import { Link } from 'react-router-dom'; import { useStore } from '../store';
const Hero3D = lazy(() => import('./Hero3D'));
const steps = ['Create your organization', 'Invite your team', 'Create projects', 'Assign tasks', 'Track progress', 'Review history'];
const comps = [['Tenant isolation', 'Every query is scoped to your organization.'], ['Role-based access', 'Owner, Admin, Member, Viewer.'], ['Boards & tasks', 'Drag cards across columns.'], ['Invites', 'Expiring email links.'],
  ['Comments', 'Discuss work on the task.'], ['Activity log', 'Append-only history.'], ['Real-time', 'Live board updates (planned).'], ['Notifications', 'Assigned, mentioned, due soon (planned).']];
const tech = [['React + Vite', 'the UI'], ['Node + Express', 'the API'], ['MySQL', 'relational data'], ['MongoDB', 'activity feed (planned)'], ['Socket.io', 'live updates (planned)'], ['Docker', 'local services'], ['Swagger', 'API docs (planned)']];
export default function Landing() {
  const simple = useStore(s => s.simple), token = useStore(s => s.token);
  return (<div className="landing">
    <header className="glass nav wide"><b className="brand">ORBITA</b><nav><a href="#what">What it is</a><a href="#how">How it works</a><a href="#components">Components</a><a href="#tech">Technology</a></nav>
      <Link className="pill" to={token ? '/app' : '/login'}>{token ? 'Open app' : 'Log in'}</Link></header>
    <section className="hero">
      <h1 className="chrome" aria-label="ORBITA">ORBITA</h1>
      {!simple && <Suspense fallback={null}><Hero3D /></Suspense>}
      <div className="hero-copy"><p className="tag">Project management for teams that orbit the same goal.</p><div className="row"><Link className="pill" to="/signup">Get started</Link><Link className="pill ghost" to="/login">Log in</Link></div></div></section>
    <section id="what" className="glass solid card"><h2 className="display">What it is</h2><p>ORBITA gives every company a private workspace to plan projects, assign tasks on boards, discuss work and keep a complete history. Companies share the platform but never each other's data.</p></section>
    <section id="how"><h2 className="display">How it works</h2><ol className="steps">{steps.map((s, i) => <li key={s} className="glass solid card"><span className="chip mono">{i + 1}</span>{s}</li>)}</ol>
      <p className="glass solid card">Example: Northwind Studio signs up, invites six designers, creates "Spring launch", assigns 40 tasks, and the owner reviews who changed what every Friday.</p></section>
    <section id="components"><h2 className="display">Key components</h2><div className="grid">{comps.map(([t, d], i) => <div key={t} className="glass solid card hover"><i className="gem" style={{ '--c': ['#F0507A', '#A99BEA', '#5FD3C8'][i % 3] }} /><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
    <section id="tech"><h2 className="display">Technology</h2><div className="grid">{tech.map(([t, d]) => <div key={t} className="glass solid card"><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
    <section className="glass solid card"><h2 className="display">Architecture</h2>
      <svg viewBox="0 0 640 120" role="img" aria-label="Client calls API; API uses MySQL and MongoDB; Socket.io pushes updates to the client" className="arch">
        {[['Client', 20], ['API', 190], ['MySQL', 360], ['MongoDB', 500]].map(([t, x]) => <g key={t}><rect x={x} y="35" width="120" height="50" rx="16" fill="var(--glass-solid)" stroke="var(--border)" /><text x={x + 60} y="66" textAnchor="middle" fill="var(--text)" fontSize="15">{t}</text></g>)}
        <path d="M140 60h50M310 60h50M310 50l190 0" stroke="var(--accent)" strokeWidth="2" fill="none" /><text x="165" y="25" textAnchor="middle" fill="var(--muted)" fontSize="11">REST + WebSocket</text></svg></section>
    <section><h2 className="display">Main points</h2><div className="grid">{[['Scalable', 'Stateless API and pooled, indexed queries.'], ['Secure', 'Hashed passwords, lockout, validated input, parameterized SQL.'], ['Auditable', 'Every write is logged.']].map(([t, d]) => <div key={t} className="glass solid card"><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
    <footer className="glass solid card row between"><span>ORBITA</span><Link className="pill" to="/signup">Start using ORBITA</Link></footer></div>);
}
