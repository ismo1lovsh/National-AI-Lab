// Yuqoridagi fanlar paneli — butun platforma bo'ylab bir xil
import React, { useEffect, useRef, useState } from 'react';
import { SUBJECTS, subjectOfModel } from '../config/subjects';
import { MODELS } from '../config/models';
import './teacher.css';

const label = (id) => (MODELS.find(m => m.id === id) || {}).label || id;

export default function SubjectsBar({ activeModelId, onOpenModel, onSoon, inline = false }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  const active = subjectOfModel(activeModelId);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);
  const pick = (s) => {
    if (!s.models) { onSoon && onSoon(s); return; }
    if (s.models.length > 1) { setOpen(o => (o === s.id ? null : s.id)); return; }
    setOpen(null); onOpenModel && onOpenModel(s.models[0]);
  };
  return (
    <nav ref={ref} className={`cl-subjects${inline ? ' inline' : ''}`}>
      {SUBJECTS.map(s => (
        <div key={s.id} className="cl-subj">
          <button className={s.id === active ? 'on' : ''} title={s.models ? s.label : `${s.label} — tez orada`} onClick={() => pick(s)}>
            <span>{s.icon}</span>{inline ? s.short : s.label}{!s.models && <em />}{s.models && s.models.length > 1 && <i className="caret">▾</i>}
          </button>
          {open === s.id && (
            <div className="cl-subj-menu">
              {s.models.map(id => (
                <button key={id} className={id === activeModelId ? 'on' : ''} onClick={() => { setOpen(null); onOpenModel && onOpenModel(id); }}>{label(id)}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
