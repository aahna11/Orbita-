import { useEffect, useState } from 'react'; import { useParams } from 'react-router-dom'; import { api, useLoad } from '../api'; import { useRole } from '../store'; import { Blob } from '../App';
export default function Task() {
  const { id } = useParams(), canW = useRole() !== 'viewer', { data: t, error, reload } = useLoad(`/tasks/${id}`), { data: members } = useLoad('/members'), { data: comments, reload: rc } = useLoad(`/tasks/${id}/comments`);
  const [f, setF] = useState(null), [msg, setMsg] = useState(''), [body, setBody] = useState('');
  useEffect(() => { if (t) setF({ title: t.title, description: t.description || '', priority: t.priority, assignee_id: t.assignee_id ?? '', due_date: t.due_date ? String(t.due_date).slice(0, 10) : '' }); }, [t]);
  const up = k => e => setF({ ...f, [k]: e.target.value });
  async function save(e) { e.preventDefault(); try { await api(`/tasks/${id}`, { method: 'PATCH', body: { ...f, assignee_id: f.assignee_id === '' ? null : Number(f.assignee_id), due_date: f.due_date || null, version: t.version } }); setMsg('Saved'); reload(); }
    catch (x) { setMsg(x.code === 'VERSION_CONFLICT' ? 'Someone else edited this task. Reload to see their changes.' : x.message); } }
  if (error) return <p role="alert" className="error">{error.message}</p>; if (!t || !f) return <Blob />;
  return (<><h1 className="display">Task <span className="mono muted">#{t.id} v{t.version}</span></h1>
    <form className="glass solid card auth" style={{ width: 'auto' }} onSubmit={save}><fieldset disabled={!canW} style={{ border: 0, padding: 0, display: 'grid', gap: 12 }}>
      <label>Title<input required value={f.title} onChange={up('title')} /></label><label>Description<textarea rows="4" value={f.description} onChange={up('description')} /></label>
      <div className="row"><label>Priority<select value={f.priority} onChange={up('priority')}>{['low', 'medium', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}</select></label>
        <label>Assignee<select value={f.assignee_id} onChange={up('assignee_id')}><option value="">Unassigned</option>{members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Due date<input type="date" value={f.due_date} onChange={up('due_date')} /></label></div>
      {canW && <button className="pill">Save changes</button>}{msg && <span role="status">{msg}</span>}</fieldset></form>
    <div className="glass solid card"><h2>Comments</h2>{comments?.map(c => <p key={c.id} className="comment">{c.body}</p>)}
      {canW && <form className="row" onSubmit={async e => { e.preventDefault(); await api(`/tasks/${id}/comments`, { method: 'POST', body: { body } }); setBody(''); rc(); }}>
        <input aria-label="Comment" placeholder="Write a comment, @name to mention" required value={body} onChange={e => setBody(e.target.value)} /><button className="pill">Send</button></form>}</div></>);
}
