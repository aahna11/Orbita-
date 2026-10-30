import { useState } from 'react'; import { api, useLoad } from '../api'; import { useRole } from '../store'; import { Blob } from '../App';
function Orbit({ people }) { const rings = ['owner', 'admin', 'member', 'viewer'], col = { owner: '#F0507A', admin: '#A99BEA', member: '#5FD3C8', viewer: '#9AA3B8' };
  return (<svg viewBox="0 0 600 400" className="arch" role="img" aria-label="Team members orbiting their role rings">
    <defs><radialGradient id="pg" cx=".3" cy=".25"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="currentColor" /></radialGradient></defs>
    {rings.map((r, i) => { const rad = 45 + i * 40, list = people.filter(p => p.role === r); return (<g key={r}><circle cx="300" cy="200" r={rad} fill="none" stroke="var(--border)" strokeDasharray="3 6" />
      <g className="orbit" style={{ animationDuration: `${40 + i * 25}s` }}>{list.map((p, j) => { const a = j / list.length * 6.283; return (<g key={p.id} transform={`translate(${300 + Math.cos(a) * rad} ${200 + Math.sin(a) * rad})`} style={{ color: col[r] }}>
        <circle r="13" fill="url(#pg)" /><title>{p.name} ({r})</title></g>); })}</g></g>); })}
    <circle cx="300" cy="200" r="22" fill="url(#pg)" style={{ color: '#F0507A' }} /></svg>); }
export default function Team() {
  const { data, error, reload } = useLoad('/members'), role = useRole(), [f, setF] = useState({ email: '', role: 'member' }), [msg, setMsg] = useState('');
  async function invite(e) { e.preventDefault(); setMsg(''); try { await api('/invites', { method: 'POST', body: f }); setMsg(`Invite sent to ${f.email}`); setF({ ...f, email: '' }); reload(); } catch (x) { setMsg(x.message); } }
  if (error) return <p role="alert" className="error">{error.message}</p>; if (!data) return <Blob />;
  return (<><h1 className="display">Team</h1>
    {['owner', 'admin'].includes(role) && <form className="glass solid card row" onSubmit={invite}><input type="email" required aria-label="Email" placeholder="teammate@company.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <select aria-label="Role" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option>admin</option><option>member</option><option>viewer</option></select><button className="pill">Invite</button>{msg && <span role="status">{msg}</span>}</form>}
    <div className="glass solid card"><Orbit people={data} /></div>
    <div className="glass solid card">{data.map(m => <div key={m.id} className="row between"><span>{m.name} <span className="muted">{m.email}</span></span><span className="chip">{m.role}</span></div>)}</div></>);
}
