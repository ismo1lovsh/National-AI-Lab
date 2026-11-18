// National AI Lab — gapiradigan 3D AI O'qituvchi.
// Kimyo laboratoriyasida o'quvchining har bir harakatiga (olish, quyish,
// reaksiya, portlash) munosabat bildiradi; texnika sahifalarida (mudofaa,
// dronlar, transport) modelni tanishtiradi va tanlangan qismni tushuntiradi.
import React, { useEffect, useRef } from 'react';
import Teacher3D from './Teacher3D';

const firstSentence = (t = '') => (t.match(/^[^.!?]+[.!?]/) || [t])[0].slice(0, 200);
const cleanEq = (eq = '') => eq.replace(/💥.*|🌋.*/u, '').trim();

/** Kimyo sahnasidan kelgan hodisani o'qituvchiga uzatadi */
export function labEventToTeacher(brain, ev) {
  if (!ev) return;
  if (ev.type === 'grab') { brain.event('olish', { name: ev.name }); return; }
  if (ev.type === 'wash') { brain.event('yuvish'); return; }
  if (ev.type !== 'pour') return;
  brain.setContext({ items: (ev.items || []).join(', ') });
  const rx = ev.reactions || [];
  const boom = rx.find(r => r.fx && (r.fx.explosion || r.fx.flash));
  if (boom) { brain.event('portlash', { eq: cleanEq(boom.eq) }); return; }
  if (rx.length) { brain.event('reaksiya', { eq: cleanEq(rx[rx.length - 1].eq) }); return; }
  if ((ev.items || []).length >= 3) brain.event('bekor');
  else brain.event('quyish', { name: ev.name });
}

export default function AiTeacher({ brain, model, selectedPart, explodeOpen, xrayMode, simMode }) {
  const first = useRef(true);
  const isChem = Boolean(model?.isChemistryLab);

  useEffect(() => {
    if (!model) return undefined;
    if (isChem) {
      // kimyoda tanishtiruv va kontekstni tajribalar oqimi (ChemLabFlow) beradi
      brain.setContext({ domain: 'kimyo', about: '' });
      first.current = false;
      return undefined;
    } else {
      brain.setContext({ domain: 'texnika', title: model.label, about: model.aiContext || '', inLab: true, next: 'biror qismni tanlab, uni o\'rganing' });
    }
    const t = setTimeout(() => {
      if (isChem) brain.say(first.current ? 'Assalomu alaykum! Men sizning AI o\'qituvchingizman. Javondan reaktivni oling va markaziy kolbaga quying — men kuzatib turaman.' : 'Kimyo laboratoriyasiga qaytdik. Qani, tajribani davom ettiramiz!');
      else brain.event('t_kirish', { name: model.label });
      first.current = false;
    }, first.current ? 1200 : 300);
    return () => clearTimeout(t);
  }, [brain, model, isChem]);

  useEffect(() => {
    if (!selectedPart || isChem) return;
    const info = model?.parts?.[selectedPart.key]?.info || '';
    brain.event('qism', { part: selectedPart.label || selectedPart.key, info: firstSentence(info) });
  }, [brain, model, selectedPart, isChem]);

  const ex = useRef(explodeOpen);
  useEffect(() => { if (!isChem && ex.current !== explodeOpen) brain.event(explodeOpen ? 'ajratish' : 'yigish'); ex.current = explodeOpen; }, [brain, explodeOpen, isChem]);
  useEffect(() => { if (!isChem && xrayMode) brain.event('rentgen'); }, [brain, xrayMode, isChem]);
  useEffect(() => { if (!isChem && simMode) brain.event('simulyatsiya'); }, [brain, simMode, isChem]);

  return <Teacher3D brain={brain} dock />;
}
