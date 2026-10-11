import { useState, useEffect } from 'react';

export default function Home() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [attuned, setAttuned] = useState(false);
  const [tools, setTools] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [log, setLog] = useState([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => { init(); }, []);

  async function init() {
    const s = await fetch('/api/auth?action=status').then(r => r.json());
    if (s.loggedIn) {
      setUser(s.username);
      setAttuned(s.attuned);
      loadTools(s.attuned);
      setView('dash');
    }
  }

  async function loadTools(isAttuned) {
    const r = await fetch('/api/tools?tool=list').then(x => x.json());
    if (r.ok) {
      setTools(r.tools);
      if (isAttuned !== undefined) setAttuned(isAttuned);
      else setAttuned(r.attuned);
    }
  }

  async function register() {
    const r = await fetch('/api/auth?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.rUser, password: form.rPass })
    }).then(x => x.json());
    setMsg(r.msg);
    if (r.ok) setTimeout(() => setView('login'), 1500);
  }

  async function login() {
    // Ambil captcha bypass token dulu
    const cap = await fetch('/api/auth?action=captcha').then(x => x.json());
    const r = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.lUser,
        password: form.lPass,
        captchaId: cap.id,
        captchaAnswer: 'auto',
        bypassToken: cap.bypassToken
      })
    }).then(x => x.json());
    setMsg(r.msg);
    if (r.ok) {
      const s = await fetch('/api/auth?action=status').then(x => x.json());
      setUser(s.username);
      setAttuned(s.attuned);
      await loadTools(s.attuned);
      setView('dash');
    }
  }

  async function logout() {
    await fetch('/api/auth?action=logout');
    location.reload();
  }

  async function attune() {
    const r = await fetch('/api/auth?action=attune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: form.attuneKey })
    }).then(x => x.json());
    if (r.ok) { setAttuned(true); await loadTools(true); alert('✅ Unlocked!'); }
    else alert('❌ ' + r.msg);
  }

  async function runTool(id) {
    setLog(['[+] Running...']);
    const r = await fetch('/api/tools?tool=' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    }).then(x => x.json());
    if (r.ok) setLog([...(r.log || []), '✅ ' + r.msg]);
    else setLog(['❌ ' + r.msg]);
  }

  const styles = {
    body: { background: '#050505', color: '#00ff88', minHeight: '100vh', fontFamily: "'Courier New', monospace", margin: 0, padding: 0 },
    center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 },
    box: { width: '100%', maxWidth: 420, border: '2px solid #00ff88', padding: 30, background: 'rgba(0,255,136,0.02)', boxShadow: '0 0 30px rgba(0,255,136,0.2)', borderRadius: 8 },
    h1: { textAlign: 'center', fontSize: 22, letterSpacing: 3, marginBottom: 5, textShadow: '0 0 10px #00ff88' },
    sub: { textAlign: 'center', color: '#00aa55', fontSize: 11, marginBottom: 25 },
    tabs: { display: 'flex', marginBottom: 20 },
    tab: (act) => ({ flex: 1, padding: 10, background: act ? '#00ff88' : 'transparent', color: act ? '#000' : '#00ff88', border: '1px solid #00ff88', cursor: 'pointer', fontFamily: 'inherit' }),
    label: { display: 'block', fontSize: 11, color: '#00aa55', marginBottom: 5, letterSpacing: 1 },
    input: { width: '100%', padding: 12, background: '#0a0a0a', border: '1px solid #00ff88', color: '#00ff88', fontFamily: 'inherit', fontSize: 14, borderRadius: 3, marginBottom: 15, boxSizing: 'border-box' },
    capBox: { border: '1px dashed #00aa55', padding: 15, margin: '15px 0', textAlign: 'center', borderRadius: 3 },
    capCode: { fontSize: 24, letterSpacing: 5, fontWeight: 'bold', textShadow: '0 0 10px #00ff88' },
    capHint: { fontSize: 10, color: '#ffaa00', marginTop: 5 },
    btn: { width: '100%', padding: 14, background: '#00ff88', color: '#000', border: 'none', fontFamily: 'inherit', fontWeight: 'bold', fontSize: 13, letterSpacing: 2, cursor: 'pointer', marginTop: 10, borderRadius: 3 },
    msg: (ok) => ({ padding: 10, margin: '10px 0', fontSize: 12, textAlign: 'center', background: ok ? 'rgba(0,255,136,0.15)' : 'rgba(255,0,0,0.15)', border: `1px solid ${ok ? '#00ff88' : '#ff0000'}`, color: ok ? '#00ff88' : '#ff6666', borderRadius: 3 }),
    topbar: { background: '#0a0a0a', borderBottom: '2px solid #00ff88', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
    attune: (un) => ({ background: un ? 'rgba(0,255,136,0.05)' : '#1a0a0a', border: `1px solid ${un ? '#00ff88' : '#ffaa00'}`, padding: 15, margin: 15, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }),
    container: { padding: 15, maxWidth: 1200, margin: '0 auto' },
    filterBar: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 15 },
    filter: (act) => ({ padding: '8px 14px', background: act ? '#00ff88' : 'transparent', color: act ? '#000' : '#00ff88', border: '1px solid #00ff88', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 20 },
    card: (lock) => ({ border: '1px solid #00ff88', padding: 15, background: 'rgba(0,255,136,0.02)', borderRadius: 5, cursor: lock ? 'not-allowed' : 'pointer', opacity: lock ? 0.4 : 1, position: 'relative' }),
    modal: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalBox: { background: '#0a0a0a', border: '2px solid #00ff88', padding: 25, borderRadius: 8, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' },
    logBox: { background: '#000', border: '1px solid #00aa55', padding: 15, marginTop: 15, fontSize: 11, color: '#00ff88', maxHeight: 250, overflowY: 'auto' },
  };

  if (view === 'login') return (
    <div style={styles.body}><div style={styles.center}><div style={styles.box}>
      <h1 style={styles.h1}>⛓ ZEROPANEL</h1>
      <div style={styles.sub}>ULTIMATE EDITION</div>
      <div style={styles.tabs}>
        <button style={styles.tab(true)} onClick={() => setView('login')}>LOGIN</button>
        <button style={styles.tab(false)} onClick={() => setView('register')}>REGISTER</button>
      </div>
      <label style={styles.label}>USERNAME</label>
      <input style={styles.input} value={form.lUser || ''} onChange={e => setForm({...form, lUser: e.target.value})} />
      <label style={styles.label}>PASSWORD</label>
      <input style={styles.input} type="password" value={form.lPass || ''} onChange={e => setForm({...form, lPass: e.target.value})} />
      <div style={styles.capBox}>
        <div style={{ fontSize: 11, color: '#00aa55', marginBottom: 8 }}>[ CAPTCHA ]</div>
        <div style={styles.capCode}>BYPASS</div>
        <div style={styles.capHint}>auto-bypass aktif</div>
      </div>
      <button style={styles.btn} onClick={login}>MASUK ⛓</button>
      {msg && <div style={styles.msg(!msg.includes('salah') && !msg.includes('gak'))}>{msg}</div>}
    </div></div></div>
  );

  if (view === 'register') return (
    <div style={styles.body}><div style={styles.center}><div style={styles.box}>
      <h1 style={styles.h1}>⛓ ZEROPANEL</h1>
      <div style={styles.sub}>REGISTER</div>
      <div style={styles.tabs}>
        <button style={styles.tab(false)} onClick={() => setView('login')}>LOGIN</button>
        <button style={styles.tab(true)} onClick={() => setView('register')}>REGISTER</button>
      </div>
      <label style={styles.label}>USERNAME</label>
      <input style={styles.input} value={form.rUser || ''} onChange={e => setForm({...form, rUser: e.target.value})} />
      <label style={styles.label}>PASSWORD</label>
      <input style={styles.input} type="password" value={form.rPass || ''} onChange={e => setForm({...form, rPass: e.target.value})} />
      <button style={styles.btn} onClick={register}>REGISTER</button>
      {msg && <div style={styles.msg(msg.includes('berhasil'))}>{msg}</div>}
    </div></div></div>
  );

  const cats = ['ALL', ...Array.from(new Set(tools.map(t => t.cat)))];
  const filtered = filter === 'ALL' ? tools : tools.filter(t => t.cat === filter);

  return (
    <div style={styles.body}>
      <div style={styles.topbar}>
        <h2 style={{ fontSize: 16, letterSpacing: 2, margin: 0 }}>⛓ ZEROPANEL</h2>
        <div style={{ color: '#00aa55', fontSize: 12 }}>👤 {user}</div>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff6666', padding: '8px 15px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>LOGOUT</button>
      </div>

      <div style={styles.attune(attuned)}>
        <div style={{ color: attuned ? '#00ff88' : '#ffaa00', fontSize: 12 }}>
          {attuned ? '✅ TOOLS UNLOCKED' : '🔒 TOOLS LOCKED — Key: sukisuki / zero / admin'}
        </div>
        {!attuned && (<>
          <input placeholder="attune key" value={form.attuneKey || ''} onChange={e => setForm({...form, attuneKey: e.target.value})} style={{ padding: '8px 12px', background: '#000', border: '1px solid #ffaa00', color: '#ffaa00', fontFamily: 'inherit', borderRadius: 3 }} />
          <button onClick={attune} style={{ padding: '8px 15px', background: '#ffaa00', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>ATTUNE ⛓</button>
        </>)}
      </div>

      <div style={styles.container}>
        <div style={styles.filterBar}>
          {cats.map(c => (
            <button key={c} style={styles.filter(filter === c)} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
        <div style={styles.grid}>
          {filtered.map(t => (
            <div key={t.id} style={styles.card(!attuned)} onClick={() => attuned && (setModal(t), setLog([]))}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>{t.name}</div>
              <div style={{ color: '#00aa55', fontSize: 10 }}>{t.cat}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div style={styles.modalBox}>
            <button onClick={() => setModal(null)} style={{ float: 'right', background: 'transparent', border: 'none', color: '#ff6666', fontSize: 24, cursor: 'pointer' }}>×</button>
            <h3 style={{ marginBottom: 20 }}>{modal.icon} {modal.name}</h3>

            {['bugwa','spamwa','sender','spamcall','spamsms','spamemail','otp'].includes(modal.id) && <>
              <label style={styles.label}>TARGET</label><input style={styles.input} placeholder="628xxx" value={form.target||''} onChange={e => setForm({...form, target: e.target.value})} />
            </>}
            {modal.id === 'bugwa' && <>
              <label style={styles.label}>JUMLAH</label><input style={styles.input} type="number" value={form.count||100} onChange={e => setForm({...form, count: e.target.value})} />
              <label style={styles.label}>TYPE</label><select style={styles.input} value={form.type||'crasher'} onChange={e => setForm({...form, type: e.target.value})}><option>crasher</option><option>freeze</option><option>kraken</option><option>chaos</option><option>apocalypse</option></select>
            </>}
            {modal.id === 'ddos' || modal.id === 'slowloris' || modal.id === 'hulk' || modal.id === 'goldeneye' ? <>
              <label style={styles.label}>HOST</label><input style={styles.input} placeholder="example.com" value={form.host||''} onChange={e => setForm({...form, host: e.target.value})} />
              <label style={styles.label}>DURASI (max 9s Vercel)</label><input style={styles.input} type="number" value={form.duration||8} onChange={e => setForm({...form, duration: e.target.value})} />
            </> : null}
            {['hackweb','sqli','xss','lfi','rce'].includes(modal.id) && <>
              <label style={styles.label}>URL</label><input style={styles.input} placeholder="https://target.com" value={form.url||''} onChange={e => setForm({...form, url: e.target.value})} />
              {modal.id === 'hackweb' && <>
                <label style={styles.label}>METHOD</label><select style={styles.input} value={form.method||'sqli'} onChange={e => setForm({...form, method: e.target.value})}><option>sqli</option><option>xss</option><option>lfi</option><option>rce</option></select>
              </>}
            </> : null}
            {modal.id === 'phishing' && <>
              <label style={styles.label}>TEMPLATE</label><select style={styles.input} value={form.template||'wa'} onChange={e => setForm({...form, template: e.target.value})}><option value="wa">WhatsApp</option><option value="ig">Instagram</option><option value="fb">Facebook</option><option value="gmail">Gmail</option></select>
            </> : null}
            {modal.id === 'track' || modal.id === 'iplookup' ? <>
              <label style={styles.label}>IP</label><input style={styles.input} placeholder="8.8.8.8" value={form.ip||''} onChange={e => setForm({...form, ip: e.target.value})} />
            </> : null}
            {modal.id === 'portscan' && <>
              <label style={styles.label}>HOST</label><input style={styles.input} value={form.host||''} onChange={e => setForm({...form, host: e.target.value})} />
              <label style={styles.label}>PORT (kosong = top ports)</label><input style={styles.input} placeholder="80" value={form.port||''} onChange={e => setForm({...form, port: e.target.value})} />
            </> : null}
            {modal.id === 'nikcheck' && <>
              <label style={styles.label}>NIK</label><input style={styles.input} value={form.nik||''} onChange={e => setForm({...form, nik: e.target.value})} />
            </> : null}
            {['subdomain','dnslookup','whois'].includes(modal.id) && <>
              <label style={styles.label}>DOMAIN</label><input style={styles.input} placeholder="example.com" value={form.domain||''} onChange={e => setForm({...form, domain: e.target.value})} />
            </> : null}
            {modal.id === 'phoneinfo' && <>
              <label style={styles.label}>NOMOR</label><input style={styles.input} value={form.number||''} onChange={e => setForm({...form, number: e.target.value})} />
            </> : null}
            {modal.id === 'hash' && <>
              <label style={styles.label}>TEXT</label><input style={styles.input} value={form.text||''} onChange={e => setForm({...form, text: e.target.value})} />
              <label style={styles.label}>ALGO</label><select style={styles.input} value={form.algo||'sha256'} onChange={e => setForm({...form, algo: e.target.value})}><option>md5</option><option>sha1</option><option>sha256</option><option>sha512</option></select>
            </> : null}
            {modal.id === 'b64' && <>
              <label style={styles.label}>TEXT</label><input style={styles.input} value={form.text||''} onChange={e => setForm({...form, text: e.target.value})} />
              <label style={styles.label}>MODE</label><select style={styles.input} value={form.mode||'encode'} onChange={e => setForm({...form, mode: e.target.value})}><option>encode</option><option>decode</option></select>
            </> : null}
            {modal.id === 'qrgen' && <>
              <label style={styles.label}>TEXT</label><input style={styles.input} value={form.text||''} onChange={e => setForm({...form, text: e.target.value})} />
            </> : null}
            {modal.id === 'password' && <>
              <label style={styles.label}>LENGTH</label><input style={styles.input} type="number" value={form.length||16} onChange={e => setForm({...form, length: e.target.value})} />
            </> : null}
            {modal.id === 'binlookup' && <>
              <label style={styles.label}>BIN</label><input style={styles.input} placeholder="414720" value={form.bin||''} onChange={e => setForm({...form, bin: e.target.value})} />
            </> : null}
            {modal.id === 'shell' && <>
              <label style={styles.label}>HOST</label><input style={styles.input} value={form.host||''} onChange={e => setForm({...form, host: e.target.value})} />
              <label style={styles.label}>PORT</label><input style={styles.input} type="number" value={form.port||4444} onChange={e => setForm({...form, port: e.target.value})} />
            </> : null}
            {modal.id === 'dox' && <>
              <label style={styles.label}>NAMA</label><input style={styles.input} value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
            </> : null}

            <button style={styles.btn} onClick={() => runTool(modal.id)}>RUN ⚡</button>
            {log.length > 0 && (
              <div style={styles.logBox}>
                {log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', color: '#00aa55', fontSize: 11, padding: 20, borderTop: '1px dashed #00ff88', marginTop: 40 }}>© ZeroPanel 2025 — VERCEL ULTIMATE</footer>
    </div>
  );
}