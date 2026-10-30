import { useState } from 'react'; import { Link, useNavigate } from 'react-router-dom'; import { api } from '../api'; import { useRole, useStore } from '../store';
export default function Settings() {
  const { orgs, orgId, theme, simple, set } = useStore(), role = useRole(), nav = useNavigate(), org = orgs.find(o => String(o.id) === String(orgId));
  const [name, setName] = useState(org?.name || ''), [newOrg, setNewOrg] = useState(''), [confirm, setConfirm] = useState(''), [msg, setMsg] = useState('');
  const refresh = async id => { const o = await api('/orgs'); set({ orgs: o, orgId: id ?? o[0]?.id ?? null }); return o; };
  const run = fn => async e => { e.preventDefault(); setMsg(''); try { await fn(); } catch (x) { setMsg(x.message); } };
  return (<><h1 className="display">Settings</h1>
    <div className="glass solid card"><h2>Appearance</h2><div className="row"><button className="pill ghost" onClick={() => set({ theme: theme === 'pearl' ? 'nebula' : 'pearl' })}>Theme: {theme}</button>
      <button className="pill ghost" aria-pressed={simple} onClick={() => set({ simple: !simple })}>Simple view: {simple ? 'on' : 'off'}</button><Link className="pill ghost" to="/app/settings/design">Design kit</Link></div></div>
    {org && ['owner', 'admin'].includes(role) && <form className="glass solid card row" onSubmit={run(async () => { await api('/orgs/current', { method: 'PATCH', body: { name } }); await refresh(orgId); setMsg('Renamed'); })}>
      <label>Organization name<input value={name} onChange={e => setName(e.target.value)} minLength={2} required /></label><button className="pill">Rename</button></form>}
    <form className="glass solid card row" onSubmit={run(async () => { const o = await api('/orgs', { method: 'POST', body: { name: newOrg } }); await refresh(o.id); setNewOrg(''); nav('/onboarding'); })}>
      <label>Create another organization<input value={newOrg} onChange={e => setNewOrg(e.target.value)} minLength={2} required /></label><button className="pill">Create</button></form>
    {role === 'owner' && <form className="glass solid card row" onSubmit={run(async () => { await api('/orgs/current', { method: 'DELETE' }); await refresh(); nav('/app/settings'); })}>
      <label>Delete organization. Type “{org?.name}” to confirm<input value={confirm} onChange={e => setConfirm(e.target.value)} /></label><button className="pill" disabled={confirm !== org?.name}>Delete forever</button></form>}
    {msg && <p role="status">{msg}</p>}</>);
}
