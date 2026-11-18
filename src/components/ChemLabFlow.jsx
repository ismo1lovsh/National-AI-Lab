// ═══════════════════════════════════════════════════════════════════════════
// National AI Lab — kimyo tajribalari oqimi:
//   tajriba tanlash (5 ta + erkin + kashfiyotlar) → reaktivlar ombori
//   (kerakli moddalar jadvali bilan) → 3D laboratoriya (qadamlar jadvali)
// AI O'qituvchi har bir qadamni kuzatadi. Laboratoriyaning o'zi o'zgarmaydi.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtualLab3DScene } from './ChemistryLabScene';
import { unlockAudio } from '../teacher/voice';
import { SUB_MAP } from '../config/virtualLabChemEngine';
import { EXPERIMENTS, FREE, STORE, STORE_CATS, MAX_PICK, loadDiscoveries, saveDiscovery, REACTION_BY_ID } from '../config/experiments';
import { allExperiments, expById, submitResult, fmtTime } from '../platform/db';
import './chemflow.css';

const F = id => SUB_MAP[id]?.formula || id;
const N = id => SUB_MAP[id]?.name || id;

export default function ChemLabFlow({ hand, brain, onSelectLabMode, user = null, task = null, onExit = null }) {
  const [phase, setPhase] = useState('menu');          // menu | pick | lab
  const [exp, setExp] = useState(null);
  const [basket, setBasket] = useState([]);
  const [disc, setDisc] = useState(loadDiscoveries);
  const [session, setSession] = useState(0);
  const [done, setDone] = useState([]);                 // bajarilgan qadamlar (modda id)
  const [dirty, setDirty] = useState(false);            // kolbaga begona modda tushdi
  const [items, setItems] = useState([]);
  const [finished, setFinished] = useState(null);       // { reaction }
  const [flash, setFlash] = useState(0);
  const [toast, setToast] = useState('');
  const [tone, setTone] = useState('calm');
  const [recipeOpen, setRecipeOpen] = useState(true);
  const [q, setQ] = useState('');
  const [sent, setSent] = useState(null);              // vazifa natijasi yuborildi
  const apiRef = useRef(null);
  const mistakes = useRef(0);
  const t0 = useRef(0);
  const taskExp = useMemo(() => task ? expById(task.expId) : null, [task]);
  const st = useRef({});
  st.current = { exp, done, dirty, items, finished, taskExp, sent };

  useEffect(() => brain.on(b => setTone(b.phase === 'away' ? 'away' : b.tone)), [brain]);
  useEffect(() => { brain.setContext({ domain: 'kimyo', inLab: false }); }, [brain]);
  useEffect(() => {
    // Vazifa rejimi: menyuni o'tkazib, darhol shu tajribaning omboriga kiramiz
    if (taskExp) { const t = setTimeout(() => { chooseExp(taskExp); brain.say(`Vazifa: «${taskExp.title}». Avval jadvaldagi moddalarni ombordan oling.`); }, 700); return () => clearTimeout(t); }
    const t = setTimeout(() => brain.say('Assalomu alaykum! Men sizning AI o\'qituvchingizman. Qaysi tajribani qilamiz? Ro\'yxatdan tanlang.'), 900); return () => clearTimeout(t);
  }, [brain]); // eslint-disable-line react-hooks/exhaustive-deps
  const toastT = useRef(0);
  const say = (t) => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 3200); };

  const allExps = useMemo(() => [...allExperiments(), ...disc].map((e, i) => ({ ...e, num: i + 1 })), [disc]);
  const isTask = !!(taskExp && exp && exp.id === taskExp.id);
  const required = exp && !exp.free ? exp.reagents.map(r => r.id) : [];
  const nextStep = (d = done) => exp && !exp.free ? exp.steps.find(s => !d.includes(s.id)) : null;

  // ── tajriba tanlash ─────────────────────────────────────────────────────
  const chooseExp = (e) => {
    unlockAudio();
    setExp(e); setBasket([]); setQ(''); setPhase('pick');
    brain.setContext({ title: e.title, recipe: e.free ? '' : e.reagents.map(r => N(r.id)).join(', '), inLab: false, next: '' });
    brain.say(e.free ? 'Erkin tajriba! Ombordan xohlagan moddalaringizni oling, lekin xavfsizlikni unutmang.' : brain.line('ombor'));
  };
  const toggle = (id) => {
    unlockAudio();
    if (basket.includes(id)) { setBasket(basket.filter(x => x !== id)); return; }
    if (basket.length >= MAX_PICK) { say(`Ko'pi bilan ${MAX_PICK} ta modda olish mumkin`); return; }
    const nb = [...basket, id];
    setBasket(nb);
    if (exp && !exp.free) {
      if (!required.includes(id)) { mistakes.current++; brain.event('ortiqcha', { name: N(id) }); }
      else if (required.every(r => nb.includes(r))) brain.event('tanlov_togri');
    }
  };
  const canEnter = exp && (exp.free ? basket.length >= 1 : required.every(r => basket.includes(r)));
  const enterLab = () => {
    if (!canEnter) { brain.event('tanlov_kam'); return; }
    // kerakli moddalar avval, jadval tartibida
    const ordered = [...required.filter(r => basket.includes(r)), ...basket.filter(b => !required.includes(b))];
    setBasket(ordered); setDone([]); setDirty(false); setItems([]); setFinished(null); setSent(null);
    t0.current = Date.now();
    setSession(s => s + 1); setPhase('lab');
    brain.setContext({ inLab: true, items: '', next: exp.free ? '' : exp.steps[0].text });
    setTimeout(() => brain.event('kirish'), 600);
  };
  const backToMenu = () => { setPhase('menu'); setFinished(null); brain.setContext({ inLab: false }); };
  const wash = () => {
    apiRef.current?.reset(); setDone([]); setDirty(false); setItems([]); setFinished(null);
    brain.setContext({ items: '', next: exp && !exp.free ? exp.steps[0].text : '' });
  };
  const nextExp = () => {
    const i = allExps.findIndex(e => e.id === exp.id);
    const n = allExps[i + 1] || allExps[0];
    chooseExp(n);
  };

  // ── laboratoriyadagi hodisalar ──────────────────────────────────────────
  const onLabEvent = useCallback((ev) => {
    const { exp: e, done: d0, finished: fin } = st.current;
    if (!e) return;
    if (ev.type === 'grab') { brain.event('olish', { name: ev.name || ev.id }); return; }
    if (ev.type === 'wash') { setDone([]); setDirty(false); setItems([]); setFinished(null); st.current.finished = null; return; }
    if (ev.type === 'pour') {
      const boom = (ev.reactions || []).find(r => r.fx && (r.fx.explosion || r.fx.flash));
      if (boom) { mistakes.current++; setFlash(f => f + 1); brain.event('portlash', { eq: boom.eq }); }
    }
    if (ev.type === 'explosion') { setFlash(f => f + 1); brain.event('portlash', { eq: ev.reaction.eq }); return; }
    if (ev.type !== 'pour') return;
    const id = ev.id; const its = ev.items;
    setItems(ev.ids || []);
    brain.setContext({ items: (its || []).join(', ') });
    let d = d0;
    let spoke = false;
    if (!e.free) {
      const reqIds = e.reagents.map(r => r.id);
      if (!reqIds.includes(id)) { mistakes.current++; setDirty(true); brain.event('notogri', { name: N(id) }); spoke = true; }
      else if (!d.includes(id)) {
        const expected = e.steps.find(s => !d.includes(s.id));
        if (e.ordered && expected && expected.id !== id) { mistakes.current++; brain.setContext({ next: expected.text }); brain.event('tartib', { next: expected.text }); spoke = true; }
        else { d = [...d, id]; setDone(d); }
      }
    }
    const nxt = !e.free ? e.steps.find(s => !d.includes(s.id)) : null;
    brain.setContext({ next: nxt ? nxt.text : '' });
    for (const r of ev.reactions) {
      if (!e.free && r.id === e.target) {
        if (nxt) { mistakes.current++; brain.event('tartib', { next: nxt.text }); spoke = true; continue; }
        if (!fin) {
          const { taskExp: te, sent: sn } = st.current;
          if (te && user && te.id === e.id && !sn) {
            const res = submitResult({ assignmentId: task.assignmentId, studentId: user.id, expId: e.id, mistakes: mistakes.current, seconds: Math.max(1, (Date.now() - t0.current) / 1000) });
            st.current.sent = res; setSent(res);
          }
          st.current.finished = { reaction: r }; setTimeout(() => setFinished({ reaction: r }), 3500); brain.setContext({ next: 'keyingi tajribani tanlash' }); brain.event('bajarildi', { eq: r.eq }); spoke = true; }
      } else if (e.free) {
        const nd = saveDiscovery(r);
        if (nd) { setDisc(loadDiscoveries()); say(`Yangi tajriba qo'shildi: ${nd.num}. ${nd.title}`); brain.event('kashfiyot', { eq: r.eq.replace(/💥.*|🌋.*/u, ''), num: nd.num }); }
        else brain.event('reaksiya', { eq: r.eq.replace(/💥.*|🌋.*/u, '') });
        spoke = true;
      } else { brain.event('reaksiya', { eq: r.eq.replace(/💥.*|🌋.*/u, '') }); spoke = true; }
    }
    if (!spoke && !e.free && reqStepJustDone(d0, d)) brain.event('qadam', { next: nxt ? nxt.text : 'reaksiyani kuzating' });
    if (!spoke && e.free) brain.event('olish', { name: N(id) });
  }, [brain, task, user]);

  const taskLines = useMemo(() => exp ? [exp.free ? 'Erkin tajriba' : `${exp.num}. ${exp.title}`, ...(exp.free ? ['Xohlagan moddalarni', 'aralashtiring'] : exp.steps.map((s, i) => `${i + 1}. ${s.text}`))] : null, [exp]);
  const targetRx = exp && exp.target ? REACTION_BY_ID[exp.target] : null;
  const boardInfo = useMemo(() => exp ? {
    title: exp.free ? 'Erkin tajriba' : `${exp.num}. ${exp.title}`,
    goal: exp.goal, eq: targetRx ? targetRx.eq.replace(/💥.*|🌋.*/u, '').trim() : '',
    reagents: exp.free ? basket.map(id => `${F(id)} — ${N(id)}`) : exp.reagents.map(r => `${F(r.id)} — ${r.amount}`),
    steps: exp.free ? [{ id: '_', text: 'Moddalarni navbat bilan markaziy kolbaga quying va kuzating' }] : exp.steps,
    watch: exp.watch || '',
  } : null, [exp, targetRx, basket]);

  // ── ko'rinish ───────────────────────────────────────────────────────────
  return (
    <>
      <VirtualLab3DScene
        key={phase === 'lab' ? 's' + session : 'idle'}
        hand={hand}
        selectedIds={phase === 'lab' ? basket : []}
        onLabEvent={onLabEvent}
        apiRef={apiRef}
        onSelectLabMode={onSelectLabMode}
      />
      <div className={`chemshell tone-${tone}`}>
      <div className="cl-anger" />
      {flash > 0 && <div key={flash} className="cl-flash" />}

      {/* 1. Tajriba tanlash */}
      {phase === 'menu' && (
        <section className="cl-screen">
          <header><h1>Kimyo laboratoriyasi</h1><p>Tajribani tanlang. Har bir tajribada qaysi moddalar kerakligi jadvalda ko'rsatilgan.</p></header>
          <div className="cl-grid">
            {allExps.map(e => (
              <button key={e.id} className={`cl-exp${e.discovered ? ' disc' : ''}`} onClick={() => chooseExp(e)}>
                <span className="n">{e.num}</span>
                <span className="ic">{e.icon}</span>
                <b>{e.title}</b>
                <small>{e.goal}</small>
                <span className="chips">{e.reagents.map(r => <i key={r.id}>{F(r.id)}</i>)}</span>
                <span className="lv">{e.discovered ? 'Kashfiyot' : e.level}</span>
              </button>
            ))}
            <button className="cl-exp free" onClick={() => chooseExp(FREE)}>
              <span className="ic">{FREE.icon}</span>
              <b>{FREE.title}</b>
              <small>{FREE.goal}</small>
              <span className="lv">{disc.length ? `${disc.length} ta kashfiyot` : 'yangi reaksiya toping'}</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. Reaktivlar ombori */}
      {phase === 'pick' && exp && (
        <section className="cl-screen pick">
          <aside className="cl-recipe big">
            <button className="back" onClick={backToMenu}>← Tajribalar</button>
            {isTask && <div className="cl-taskline">📌 O'qituvchi vazifasi</div>}
            <h2>{exp.free ? 'Erkin tajriba' : `${exp.num}. ${exp.title}`}</h2>
            <p className="goal">{exp.goal}</p>
            {!exp.free && <>
              <h3>Qanday olinadi</h3>
              {targetRx && <div className="eq">{targetRx.eq.replace(/💥.*|🌋.*/u, '')}</div>}
              <h3>Kerakli moddalar jadvali</h3>
              <table>
                <thead><tr><th /><th>Modda</th><th>Miqdor</th><th>Vazifasi</th></tr></thead>
                <tbody>{exp.reagents.map(r => (
                  <tr key={r.id} className={basket.includes(r.id) ? 'ok' : ''}>
                    <td>{basket.includes(r.id) ? '✓' : '○'}</td>
                    <td><b>{F(r.id)}</b><br /><small>{N(r.id)}</small></td>
                    <td>{r.amount}</td><td><small>{r.role}</small></td>
                  </tr>))}
                </tbody>
              </table>
              <p className="watch">👁 {exp.watch}</p>
            </>}
            {exp.free && <p className="watch">Yangi modda hosil bo'lsa, tajriba avtomatik ravishda {allExps.length + 1}-raqam bilan ro'yxatga qo'shiladi.</p>}
          </aside>
          <div className="cl-store">
            <div className="hd"><h2>Reaktivlar ombori</h2><input value={q} onChange={e => setQ(e.target.value)} placeholder="Qidirish: nomi yoki formula" /></div>
            <div className="cats">
              {STORE_CATS.map(cat => {
                const list = STORE.filter(s => s.cat === cat && (!q || (s.name + s.formula + s.id).toLowerCase().includes(q.toLowerCase())));
                if (!list.length) return null;
                return (
                  <div key={cat} className="cat"><h4>{cat}</h4>
                    <div className="tiles">{list.map(s => (
                      <button key={s.id} title={s.hazard} className={`tile${basket.includes(s.id) ? ' on' : ''}${required.includes(s.id) ? ' need' : ''}`} onClick={() => toggle(s.id)}>
                        <i style={{ background: s.color }} /><b>{s.formula}</b><span>{s.name}</span>
                      </button>))}
                    </div>
                  </div>
                );
              })}
            </div>
            <footer>
              <div className="bk">{basket.length ? basket.map(id => <span key={id} className={required.length && !required.includes(id) ? 'extra' : ''} onClick={() => toggle(id)}>{F(id)} ✕</span>) : <em>Savat bo'sh — moddani bosib tanlang</em>}</div>
              <button className="go" disabled={!canEnter} onClick={enterLab}>Laboratoriyaga kirish →</button>
            </footer>
          </div>
        </section>
      )}

      {/* 3. Laboratoriya ichida: jadval va boshqaruv */}
      {phase === 'lab' && exp && (
        <aside className={`cl-recipe lab${recipeOpen ? '' : ' closed'}`}>
          {isTask && <div className="cl-taskline">📌 O'qituvchi vazifasi</div>}
          <div className="row">
            <h2>{exp.free ? 'Erkin tajriba' : `${exp.num}. ${exp.title}`}</h2>
            <button onClick={() => setRecipeOpen(o => !o)}>{recipeOpen ? '−' : '+'}</button>
          </div>
          {recipeOpen && <>
            {!exp.free && (
              <ol className="steps">
                {exp.steps.map(s => {
                  const ok = done.includes(s.id); const cur = !ok && nextStep()?.id === s.id;
                  return <li key={s.id} className={ok ? 'ok' : cur ? 'cur' : ''}><span>{ok ? '✓' : ''}</span>{s.text}<b>{F(s.id)}</b></li>;
                })}
              </ol>
            )}
            {!exp.free && (
              <table className="mini"><tbody>{exp.reagents.map(r => <tr key={r.id}><td><b>{F(r.id)}</b></td><td>{r.amount}</td><td>{N(r.id)}</td></tr>)}</tbody></table>
            )}
            <div className="flask"><span>Kolbada:</span> {items.length ? items.map(F).join(' + ') : 'bo\'sh'}</div>
            {dirty && <div className="warn">Kolbaga keraksiz modda tushdi. Yuving va qaytadan boshlang.</div>}
            <div className="btns">
              <button onClick={wash}>🧽 Kolbani yuvish</button>
              <button onClick={backToMenu}>☰ Tajribalar</button>
            </div>
          </>}
        </aside>
      )}

      {finished && phase === 'lab' && (
        <div className="cl-done">
          <div className="box">
            <div className="big">🏆</div>
            <h2>Tajriba bajarildi!</h2>
            <div className="eq">{finished.reaction.eq.replace(/💥.*|🌋.*/u, '')}</div>
            <p>{finished.reaction.observe}</p>
            <p className="ex">{finished.reaction.explain}</p>
            {sent && <div className="sent">✓ Natija o'qituvchiga yuborildi: baho {sent.grade} · {sent.mistakes} ta xato · {fmtTime(sent.seconds)}</div>}
            <div className="btns">
              <button onClick={() => setFinished(null)}>Kuzatishda davom etish</button>
              <button onClick={() => { mistakes.current = 0; t0.current = Date.now(); setSent(null); st.current.sent = null; wash(); }}>Qayta bajarish</button>
              {sent && onExit
                ? <button className="go" onClick={onExit}>Panelga qaytish →</button>
                : <button className="go" onClick={nextExp}>Keyingi tajriba →</button>}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="cl-toast">{toast}</div>}
      </div>
    </>
  );
}

function reqStepJustDone(a, b) { return b.length > a.length; }
