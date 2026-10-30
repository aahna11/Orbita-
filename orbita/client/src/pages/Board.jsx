import { useEffect, useState } from 'react'; import { Link, useParams } from 'react-router-dom'; import { io } from 'socket.io-client'; import { useStore } from '../store'; import { api, useLoad } from '../api'; import { useRole } from '../store'; import { Blob } from '../App';
const tilt = e => { const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  e.currentTarget.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`; };
function Comments({ task, onClose, canComment }) {
  const { data, reload } = useLoad(`/tasks/${task.id}/comments`), [body, setBody] = useState('');
  const send = async e => { e.preventDefault(); await api(`/tasks/${task.id}/comments`, { method: 'POST', body: { body } }); setBody(''); reload(); };
  return (<aside className="glass solid card side" aria-label="Task details"><button className="pill ghost" onClick={onClose}>Close</button><h2>{task.title}</h2><Link to={`/app/tasks/${task.id}`}>Open full page</Link>
    <span className={`chip p-${task.priority}`}>{task.priority}</span><span className="mono muted"> v{task.version}</span>
    <h3>Comments</h3>{!data ? <Blob /> : data.map(c => <p key={c.id} className="comment">{c.body}</p>)}
    {canComment && <form onSubmit={send} className="row"><input aria-label="Comment" required value={body} onChange={e => setBody(e.target.value)} /><button className="pill">Send</button></form>}</aside>);
}
export default function Board() {
  const { id } = useParams(), canW = useRole() !== 'viewer', [cols, setCols] = useState(null), [tasks, setTasks] = useState([]), [err, setErr] = useState(''), [open, setOpen] = useState(null), [drag, setDrag] = useState(null);
  useEffect(() => { (async () => { try { const c = await api(`/projects/${id}/columns`); let all = [], cur = 0;
    do { const r = await api(`/projects/${id}/tasks?cursor=${cur}`); all = all.concat(r.items); cur = r.nextCursor; } while (cur); setCols(c); setTasks(all); } catch (e) { setErr(e.message); } })(); }, [id]);
  const [online, setOnline] = useState(0);
  useEffect(() => { useStore.getState().set({ lastProject: id }); // live updates + presence
    const { token, orgId } = useStore.getState(), s = io({ auth: { token } });
    s.on('connect', () => s.emit('join', { orgId, projectId: Number(id) }));
    const put = t => setTasks(p => p.some(x => x.id === t.id) ? p.map(x => x.id === t.id ? t : x) : [...p, t]);
    s.on('task:created', put); s.on('task:updated', put); s.on('task:moved', put); s.on('task:deleted', ({ id: d }) => setTasks(p => p.filter(x => x.id !== d)));
    s.on('presence', l => setOnline(l.length)); return () => s.close(); }, [id]);
  async function drop(colId) { const t = tasks.find(x => x.id === drag); setDrag(null); if (!t || t.column_id === colId) return;
    const inCol = tasks.filter(x => x.column_id === colId), last = Math.max(0, ...inCol.map(x => x.position)), prev = tasks;
    setTasks(tasks.map(x => x.id === t.id ? { ...x, column_id: colId, position: last + 1000 } : x)); // optimistic
    try { const n = await api(`/tasks/${t.id}/move`, { method: 'POST', body: { column_id: colId, after: inCol.length ? last : undefined, version: t.version } }); setTasks(p => p.map(x => x.id === n.id ? n : x)); }
    catch (e) { setTasks(prev); setErr(e.code === 'VERSION_CONFLICT' ? 'Someone else changed this task. Reload to see the latest.' : e.message); } }
  async function add(colId, title) { try { const t = await api('/tasks', { method: 'POST', body: { project_id: Number(id), column_id: colId, title } }); setTasks(p => [...p, t]); } catch (e) { setErr(e.message); } }
  if (!cols) return err ? <p role="alert" className="error">{err}</p> : <Blob />;
  return (<><h1 className="display">Board {online > 0 && <span className="chip mono">{online} online</span>}</h1>{err && <p role="alert" className="error">{err}</p>}
    <div className="board">{cols.map(c => <section key={c.id} className="glass tray" onDragOver={e => e.preventDefault()} onDrop={() => drop(c.id)} aria-label={c.name}>
      <h2>{c.name} <span className="chip mono">{tasks.filter(t => t.column_id === c.id).length}</span></h2>
      {tasks.filter(t => t.column_id === c.id).sort((a, b) => a.position - b.position).map(t =>
        <article key={t.id} className="slab" tabIndex={0} draggable={canW} onDragStart={() => setDrag(t.id)} onMouseMove={tilt} onMouseLeave={e => e.currentTarget.style.transform = ''}
          onClick={() => setOpen(t)} onKeyDown={e => e.key === 'Enter' && setOpen(t)}><span>{t.title}</span><span className={`chip p-${t.priority}`}>{t.priority}</span></article>)}
      {canW && <form onSubmit={e => { e.preventDefault(); const v = e.target.t.value.trim(); if (v) { add(c.id, v); e.target.reset(); } }}><input name="t" aria-label={`Add task to ${c.name}`} placeholder="+ Add task" /></form>}</section>)}</div>
    {open && <Comments task={open} canComment={canW} onClose={() => setOpen(null)} />}</>);
}
