import { api, useLoad } from '../api'; import { Blob } from '../App';
export default function Notifications() {
  const { data, error, reload } = useLoad('/notifications');
  if (error) return <p role="alert" className="error">{error.message}</p>; if (!data) return <Blob />;
  return (<><h1 className="display">Notifications</h1><button className="pill ghost" onClick={async () => { await api('/notifications/read-all', { method: 'POST' }); reload(); }}>Mark all read</button>
    <div className="glass solid card">{data.items.length ? data.items.map(n => <div key={n.id} className="row between" style={{ opacity: n.read ? .6 : 1 }}><span>{n.message}</span><span className="chip">{n.type.replace('_', ' ')}</span></div>) : 'Nothing yet.'}</div></>);
}
