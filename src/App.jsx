import { useState, useRef, useEffect, useCallback } from 'react';
import ModelScene      from './components/ModelScene';
import CameraFeed      from './components/CameraFeed';
import VoiceAssistant  from './components/VoiceAssistant';
import HandOverlay     from './components/HandOverlay';
import PartDetailView  from './components/PartDetailView';
import useHandTracking from './hooks/useHandTracking';
import useVoiceAI      from './hooks/useVoiceAI';
import { MODELS, CATEGORIES, DEFAULT_MODEL_ID } from './config/models';
import { VirtualLab3DScene } from './components/ChemistryLabScene';
import AiTeacher from './components/AiTeacher';
import ChemLabFlow from './components/ChemLabFlow';
import './platform/platform.css';
import SubjectsBar from './components/SubjectsBar';
import { TeacherBrain } from './teacher/brain';
import { askWithFallback, availableProviders } from './config/aiProviders';
import { LANGS } from './config/i18n';
import { createLogger } from './utils/logger';
import GuidePage from './components/GuidePage';

const log = createLogger('APP');
const SANS = "'Manrope', system-ui, -apple-system, sans-serif";

const PART_AI_SYS = `Sen "National AI Lab" interaktiv 3D ta'lim platformasining AI o'qituvchisisan. O'quvchi 3D modelda bitta asosiy komponentni tanladi. Shu qism haqida aniq dars ber:
1) VAZIFASI VA ISHLASH PRINSIPI — (2-3 gap)
2) TUZILISHI — (1-2 gap)
3) MUHIM TEXNIK YOKI AMALIY FAKT — (1-2 gap)
FAQAT O'ZBEK TILIDA, 4-6 gap. Markdown belgilarisiz (*, #, -), oddiy matn.`;

