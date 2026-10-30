import { useState } from 'react'; import { Link, useLocation, useNavigate } from 'react-router-dom'; import { api } from '../api'; import { useStore } from '../store';
const strength = p => [/.{10,}/, /[A-Z]/, /[a-z]/, /\d/].filter(r => r.test(p)).length;
export default function Auth({ mode }) {
  const signup = mode === 'signup', nav = useNavigate(), from = useLocation().state?.from || '/app', set = useStore(s => s.set);
  const [f, setF] = useState({ name: '', email: '', orgName: '', password: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const up = k => e => setF({ ...f, [k]: e.target.value });
  async function submit(e) { e.preventDefault(); setBusy(true); setErr('');
    try { if (signup) { const r = await api('/auth/signup', { method: 'POST', body: f }); set({ token: r.token, orgs: [{ id: r.orgId, name: f.orgName, role: 'owner' }], orgId: r.orgId }); }
      else { const r = await api('/auth/login', { method: 'POST', body: { email: f.email, password: f.password } }); set({ token: r.token, orgs: r.orgs, orgId: r.orgs[0]?.id }); }
      const lp = useStore.getState().lastProject; nav(signup ? '/onboarding' : from !== '/app' ? from : lp ? `/app/projects/${lp}` : '/app', { replace: true }); } catch (x) { setErr(`${x.message}${x.code ? ` (${x.code})` : ''}`); } setBusy(false); }
  return (<div className="center"><form className="glass solid card auth" onSubmit={submit}>
    <h1 className="display">{signup ? 'Create your workspace' : 'Welcome back'}</h1>
    {signup && <><label>Your name<input required value={f.name} onChange={up('name')} /></label><label>Organization<input required minLength={2} value={f.orgName} onChange={up('orgName')} /></label></>}
    <label>Email<input type="email" required value={f.email} onChange={up('email')} /></label>
    <label>Password<input type="password" required value={f.password} onChange={up('password')} /></label>
    {signup && <div className="bar" aria-label="Password strength"><span style={{ width: strength(f.password) * 25 + '%' }} /></div>}
    {signup && <small>10+ characters with upper, lower case and a number.</small>}
    {err && <p role="alert" className="error">{err}</p>}
    <button className="pill" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button>
    {!signup && <small><Link to="/forgot">Forgot password?</Link></small>}
    <small>{signup ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/signup">Sign up</Link></>}</small></form></div>);
}
