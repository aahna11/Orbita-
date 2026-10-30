import { useState } from 'react'; import { Link } from 'react-router-dom'; import { api, useLoad } from '../api'; import { useRole } from '../store'; import { Blob } from '../App';
export default function Projects() {
  const { data, error, reload } = useLoad('/projects'), role = useRole(), [name, setName] = useState(''), [err, setErr] = useState('');
  async function add(e) { e.preventDefault(); setErr(''); try { await api('/projects', { method: 'POST', body: { name } }); setName(''); reload(); } catch (x) { setErr(x.message); } }
  if (error) return <p role="alert" className="error">{error.message}</p>; if (!data) return <Blob />;
  return (<><h1 className="display">Projects</h1>
    {['owner', 'admin'].includes(role) && <form className="glass solid card row" onSubmit={add}><input aria-label="Project name" placeholder="New project name" required value={name} onChange={e => setName(e.target.value)} /><button className="pill">Create project</button>{err && <span role="alert" className="error">{err}</span>}</form>}
    <div className="grid">{data.map(p => <Link key={p.id} to={`/app/projects/${p.id}`} className="glass solid card hover"><span className="chip mono">#{p.id}</span><h2>{p.name}</h2></Link>)}</div>
    {!data.length && <p className="muted">No projects yet.</p>}</>);
}
