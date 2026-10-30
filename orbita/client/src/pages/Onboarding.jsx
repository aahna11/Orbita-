import { useState } from 'react'; import { useNavigate } from 'react-router-dom'; import { api } from '../api';
export default function Onboarding() {
  const nav = useNavigate(), [step, setStep] = useState(1), [emails, setEmails] = useState(''), [name, setName] = useState(''), [msg, setMsg] = useState('');
  async function invite(e) { e.preventDefault(); let ok = 0; for (const email of emails.split(/[\s,;]+/).filter(Boolean)) { try { await api('/invites', { method: 'POST', body: { email, role: 'member' } }); ok++; } catch {} } setMsg(`${ok} invite(s) sent`); setStep(2); }
  async function project(e) { e.preventDefault(); try { const p = await api('/projects', { method: 'POST', body: { name } }); nav(`/app/projects/${p.id}`); } catch (x) { setMsg(x.message); } }
  return (<div className="center"><div className="glass solid card auth"><h1 className="display">Let’s set up your workspace</h1><span className="chip mono">Step {step} of 2</span>
    {step === 1 ? <form className="auth" style={{ width: 'auto' }} onSubmit={invite}><label>Invite teammates (emails, comma separated)<textarea rows="3" value={emails} onChange={e => setEmails(e.target.value)} /></label>
      <button className="pill">Send invites</button><button type="button" className="pill ghost" onClick={() => setStep(2)}>Skip</button></form>
      : <form className="auth" style={{ width: 'auto' }} onSubmit={project}><label>First project name<input required value={name} onChange={e => setName(e.target.value)} /></label><button className="pill">Create project</button><button type="button" className="pill ghost" onClick={() => nav('/app')}>Skip</button></form>}
    {msg && <p role="status">{msg}</p>}</div></div>);
}
