// National AI Lab — O'qituvchi paneli: vazifa yuklash va natijalarni kuzatish
import React, { useState } from 'react';
import { PanelTop } from './Login';
import { useDb, allExperiments, expById, addAssignment, removeAssignment, assignmentsOfTeacher, studentsOf, bestSubmission, groupsList, isOverdue, fmtTime, fmtDate, listUsers } from './db';
import './platform.css';

const groupLabel = (g) => g === '*' ? 'Barcha o\'quvchilar' : g;

export default function TeacherPanel({ user, onLogout, onOpenLab }) {
  const db = useDb();
  const [tab, setTab] = useState('tasks');
  const mine = assignmentsOfTeacher(user.id);
  const students = listUsers('student');
  const doneCount = mine.reduce((n, a) => n + studentsOf(a.group).filter(s => bestSubmission(a.id, s.id)).length, 0);
  const needCount = mine.reduce((n, a) => n + studentsOf(a.group).length, 0);
  return (
    <div className="pf">
      <PanelTop user={user} onLogout={onLogout}><button className="btn ghost sm" onClick={onOpenLab}>🧪 Laboratoriyani ochish</button></PanelTop>
      <div className="pn-body">
        <div className="pn-hello"><h1>Assalomu alaykum, {user.name}</h1><p>Sinf yoki guruhga tajriba bo'yicha vazifa yuklang — natijalar shu yerda ko'rinadi.</p></div>
        <div className="stats">
          <div className="stat"><b>{mine.length}</b><span>berilgan vazifa</span></div>
          <div className="stat"><b>{doneCount} / {needCount}</b><span>bajarilgan topshiriq</span></div>
          <div className="stat"><b>{students.length}</b><span>o'quvchi va talaba</span></div>
          <div className="stat"><b>{groupsList().length}</b><span>sinf va guruh</span></div>
        </div>
        <div className="tabs" role="tablist">
          <button className={tab === 'tasks' ? 'on' : ''} onClick={() => setTab('tasks')}>Vazifalar</button>
          <button className={tab === 'students' ? 'on' : ''} onClick={() => setTab('students')}>O'quvchilar</button>
        </div>
        {tab === 'tasks'
          ? <div className="grid2"><NewTask user={user} key={db.experiments.length} /><TaskList list={mine} /></div>
          : <StudentsTab />}
      </div>
    </div>
  );
}

function NewTask({ user }) {
  const exps = allExperiments();
  const groups = groupsList();
  const [f, setF] = useState({ expId: '', group: groups[0] || '*', due: '', note: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const exp = exps.find(e => e.id === f.expId);
  const save = (e) => {
    e.preventDefault();
    const r = addAssignment(f, user.id);
    if (r.error) setMsg({ err: r.error }); else { setMsg({ ok: `Vazifa yuklandi: ${groupLabel(f.group)} — ${exp.title}` }); setF({ ...f, expId: '', note: '' }); }
  };
  return (
    <form className="box" onSubmit={save}>
      <h3>Yangi vazifa</h3>
      <p className="hint">O'quvchi tajribani laboratoriyada bajarganda natija (xatolar soni, vaqt, baho) avtomatik sizga keladi.</p>
      <label htmlFor="ex">Tajriba</label>
      <select id="ex" value={f.expId} onChange={set('expId')}>
        <option value="">— tanlang —</option>
        {exps.map(e => <option key={e.id} value={e.id}>{e.num}. {e.title}{e.builtIn ? '' : ' (yangi)'}</option>)}
      </select>
      {exp && <p className="hint" style={{ marginTop: 8 }}>{exp.goal}</p>}
      <label htmlFor="gp">Kimga</label>
      <select id="gp" value={f.group} onChange={set('group')}>
        <option value="*">Barcha o'quvchilar</option>
        {groups.map(g => <option key={g} value={g}>{g} ({studentsOf(g).length} kishi)</option>)}
      </select>
      <label htmlFor="du">Muddat</label>
      <input id="du" type="date" value={f.due} onChange={set('due')} />
      <label htmlFor="nt">Izoh</label>
      <textarea id="nt" rows={3} value={f.note} onChange={set('note')} placeholder="Masalan: rang o'zgarishini daftarga yozing" />
      <button className="btn" style={{ width: '100%', marginTop: 18 }}>Vazifani yuklash</button>
      {msg?.err && <div className="err">{msg.err}</div>}
      {msg?.ok && <div className="okmsg">{msg.ok}</div>}
    </form>
  );
}

function TaskList({ list }) {
  const [open, setOpen] = useState(null);
  if (!list.length) return <div className="empty">Hali vazifa berilmagan. Chapdagi shakl orqali birinchi vazifani yuklang.</div>;
  return (
    <div className="list">
      {list.map(a => {
        const e = expById(a.expId);
        const st = studentsOf(a.group);
        const rows = st.map(s => ({ s, sub: bestSubmission(a.id, s.id) }));
        const done = rows.filter(r => r.sub).length;
        return (
          <div className="item" key={a.id}>
            <div className="hd">
              <span className="ic">{e?.icon || '❔'}</span>
              <div className="tt"><b>{e ? e.title : 'O\'chirilgan tajriba'}</b><small>{groupLabel(a.group)} · berilgan {fmtDate(a.createdAt)}</small></div>
              {isOverdue(a) ? <span className="chip late">Muddat o'tdi</span> : a.due ? <span className="chip">Muddat {fmtDate(a.due)}</span> : null}
            </div>
            {a.note && <p className="note">{a.note}</p>}
            <div className="bar"><i style={{ width: st.length ? `${(done / st.length) * 100}%` : 0 }} /></div>
            <div className="meta" style={{ justifyContent: 'space-between' }}>
              <span>{done} / {st.length} bajardi</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="btn ghost sm" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Yopish' : 'Natijalar'}</button>
                <button className="btn danger" onClick={() => { if (confirm('Vazifa va uning natijalari o\'chirilsinmi?')) removeAssignment(a.id); }}>O'chirish</button>
              </span>
            </div>
            {open === a.id && (
              st.length ? (
                <table className="tb">
                  <thead><tr><th>O'quvchi</th><th>Holat</th><th>Xatolar</th><th>Vaqt</th><th>Baho</th></tr></thead>
                  <tbody>{rows.map(({ s, sub }) => (
                    <tr key={s.id}>
                      <td>{s.name}<br /><small style={{ color: 'var(--mut)' }}>{s.group}</small></td>
                      <td>{sub ? <span className="chip ok">Bajardi · {fmtDate(sub.at)}</span> : <span className="chip">Kutilmoqda</span>}</td>
                      <td>{sub ? sub.mistakes : '—'}</td>
                      <td>{sub ? fmtTime(sub.seconds) : '—'}</td>
                      <td>{sub ? <span className={`grade g${sub.grade}`}>{sub.grade}</span> : '—'}</td>
                    </tr>))}
                  </tbody>
                </table>
              ) : <p className="note">Bu guruhda hali o'quvchi yo'q.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StudentsTab() {
  const groups = groupsList();
  if (!groups.length) return <div className="empty">Hali o'quvchi ro'yxatdan o'tmagan.</div>;
  return (
    <div className="list">
      {groups.map(g => (
        <div className="box" key={g}>
          <h3>{g}</h3>
          <table className="tb">
            <thead><tr><th>Ism</th><th>Login</th><th>Turi</th></tr></thead>
            <tbody>{studentsOf(g).map(s => <tr key={s.id}><td>{s.name}</td><td>{s.login}</td><td>{s.kind === 'talaba' ? 'Talaba' : 'Maktab o\'quvchisi'}</td></tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
