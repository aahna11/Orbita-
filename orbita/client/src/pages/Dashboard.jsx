import { useState } from 'react'; import { Link } from 'react-router-dom'; import { api, useLoad } from '../api'; import { useStore } from '../store'; import { Blob } from '../App';
const COL = { urgent: '#E5484D', high: '#F2A93B', medium: '#4C8DFF', low: '#2FBF8F' }, ORDER = ['urgent', 'high', 'medium', 'low'];
function Donut({ data }) { const total = data.reduce((a, d) => a + d.n, 0), R = 70, C = 2 * Math.PI * R; let acc = 0;
  return (<svg viewBox="0 0 200 200" role="img" aria-label={`${total} tasks by priority`} className="donut"><defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".75" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <filter id="sh"><feDropShadow dx="0" dy="7" stdDeviation="5" floodOpacity=".3" /></filter></defs>
    <g filter="url(#sh)" transform="rotate(-90 100 100)">{data.map(d => { const len = d.n / (total || 1) * C, o = -acc; acc += len;
      return <circle key={d.priority} r={R} cx="100" cy="100" fill="none" stroke={COL[d.priority]} strokeWidth="26" strokeLinecap="round" strokeDasharray={`${Math.max(len - 4, 0)} ${C}`} strokeDashoffset={o} />; })}</g>
    <circle r={R} cx="100" cy="100" fill="none" stroke="url(#gl)" strokeWidth="26" opacity=".7" /><text x="100" y="108" textAnchor="middle" fontSize="28" fill="var(--text)" className="mono">{total}</text></svg>);
}
export default function Dashboard() {
  const { data, error } = useLoad('/dashboard'), [q, setQ] = useState(''), [res, setRes] = useState(null), last = useStore(s => s.lastProject);
  if (error) return <p role="alert" className="error">{error.message}</p>; if (!data) return <Blob />;
  const by = ORDER.map(p => ({ priority: p, n: data.byPriority.find(x => x.priority === p)?.n || 0 })), max = Math.max(1, ...by.map(b => b.n));
  return (<><h1 className="display">Dashboard</h1>
    <form className="searchpill" role="search" onSubmit={async e => { e.preventDefault(); setRes((await api(`/search?q=${encodeURIComponent(q)}`)).items); }}>
      <input aria-label="Search tasks" placeholder="Search tasks…" value={q} onChange={e => setQ(e.target.value)} /><button className="pill">Search</button></form>
    {res && <div className="glass solid card">{res.length ? res.map(t => <div key={t.id} className="row between"><Link to={`/app/tasks/${t.id}`}>{t.title}</Link><span className={`chip p-${t.priority}`}>{t.priority}</span></div>) : 'No matches.'}</div>}
    {last && <Link className="pill ghost" to={`/app/projects/${last}`}>Continue where you left off</Link>}
    <div className="stack">{[['Projects', data.projects], ['Members', data.members], ['Tasks', data.tasks], ['Assigned to me', data.mine]].map(([l, n]) => <div key={l} className="glass solid card stat"><span className="badge mono">{n}</span>{l}</div>)}</div>
    <div className="grid"><div className="glass solid card"><h2>By priority</h2><Donut data={by} /></div>
      <div className="glass solid card"><h2>Workload</h2>{by.map(b => <div key={b.priority} className="barrow"><span>{b.priority}</span><div className="gbar"><span style={{ width: b.n / max * 100 + '%', background: COL[b.priority] }} /></div><span className="mono">{b.n}</span></div>)}</div></div></>);
}
