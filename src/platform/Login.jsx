// National AI Lab — kirish sahifasi: Admin / O'qituvchi / O'quvchi-Talaba
import React, { useState } from 'react';
import { login, registerStudent, ROLES } from './db';
import './platform.css';

const ROLE_ORDER = ['student', 'teacher', 'admin'];
const DEMO = { student: ['talaba', 'talaba123'], teacher: ['ustoz', 'ustoz123'], admin: ['admin', 'admin123'] };

export default function Login({ onLogin }) {
  const [role, setRole] = useState('student');
  const [mode, setMode] = useState('in');          // in | up  (up faqat o'quvchi uchun)
  const [f, setF] = useState({ login: '', pass: '', name: '', group: '', kind: 'maktab' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickRole = (r) => { setRole(r); setMode('in'); setErr(''); };
  const submit = (e) => {
    e.preventDefault(); setErr('');
    const res = mode === 'up' ? registerStudent({ ...f, login: f.login }) : login(f.login, f.pass, role);
    if (res.error) setErr(res.error); else onLogin(res.user);
  };
  const fillDemo = () => { setMode('in'); setF({ ...f, login: DEMO[role][0], pass: DEMO[role][1] }); setErr(''); };

  return (
    <div className="pf">
      <div className="lg">
        <section className="lg-side">
          <div>
            <div className="lg-brand"><i>⚗️</i>National AI Lab</div>
            <h1>Virtual laboratoriya va AI O'qituvchi</h1>
            <p className="lead">Tajribalar 3D laboratoriyada, qo'l harakati bilan bajariladi. O'qituvchi vazifa beradi, natijalarni esa platforma o'zi yig'adi.</p>
            <div className="lg-roles">
              <div><span>🎓</span><p><b>O'quvchi va talaba</b><small>Vazifalarni bajaradi, erkin tajriba qiladi, bahosini ko'radi.</small></p></div>
              <div><span>👩‍🏫</span><p><b>O'qituvchi</b><small>Sinf yoki guruhga tajriba bo'yicha vazifa yuklaydi va natijalarni kuzatadi.</small></p></div>
              <div><span>🛡️</span><p><b>Admin</b><small>Yangi tajribalar qo'shadi, o'qituvchi hisoblarini ochadi.</small></p></div>
            </div>
          </div>
          <p className="lg-foot">Milliy AI hakaton · Ta'lim yo'nalishi</p>
          <svg className="lg-flask" viewBox="0 0 280 370" aria-hidden="true">
            <path d="M100 20h80v110l86 190a24 24 0 0 1-22 34H36a24 24 0 0 1-22-34l86-190z" fill="#00d4ff" />
          </svg>
        </section>

        <main className="lg-main">
          <form className="lg-card" onSubmit={submit}>
            <h2>{mode === 'up' ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}</h2>
            <p className="sub">{mode === 'up' ? 'O\'quvchi yoki talaba hisobini yarating' : 'Rolingizni tanlang va hisobingizga kiring'}</p>

            <div className="seg" role="tablist">
              {ROLE_ORDER.map(r => (
                <button type="button" key={r} role="tab" aria-selected={role === r} className={role === r ? 'on' : ''} onClick={() => pickRole(r)}>
                  {ROLES[r].icon} {ROLES[r].label}
                </button>
              ))}
            </div>

            {mode === 'up' && <>
              <label htmlFor="nm">Ism-familiya</label>
              <input id="nm" value={f.name} onChange={set('name')} autoComplete="name" />
              <div className="lg-row2">
                <div>
                  <label htmlFor="kd">Kim siz?</label>
                  <select id="kd" value={f.kind} onChange={set('kind')}>
                    <option value="maktab">Maktab o'quvchisi</option>
                    <option value="talaba">Talaba</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gr">{f.kind === 'talaba' ? 'Guruh' : 'Sinf'}</label>
                  <input id="gr" value={f.group} onChange={set('group')} placeholder={f.kind === 'talaba' ? 'KM-21 guruh' : '8-A sinf'} />
                </div>
              </div>
            </>}

            <label htmlFor="lg">Login</label>
            <input id="lg" value={f.login} onChange={set('login')} autoComplete="username" autoCapitalize="none" />
            <label htmlFor="ps">Parol</label>
            <input id="ps" type="password" value={f.pass} onChange={set('pass')} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />

            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn" style={{ width: '100%', marginTop: 22 }}>{mode === 'up' ? 'Hisob yaratish' : 'Kirish'}</button>

            {role === 'student' && (
              <p className="lg-switch">
                {mode === 'up'
                  ? <>Hisobingiz bormi? <button type="button" onClick={() => { setMode('in'); setErr(''); }}>Kirish</button></>
                  : <>Hisobingiz yo'qmi? <button type="button" onClick={() => { setMode('up'); setErr(''); }}>Ro'yxatdan o'tish</button></>}
              </p>
            )}
            {role === 'teacher' && <p className="lg-switch">O'qituvchi hisobini platforma admini ochadi.</p>}

            <div className="lg-demo">
              Namuna hisob ({ROLES[role].label}): <b>{DEMO[role][0]}</b> / <b>{DEMO[role][1]}</b>
              <button type="button" onClick={fillDemo}>To'ldirish</button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export function PanelTop({ user, onLogout, children }) {
  return (
    <header className="pn-top">
      <div className="lg-brand"><i>⚗️</i>National AI Lab</div>
      <span className="pn-role">{ROLES[user.role].icon} {ROLES[user.role].label}</span>
      <div className="sp" />
      {children}
      <div className="pn-user"><b>{user.name}</b><small>{user.group || user.subject || user.login}</small></div>
      <button className="btn ghost sm" onClick={onLogout}>Chiqish</button>
    </header>
  );
}
