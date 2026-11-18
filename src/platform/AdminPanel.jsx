// National AI Lab — Admin paneli: tajribalar va foydalanuvchilar
import React, { useMemo, useState } from 'react';
import { PanelTop } from './Login';
import { useDb, allExperiments, addExperiment, removeExperiment, ADDABLE_REACTIONS, listUsers, addTeacher, removeUser, ROLES, fmtDate } from './db';
import { SUB_MAP } from '../config/virtualLabChemEngine';
import './platform.css';

const ICONS = ['⚗️', '🧪', '🫧', '💧', '🔥', '🌈', '🟠', '🟢', '🔵', '🟣', '⚡', '🌫️'];
const clean = (eq) => eq.replace(/\s*\+?\s*💥.*$|🌋.*$/u, '').trim();
const F = (id) => SUB_MAP[id]?.formula || id;

export default function AdminPanel({ user, onLogout, onOpenLab }) {
  const db = useDb();
  const [tab, setTab] = useState('exp');
  const exps = allExperiments();
  const users = listUsers();
  return (
    <div className="pf">
      <PanelTop user={user} onLogout={onLogout}><button className="btn ghost sm" onClick={onOpenLab}>🧪 Laboratoriyani ochish</button></PanelTop>
      <div className="pn-body">
        <div className="pn-hello"><h1>Boshqaruv paneli</h1><p>Tajribalar ro'yxati va platforma foydalanuvchilari</p></div>
        <div className="stats">
          <div className="stat"><b>{exps.length}</b><span>tajriba ({db.experiments.length} tasi admin qo'shgan)</span></div>
          <div className="stat"><b>{users.filter(u => u.role === 'teacher').length}</b><span>o'qituvchi</span></div>
          <div className="stat"><b>{users.filter(u => u.role === 'student').length}</b><span>o'quvchi va talaba</span></div>
          <div className="stat"><b>{db.submissions.length}</b><span>bajarilgan vazifa</span></div>
        </div>
        <div className="tabs" role="tablist">
          <button className={tab === 'exp' ? 'on' : ''} onClick={() => setTab('exp')}>Tajribalar</button>
          <button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>Foydalanuvchilar</button>
        </div>
        {tab === 'exp' ? <ExpTab user={user} exps={exps} /> : <UsersTab me={user} users={users} />}
      </div>
    </div>
  );
}

function ExpTab({ user, exps }) {
  return (
    <div className="grid2">
      <NewExperiment user={user} />
      <div className="list">
        {exps.map(e => (
          <div className="item" key={e.id}>
            <div className="hd">
              <span className="ic">{e.icon}</span>
              <div className="tt"><b>{e.num}. {e.title}</b><small>{e.goal}</small></div>
              {e.builtIn ? <span className="chip base">Asosiy</span> : <button className="btn danger" onClick={() => { if (confirm(`«${e.title}» tajribasi o'chirilsinmi?`)) removeExperiment(e.id); }}>O'chirish</button>}
            </div>
            <div className="meta">
              {e.reagents.map(r => <span className="chip" key={r.id}>{F(r.id)} · {r.amount}</span>)}
              <span className="chip">{e.level}</span>
              {!e.builtIn && <span className="chip new">qo'shilgan {fmtDate(e.createdAt)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewExperiment({ user }) {
  const [rxId, setRxId] = useState('');
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const rx = useMemo(() => ADDABLE_REACTIONS.find(r => r.id === rxId), [rxId]);

  const pick = (id) => {
    setRxId(id); setMsg(null);
    const r = ADDABLE_REACTIONS.find(x => x.id === id);
    if (!r) { setD(null); return; }
    setD({
      icon: '⚗️', title: '', goal: r.explain || '', watch: r.observe || '', level: r.sinf || '8-sinf', ordered: false,
      rows: r.reactants.map(id2 => ({ id: id2, amount: `${SUB_MAP[id2].defaultDose ?? ''} ${SUB_MAP[id2].unit ?? ''}`.trim(), role: (SUB_MAP[id2].cat || '').toLowerCase(), step: `${SUB_MAP[id2].name} — kolbaga qo'shing` })),
    });
  };
  const row = (i, k) => (e) => setD({ ...d, rows: d.rows.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r) });
  const save = (e) => {
    e.preventDefault();
    const res = addExperiment({
      icon: d.icon, title: d.title, goal: d.goal, watch: d.watch, level: d.level, ordered: d.ordered, target: rxId,
      product: clean(rx.eq).split('→')[1]?.trim() || '',
      reagents: d.rows.map(r => ({ id: r.id, amount: r.amount, role: r.role })),
      steps: d.rows.map(r => ({ id: r.id, text: r.step })),
    }, user.id);
    if (res.error) setMsg({ err: res.error });
    else { setMsg({ ok: `«${res.exp.title}» qo'shildi. Endi u o'quvchilar menyusida va o'qituvchi vazifalarida ko'rinadi.` }); setRxId(''); setD(null); }
  };

  return (
    <form className="box" onSubmit={save}>
      <h3>Yangi tajriba qo'shish</h3>
      <p className="hint">Avval reaksiyani tanlang — moddalar, qadamlar va kuzatish matni avtomatik to'ldiriladi. Ro'yxatda faqat kimyo dvigateli biladigan reaksiyalar bor, shuning uchun har bir tajriba laboratoriyada haqiqatan ishlaydi.</p>
      <label htmlFor="rx">Reaksiya</label>
      <select id="rx" value={rxId} onChange={e => pick(e.target.value)}>
        <option value="">— tanlang ({ADDABLE_REACTIONS.length} ta) —</option>
        {ADDABLE_REACTIONS.map(r => <option key={r.id} value={r.id}>{clean(r.eq)}</option>)}
      </select>
      {d && <>
        <div className="eqbox">{clean(rx.eq)}</div>
        <label htmlFor="tt">Tajriba nomi</label>
        <input id="tt" value={d.title} onChange={e => setD({ ...d, title: e.target.value })} placeholder="Masalan: Magniy va kislota" />
        <label>Belgi</label>
        <div className="icons">{ICONS.map(ic => <button type="button" key={ic} className={d.icon === ic ? 'on' : ''} onClick={() => setD({ ...d, icon: ic })}>{ic}</button>)}</div>
        <label htmlFor="gl">Maqsad</label>
        <textarea id="gl" rows={3} value={d.goal} onChange={e => setD({ ...d, goal: e.target.value })} />
        <label>Moddalar: miqdori va qadam matni</label>
        {d.rows.map((r, i) => (
          <div className="rg-row" key={r.id}>
            <b>{F(r.id)}</b>
            <input value={r.amount} onChange={row(i, 'amount')} aria-label={`${F(r.id)} miqdori`} />
            <input value={r.step} onChange={row(i, 'step')} aria-label={`${F(r.id)} qadami`} />
          </div>
        ))}
        <label className="check"><input type="checkbox" checked={d.ordered} onChange={e => setD({ ...d, ordered: e.target.checked })} /> Qadamlar aynan shu tartibda bajarilsin</label>
        <label htmlFor="wt">Nimani kuzatadi</label>
        <textarea id="wt" rows={2} value={d.watch} onChange={e => setD({ ...d, watch: e.target.value })} />
        <label htmlFor="lv">Sinf</label>
        <input id="lv" value={d.level} onChange={e => setD({ ...d, level: e.target.value })} />
        <button className="btn" style={{ width: '100%', marginTop: 18 }}>Tajribani qo'shish</button>
      </>}
      {msg?.err && <div className="err">{msg.err}</div>}
      {msg?.ok && <div className="okmsg">{msg.ok}</div>}
    </form>
  );
}

function UsersTab({ me, users }) {
  const [f, setF] = useState({ name: '', login: '', pass: '', subject: 'Kimyo' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = (e) => {
    e.preventDefault();
    const r = addTeacher(f);
    if (r.error) setMsg({ err: r.error }); else { setMsg({ ok: `O'qituvchi hisobi ochildi: ${f.login}` }); setF({ name: '', login: '', pass: '', subject: 'Kimyo' }); }
  };
  const del = (u) => {
    if (!confirm(`${u.name} (${u.login}) o'chirilsinmi?`)) return;
    const r = removeUser(u.id); if (r?.error) alert(r.error);
  };
  return (
    <div className="grid2">
      <form className="box" onSubmit={add}>
        <h3>O'qituvchi qo'shish</h3>
        <p className="hint">O'quvchi va talabalar login sahifasida o'zlari ro'yxatdan o'tadi.</p>
        <label htmlFor="tn">Ism-familiya</label><input id="tn" value={f.name} onChange={set('name')} />
        <label htmlFor="ts">Fan</label><input id="ts" value={f.subject} onChange={set('subject')} />
        <label htmlFor="tl">Login</label><input id="tl" value={f.login} onChange={set('login')} autoCapitalize="none" />
        <label htmlFor="tp">Boshlang'ich parol</label><input id="tp" value={f.pass} onChange={set('pass')} />
        <button className="btn" style={{ width: '100%', marginTop: 18 }}>Hisob ochish</button>
        {msg?.err && <div className="err">{msg.err}</div>}
        {msg?.ok && <div className="okmsg">{msg.ok}</div>}
      </form>
      <div className="box">
        <h3>Foydalanuvchilar ({users.length})</h3>
        <table className="tb">
          <thead><tr><th>Ism</th><th>Login</th><th>Rol</th><th>Sinf / guruh / fan</th><th /></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.login}</td><td>{ROLES[u.role].icon} {ROLES[u.role].label}</td>
              <td>{u.group || u.subject || '—'}</td>
              <td style={{ textAlign: 'right' }}>{u.id !== me.id && <button className="btn danger" onClick={() => del(u)}>O'chirish</button>}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
