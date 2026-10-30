import { useEffect, useState } from 'react'; import { api } from '../api'; import { Blob } from '../App';
export default function Activity() {
  const [items, setItems] = useState(null), [next, setNext] = useState(null);
  const load = async c => { const r = await api('/activity' + (c ? `?cursor=${c}` : '')); setItems(p => (p || []).concat(r.items)); setNext(r.nextCursor); };
  useEffect(() => { load(); }, []);
  if (!items) return <Blob />;
  return (<><h1 className="display">Activity</h1><ol className="glass solid card timeline">{items.map((a, i) => <li key={a.id} style={{ opacity: Math.max(.35, 1 - i * .04), marginLeft: Math.min(i * 2, 40) }}><i /><span className="mono">{a.action}</span><span className="muted">user {a.user_id} · {new Date(a.created_at).toLocaleString()}</span></li>)}</ol>
    {next && <button className="pill" onClick={() => load(next)}>Load more</button>}</>);
}