function stripMd(txt) {
  return String(txt)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function partDetailOf(model, selectedPart) {
  if (!model || !selectedPart) return { name: '', info: '' };
  if (model.meshNames) {
    const idx = parseInt(String(selectedPart.key).replace(/\D/g, ''), 10);
    const entry = model.meshNames[isNaN(idx) ? -1 : idx]
      ?? (model.meshNames.length === 1 ? model.meshNames[0] : null);
    if (entry) return { name: entry.name, info: entry.info };
  }
  const part = model.parts?.[selectedPart.key];
  if (part) return { name: part.label, info: part.info || '' };
  return { name: selectedPart.label, info: '' };
}

// Modelning 6 ta asosiy komponentlari ro'yxatini olish
function getMainComponentsOf(model) {
  if (!model) return [];
  if (model.meshNames?.length) {
    return model.meshNames.slice(0, 6).map((m, i) => ({
      key: `mesh_${i}`,
      label: m.name,
      shortLabel: m.shortLabel || m.name,
      icon: m.icon || '⚙️',
      info: m.info || '',
    }));
  }
  if (model.parts && Object.keys(model.parts).length) {
    return Object.entries(model.parts).slice(0, 6).map(([k, v]) => ({
      key: k,
      label: v.label,
      shortLabel: v.shortLabel || v.label,
      icon: v.icon || '⚙️',
      info: v.info || '',
    }));
  }
  return [];
}

const MAX_SCALE = 8.0;
const MIN_SCALE = 0.15;
const ROT_SIGN_H = -1;
const ROT_SIGN_V = 1;
const SELECT_HOLD_MS = 360;

function readUrlParams() {
  try {
    const q = new URLSearchParams(window.location.search);
    return {
      model: q.get('model'),
      lang:  q.get('lang'),
      embed: q.get('embed') === '1',
    };
  } catch { return {}; }
}
const URL_CFG = readUrlParams();

export default function App({ onOpenQuiz, user = null, task = null, onExit = null }) {
  const videoRef = useRef(null);
  const [showGuide, setShowGuide] = useState(false);

  const [activeModelIdx, setActiveModelIdx] = useState(() => {
    const wanted = URL_CFG.model
      ? MODELS.findIndex(m => m.id === URL_CFG.model)
      : -1;
    return wanted >= 0 ? wanted : Math.max(0, MODELS.findIndex(m => m.id === DEFAULT_MODEL_ID));
  });
  const activeModel = MODELS[activeModelIdx] || MODELS[0];

  const [rotation, setRotation]                       = useState({ x: 0, y: 0 });
  const [scale, setScale]                             = useState(1.0);
  const [panMode, setPanMode]                         = useState(false);
  const [selectedPart, setSelectedPart]               = useState(null);
  const [selectedMeshRawData, setSelectedMeshRawData] = useState(null);
  const [highlightPart, setHighlightPart]             = useState(null);
  const [hoverLabel, setHoverLabel]                   = useState(null);
  const [explodeOpen, setExplodeOpen]                 = useState(false);
  const [explodeFactor, setExplodeFactor]             = useState(1.0);
  const [xrayMode, setXrayMode]                       = useState(false);
  // Shaffoflik foizi: 0% (oddiy) .. 70%..85% (X-Ray shaffof)
  const [transparencyPct, setTransparencyPct]         = useState(70);
  const [showCadEdges, setShowCadEdges]               = useState(true);
  const [pinchPoint, setPinchPoint]                   = useState(null);

  const [simMode, setSimMode]                         = useState(false);
  const [simTelemetry, setSimTelemetry]               = useState({ speed: 0, rpm: 850, heading: 0, steer: 0, pitch: 0 });
  const [firstAidMode, setFirstAidMode]               = useState(false);

  const [pinchHoldMs, setPinchHoldMs]                 = useState(0);
  const [showQuizSelect, setShowQuizSelect]           = useState(false);
  const [camOn, setCamOn]                             = useState(true);
  const [lang, setLang]                               = useState(
    LANGS.some(l => l.id === URL_CFG.lang) ? URL_CFG.lang : 'uz'
  );
  const [showLabels, setShowLabels]                   = useState(false);
  const [projector, setProjector]                     = useState(false);
  const [leftFanlarOpen, setLeftFanlarOpen]           = useState(true);
  const [vrMenuOpen, setVrMenuOpen]                   = useState(false);

  // ── KIMYO TAJRIBA LABORATORIYASI HOLATI (2D Interaktiv + 3D Rejim) ─────────
  const [chemViewMode, setChemViewMode] = useState('2d');
  const [sharedLabState, setSharedLabState] = useState({
    isHeating: false,
    temp: 22.0,
    grabbedIdx: -1,
    pouringIdx: -1,
    explosionTick: 0,
    precipitateHeight: 0,
    foamHeight: 0,
    equationText: 'Markaziy Kolba: H₂O + NaCl (Tayyor muhit)',
    statusText: "✊ Musht (Punch) qilib istalgan kolbani ushlang, ko'tarib Markaziy Kolbaga olib borib quying!",
  });

  const captureRef = useRef(null);
  const [aiPartInfo, setAiPartInfo] = useState(null);
  const aiPartReqRef   = useRef(null);
  const aiPartCacheRef = useRef({});

  const hand  = useHandTracking(videoRef, camOn);

  // ── AI O'qituvchi (3D, gapiradi) — butun platforma uchun bitta ──────────
  const [teacher] = useState(() => new TeacherBrain());
  useEffect(() => { teacher.start(); window.__oqituvchi = teacher; return () => teacher.stop(); }, [teacher]);
  const voice = useVoiceAI();

  const handRef         = useRef(hand);
  const selectedPartRef = useRef(selectedPart);
  const activeModelRef  = useRef(activeModel);

  useEffect(() => { handRef.current = hand; }, [hand]);


  useEffect(() => { selectedPartRef.current = selectedPart; }, [selectedPart]);
  useEffect(() => { activeModelRef.current = activeModel; }, [activeModel]);

  const prevIndexRef   = useRef(null);
  const selectStartRef = useRef(null);
  const selectFiredRef = useRef(false);

  const doDeselect = useCallback(() => {
    setSelectedPart(null);
    setSelectedMeshRawData(null);
    setHighlightPart(null);
    aiPartReqRef.current = null;
    setAiPartInfo(null);
  }, []);

  const requestPartAI = useCallback(async (key, label, model) => {
    if (!availableProviders().length) return;
    const m = model || activeModelRef.current;
    const cacheKey = `${m.id}:${key}`;
    const cached = aiPartCacheRef.current[cacheKey];
    if (cached) { setAiPartInfo({ key, text: cached, loading: false }); return; }

    aiPartReqRef.current = key;
    setAiPartInfo({ key, text: '', loading: true });
    const d = partDetailOf(m, { key, label });
    try {
      const { text } = await askWithFallback(null, [
        { role: 'system', content: PART_AI_SYS },
        {
          role: 'user',
          content: `Model: "${m.label}". Tanlangan asosiy komponent: "${d.name || label}".`
            + (d.info ? ` Ma'lumotnoma: ${d.info}` : '')
            + ` Shu komponent haqida tahlil ber.`,
        },
      ], { maxTokens: 650, temperature: 0.6 });
      if (aiPartReqRef.current !== key) return;
      const clean = stripMd(text);
      aiPartCacheRef.current[cacheKey] = clean;
      setAiPartInfo({ key, text: clean, loading: false });
    } catch (e) {
      if (aiPartReqRef.current !== key) return;
      setAiPartInfo({ key, text: '', loading: false, error: "Ma'lumotnoma matni asosida o'rganing" });
    }
  }, []);

  const handleModelSwitch = useCallback((id) => {
    const idx = MODELS.findIndex(m => m.id === id);
    if (idx >= 0) {
      setActiveModelIdx(idx);
      setRotation({ x: 0, y: 0 });
      setScale(1.0);
      setHighlightPart(null);
      setSelectedPart(null);
      setSelectedMeshRawData(null);
      setExplodeOpen(false);
      setSimMode(false);
      setFirstAidMode(false);
      prevIndexRef.current = null;
      aiPartReqRef.current = null;
      setAiPartInfo(null);
    }
  }, []);

  const switchModelDelta = useCallback((delta) => {
    const nextIdx = (activeModelIdx + delta + MODELS.length) % MODELS.length;
    handleModelSwitch(MODELS[nextIdx].id);
  }, [activeModelIdx, handleModelSwitch]);

  useEffect(() => {
    const onKey = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      const k = e.key.toLowerCase();
      switch (k) {
        case 'e': setExplodeOpen(o => !o); break;
        case 'x': setXrayMode(o => !o); break;
        case 'm': setSimMode(o => !o); break;
        case 'r':
          setRotation({ x: 0, y: 0 });
          setScale(1.0);
          setExplodeOpen(false);
          setXrayMode(false);
          setSimMode(false);
          doDeselect();
          break;
        case 'c': setCamOn(o => !o); break;
        case 'p': setProjector(o => !o); break;
        case 'l': setShowLabels(o => !o); break;
        case 'escape': doDeselect(); break;
        case 'arrowleft': if (!activeModelRef.current?.isChemistryLab) switchModelDelta(-1); break;
        case 'arrowright': if (!activeModelRef.current?.isChemistryLab) switchModelDelta(1); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [switchModelDelta, doDeselect]);

  // ── TALAB #5: 👌 (OK belgisi) yoki 🖖 (3 barmoq) bilan Qismni Tanlash ─────
  useEffect(() => {
    let raf;
    const loop = () => {
      const h = handRef.current;
      if (activeModelRef.current?.isChemistryLab) { setPinchHoldMs(0); raf = requestAnimationFrame(loop); return; }
      const selecting = h.isTracking && h.gesture === 'LASER_SELECT';
      if (selecting) {
        const mid = h.h1PinchMid;
        const st  = selectStartRef.current;
        if (!st) {
          selectStartRef.current = { t: Date.now(), x: mid?.x ?? 0.5, y: mid?.y ?? 0.5 };
          selectFiredRef.current = false;
        } else if (mid && Math.hypot(mid.x - st.x, mid.y - st.y) > 0.045) {
          selectStartRef.current = { t: Date.now(), x: mid.x, y: mid.y };
          selectFiredRef.current = false;
          setPinchHoldMs(0);
        } else {
          const held = Date.now() - st.t;
          setPinchHoldMs(held);
          if (held >= SELECT_HOLD_MS && !selectFiredRef.current && mid) {
            selectFiredRef.current = true;
            setPinchPoint({ id: Date.now(), normX: 1 - mid.x, normY: mid.y });
            log.info('LASER_SELECT fired');
          }
        }
      } else {
        if (selectStartRef.current) {
          selectStartRef.current = null;
          selectFiredRef.current = false;
          setPinchHoldMs(0);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const buildVoiceCtx = useCallback(() => {
    const sp = selectedPartRef.current;
    const m  = activeModelRef.current;
    if (sp) {
      const d = partDetailOf(m, sp);
      return `Model: "${m.label}". Tanlangan komponent: "${d.name || sp.label}".`
        + (d.info ? ` Ma'lumotnoma: ${d.info}` : '')
        + ` Umumiy kontekst: ${m.aiContext}`;
    }
    return `Model: "${m.label}". Kontekst: ${m.aiContext}`;
  }, []);

  // ── TALAB #4: 360° Aylantirish FAQAT ko'rsatkich barmog'i + mushtda (`POINT_ROTATE`)
  useEffect(() => {
    if (!hand.isTracking || activeModel.isChemistryLab) {
      prevIndexRef.current = null;
      return;
    }
    const { gesture, h1IndexCenter, h1PalmCenter, zoomDelta } = hand;

    if (simMode && h1PalmCenter) {
      if (gesture === 'EXPLODE_TOGGLE') {
        setSimTelemetry(st => ({ ...st, speed: st.speed * 0.6, rpm: 850, pitch: 0.1 }));
      } else {
        const steerInput = (0.5 - h1PalmCenter.x) * 2.2;
        const throttle = Math.max(0, Math.min(1, (0.78 - h1PalmCenter.y) * 1.6));
        const maxSpd = activeModel.id === 'jet_fighter' ? 850 : activeModel.category === 'dronlar' ? 75 : 67;
        setSimTelemetry(st => ({
          speed: Math.round(st.speed * 0.8 + throttle * maxSpd * 0.2),
          rpm: Math.round(850 + throttle * 2200),
          steer: st.steer * 0.82 + steerInput * 0.18,
          pitch: (0.5 - h1PalmCenter.y) * 0.4,
          heading: Math.round((st.heading - steerInput * 4 + 360) % 360),
        }));
      }
      return;
    }

    if (gesture !== 'POINT_ROTATE') {
      prevIndexRef.current = null;
    }

    if (gesture === 'POINT_ROTATE' && h1IndexCenter) {
      if (prevIndexRef.current) {
        const dx = h1IndexCenter.x - prevIndexRef.current.x;
        const dy = h1IndexCenter.y - prevIndexRef.current.y;
        if (Math.abs(dx) > 0.0007 || Math.abs(dy) > 0.0007) {
          setRotation(r => ({
            y: r.y + ROT_SIGN_H * dx * 8.5,
            x: Math.max(-1.45, Math.min(1.45, r.x + ROT_SIGN_V * dy * 6.2)),
          }));
        }
      }
      prevIndexRef.current = { x: h1IndexCenter.x, y: h1IndexCenter.y };
    } else if (gesture === 'ZOOM' && Math.abs(zoomDelta) > 0.0005) {
      setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + zoomDelta)));
    }
  }, [hand.gesture, hand.h1IndexCenter, hand.h1PalmCenter, hand.zoomDelta, hand.isTracking, simMode, activeModel.id, activeModel.category, activeModel.isChemistryLab]);

  useEffect(() => {
    if (!hand.explodeTick || activeModel.isChemistryLab) return;
    setExplodeOpen(o => !o);
  }, [hand.explodeTick, activeModel.isChemistryLab]);

  useEffect(() => {
    if (!hand.xrayTick || activeModel.isChemistryLab) return;
    setXrayMode(o => !o);
  }, [hand.xrayTick, activeModel.isChemistryLab]);

  const handlePartHover = useCallback((key, label) => {
    setHoverLabel(label || null);
  }, []);

  const handlePartClick = useCallback((key, label, rawData) => {
    if (selectedPart?.key === key) {
      doDeselect();
      return;
    }
    setSelectedPart({ key, label });
    setHighlightPart(key);
    setSelectedMeshRawData(rawData || null);
    requestPartAI(key, label, activeModelRef.current);
  }, [selectedPart, doDeselect, requestPartAI]);

  const handleMicToggle = useCallback(() => {
    if (voice.isListening) voice.stopListening();
    else voice.startListening(buildVoiceCtx());
  }, [voice, buildVoiceCtx]);

  const partDetail = partDetailOf(activeModel, selectedPart);
  const mainComponents = getMainComponentsOf(activeModel);

  const labelForKey = useCallback((key) => {
    const d = partDetailOf(activeModelRef.current, { key, label: key });
    return d.name || null;
  }, []);

  // X-Ray shaffoflik darajasini `transparencyPct` (0..90%) dan hisoblash
  const effectiveXrayOpacity = Math.max(0.08, Math.min(0.85, 1 - transparencyPct / 100));

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at 50% 42%, #0a2246 0%, #041024 55%, #020611 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: SANS,
    }}>
      {/* Orqa fon golografik setkasi */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: [
          'radial-gradient(760px 440px at 50% 46%, rgba(0, 229, 255, 0.09), transparent 72%)',
          'linear-gradient(rgba(0, 229, 255, 0.025) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(0, 229, 255, 0.025) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
      }} />

      {showGuide && <GuidePage onDone={() => setShowGuide(false)} />}

      {/* ═══════════════════════════════════════════════════════════════════════
          1. YUQORI NAVIGATSIYA PANELI (Rasmda ko'rsatilganidek!)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeModel.isChemistryLab && !projector && (
        <button
          onClick={() => setVrMenuOpen(o => !o)}
          style={{
            position: "fixed",
            top: 10,
            left: 14,
            zIndex: 220,
            padding: "6px 12px",
            borderRadius: 8,
            background: vrMenuOpen ? "#1e78d6" : "rgba(24, 24, 27, 0.72)",
            border: "1px solid rgba(255,255,255,0.28)",
            color: "#ffffff",
            fontSize: 11.5,
            fontWeight: 800,
            cursor: "pointer",
            backdropFilter: "blur(8px)",
          }}
        >
          {vrMenuOpen ? "✕ Menyuni yopish" : "☰ National AI Lab Menyu"}
        </button>
      )}
      {!projector && (!activeModel.isChemistryLab || vrMenuOpen) && (
        <header style={{
          position: 'fixed',
          top: 10,
          left: 16,
          right: 16,
          height: 46,
          zIndex: 180,
          background: 'linear-gradient(90deg, rgba(4, 13, 28, 0.92) 0%, rgba(8, 22, 48, 0.88) 50%, rgba(4, 13, 28, 0.92) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: 10,
          padding: '0 14px',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Chap: Hexagon 3D Cube Logo + National AI Lab */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(0, 229, 255, 0.14)',
              border: '1.5px solid #00e5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0, 229, 255, 0.35)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                National <span style={{ color: '#00e5ff' }}>AI</span> Lab
              </div>
              <div style={{ fontSize: 9, color: 'rgba(148, 184, 224, 0.75)' }}>
                Interactive Learning Platform
              </div>
            </div>
          </div>

          {/* Markaziy: fanlar paneli + ixcham asboblar */}
          {!activeModel.isChemistryLab && (
            <SubjectsBar inline activeModelId={activeModel.id} onOpenModel={handleModelSwitch}
              onSoon={(sb) => teacher.say(`${sb.label} bo'limi hali tayyorlanmoqda. Tez orada qo'shiladi!`)} />
          )}
          <nav className="hl-iconnav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => { setExplodeOpen(false); setXrayMode(false); setSimMode(false); doDeselect(); }}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'rgba(203, 226, 255, 0.78)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🏠</span> Home
            </button>

            <button
              onClick={() => setSimMode(false)}
              style={{
                background: !simMode ? 'linear-gradient(180deg, rgba(0, 229, 255, 0.24), rgba(2, 132, 199, 0.18))' : 'transparent',
                border: `1px solid ${!simMode ? '#00e5ff' : 'rgba(0, 229, 255, 0.2)'}`,
                borderRadius: 8,
                padding: '6px 14px',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: !simMode ? '0 0 16px rgba(0, 229, 255, 0.32)' : 'none',
              }}
            >
              <span style={{ color: '#00e5ff' }}>🧊</span> 3D Laboratory
            </button>

            <button
              onClick={handleMicToggle}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'rgba(203, 226, 255, 0.85)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>☆</span> AI USTOZ
            </button>

            <button
              onClick={() => setShowLabels(o => !o)}
              style={{
                background: showLabels ? 'rgba(0, 229, 255, 0.16)' : 'transparent',
                border: `1px solid ${showLabels ? '#00e5ff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: showLabels ? '#00e5ff' : 'rgba(203, 226, 255, 0.8)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📖</span> Knowledge Base
            </button>

            {onOpenQuiz && (
              <button
                onClick={() => setShowQuizSelect(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: 'rgba(203, 226, 255, 0.85)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🏆</span> Challenges
              </button>
            )}

            <button
              onClick={() => setSimMode(o => !o)}
              style={{
                background: simMode ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
                border: `1px solid ${simMode ? '#00ff88' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: simMode ? '#00ff88' : 'rgba(203, 226, 255, 0.8)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📊</span> Simulations
            </button>
          </nav>

          {/* O'ng: Til, Sozlamalar va Student Profili */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex',
              gap: 2,
              background: 'rgba(3, 10, 24, 0.8)',
              border: '1px solid rgba(0, 229, 255, 0.22)',
              borderRadius: 6,
              padding: 2,
            }}>
              {LANGS.map(L => (
                <button
                  key={L.id}
                  onClick={() => setLang(L.id)}
                  style={{
                    background: lang === L.id ? 'rgba(0, 229, 255, 0.25)' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    padding: '3px 7px',
                    color: lang === L.id ? '#00e5ff' : 'rgba(186, 230, 253, 0.5)',
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                >
                  {L.short}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowGuide(true)}
              title="Qo'llanma"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0, 229, 255, 0.22)',
                color: '#bae6fd',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ⚙️
            </button>

            <button
              onClick={() => setProjector(o => !o)}
              title="To'liq ekran [P]"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(0, 229, 255, 0.22)',
                color: '#bae6fd',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ⛶
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px 3px 4px',
              borderRadius: 20,
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                position: 'relative',
              }}>
                👨‍🎓
                <span style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '1.5px solid #041024',
                }} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#e2f1ff' }}>{user ? user.name : 'Student'}</span>
            </div>
            {onExit && <button onClick={onExit} style={{ border: 0, borderRadius: 16, padding: '5px 12px', background: '#00d4ff', color: '#04223a', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>← Panel</button>}
          </div>
        </header>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          2. CHAP SIDEBAR MENYUSI (image_e16263.jpg va image_e15f63.jpg bilan bir xil!)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!projector && (!activeModel.isChemistryLab || vrMenuOpen) && (
        <aside style={{
          position: 'fixed',
          top: 66,
          left: 16,
          width: 238,
          zIndex: 150,
          background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.92) 0%, rgba(3, 10, 24, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.28)',
          borderRadius: 12,
          padding: '10px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {/* Bosh sahifa */}
          <button
            onClick={() => { setExplodeOpen(false); setXrayMode(false); setSimMode(false); doDeselect(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 11px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#dbeafe',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span>🏠</span> Bosh sahifa
            </span>
            <span style={{ opacity: 0.5 }}>›</span>
          </button>

          {/* AI USTOZ [Beta] — Yorqin Binafsha Neon Tugma (Rasmda ko'rsatilganidek!) */}
          <button
            onClick={handleMicToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 11px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.36), rgba(168, 85, 247, 0.22))',
              border: '1.5px solid #a855f7',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 18px rgba(168, 85, 247, 0.35)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: '#e9d5ff' }}>✨</span> AI USTOZ
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#090d16',
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 7px',
              borderRadius: 6,
            }}>
              Beta
            </span>
          </button>

          {/* 3D LABORATORIYA — Yorqin Moviy Neon Tugma */}
          <button
            onClick={() => setLeftFanlarOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 11px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.22), rgba(2, 132, 199, 0.12))',
              border: '1.5px solid #00e5ff',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(0, 229, 255, 0.25)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ color: '#00e5ff' }}>🧊</span> 3D LABORATORIYA
            </span>
            <span style={{ color: '#00e5ff' }}>›</span>
          </button>

          {/* 3D KIMYO VA 3D FIZIKA LABORATORIYALARI — Tezkor Tugmalar */}
          <button
            onClick={() => handleModelSwitch('chemistry_reaction_lab')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 11px',
              borderRadius: 8,
              background: activeModel.id === 'chemistry_reaction_lab'
                ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.36), rgba(0, 229, 255, 0.24))'
                : 'rgba(16, 185, 129, 0.12)',
              border: `1.5px solid ${activeModel.id === 'chemistry_reaction_lab' ? '#10b981' : 'rgba(16, 185, 129, 0.45)'}`,
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activeModel.id === 'chemistry_reaction_lab' ? '0 0 18px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span>🧪</span> 3D Kimyo Lab
            </span>
            <span style={{
              background: '#10b981',
              color: '#021324',
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 6px',
              borderRadius: 6,
            }}>
              33 Modda
            </span>
          </button>

          <button
            onClick={() => handleModelSwitch('physics_virtual_lab')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 11px',
              borderRadius: 8,
              background: activeModel.id === 'physics_virtual_lab'
                ? 'linear-gradient(90deg, rgba(124, 58, 237, 0.36), rgba(56, 189, 248, 0.24))'
                : 'rgba(124, 58, 237, 0.12)',
              border: `1.5px solid ${activeModel.id === 'physics_virtual_lab' ? '#a855f7' : 'rgba(168, 85, 247, 0.45)'}`,
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: activeModel.id === 'physics_virtual_lab' ? '0 0 18px rgba(168, 85, 247, 0.35)' : 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span>⚡</span> 3D Fizika Lab
            </span>
            <span style={{
              background: '#a855f7',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 6px',
              borderRadius: 6,
            }}>
              4 Stend
            </span>
          </button>

          {/* Fanlar (Modellar ro'yxati) */}
          <button
            onClick={() => setLeftFanlarOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 11px',
              borderRadius: 8,
              background: leftFanlarOpen ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0, 229, 255, 0.18)',
              color: '#dbeafe',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span>🎓</span> Fanlar ({MODELS.length} model)
            </span>
            <span style={{ opacity: 0.6 }}>{leftFanlarOpen ? '▾' : '›'}</span>
          </button>

          {leftFanlarOpen && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 190,
              overflowY: 'auto',
              padding: '4px',
              background: 'rgba(2, 8, 20, 0.75)',
              borderRadius: 8,
              border: '1px solid rgba(0, 229, 255, 0.16)',
            }}>
              {CATEGORIES.map(cat => (
                <div key={cat.id} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800, padding: '2px 6px' }}>
                    {cat.icon} {cat.label}
                  </div>
                  {MODELS.filter(m => m.category === cat.id).map(m => {
                    const isAct = m.id === activeModel.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleModelSwitch(m.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '5px 8px',
                          borderRadius: 6,
                          background: isAct ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                          border: isAct ? '1px solid #00e5ff' : '1px solid transparent',
                          color: isAct ? '#ffffff' : 'rgba(203, 226, 255, 0.75)',
                          fontSize: 11,
                          fontWeight: isAct ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{m.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Sozlamalar / CAD Edges */}
          <button
            onClick={() => setShowCadEdges(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 11px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#dbeafe',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span>⚙️</span> CAD Qirralar: {showCadEdges ? 'Yoqiq' : "O'chiq"}
            </span>
            <span style={{ opacity: 0.5 }}>›</span>
          </button>
        </aside>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          3. YUQORI-CHAP MODEL PASPORTI BELGISI (image_e1635f.jpg & image_e16263.jpg!)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!projector && !activeModel.isChemistryLab && (
        <div style={{
          position: 'fixed',
          top: 68,
          left: 268,
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 58,
            height: 46,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(6, 22, 48, 0.9), rgba(2, 10, 24, 0.95))',
            border: '1px solid rgba(0, 229, 255, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.2)',
          }}>
            {activeModel.icon}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
              {activeModel.label}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(186, 230, 253, 0.78)', marginBottom: 4 }}>
              {activeModel.labelEn}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(activeModel.badges || [activeModel.category]).map((b, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: i === 0 ? 'rgba(2, 132, 199, 0.35)' : 'rgba(124, 58, 237, 0.32)',
                    border: `1px solid ${i === 0 ? '#00e5ff' : '#a855f7'}`,
                    color: i === 0 ? '#7dd3fc' : '#e9d5ff',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Sahna yoki Virtual Lab 3D (Kimyo & Fizika Laboratoriyalari) */}
      {!activeModel.isChemistryLab ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <ModelScene
            modelCfg={activeModel}
            rotation={rotation}
            scale={scale}
            panMode={panMode}
            highlightPart={highlightPart}
            onPartHover={handlePartHover}
            onPartClick={handlePartClick}
            explodeOpen={explodeOpen}
            explodeFactor={explodeFactor}
            xrayMode={xrayMode}
            xrayOpacity={effectiveXrayOpacity}
            showCadEdges={showCadEdges}
            simMode={simMode}
            simSpeed={simTelemetry.speed}
            simSteer={simTelemetry.steer}
            simPitch={simTelemetry.pitch}
            firstAidMode={firstAidMode}
            selectedMeshKey={selectedPart?.key || null}
            pinchPoint={pinchPoint}
            showLabels={showLabels}
            partLabelOf={labelForKey}
            captureRef={captureRef}
          />
        </div>
      ) : (
        <ChemLabFlow
          key={activeModel.id}
          hand={hand}
          brain={teacher}
          user={user}
          task={task}
          onExit={onExit}
          onSelectLabMode={(mode) => {
            handleModelSwitch(mode === 'physics' ? 'physics_virtual_lab' : 'chemistry_reaction_lab');
          }}
        />
      )}

      {activeModel.isChemistryLab && !projector && user && !vrMenuOpen && (
        <div className="nal-chip">
          <span>{user.name}<br /><small>{user.group || user.subject || ''}</small></span>
          {onExit && <button onClick={onExit}>← Panel</button>}
        </div>
      )}

      {activeModel.isChemistryLab && !projector && (
        <div className="cl-subjects-wrap">
          <SubjectsBar activeModelId={activeModel.id} onOpenModel={handleModelSwitch}
            onSoon={(sb) => teacher.say(`${sb.label} bo'limi hali tayyorlanmoqda. Tez orada qo'shiladi!`)} />
        </div>
      )}

      {/* Golografik Qo'l Kursori */}
      {!projector && !activeModel.isChemistryLab && (
        <HandOverlay
          landmarks={hand.landmarks}
          gesture={hand.gesture}
          pinchHoldMs={pinchHoldMs}
          hand1PinchMid={hand.h1PinchMid}
          fistArmed={hand.fistArmed}
          xrayHoldMs={hand.xrayHoldMs}
        />
      )}

      {/* Chap menyu ostida Tanlangan Komponent + AI Ustoz Sharhi */}
      <PartDetailView
        partName={selectedPart ? partDetail.name : null}
        partInfo={partDetail.info}
        onClose={doDeselect}
        onAskAI={handleMicToggle}
        meshRawData={selectedMeshRawData}
        aiInfo={selectedPart && aiPartInfo?.key === selectedPart.key ? aiPartInfo : null}
        onRetryAI={() => {
          if (!selectedPart) return;
          delete aiPartCacheRef.current[`${activeModel.id}:${selectedPart.key}`];
          requestPartAI(selectedPart.key, selectedPart.label, activeModel);
        }}
        hidden={projector}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          4. O'NG SIDEBAR: 1) Hand Tracking Kamera (O'z joyida!)
                           2) Model Information / Specifications
                           3) Components (6 ta Asosiy Komponent!)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!projector && (
        <>
          <CameraFeed
            videoRef={videoRef}
            landmarks={hand.landmarks}
            gesture={hand.gesture}
            pinchNorm={hand.h1PinchNorm}
            isTracking={hand.isTracking}
            handsCount={hand.handsCount}
            fps={hand.fps}
            syncQuality={hand.syncQuality}
            fistArmed={hand.fistArmed}
            xrayHoldMs={hand.xrayHoldMs}
            error={hand.error}
            status={hand.status}
            tooFar={hand.tooFar}
            camOn={camOn}
            onToggleCamera={() => setCamOn(o => !o)}
            headYaw={hand.headYaw}
            headAngleDeg={hand.headAngleDeg}
            headCenter={hand.headCenter}
            headLeftCheek={hand.headLeftCheek}
            headRightCheek={hand.headRightCheek}
            headTracking={hand.headTracking}
            onRecenterHead={hand.recenterHead}
          />

          {/* Specifications Card */}
          {!activeModel.isChemistryLab && (
          <div style={{
            position: 'fixed',
            top: 260,
            right: 16,
            width: 256,
            zIndex: 130,
            background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.92) 0%, rgba(3, 10, 24, 0.95) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            borderRadius: 10,
            padding: '10px 12px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid rgba(0, 229, 255, 0.16)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#00e5ff',
                  color: '#021324',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                }}>i</span>
                Specifications
              </span>
              <span style={{ color: 'rgba(186, 230, 253, 0.5)', fontSize: 12 }}>›</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {(activeModel.specs || []).slice(0, 5).map((sp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(186, 230, 253, 0.72)' }}>• {sp.label}:</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>{sp.val}</span>
                </div>
              ))}
            </div>
          </div>

          )}

          {/* Components Card (6 ta Asosiy Qismlar — rasmda ko'rsatilganidek!) */}
          {!activeModel.isChemistryLab && (
          <div style={{
            position: 'fixed',
            top: 422,
            right: 16,
            width: 256,
            maxHeight: 'calc(100vh - 555px)',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            zIndex: 130,
            background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.92) 0%, rgba(3, 10, 24, 0.95) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            borderRadius: 10,
            padding: '10px 12px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid rgba(0, 229, 255, 0.16)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
                <span>🧊</span> Components ({mainComponents.length})
              </span>
              <span style={{ color: 'rgba(186, 230, 253, 0.5)', fontSize: 12 }}>▾</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {mainComponents.map((comp) => {
                const isSel = selectedPart?.key === comp.key;
                return (
                  <button
                    key={comp.key}
                    onClick={() => handlePartClick(comp.key, comp.label, null)}
                    onMouseEnter={() => setHighlightPart(comp.key)}
                    onMouseLeave={() => setHighlightPart(selectedPart?.key || null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '6px 9px',
                      borderRadius: 7,
                      background: isSel ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSel ? '#00e5ff' : 'rgba(0, 229, 255, 0.14)'}`,
                      color: isSel ? '#ffffff' : 'rgba(214, 232, 255, 0.85)',
                      fontSize: 11.5,
                      fontWeight: isSel ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isSel ? '0 0 14px rgba(0, 229, 255, 0.3)' : 'none',
                    }}
                  >
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid rgba(0, 229, 255, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      flexShrink: 0,
                    }}>
                      {comp.icon}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comp.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          5. PASTKI MARKAZIY BOSHQARUV DOKI (Rotate | Move | Explode | X-Ray | Transparency | Reset)
         ═══════════════════════════════════════════════════════════════════════ */}
      {!projector && !activeModel.isChemistryLab && (
        <div style={{
          position: 'fixed',
          bottom: 112,
          left: 'calc(50% - 60px)',
          transform: 'translateX(-50%)',
          zIndex: 160,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(90deg, rgba(4, 14, 30, 0.92), rgba(8, 24, 52, 0.94), rgba(4, 14, 30, 0.92))',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          borderRadius: 24,
          padding: '6px 12px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(0, 229, 255, 0.15)',
        }}>
          <button
            onClick={() => setPanMode(false)}
            style={{
              background: !panMode ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              border: `1px solid ${!panMode ? '#00e5ff' : 'rgba(0, 229, 255, 0.22)'}`,
              borderRadius: 18,
              padding: '6px 13px',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: '#00e5ff' }}>🔄</span> Rotate
          </button>

          <button
            onClick={() => setPanMode(o => !o)}
            style={{
              background: panMode ? 'rgba(0, 229, 255, 0.22)' : 'transparent',
              border: `1px solid ${panMode ? '#00e5ff' : 'rgba(0, 229, 255, 0.22)'}`,
              borderRadius: 18,
              padding: '6px 13px',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: '#38bdf8' }}>✥</span> Move
          </button>

          <button
            onClick={() => setExplodeOpen(o => !o)}
            style={{
              background: explodeOpen ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.32), rgba(2, 132, 199, 0.25))' : 'transparent',
              border: `1.5px solid ${explodeOpen ? '#00e5ff' : 'rgba(0, 229, 255, 0.25)'}`,
              borderRadius: 18,
              padding: '6px 14px',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: explodeOpen ? '0 0 16px rgba(0, 229, 255, 0.4)' : 'none',
            }}
          >
            <span style={{ color: '#00e5ff' }}>📦</span> Explode
          </button>

          <button
            onClick={() => setXrayMode(o => !o)}
            style={{
              background: xrayMode ? 'linear-gradient(135deg, #0284c7, #00e5ff)' : 'transparent',
              border: `1.5px solid ${xrayMode ? '#00e5ff' : 'rgba(0, 229, 255, 0.25)'}`,
              borderRadius: 18,
              padding: '6px 14px',
              color: xrayMode ? '#021324' : '#ffffff',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: xrayMode ? '0 0 20px rgba(0, 229, 255, 0.55)' : 'none',
            }}
          >
            <span>☢️</span> X-Ray
          </button>

          {/* Transparency Slider (rasmda ko'rsatilganidek!) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 18,
            background: 'rgba(2, 10, 24, 0.75)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
          }}>
            <span style={{ fontSize: 12, color: '#00e5ff' }}>👁️</span>
            <span style={{ fontSize: 11, color: '#dbeafe', fontWeight: 600 }}>Transparency</span>
            <input
              type="range"
              min="15"
              max="88"
              step="5"
              value={transparencyPct}
              onChange={e => {
                setTransparencyPct(Number(e.target.value));
                if (!xrayMode) setXrayMode(true);
              }}
              style={{ width: 74, accentColor: '#00e5ff', cursor: 'pointer', height: 4 }}
            />
            <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#00e5ff', fontWeight: 800, minWidth: 30 }}>
              {xrayMode ? `${transparencyPct}%` : '0%'}
            </span>
          </div>

          <button
            onClick={() => {
              setRotation({ x: 0, y: 0 });
              setScale(1.0);
              setExplodeOpen(false);
              setXrayMode(false);
              setSimMode(false);
              doDeselect();
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: 18,
              padding: '6px 13px',
              color: '#ffffff',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: '#00e5ff' }}>↺</span> Reset
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          6. PASTKI "EXPLODED VIEW" 6 TA ASOSIY KOMPONENT VA MODELLAR PANELI
         ═══════════════════════════════════════════════════════════════════════ */}
      {!projector && !activeModel.isChemistryLab && (
        <div style={{
          position: 'fixed',
          bottom: 12,
          left: 16,
          right: 316,
          height: 92,
          zIndex: 145,
          background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.9) 0%, rgba(3, 10, 24, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 12,
          padding: '7px 12px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📦</span> Exploded View · Asosiy Komponentlar ›
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(186, 230, 253, 0.65)' }}>
                ☝️ Koʻrsatkich+Musht = 360° Aylantirish · 👌/🖖 OK/3-barmoq = Tanlash · ✊→🖐 = Ajratish · ✌️ = X-Ray
              </span>
            </div>

            {/* Tezkor model almashtirish tugmalari */}
            <div style={{ display: 'flex', gap: 5 }}>
              {MODELS.map(m => {
                const act = m.id === activeModel.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleModelSwitch(m.id)}
                    title={m.label}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: act ? 'rgba(0, 229, 255, 0.22)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${act ? '#00e5ff' : 'rgba(0, 229, 255, 0.16)'}`,
                      color: act ? '#00e5ff' : 'rgba(203, 226, 255, 0.7)',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 ta Asosiy Komponent Kartochkalari (rasmdagidek!) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(1, mainComponents.length)}, 1fr)`,
            gap: 8,
            height: 54,
          }}>
            {mainComponents.map((comp) => {
              const isSel = selectedPart?.key === comp.key;
              return (
                <button
                  key={comp.key}
                  onClick={() => {
                    if (!explodeOpen) setExplodeOpen(true);
                    handlePartClick(comp.key, comp.label, null);
                  }}
                  style={{
                    background: isSel
                      ? 'radial-gradient(circle, rgba(0, 229, 255, 0.25), rgba(4, 16, 36, 0.95))'
                      : 'rgba(4, 14, 30, 0.85)',
                    border: `1.5px solid ${isSel ? '#00e5ff' : 'rgba(0, 229, 255, 0.22)'}`,
                    borderRadius: 8,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    boxShadow: isSel ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  <span style={{
                    width: 34,
                    height: 34,
                    borderRadius: 7,
                    background: 'rgba(0, 229, 255, 0.08)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    {comp.icon}
                  </span>
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isSel ? '#00e5ff' : '#e2f1ff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {comp.shortLabel}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(148, 184, 224, 0.65)', fontFamily: 'monospace' }}>
                      Asosiy uzel
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* O'ng-Pastki: gapiradigan 3D AI O'qituvchi (eski «AI USTOZ» o'rnida) */}
      {!projector && (
        <AiTeacher brain={teacher} model={activeModel} selectedPart={selectedPart} explodeOpen={explodeOpen} xrayMode={xrayMode} simMode={simMode} />
      )}
      {/* eski «AI USTOZ» paneli o'rniga endi 3D AI O'qituvchi turadi */}
      {false && (
        <VoiceAssistant
          isListening={voice.isListening}
          isTranscribing={voice.isTranscribing}
          isWaitingConfirm={voice.isWaitingConfirm}
          isLoading={voice.isLoading}
          isSpeaking={voice.isSpeaking}
          pendingTranscript={voice.pendingTranscript}
          transcript={voice.transcript}
          answer={voice.answer}
          history={voice.history}
          error={voice.error}
          onMicToggle={handleMicToggle}
          onStopSpeaking={voice.stopSpeaking}
          onConfirm={voice.confirmAndSend}
          onDiscard={voice.discardTranscript}
          providerId={voice.providerId}
          onProviderChange={voice.setProvider}
          onSendText={(txt) => voice.sendText(txt, buildVoiceCtx())}
          onTeach={(a) => voice.teach(a, buildVoiceCtx())}
          selectedPartName={selectedPart ? partDetail.name || selectedPart.label : null}
          activeModelLabel={activeModel.label}
        />
      )}

      {/* Quiz Modali */}
      {showQuizSelect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(2, 7, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowQuizSelect(false)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(7, 19, 42, 0.98) 0%, rgba(3, 10, 24, 0.98) 100%)',
              border: '1.5px solid #00e5ff',
              borderRadius: 12,
              padding: '28px 26px',
              width: 410,
              maxWidth: '92vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
              <h2 style={{ color: '#f0f9ff', fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>
                Challenges · Sinov Turi
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                onClick={() => { setShowQuizSelect(false); onOpenQuiz('open'); }}
                style={{
                  padding: '18px 12px',
                  borderRadius: 10,
                  border: '1px solid #00e5ff',
                  background: 'rgba(0, 229, 255, 0.1)',
                  color: '#f0f9ff',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#00e5ff', marginBottom: 6 }}>Ochiq Test</div>
                <div style={{ fontSize: 11, color: 'rgba(203, 226, 255, 0.65)' }}>10 ta variantli savol</div>
              </button>
              <button
                onClick={() => { setShowQuizSelect(false); onOpenQuiz('closed'); }}
                style={{
                  padding: '18px 12px',
                  borderRadius: 10,
                  border: '1px solid #a855f7',
                  background: 'rgba(168, 85, 247, 0.1)',
                  color: '#f0f9ff',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 8 }}>🎙️</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e9d5ff', marginBottom: 6 }}>AI Og'zaki Imtihon</div>
                <div style={{ fontSize: 11, color: 'rgba(203, 226, 255, 0.65)' }}>5 ta savol · AI baholaydi</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}