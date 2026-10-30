import { useState } from 'react'; import { Link, useNavigate, useParams } from 'react-router-dom'; import { api } from '../api'; import { useStore } from '../store';
export function Forgot() { const [email, setEmail] = useState(''), [done, setDone] = useState(false);
  return (<div className="center"><form className="glass solid card auth" onSubmit={async e => { e.preventDefault(); await api('/auth/forgot', { method: 'POST', body: { email } }); setDone(true); }}>
    <h1 className="display">Reset password</h1>{done ? <p role="status">If that account exists, an email is on its way.</p> : <><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><button className="pill">Send reset link</button></>}<Link to="/login">Back to login</Link></form></div>); }
export function Reset() { const { token } = useParams(), nav = useNavigate(), [password, setPassword] = useState(''), [err, setErr] = useState('');
  return (<div className="center"><form className="glass solid card auth" onSubmit={async e => { e.preventDefault(); try { await api('/auth/reset', { method: 'POST', body: { token, password } }); nav('/login'); } catch (x) { setErr(x.message); } }}>
    <h1 className="display">Choose a new password</h1><label>New password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><small>10+ characters with upper, lower case and a number.</small>
    {err && <p role="alert" className="error">{err}</p>}<button className="pill">Set password</button></form></div>); }
export function Invite() { const { token } = useParams(), nav = useNavigate(), set = useStore(s => s.set), [err, setErr] = useState('');
  return (<div className="center"><div className="glass solid card auth"><h1 className="display">You’re invited</h1>{err && <p role="alert" className="error">{err}</p>}
    <button className="pill" onClick={async () => { try { const r = await api('/invites/accept', { method: 'POST', body: { token } }); const o = await api('/orgs'); set({ orgs: o, orgId: r.orgId }); nav('/app'); } catch (x) { setErr(`${x.message} (${x.code})`); } }}>Accept invitation</button></div></div>); }
