// National AI Lab — O'quvchi / Talaba paneli: vazifalar va natijalar
import React from 'react';
import { PanelTop } from './Login';
import { useDb, assignmentsForStudent, expById, bestSubmission, isOverdue, userName, fmtDate, fmtTime } from './db';
import './platform.css';

export default function StudentPanel({ user, onLogout, onOpenLab }) {
  const db = useDb();
  const tasks = assignmentsForStudent(user).map(a => ({ a, e: expById(a.expId), sub: bestSubmission(a.id, user.id) })).filter(t => t.e);
  const todo = tasks.filter(t => !t.sub);
  const done = tasks.filter(t => t.sub);
  const mySubs = db.submissions.filter(s => s.studentId === user.id);
  const avg = done.length ? (done.reduce((n, t) => n + t.sub.grade, 0) / done.length).toFixed(1) : '—';

  return (
    <div className="pf">
      <PanelTop user={user} onLogout={onLogout} />
      <div className="pn-body">
        <div className="pn-hello">
          <h1>Salom, {user.name.split(' ')[0]}!</h1>
          <p>{user.kind === 'talaba' ? 'Talaba' : 'O\'quvchi'} · {user.group}</p>
        </div>
        <div className="stats">
          <div className="stat"><b>{todo.length}</b><span>bajarilishi kerak</span></div>
          <div className="stat"><b>{done.length}</b><span>bajarilgan vazifa</span></div>
          <div className="stat"><b>{avg}</b><span>o'rtacha baho</span></div>
          <div className="stat"><b>{mySubs.length}</b><span>jami urinish</span></div>
        </div>

        <div className="cta">
          <div className="tt"><b>Erkin laboratoriya</b><p>Istalgan tajribani o'zingiz bajaring yoki erkin rejimda yangi reaksiya kashf qiling.</p></div>
          <button className="btn" onClick={() => onOpenLab(null)}>🧪 Laboratoriyaga kirish</button>
        </div>

        <h2 style={{ fontSize: 22, margin: '34px 0 14px' }}>Vazifalarim</h2>
        {!tasks.length && <div className="empty">Hozircha vazifa yo'q. O'qituvchingiz vazifa yuklasa, u shu yerda paydo bo'ladi.</div>}
        <div className="list">
          {[...todo, ...done].map(({ a, e, sub }) => {
            const late = !sub && isOverdue(a);
            return (
              <div className="item" key={a.id}>
                <div className="hd">
                  <span className="ic">{e.icon}</span>
                  <div className="tt"><b>{e.title}</b><small>{userName(a.teacherId)} · {a.due ? `muddat ${fmtDate(a.due)}` : 'muddatsiz'}</small></div>
                  {sub ? <span className="chip ok">✓ Bajarildi</span> : late ? <span className="chip late">Muddat o'tdi</span> : <span className="chip new">Yangi</span>}
                </div>
                <p className="note">{e.goal}</p>
                {a.note && <p className="note">📝 {a.note}</p>}
                <div className="meta" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {sub ? <>Baho <span className={`grade g${sub.grade}`}>{sub.grade}</span> · {sub.mistakes} ta xato · {fmtTime(sub.seconds)}</> : `Kerakli moddalar: ${e.reagents.length} ta · ${e.steps.length} qadam`}
                  </span>
                  <button className={sub ? 'btn ghost sm' : 'btn sm'} onClick={() => onOpenLab({ assignmentId: a.id, expId: e.id })}>{sub ? 'Qayta bajarish' : 'Bajarish →'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
