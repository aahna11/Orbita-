import { useLoad } from '../api'; import { Blob } from '../App';
export default function Admin() {
  const s = useLoad('/admin/stats'), o = useLoad('/admin/orgs');
  if (s.error) return <p role="alert" className="error">{s.error.message}</p>; if (!s.data || !o.data) return <Blob />;
  return (<><h1 className="display">Platform admin</h1><div className="stack">{Object.entries(s.data).map(([k, v]) => <div key={k} className="glass solid card stat"><span className="badge mono">{v}</span>{k}</div>)}</div>
    <div className="glass solid card"><h2>Organizations</h2>{o.data.map(x => <div key={x.id} className="row between"><span>{x.name} <span className="muted mono">{x.slug}</span></span><span className="chip">{x.members} members</span></div>)}</div></>);
}
