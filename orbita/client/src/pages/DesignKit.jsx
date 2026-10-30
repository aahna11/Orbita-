const chips = [['#2563EB', 16], ['#16A34A', 10], ['#EA580C', 20], ['#7C3AED', 24]];
export default function DesignKit() {
  return (<><h1 className="display">Liquid Glass Foundations</h1>
    <section className="glass solid card"><h2>Blur recipes</h2><div className="row">{[12, 24, 32].map(b => <div key={b} className="tile" style={{ backdropFilter: `blur(${b}px)`, background: 'var(--glass)' }}><span className="mono">blur {b}</span></div>)}</div></section>
    <section className="glass solid card"><h2>Corner radii</h2><div className="row">{[12, 16, 24, 32].map(r => <div key={r} className="tile" style={{ borderRadius: r }}><span className="mono">{r}</span></div>)}</div></section>
    <section className="glass solid card"><h2>Round badges (task counts and priority)</h2><div className="row">{chips.map(([c, n]) => <span key={n} className="badge big mono" style={{ background: c }}>{n}</span>)}</div></section>
    <section className="glass solid card"><h2>Buttons, chips, progress</h2><div className="row"><button className="pill">Primary</button><button className="pill ghost">Glass</button><span className="chip hl">Highlight 12%</span>
      <span className="chip p-urgent">urgent</span><span className="chip p-high">high</span><span className="chip p-medium">medium</span><span className="chip p-low">low</span></div>
      <div className="gbar big" role="progressbar" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><span style={{ width: '64%' }} /></div></section>
    <section className="glass solid card"><h2>Icon tiles and shadows</h2><div className="row">{['◎', '▦', '✦', '☰'].map(g => <div key={g} className="tile sq" aria-hidden="true">{g}</div>)}<div className="tile" style={{ boxShadow: 'var(--shadow)' }}>Shadow soft</div></div></section></>);
}
