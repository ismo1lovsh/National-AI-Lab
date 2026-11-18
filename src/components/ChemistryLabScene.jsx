import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SUB_MAP, evaluateMix } from '../config/virtualLabChemEngine';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WEBAUDIO OVOZ SINTEZATORI
// ═══════════════════════════════════════════════════════════════════════════════
const Sound = (() => {
  let ac = null, master = null, on = true, burner = null, pourSrc = null;
  const ensure = () => {
    try {
      if (!ac) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        ac = new AudioCtx();
        master = ac.createGain();
        master.gain.value = 0.7;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    } catch { return null; }
  };
  const noiseBuf = (sec = 2, brown = false) => {
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return b;
  };
  const env = (g, t, a, peak, dec) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  };
  const tone = (f, dur, type = 'sine', vol = 0.2, when = 0, slide = 0) => {
    if (!on || !ensure()) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
    env(g, t, 0.004, vol, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const noise = (dur, type, freq, q, vol, attack = 0.01, brown = false) => {
    if (!on || !ensure()) return null;
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf(Math.max(dur + 0.1, 0.3), brown);
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    env(g, t, attack, vol, dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.1);
    return f;
  };
  return {
    unlock: ensure,
    clink() { [2630, 4120, 5410].forEach((f, i) => tone(f * rand(0.97, 1.03), 0.32 - i * 0.08, 'sine', 0.07 / (i + 1))); },
    tap() { tone(840, 0.07, 'triangle', 0.08); noise(0.04, 'highpass', 3000, 0.7, 0.05); },
    drip() { tone(920, 0.08, 'sine', 0.14, 0, 1.9); },
    bubble() { tone(rand(380, 900), rand(0.03, 0.07), 'sine', 0.05, 0, rand(1.4, 2.2)); },
    fizz(dur = 2.2, vol = 0.12) { noise(dur, 'highpass', 4200, 0.5, vol, 0.08); },
    chime() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.85, 'sine', 0.09, i * 0.09)); },
    buzz() { tone(190, 0.35, 'sawtooth', 0.18); },
    click() { tone(1500, 0.03, 'square', 0.04); },
    drain() { noise(1.2, 'bandpass', 500, 1.2, 0.18, 0.1, true); },
    pour(start) {
      try {
        if (!start) {
          if (pourSrc && ac) {
            pourSrc.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.08);
            pourSrc.s.stop(ac.currentTime + 0.3);
            pourSrc = null;
          }
          return;
        }
        if (!on || pourSrc || !ensure()) return;
        const s = ac.createBufferSource();
        s.buffer = noiseBuf(3);
        s.loop = true;
        const f = ac.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 920;
        f.Q.value = 1.4;
        const g = ac.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.2, ac.currentTime, 0.05);
        s.connect(f).connect(g).connect(master);
        s.start();
        pourSrc = { s, g };
      } catch {}
    },
    burner(start) {
      try {
        if (!start) {
          if (burner && ac) {
            burner.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.2);
            burner.s.stop(ac.currentTime + 0.6);
            burner = null;
          }
          return;
        }
        if (!on || burner || !ensure()) return;
        const s = ac.createBufferSource();
        s.buffer = noiseBuf(3, true);
        s.loop = true;
        const f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 420;
        const g = ac.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.22, ac.currentTime, 0.25);
        s.connect(f).connect(g).connect(master);
        s.start();
        burner = { s, g };
      } catch {}
    },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// 2. JAVON VA STOL REAKTIVLARI
// ═══════════════════════════════════════════════════════════════════════════════
const SHELF_BOTTLES_TOP = [
  { id: 'CuO',     formula: 'CuO',      sub: '',     color: '#1e293b', isSolid: true },
  { id: 'NaCl',    formula: 'NaCl',     sub: '',     color: '#f8fafc', isSolid: true },
  { id: 'CrO3',    formula: 'CrO₃',     sub: '',     color: '#b91c1c', isSolid: true },
  { id: 'FeCl3',   formula: 'CrCl₃',    sub: '0.1M', color: '#14532d', isSolid: false },
  { id: 'CuSO4',   formula: 'CuSO₄',    sub: '0.1M', color: '#0369a1', isSolid: false },
];

const SHELF_BOTTLES_BOTTOM = [
  { id: 'HCl',     formula: 'HCl',      sub: '1M',   color: '#e2e8f0', isSolid: false },
  { id: 'H2SO4',   formula: 'H₂SO₄',    sub: '2M',   color: '#e2e8f0', isSolid: false },
  { id: 'NaOH',    formula: 'NaOH',     sub: '1M',   color: '#e2e8f0', isSolid: false },
  { id: 'BaCl2',   formula: 'BaCl₂',    sub: '0.1M', color: '#e2e8f0', isSolid: false },
  { id: 'CaCl2',   formula: 'CaCl₂',    sub: '0.1M', color: '#e2e8f0', isSolid: false },
  { id: 'PbNO32',  formula: 'Pb(NO₃)₂', sub: '0.1M', color: '#e2e8f0', isSolid: false },
  { id: 'CuSO4',   formula: 'CuSO₄',    sub: '0.1M', color: '#0369a1', isSolid: false },
];

const TABLE_BOTTLES = [
  { id: 'H2O',    formula: 'H₂O',    sub: '',      color: '#e2e8f0', pos: [-0.28, 0.903, -0.02], scale: 1.15 },
  { id: 'KMnO4',  formula: 'KMnO₄',  sub: '0.05M', color: '#581c87', pos: [-0.11, 0.903, -0.02], scale: 1.0 },
  { id: 'KI',     formula: 'Na₂S',   sub: '1M',    color: '#e2e8f0', pos: [0.06,  0.903, -0.02], scale: 1.0 },
  { id: 'NaHCO3', formula: 'P₂O₅',   sub: '',      color: '#ffffff', pos: [0.35,  0.903, -0.02], scale: 1.0, isSolid: true },
];

const TABLE_INDICATORS = [
  { id: 'metiloranj',   label: 'Метиловый оранжевый', uzLabel: 'Metiloranj',   bodyCol: '#eab308', tipCol: '#16a34a', pos: [-0.18, 0.903, -0.14], flagOffset: [0.08, 0.14, 0] },
  { id: 'lakmus',       label: 'Лакмус',              uzLabel: 'Lakmus',       bodyCol: '#7e22ce', tipCol: '#16a34a', pos: [0.02,  0.903, -0.12], flagOffset: [0.10, 0.11, 0] },
  { id: 'fenolftalein', label: 'Фенолфталеин',        uzLabel: 'Fenolftalein', bodyCol: '#f8fafc', tipCol: '#16a34a', pos: [0.14,  0.903, -0.15], flagOffset: [0.12, 0.14, 0] },
];

const SCENE_PRESETS = [
  { id: 'solutions', label: '1. Eritmalar bilan ishlash', camPos: [0, 1.46, 0.56], lookAt: [0, 0.94, 0.02] },
  { id: 'overview',  label: '2. Umumiy koʻrinish va Tarozi', camPos: [-0.08, 1.38, 0.68], lookAt: [0.05, 1.02, -0.12] },
  { id: 'ph_meter',  label: '3. pH-metr va Pipetka',      camPos: [0.32, 1.42, 0.54], lookAt: [0.32, 0.94, 0.04] },
  { id: 'heater',    label: '4. Qizdirish qurilmasi',     camPos: [-0.36, 1.42, 0.54], lookAt: [-0.36, 0.95, 0.04] },
  { id: 'verify',    label: '5. Eritma 1–4 tekshiruvi',   camPos: [0, 1.44, 0.62], lookAt: [0, 0.92, 0.12] },
  { id: 'board',     label: '📋 Oʻzbekcha Doska',         camPos: [-0.62, 1.44, 0.72], lookAt: [-1.05, 1.24, -0.18] },
];

const BOARD_PAGES = [
  { id: 0, short: '1. Jonli Reaksiya', title: 'JONLI TAJRIBA VA REAKSIYA TENGLAMASI' },
  { id: 1, short: '2. Topshiriqlar',   title: 'LABORATORIYA AMALIY ISH TOPSHIRIQLARI' },
  { id: 2, short: '3. Sifat Jadvali',  title: 'SIFAT REAKSIYALARI VA CHOʻKMALAR RANGI' },
  { id: 3, short: '4. Qoidalar',       title: 'XAVFSIZLIK VA QOʻL/BOSH BOSHQARUVI' },
];

export function VirtualLab3DScene({ hand, onLabEvent, selectedIds = null, apiRef = null }) {
  const mountRef = useRef(null);
  const handRef = useRef(hand);
  useEffect(() => { handRef.current = hand; }, [hand]);
  // AI O'qituvchiga hodisalarni uzatish (olish, quyish, reaksiya, tozalash)
  const labEvRef = useRef(onLabEvent);
  useEffect(() => { labEvRef.current = onLabEvent; }, [onLabEvent]);
  const emitLab = (e) => { try { labEvRef.current && labEvRef.current(e); } catch (err) { console.warn('[Lab] hodisa:', err); } };
  const firedRxRef = useRef(new Set());

  const [activePreset, setActivePreset] = useState('solutions');
  // Bosh rejimi: 'auto' = qoʻl yoʻq paytda ishlaydi (qoʻl chiqsa kamera qotadi, Shift bosilsa ishlaydi),
  //              'key'  = faqat Shift bosib turilganda ishlaydi, 'off' = oʻchiq
  const [headMode, setHeadMode] = useState('auto');
  const [headGate, setHeadGate] = useState('idle'); // 'live' | 'frozen' | 'idle'
  const [headSensitivity, setHeadSensitivity] = useState(1.0);
  const [boardPage, setBoardPage] = useState(0);
  const headSensitivityRef = useRef(1.0);
  useEffect(() => { headSensitivityRef.current = headSensitivity; }, [headSensitivity]);
  const headModeRef = useRef('auto');
  const shiftHeldRef = useRef(false);
  const headGateRef = useRef('idle');
  // Boshning kameraga qoʻshgan hissasi (radian). Gate yopiq paytda MUZLAYDI (sakrash boʻlmaydi).
  const headAppliedRef = useRef({ yaw: 0, pitch: 0 });

  const presetRef = useRef(SCENE_PRESETS[0]);
  const lookOffsetRef = useRef({ yaw: 0, pitch: 0, manualYaw: 0 });
  const boardControlRef = useRef({
    page: 0,
    targetX: -1.08,
    targetZ: -0.18,
    rotY: 0.52,
    drawBoard: null,
    resetFlask: null,
  });

  useEffect(() => {
    headModeRef.current = headMode;
  }, [headMode]);

  useEffect(() => {
    boardControlRef.current.page = boardPage;
    boardControlRef.current.drawBoard?.();
  }, [boardPage]);

  const handlePresetChange = (id) => {
    const found = SCENE_PRESETS.find(p => p.id === id) || SCENE_PRESETS[0];
    presetRef.current = found;
    lookOffsetRef.current = { yaw: 0, pitch: 0, manualYaw: 0 };
    headAppliedRef.current = { yaw: 0, pitch: 0 };
    setActivePreset(id);
  };

  const panRoomManual = (deltaYaw) => {
    lookOffsetRef.current.manualYaw = clamp(lookOffsetRef.current.manualYaw + deltaYaw, -1.35, 1.35);
  };

  const moveBoardDelta = (dx, dz = 0) => {
    boardControlRef.current.targetX = clamp(boardControlRef.current.targetX + dx, -1.45, 0.85);
    boardControlRef.current.targetZ = clamp(boardControlRef.current.targetZ + dz, -0.45, 0.22);
    Sound.click();
  };

  const bringBoardToCenter = () => {
    boardControlRef.current.targetX = -0.52;
    boardControlRef.current.targetZ = 0.04;
    boardControlRef.current.rotY = 0.32;
    Sound.chime();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W0 = container.clientWidth || window.innerWidth;
    const H0 = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W0, H0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e2e7ec');

    const camera = new THREE.PerspectiveCamera(52, W0 / H0, 0.04, 28);
    const camPosTarget = new THREE.Vector3(...SCENE_PRESETS[0].camPos);
    const camLookTarget = new THREE.Vector3(...SCENE_PRESETS[0].lookAt);
    const camLookCurrent = camLookTarget.clone();
    camera.position.copy(camPosTarget);
    camera.lookAt(camLookCurrent);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Yorug' kunduzgi 360° laboratoriya yoritilishi
    scene.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.28));
    const sun = new THREE.DirectionalLight('#fffef8', 2.0);
    sun.position.set(1.4, 2.8, -1.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.2, bottom: -1.6, near: 0.4, far: 9 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const frontFill = new THREE.DirectionalLight('#f0f7ff', 0.9);
    frontFill.position.set(-1.2, 2.3, 1.8);
    scene.add(frontFill);

    function canvasTex(w, h, draw, repeat) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      if (repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(...repeat);
      }
      return t;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. TO'LIQ 360° PANORAMALI XONA (Bosh O'ngga-Chapga Burilganda Ko'rinadigan!)
    // ═══════════════════════════════════════════════════════════════════════════
    const roomG = new THREE.Group();
    scene.add(roomG);

    const hexFloorTex = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#e7ebef';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3b4249';
      g.lineWidth = 5;
      const R = 86;
      const dx = R * 1.5;
      const dy = R * Math.sqrt(3);
      for (let row = -1; row < 10; row++) {
        for (let col = -1; col < 10; col++) {
          const cx = col * dx;
          const cy = row * dy + (col % 2 ? dy / 2 : 0);
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k * Math.PI) / 3;
            const px = cx + R * Math.cos(ang);
            const py = cy + R * Math.sin(ang);
            if (k === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.closePath();
          g.stroke();
        }
      }
    }, [8, 7]);

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 8.0),
      new THREE.MeshStandardMaterial({ map: hexFloorTex, roughness: 0.32 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    roomG.add(floorMesh);

    // Shift (Ceiling) va LED panellar
    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 8.0),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.7 })
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = 2.85;
    roomG.add(ceilingMesh);

    [-1.4, 0, 1.4].forEach(lx => {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.02, 0.32),
        new THREE.MeshBasicMaterial({ color: '#ffffff' })
      );
      led.position.set(lx, 2.83, -0.1);
      roomG.add(led);
    });

    // Orqa devor (Derazalar + O'zbek tilidagi yozuvlar + Elektr shiti)
    const backWallTex = canvasTex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#e2e6ea';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#cbd2d9';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

      g.fillStyle = '#2574c9';
      g.fillRect(0, h - 42, w, 24);

      // Yuqori shior (O'zbek tilida)
      g.fillStyle = '#1e3a8a';
      g.beginPath();
      g.roundRect(420, 42, 1120, 68, 16);
      g.fill();
      g.fillStyle = '#ffffff';
      g.font = 'bold 34px Arial';
      g.textAlign = 'center';
      g.fillText('KIMYO VA FIZIKA VIRTUAL TAJRIBA LABORATORIYASI', 980, 88);
      g.textAlign = 'left';

      [240, 860].forEach(wx => {
        const wy = 165, ww = 410, wh = 510;
        g.fillStyle = '#9a4637';
        g.fillRect(wx, wy, ww, wh);
        g.fillStyle = '#2d3748';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            g.fillRect(wx + 36 + c * 120, wy + 52 + r * 145, 76, 94);
            g.strokeStyle = '#f8fafc';
            g.lineWidth = 4;
            g.strokeRect(wx + 36 + c * 120, wy + 52 + r * 145, 76, 94);
          }
        }
        g.strokeStyle = '#f1f5f9';
        g.lineWidth = 14;
        g.strokeRect(wx, wy, ww, wh);
      });

      g.fillStyle = '#1d63b8';
      g.fillRect(1560, 210, 280, 340);
      g.fillStyle = '#eab308';
      g.fillRect(1650, 250, 100, 110);
      g.fillStyle = '#111827';
      g.font = 'bold 64px Arial';
      g.fillText('⚡', 1666, 325);
      g.fillStyle = '#ffffff';
      g.font = 'bold 22px Arial';
      g.fillText('ELEKTR SHITI', 1620, 410);
      g.fillText('220V / 50Hz', 1635, 445);
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 2.9),
      new THREE.MeshStandardMaterial({ map: backWallTex, roughness: 0.5 })
    );
    backWall.position.set(0, 1.42, -1.35);
    backWall.receiveShadow = true;
    roomG.add(backWall);

    // CHAP DEVOR (Bosh chapga burilganda ko'rinadi: O'zbek tilidagi Mendeleyev jadvali + Xavfsizlik stendi)
    const leftWallTex = canvasTex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#dde3ea';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#cbd2d9';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#2574c9';
      g.fillRect(0, h - 42, w, 24);

      // Mendeleyev davriy jadvali (O'zbek tilida!)
      g.fillStyle = '#ffffff';
      g.fillRect(140, 110, 1120, 560);
      g.strokeStyle = '#1e78d6';
      g.lineWidth = 10;
      g.strokeRect(140, 110, 1120, 560);
      g.fillStyle = '#0f172a';
      g.font = 'bold 30px Arial';
      g.textAlign = 'center';
      g.fillText('KIMYOVIY ELEMENTLAR DAVRIY JADVALI (D. I. MENDELEYEV)', 700, 160);

      const elCols = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
      const sampleSyms = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Ag', 'Ba', 'Pb', 'Au'];
      let idx = 0;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 12; c++) {
          const bx = 175 + c * 88;
          const by = 188 + r * 64;
          g.fillStyle = elCols[(r + c) % elCols.length];
          g.fillRect(bx, by, 78, 52);
          g.fillStyle = '#ffffff';
          g.font = 'bold 22px Arial';
          g.fillText(sampleSyms[idx % sampleSyms.length], bx + 39, by + 34);
          idx++;
        }
      }

      // Xavfsizlik qoidalari plakati (O'zbek tilida)
      g.fillStyle = '#0f172a';
      g.fillRect(1340, 110, 560, 560);
      g.strokeStyle = '#eab308';
      g.lineWidth = 8;
      g.strokeRect(1340, 110, 560, 560);
      g.fillStyle = '#fde047';
      g.font = 'bold 28px Arial';
      g.fillText('XAVFSIZLIK QOIDALARI', 1620, 165);
      g.textAlign = 'left';
      g.fillStyle = '#f8fafc';
      g.font = '23px Arial';
      const rules = [
        '1. Maxsus xalat va qoʻlqopda ishlang.',
        '2. Kislotani suvga asta-sekin quying.',
        '3. Nomaʼlum moddalarni hidlamang.',
        '4. Qizdirishda kolbani oʻzingizga qaratmang.',
        '5. Tajribadan soʻng idishlarni yuving.',
        '6. Boshni chap/oʻngga burib xonani koʻring.',
      ];
      rules.forEach((rl, i) => g.fillText(rl, 1375, 235 + i * 68));
    });

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.9),
      new THREE.MeshStandardMaterial({ map: leftWallTex, roughness: 0.5 })
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-3.1, 1.42, 0.8);
    roomG.add(leftWall);

    // O'NG DEVOR (Bosh o'ngga burilganda ko'rinadi: Eruvchanlik jadvali va Birinchi Yordam stendi)
    const rightWallTex = canvasTex(2048, 1024, (g, w, h) => {
      g.fillStyle = '#dde3ea';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#cbd2d9';
      g.lineWidth = 2;
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#2574c9';
      g.fillRect(0, h - 42, w, 24);

      g.fillStyle = '#ffffff';
      g.fillRect(180, 110, 1080, 560);
      g.strokeStyle = '#0d9488';
      g.lineWidth = 10;
      g.strokeRect(180, 110, 1080, 560);
      g.fillStyle = '#0f172a';
      g.font = 'bold 30px Arial';
      g.textAlign = 'center';
      g.fillText('TUZVA ASOSLARNING SUVDA ERUVCHANLIK JADVALI', 720, 162);

      const anions = ['OH⁻', 'Cl⁻', 'SO₄²⁻', 'CO₃²⁻', 'PO₄³⁻', 'NO₃⁻', 'S²⁻', 'SO₃²⁻'];
      const cations = ['H⁺', 'Na⁺', 'K⁺', 'Ba²⁺', 'Ca²⁺', 'Cu²⁺', 'Fe³⁺', 'Ag⁺', 'Pb²⁺'];
      anions.forEach((an, r) => {
        cations.forEach((cat, c) => {
          const cx = 230 + c * 105;
          const cy = 195 + r * 55;
          const state = (c <= 2 || r === 5) ? 'E' : (r + c) % 3 === 0 ? 'Ch' : 'E';
          g.fillStyle = state === 'E' ? '#10b981' : '#f43f5e';
          g.fillRect(cx, cy, 92, 44);
          g.fillStyle = '#ffffff';
          g.font = 'bold 20px Arial';
          g.fillText(`${cat}${an}: ${state}`, cx + 46, cy + 29);
        });
      });

      // Birinchi yordam burchagi
      g.fillStyle = '#ffffff';
      g.fillRect(1360, 130, 520, 480);
      g.strokeStyle = '#ef4444';
      g.lineWidth = 10;
      g.strokeRect(1360, 130, 520, 480);
      g.fillStyle = '#ef4444';
      g.font = 'bold 90px Arial';
      g.fillText('➕', 1620, 260);
      g.font = 'bold 32px Arial';
      g.fillText('BIRINCHI YORDAM', 1620, 330);
      g.fillStyle = '#1e293b';
      g.font = '24px Arial';
      g.fillText('• Koʻz yuvish eritmasi (H₂O)', 1620, 400);
      g.fillText('• 2% NaHCO₃ (Kislota kuyishida)', 1620, 450);
      g.fillText('• 2% Borat kislota (Ishqor uchun)', 1620, 500);
    });

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.9),
      new THREE.MeshStandardMaterial({ map: rightWallTex, roughness: 0.5 })
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(3.1, 1.42, 0.8);
    roomG.add(rightWall);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. XONANING CHAP VA O'NG QANOT JIHOZLARI (Bosh Burilganda To'liq Ko'rinadi!)
    // ═══════════════════════════════════════════════════════════════════════════
    const tableMat = new THREE.MeshStandardMaterial({ color: '#b8bec5', roughness: 0.46, metalness: 0.05 });
    const shelfMat = new THREE.MeshStandardMaterial({ color: '#aeb4bc', roughness: 0.45, metalness: 0.08 });
    const blueBracketMat = new THREE.MeshStandardMaterial({ color: '#1e78d6', roughness: 0.3, metalness: 0.35 });
    const whitePlasticMat = new THREE.MeshStandardMaterial({ color: '#f4f6f9', roughness: 0.25, metalness: 0.05 });
    const darkRimMat = new THREE.MeshStandardMaterial({ color: '#272b30', roughness: 0.5 });

    // 2.1. Chap qanotda Sorbsion Mo'rili Kimyoviy Shkaf (Fume Hood / Mo'rili shkaf)
    const fumeHood = new THREE.Group();
    fumeHood.position.set(-2.15, 0, -0.55);
    fumeHood.rotation.y = 0.38;
    const fhBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.90, 0.68), whitePlasticMat);
    fhBase.position.y = 0.45;
    const fhUpper = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.64), new THREE.MeshStandardMaterial({ color: '#dbeafe', transparent: true, opacity: 0.38, roughness: 0.15 }));
    fhUpper.position.y = 1.48;
    const fhFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.68), blueBracketMat);
    fhFrameTop.position.y = 2.10;
    const fhBannerTex = canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#1e78d6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      g.font = 'bold 34px Arial';
      g.textAlign = 'center';
      g.fillText('MOʻRILI SHKAF (VENTILYATSIYA)', w / 2, 60);
    });
    const fhBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.14), new THREE.MeshBasicMaterial({ map: fhBannerTex }));
    fhBanner.position.set(0, 2.10, 0.345);
    fumeHood.add(fhBase, fhUpper, fhFrameTop, fhBanner);
    roomG.add(fumeHood);

    // 2.2. O'ng qanotda Reaktivlar Javoni, Mikroskop va Rakovina Stoli
    const rightStation = new THREE.Group();
    rightStation.position.set(1.58, 0, -0.18);
    rightStation.rotation.y = -0.42;
    const rsTable = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.88, 0.68), whitePlasticMat);
    rsTable.position.y = 0.44;
    const rsTop = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.04, 0.72), tableMat);
    rsTop.position.y = 0.90;
    // Rakovina (Sink) va kran
    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.32), darkRimMat);
    sinkBasin.position.set(-0.28, 0.915, 0);
    const faucetPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.26, 16), blueBracketMat);
    faucetPipe.position.set(-0.28, 1.04, -0.14);
    // Mikroskop
    const micBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.22), darkRimMat);
    micBase.position.set(0.24, 0.93, 0.02);
    const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.28, 16), whitePlasticMat);
    micArm.position.set(0.24, 1.08, -0.04);
    const micTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.16, 16), blueBracketMat);
    micTube.position.set(0.24, 1.20, 0.02);
    micTube.rotation.x = 0.45;
    const rsSignTex = canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#38bdf8';
      g.font = 'bold 30px Arial';
      g.textAlign = 'center';
      g.fillText('YUVISH VA MIKROSKOPIYA STENDI', w / 2, 58);
    });
    const rsSign = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.14), new THREE.MeshBasicMaterial({ map: rsSignTex }));
    rsSign.position.set(0, 1.42, -0.32);
    rightStation.add(rsTable, rsTop, sinkBasin, faucetPipe, micBase, micArm, micTube, rsSign);
    roomG.add(rightStation);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. O'ZBEK TILIDAGI HARAKATLANUVCHI INTERAKTIV 3D DOSKA (`doskaGroup`)
    //    (Qo'l yoki sichqoncha bilan ushlab suriladi + Reaksiyalarni jonli yozadi!)
    // ═══════════════════════════════════════════════════════════════════════════
    const doskaGroup = new THREE.Group();
    doskaGroup.position.set(boardControlRef.current.targetX, 0.903, boardControlRef.current.targetZ);
    doskaGroup.rotation.y = boardControlRef.current.rotY;
    scene.add(doskaGroup);

    // Doska g'ildirakli oyoqlari va ramkasi
    const boardLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92, 16), darkRimMat);
    boardLegL.position.set(-0.46, -0.44, 0);
    const boardLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.92, 16), darkRimMat);
    boardLegR.position.set(0.46, -0.44, 0);
    const boardCrossBar = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.025, 0.025), blueBracketMat);
    boardCrossBar.position.set(0, -0.72, 0);
    doskaGroup.add(boardLegL, boardLegR, boardCrossBar);

    // Doska korpusi (0.98m kenglik x 0.64m balandlik)
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.64, 0.028), blueBracketMat);
    boardFrame.position.set(0, 0.34, 0);
    boardFrame.castShadow = true;
    doskaGroup.add(boardFrame);

    // Yuqori ushlab surish tutqichi (`🖐 DOSKANI USHLAB SURISH`)
    const boardHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.048, 0.042),
      new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 })
    );
    boardHandle.position.set(0, 0.685, 0.01);
    doskaGroup.add(boardHandle);

    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 1024;
    boardCanvas.height = 680;
    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    boardTex.anisotropy = 8;

    const boardFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.93, 0.59),
      new THREE.MeshBasicMaterial({ map: boardTex })
    );
    boardFace.position.set(0, 0.34, 0.016);
    doskaGroup.add(boardFace);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. MARKAZIY LABORATORIYA STOLI VA KO'K TIRGAKLI JAVON
    // ═══════════════════════════════════════════════════════════════════════════
    const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.04, 0.92), tableMat);
    tableMesh.position.set(0, 0.883, 0.02);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    roomG.add(tableMesh);

    const flaskZoneTex = canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 8;
      g.beginPath();
      g.roundRect(18, 18, w - 36, h - 36, 34);
      g.stroke();
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(108, 62);
      g.lineTo(148, 62);
      g.moveTo(116, 62);
      g.lineTo(116, 102);
      g.lineTo(74, 186);
      g.quadraticCurveTo(70, 198, 86, 198);
      g.lineTo(170, 198);
      g.quadraticCurveTo(186, 198, 182, 186);
      g.lineTo(140, 102);
      g.lineTo(140, 62);
      g.stroke();
    });
    const flaskZoneDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.15),
      new THREE.MeshBasicMaterial({ map: flaskZoneTex, transparent: true })
    );
    flaskZoneDecal.rotation.x = -Math.PI / 2;
    flaskZoneDecal.position.set(0.28, 0.904, 0.24);
    roomG.add(flaskZoneDecal);

    const SHELF_Y = [1.26, 1.54];
    const SHELF_Z = -0.26;
    SHELF_Y.forEach((sy) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.028, 0.24), shelfMat);
      plank.position.set(-0.06, sy, SHELF_Z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      roomG.add(plank);
    });

    [-0.84, 0.72].forEach((px) => {
      [-0.36, -0.16].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.72, 0.022), shelfMat);
        post.position.set(px, 1.26, pz);
        post.castShadow = true;
        roomG.add(post);

        const blueStrip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.72, 0.024), blueBracketMat);
        blueStrip.position.set(px + (px > 0 ? 0.01 : -0.01), 1.26, pz);
        roomG.add(blueStrip);

        const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 24), blueBracketMat);
        footPad.position.set(px, 0.908, pz);
        roomG.add(footPad);
      });
    });

    const clockTex = canvasTex(256, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#2dd4bf';
      g.font = 'bold 38px Arial';
      g.fillText('📶 13:30', 18, 46);
    });
    const clockPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.034),
      new THREE.MeshBasicMaterial({ map: clockTex, transparent: true })
    );
    clockPlane.position.set(0.62, SHELF_Y[0], SHELF_Z + 0.121);
    roomG.add(clockPlane);

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. 3D `⚙️` IKONKASI VA SPAWNER PADLAR (`ConicFlask250`, `Spoon3`, `УТИЛИЗАТОР`)
    // ═══════════════════════════════════════════════════════════════════════════
    const gearIconTex = canvasTex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const cx = 64, cy = 64;
      g.strokeStyle = '#ffffff';
      g.fillStyle = '#ffffff';
      g.lineWidth = 6;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.save();
        g.translate(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
        g.rotate(a);
        g.fillRect(-7, -7, 14, 14);
        g.restore();
      }
      g.beginPath();
      g.arc(cx, cy, 36, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 4.5;
      g.beginPath();
      g.moveTo(58, 42);
      g.lineTo(70, 42);
      g.moveTo(60, 42);
      g.lineTo(60, 56);
      g.lineTo(46, 82);
      g.lineTo(82, 82);
      g.lineTo(68, 56);
      g.lineTo(68, 42);
      g.stroke();
    });

    function makeGearSprite(scale = 0.026) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: gearIconTex, transparent: true, depthTest: false })
      );
      sp.scale.set(scale, scale, 1);
      sp.renderOrder = 15;
      return sp;
    }

    function createBluePad({ x, z, labelText, hasGear = true }) {
      const g = new THREE.Group();
      g.position.set(x, 0.903, z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.022, 0.175), whitePlasticMat);
      base.position.y = 0.011;
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);

      const blueRim = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.010, 0.145), blueBracketMat);
      blueRim.position.set(0, 0.024, -0.006);
      g.add(blueRim);

      const innerPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.122, 0.012, 0.115),
        new THREE.MeshStandardMaterial({ color: '#dce3ec', roughness: 0.25 })
      );
      innerPlate.position.set(0, 0.024, -0.006);
      g.add(innerPlate);

      const badgeTex = canvasTex(256, 64, (ctx, w, h) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.roundRect(8, 8, hasGear ? 190 : 240, 48, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, hasGear ? 103 : 128, 40);
        if (hasGear) {
          ctx.fillStyle = '#18181b';
          ctx.font = 'bold 34px Arial';
          ctx.fillText('⚙', 224, 44);
        }
      });
      const badgePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.135, 0.026),
        new THREE.MeshBasicMaterial({ map: badgeTex })
      );
      badgePlane.position.set(0, 0.014, 0.088);
      badgePlane.rotation.x = -0.35;
      g.add(badgePlane);

      scene.add(g);
      return g;
    }

    createBluePad({ x: -0.62, z: -0.02, labelText: 'ConicFlask250', hasGear: true });
    createBluePad({ x: -0.44, z: -0.02, labelText: 'Spoon3', hasGear: true });
    createBluePad({ x: 0.22,  z: -0.02, labelText: 'ConicFlask250', hasGear: true });
    createBluePad({ x: 0.42,  z: -0.02, labelText: 'УТИЛИЗАТОР', hasGear: false });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. SHISHA REAKTIVLAR, KONUS KOLBALAR VA INDIKATORLAR
    // ═══════════════════════════════════════════════════════════════════════════
    const glassMat = (tint = '#ffffff', opacity = 0.26) => new THREE.MeshPhysicalMaterial({
      color: tint,
      roughness: 0.08,
      metalness: 0.0,
      transparent: true,
      opacity,
      specularIntensity: 0.85,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const liquidMat = (hex, opacity = 0.82) => new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness: 0.18,
      transparent: true,
      opacity,
      clearcoat: 0.4,
    });

    function lathe(points, seg = 40) {
      return new THREE.LatheGeometry(points.map(p => new THREE.Vector2(p[0], p[1])), seg);
    }

    function makeBottleLabelTex(formula, subText = '') {
      return canvasTex(512, 320, (g, w, h) => {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#111827';
        g.textAlign = 'center';
        if (subText) {
          g.font = 'bold 110px Arial';
          g.fillText(formula, w / 2, 148);
          g.font = 'bold 90px Arial';
          g.fillText(subText, w / 2, 265);
        } else {
          g.font = 'bold 138px Arial';
          g.fillText(formula, w / 2, 208);
        }
      });
    }

    const grabbableObjects = [];

    // Doskani ham ushlab suriladigan obyekt sifatida ro'yxatga qo'shamiz!
    doskaGroup.userData = {
      kind: 'board',
      h: 0.70,
      home: doskaGroup.position.clone(),
      sub: { id: 'BOARD', name: 'Interaktiv Doska', formula: 'DOSKA' },
    };
    grabbableObjects.push(doskaGroup);

    function createVRBottle(cfg, homePos, customScale = 1.0) {
      const g = new THREE.Group();
      const inner = new THREE.Group();
      inner.scale.setScalar(customScale);
      g.add(inner);

      const r = 0.040;
      const h = 0.125;
      const nh = 0.032;
      const prof = [
        [0, 0], [r - 0.004, 0], [r, 0.006], [r, h * 0.74],
        [0.017, h * 0.92], [0.013, h * 0.95], [0.013, h + nh],
        [0.011, h + nh], [0.011, h * 0.95], [r - 0.002, h * 0.74],
        [r - 0.002, 0.003], [0, 0.003],
      ];
      const glass = new THREE.Mesh(lathe(prof, 40), glassMat('#dce6f0', 0.34));
      glass.renderOrder = 3;

      const isClear = ['#e2e8f0', '#eef6ff'].includes(cfg.color);
      const liq = new THREE.Mesh(
        new THREE.CylinderGeometry(r - 0.003, r - 0.003, h * 0.58, 32),
        liquidMat(cfg.color, cfg.isSolid ? 0.96 : isClear ? 0.35 : 0.90)
      );
      liq.position.y = h * 0.29 + 0.004;

      const stopper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.013, 0.032, 24),
        darkRimMat
      );
      stopper.position.y = h + nh + 0.010;
      stopper.name = 'cap';

      const labelMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(r + 0.0008, r + 0.0008, h * 0.50, 32, 1, true, -0.95, 1.9),
        new THREE.MeshBasicMaterial({ map: makeBottleLabelTex(cfg.formula, cfg.sub), side: THREE.DoubleSide })
      );
      labelMesh.position.y = h * 0.38;

      const gearSp = makeGearSprite(0.025);
      gearSp.position.set(0, h * 0.78, r * 0.65);

      const totalH = (h + nh) * customScale;
      inner.add(liq, glass, stopper, labelMesh, gearSp);
      inner.position.y = -(h + nh);
      inner.traverse(o => { if (o.isMesh) o.castShadow = true; });

      const subObj = SUB_MAP[cfg.id] || {
        id: cfg.id,
        name: cfg.formula,
        formula: cfg.formula,
        color: cfg.color,
        state: cfg.isSolid ? 'qattiq' : 'eritma',
        defaultDose: 50,
        unit: 'мл',
      };

      g.userData = {
        sub: subObj,
        vrCfg: cfg,
        kind: cfg.isSolid ? 'jar' : 'bottle',
        h: totalH,
        home: homePos.clone().add(V3(0, totalH, 0)),
        homeRot: 0,
      };
      g.position.copy(g.userData.home);
      scene.add(g);
      grabbableObjects.push(g);
      return g;
    }

    // Tajriba tanlangan bo'lsa — faqat o'quvchi ombordan olgan moddalar qo'yiladi
    const pickedIds = selectedIds ? selectedIds.filter(id => SUB_MAP[id]) : null;
    const isInd = id => TABLE_INDICATORS.some(t => t.id === id);
    if (pickedIds) {
      const TABLE_POS = [[-0.28, -0.02], [-0.11, -0.02], [0.06, -0.02], [0.35, -0.02]];
      pickedIds.filter(id => !isInd(id)).forEach((id, i) => {
        const s = SUB_MAP[id];
        const cfg = { id, formula: s.formula.length > 9 ? s.formula.slice(0, 9) : s.formula, sub: s.molarity && s.molarity !== 'Toza' ? s.molarity : (s.state === 'qattiq' ? `${s.defaultDose} g` : ''), color: s.color, isSolid: s.state === 'qattiq' };
        if (i < TABLE_POS.length) createVRBottle(cfg, V3(TABLE_POS[i][0], 0.903, TABLE_POS[i][1]), 1.1);
        else createVRBottle(cfg, V3(-0.68 + (i - TABLE_POS.length) * 0.21, SHELF_Y[0] + 0.014, SHELF_Z + 0.02), 0.95);
      });
    } else {
      SHELF_BOTTLES_TOP.forEach((b, i) => {
        const x = -0.52 + i * 0.24;
        createVRBottle(b, V3(x, SHELF_Y[1] + 0.014, SHELF_Z + 0.02), 0.92);
      });
      SHELF_BOTTLES_BOTTOM.forEach((b, i) => {
        const x = -0.68 + i * 0.21;
        createVRBottle(b, V3(x, SHELF_Y[0] + 0.014, SHELF_Z + 0.02), 0.95);
      });
      TABLE_BOTTLES.forEach((b) => {
        createVRBottle(b, V3(...b.pos), b.scale || 1.0);
      });
    }

    function make3DBlueFlag(text, offset = [0.09, 0.12, 0]) {
      const grp = new THREE.Group();
      const flagTex = canvasTex(512, 96, (g, w, h) => {
        g.fillStyle = '#1e78d6';
        g.beginPath();
        g.roundRect(6, 6, w - 12, h - 12, 22);
        g.fill();
        g.strokeStyle = '#7dd3fc';
        g.lineWidth = 6;
        g.stroke();
        g.fillStyle = '#ffffff';
        g.font = 'bold 38px Arial';
        g.textAlign = 'center';
        g.fillText(text, w / 2, 60);
      });
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, 0.032),
        new THREE.MeshBasicMaterial({ map: flagTex, transparent: true, side: THREE.DoubleSide })
      );
      plate.position.set(offset[0], offset[1], offset[2]);
      plate.rotation.x = -0.35;

      const pts = [V3(0, 0.065, 0), V3(0, offset[1], 0), V3(offset[0] - 0.06, offset[1], offset[2])];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#38bdf8', linewidth: 2 }));
      grp.add(plate, line);
      return grp;
    }

    (pickedIds ? TABLE_INDICATORS.filter(t => pickedIds.includes(t.id)).map(t => ({ ...t, label: t.uzLabel || t.label })) : TABLE_INDICATORS).forEach((ind) => {
      const g = new THREE.Group();
      const inner = new THREE.Group();
      g.add(inner);
      const h = 0.072;

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.019, 0.048, 24),
        new THREE.MeshStandardMaterial({ color: ind.bodyCol, roughness: 0.3 })
      );
      body.position.y = 0.024;
      const lbl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0195, 0.0195, 0.024, 24, 1, true, -1.0, 2.0),
        new THREE.MeshBasicMaterial({ map: makeBottleLabelTex(ind.label.slice(0, 6), '') })
      );
      lbl.position.y = 0.024;
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.005, 0.024, 14),
        new THREE.MeshStandardMaterial({ color: ind.tipCol, roughness: 0.3 })
      );
      tip.position.y = 0.060;

      const flag3D = make3DBlueFlag(ind.label, ind.flagOffset);
      inner.add(body, lbl, tip, flag3D);
      inner.position.y = -h;

      const home = V3(...ind.pos).add(V3(0, h, 0));
      g.position.copy(home);
      g.userData = {
        sub: SUB_MAP[ind.id],
        vrIndicator: ind,
        kind: 'dropper',
        h,
        home,
        homeRot: 0,
      };
      scene.add(g);
      grabbableObjects.push(g);
    });

    [-0.62, 0.22].forEach((px) => {
      const fMesh = new THREE.Mesh(
        lathe([[0, 0], [0.042, 0], [0.044, 0.01], [0.015, 0.10], [0.015, 0.135]], 36),
        glassMat('#dce6f0', 0.32)
      );
      fMesh.position.set(px, 0.93, -0.02);
      const gear = makeGearSprite(0.022);
      gear.position.set(0, 0.10, 0.02);
      fMesh.add(gear);
      scene.add(fMesh);
    });

    function makeBlueSpoon(pos, rotZ = 0) {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.11, 16), blueBracketMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.x = 0.04;
      const scoop = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.006, 0.018),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3 })
      );
      scoop.position.x = -0.035;
      g.add(handle, scoop);
      g.position.set(...pos);
      g.rotation.z = rotZ;
      scene.add(g);
    }
    makeBlueSpoon([-0.44, 0.98, -0.02], 1.25);
    makeBlueSpoon([0.18, 0.91, 0.16], 0);

    // Tanlangan obyektni yorituvchi halqa (Hover Ring — qo'l yaqinlashganda yonadi!)
    const hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.044, 0.056, 32),
      new THREE.MeshBasicMaterial({ color: '#00e5ff', side: THREE.DoubleSide })
    );
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.visible = false;
    scene.add(hoverRing);

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. MARKAZIY KONUS KOLBA VA SARIQ QUYISH NISHONI
    // ═══════════════════════════════════════════════════════════════════════════
    const BK = { x: -0.02, z: 0.15, bottom: 0.903, r: 0.048, h: 0.14 };
    BK.top = BK.bottom + BK.h;

    const centralFlask = new THREE.Group();
    centralFlask.position.set(BK.x, BK.bottom, BK.z);
    scene.add(centralFlask);

    const erlenmeyerPts = [
      [0, 0], [BK.r - 0.003, 0], [BK.r, 0.006],
      [BK.r * 0.94, BK.h * 0.16],
      [0.016, BK.h * 0.76],
      [0.016, BK.h],
      [0.018, BK.h + 0.003],
      [0.014, BK.h],
      [0.014, BK.h * 0.76],
      [BK.r - 0.003, BK.h * 0.16],
      [BK.r - 0.003, 0.003], [0, 0.003],
    ];
    const flaskGlass = new THREE.Mesh(lathe(erlenmeyerPts, 48), glassMat('#dce6f0', 0.34));
    flaskGlass.renderOrder = 4;
    flaskGlass.castShadow = true;
    centralFlask.add(flaskGlass);

    const centerGear = makeGearSprite(0.024);
    centerGear.position.set(0, BK.h * 0.65, 0.022);
    centralFlask.add(centerGear);

    const yellowPourRing = new THREE.Mesh(
      new THREE.RingGeometry(0.022, 0.027, 32),
      new THREE.MeshBasicMaterial({ color: '#eab308', side: THREE.DoubleSide })
    );
    yellowPourRing.rotation.x = -Math.PI / 2;
    yellowPourRing.position.set(0, BK.h + 0.025, 0);
    centralFlask.add(yellowPourRing);

    const LIQ_R = BK.r - 0.004;
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(LIQ_R * 0.55, LIQ_R, 1, 40),
      liquidMat('#d4d8dc', 0.68)
    );
    liquid.position.y = 0.004;
    liquid.scale.y = 0.035;
    centralFlask.add(liquid);

    const sediment = new THREE.Group();
    centralFlask.add(sediment);

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. STEND QURILMALARI (`ВЕСЫ`, `Планшет`, `pH-метр`, `НАГРЕВ 84.6 °C`, `Раствор 1–4`)
    // ═══════════════════════════════════════════════════════════════════════════
    const scaleGroup = new THREE.Group();
    scaleGroup.position.set(-0.62, 0.903, 0.22);
    scene.add(scaleGroup);
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.038, 0.20), whitePlasticMat);
    sBody.position.y = 0.019;
    const sRim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.15), blueBracketMat);
    sRim.position.set(0, 0.040, -0.015);
    const sPan = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.008, 32), darkRimMat);
    sPan.position.set(0, 0.044, -0.015);

    const scaleLcdCanvas = document.createElement('canvas');
    scaleLcdCanvas.width = 256;
    scaleLcdCanvas.height = 96;
    const scaleLcdTex = new THREE.CanvasTexture(scaleLcdCanvas);
    const drawScaleLcd = (grams) => {
      const ctx = scaleLcdCanvas.getContext('2d');
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 256, 96);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 248, 88);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('ВЕСЫ', 96, 26);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(12, 42, 62, 36, 12);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Тара', 20, 66);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px monospace';
      ctx.fillText(`${grams.toFixed(2).padStart(6, '0')}г`, 82, 72);
      scaleLcdTex.needsUpdate = true;
    };
    drawScaleLcd(0.0);
    const sScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.046), new THREE.MeshBasicMaterial({ map: scaleLcdTex }));
    sScreen.position.set(0, 0.022, 0.101);
    sScreen.rotation.x = -0.32;
    scaleGroup.add(sBody, sRim, sPan, sScreen);

    const tabletGroup = new THREE.Group();
    tabletGroup.position.set(-0.28, 0.908, 0.22);
    const tabBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.13), darkRimMat);
    const tabScrTex = canvasTex(256, 192, (g, w, h) => {
      g.fillStyle = '#0f172a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#38bdf8';
      g.font = 'bold 20px Arial';
      g.fillText('Laboratoriya ishi', 16, 36);
      g.fillStyle = '#e2e8f0';
      g.font = '16px Arial';
      g.fillText('1. pH muhitini aniqlash', 16, 74);
      g.fillText('2. Ion almashinish reaksiyasi', 16, 108);
      g.fillText('3. Eritma 1–4 ni topish', 16, 142);
    });
    const tabScr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshBasicMaterial({ map: tabScrTex }));
    tabScr.rotation.x = -Math.PI / 2;
    tabScr.position.y = 0.005;
    tabletGroup.add(tabBody, tabScr);
    scene.add(tabletGroup);

    const phStand = new THREE.Group();
    phStand.position.set(0.46, 0.903, 0.18);
    scene.add(phStand);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.012, 0.14), blueBracketMat);
    legL.position.set(-0.045, 0.006, 0.02);
    legL.rotation.y = 0.45;
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.012, 0.14), blueBracketMat);
    legR.position.set(0.045, 0.006, 0.02);
    legR.rotation.y = -0.45;
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.22, 0.018), whitePlasticMat);
    arm1.position.set(0.02, 0.11, -0.02);
    arm1.rotation.z = -0.25;
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.18, 0.018), whitePlasticMat);
    arm2.position.set(0.01, 0.26, -0.02);
    arm2.rotation.z = 0.35;
    const jointCap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.026, 20), blueBracketMat);
    jointCap.rotation.x = Math.PI / 2;
    jointCap.position.set(0.045, 0.19, -0.02);

    const phHeadCanvas = document.createElement('canvas');
    phHeadCanvas.width = 256;
    phHeadCanvas.height = 256;
    const phHeadTex = new THREE.CanvasTexture(phHeadCanvas);
    const drawPhHead = (val) => {
      const ctx = phHeadCanvas.getContext('2d');
      ctx.fillStyle = '#1e88e5';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(28, 36, 200, 96, 18);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 68px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(val.toFixed(1), 128, 108);
      ctx.fillStyle = '#0d47a1';
      ctx.font = 'bold 46px Arial';
      ctx.fillText('pH', 128, 190);
      phHeadTex.needsUpdate = true;
    };
    drawPhHead(2.8);

    const phHeadMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.022, 0.12, 24),
      new THREE.MeshBasicMaterial({ map: phHeadTex })
    );
    phHeadMesh.position.set(-0.04, 0.32, 0.01);
    const phElectrode = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.004, 0.24, 14), darkRimMat);
    phElectrode.position.set(-0.04, 0.16, 0.01);
    phStand.add(legL, legR, arm1, arm2, jointCap, phHeadMesh, phElectrode);

    const phExtraGroup = new THREE.Group();
    scene.add(phExtraGroup);
    const gradCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, 0.19, 28),
      glassMat('#dce6f0', 0.36)
    );
    gradCyl.position.set(0.12, 0.998, 0.14);
    const gradBase = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.008, 24), glassMat('#dce6f0', 0.5));
    gradBase.position.set(0.12, 0.907, 0.14);
    const pipetteGrp = new THREE.Group();
    pipetteGrp.position.set(0.36, 1.15, 0.22);
    pipetteGrp.rotation.z = 0.25;
    const pipBody = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.010, 0.13, 20), whitePlasticMat);
    const pipTop = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 20), blueBracketMat);
    pipTop.position.y = 0.075;
    const pipTip = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.045, 16), new THREE.MeshStandardMaterial({ color: '#eab308' }));
    pipTip.rotation.x = Math.PI;
    pipTip.position.y = -0.085;
    pipetteGrp.add(pipBody, pipTop, pipTip);
    phExtraGroup.add(gradCyl, gradBase, pipetteGrp);

    const heaterStation = new THREE.Group();
    heaterStation.position.set(-0.36, 0.903, 0.22);
    scene.add(heaterStation);
    const hBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.036, 0.18), whitePlasticMat);
    hBase.position.y = 0.018;
    const hPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.14), darkRimMat);
    hPlate.position.set(0, 0.040, -0.01);

    const hPanelTex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#18181b';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#64748b';
      g.lineWidth = 6;
      g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#ef4444';
      g.font = 'bold 26px Arial';
      g.textAlign = 'center';
      g.fillText('НАГРЕВ', w / 2, 32);
      g.fillStyle = '#f87171';
      g.fillRect(22, 46, 180, 32);
      g.fillStyle = '#ffffff';
      g.fillRect(190, 40, 36, 44);
      g.font = 'bold 20px Arial';
      g.fillText('O       I       II      III', w / 2, 112);
    });
    const hPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.045), new THREE.MeshBasicMaterial({ map: hPanelTex }));
    hPanel.position.set(0, 0.020, 0.091);
    hPanel.rotation.x = -0.35;

    const thermoScreenCanvas = document.createElement('canvas');
    thermoScreenCanvas.width = 256;
    thermoScreenCanvas.height = 96;
    const thermoScreenTex = new THREE.CanvasTexture(thermoScreenCanvas);
    const drawThermoScreen = (tVal) => {
      const ctx = thermoScreenCanvas.getContext('2d');
      ctx.fillStyle = '#1e88e5';
      ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(10, 10, 236, 76, 16);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${tVal.toFixed(1)} °C`, 128, 66);
      thermoScreenTex.needsUpdate = true;
    };
    drawThermoScreen(84.6);

    const thermoScreenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.046, 0.016),
      new THREE.MeshBasicMaterial({ map: thermoScreenTex })
    );
    thermoScreenMesh.position.set(0.05, 0.28, -0.02);
    const thermoRod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 12), darkRimMat);
    thermoRod.position.set(0, 0.15, -0.01);
    heaterStation.add(hBase, hPlate, hPanel, thermoScreenMesh, thermoRod);

    const verifyGroup = new THREE.Group();
    scene.add(verifyGroup);
    const VERIFY_PADS = [
      { formula: 'Na₂S',   x: -0.33, z: 0.28, ledCol: '#cbd5e1', hasFlask: false },
      { formula: 'Na₂SO₃', x: -0.11, z: 0.28, ledCol: '#cbd5e1', hasFlask: true, flaskLabel: 'Раствор 1' },
      { formula: 'Na₂SO₄', x: 0.11,  z: 0.28, ledCol: '#cbd5e1', hasFlask: false },
      { formula: 'H₂O',    x: 0.33,  z: 0.28, ledCol: '#00ff44', hasFlask: true, flaskLabel: 'Раствор 2' },
    ];
    VERIFY_PADS.forEach((vp) => {
      const pg = new THREE.Group();
      pg.position.set(vp.x, 0.903, vp.z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.17), whitePlasticMat);
      base.position.y = 0.011;
      const blueRim = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.009, 0.14), blueBracketMat);
      blueRim.position.set(0, 0.023, -0.005);
      const ledBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.008, 0.014),
        new THREE.MeshBasicMaterial({ color: vp.ledCol })
      );
      ledBar.position.set(0, 0.023, 0.072);

      const lblTex = canvasTex(256, 64, (g, w, h) => {
        g.fillStyle = '#18181b';
        g.beginPath();
        g.roundRect(10, 6, w - 20, h - 12, 14);
        g.fill();
        g.fillStyle = '#ffffff';
        g.font = 'bold 34px Arial';
        g.textAlign = 'center';
        g.fillText(vp.formula, w / 2, 44);
      });
      const lblMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.028), new THREE.MeshBasicMaterial({ map: lblTex }));
      lblMesh.position.set(0, 0.013, 0.086);
      lblMesh.rotation.x = -0.35;
      pg.add(base, blueRim, ledBar, lblMesh);

      if (vp.hasFlask) {
        const fl = new THREE.Mesh(
          lathe([[0, 0], [0.042, 0], [0.044, 0.01], [0.015, 0.10], [0.015, 0.135]], 36),
          glassMat('#dce6f0', 0.34)
        );
        fl.position.set(0, 0.026, -0.005);
        const rLbl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.041, 0.035, 28, 1, true, -0.9, 1.8),
          new THREE.MeshBasicMaterial({ map: makeBottleLabelTex(vp.flaskLabel, ''), side: THREE.DoubleSide })
        );
        rLbl.position.y = 0.035;
        fl.add(rLbl);
        pg.add(fl);
      }
      verifyGroup.add(pg);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. O'ZBEK TILIDAGI INTERAKTIV DOSKANI CHIZISH FUNKSIYASI (`drawUzbekBoard`)
    // ═══════════════════════════════════════════════════════════════════════════
    const ST = {
      items: [],
      level: 0.24,
      levelT: 0.24,
      col: new THREE.Color('#c8ccd0'),
      colT: new THREE.Color('#c8ccd0'),
      temp: 84.6,
      ph: 2.8,
      scaleGrams: 0.0,
      emitters: [],
      cloud: 0,
      cloudCol: new THREE.Color('#ffffff'),
      lastRes: null,
      lastEq: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
      lastTitle: 'Mis(II) gidroksidning moviy choʻkmasi hosil boʻlishi',
      lastObs: 'Kolbaga reaktiv quyganda tenglama va natija shu doskada avtomatik yoziladi!',
    };

    function drawUzbekBoard() {
      const ctx = boardCanvas.getContext('2d');
      const W = boardCanvas.width, H = boardCanvas.height;
      const pg = boardControlRef.current.page || 0;

      // To'q yashil maktab doskasi foni
      ctx.fillStyle = '#0f2e22';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, W - 20, H - 20);

      // Yuqori sarlavha
      ctx.fillStyle = '#144432';
      ctx.fillRect(18, 18, W - 36, 76);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📋 NATIONAL AI LAB — OʻZBEK TILIDAGI INTERAKTIV KIMYO DOSKASI', W / 2, 54);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('🖐 Doskani qoʻl (chimchilash/musht) yoki sichqoncha bilan ushlab xona boʻylab surishingiz mumkin!', W / 2, 82);

      // Sahifa tablari
      BOARD_PAGES.forEach((tab, idx) => {
        const tx = 28 + idx * 244;
        const ty = 106;
        const active = idx === pg;
        ctx.fillStyle = active ? '#eab308' : '#1b4d38';
        ctx.beginPath();
        ctx.roundRect(tx, ty, 232, 44, 10);
        ctx.fill();
        ctx.fillStyle = active ? '#0f172a' : '#e2e8f0';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tab.short, tx + 116, ty + 29);
      });

      ctx.textAlign = 'left';
      if (pg === 0) {
        // 1-SAHIFA: JONLI TAJRIBA VA REAKSIYA TENGLAMASI
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('🧪 1. Markaziy kolbadagi moddalar:', 40, 200);

        const names = ST.items.length
          ? ST.items.map(id => SUB_MAP[id]?.formula || id).join('  +  ')
          : 'H₂O (Distillangan suv — reaktiv quyishga tayyor)';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(names, 48, 245);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('⚗️ 2. Kimyoviy reaksiya tenglamasi:', 40, 310);

        ctx.fillStyle = '#144432';
        ctx.beginPath();
        ctx.roundRect(40, 328, W - 80, 86, 14);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 34px Arial';
        ctx.fillText(ST.lastEq, 64, 384);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 25px Arial';
        ctx.fillText('🔍 3. Kuzatilayotgan jarayon va oʻlchovlar:', 40, 462);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = '23px Arial';
        ctx.fillText(`• Hodisa: ${ST.lastTitle}`, 52, 504);
        ctx.fillText(`• Izoh: ${ST.lastObs.slice(0, 68)}`, 52, 544);

        // Ko'rsatkichlar qatori
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(40, 576, W - 80, 68, 12);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`Muhit: pH ${ST.ph.toFixed(1)}   |   Harorat: ${ST.temp.toFixed(1)} °C   |   Massa: ${ST.scaleGrams.toFixed(1)} g`, 68, 618);
      } else if (pg === 1) {
        // 2-SAHIFA: AMALIY TOPSHIRIQLAR (O'zbek tilida)
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 27px Arial';
        ctx.fillText('📚 AMALIY LABORATORIYA TOPSHIRIQLARI:', 40, 205);
        const tasks = [
          ['1-topshiriq (Indikatorlar):', 'Kolbaga HCl yoki NaOH quyib, ustiga Lakmus / Fenolftalein tomizing.'],
          ['2-topshiriq (Choʻkma olish):', 'BaCl₂ eritmasi ustiga H₂SO₄ quying — oq BaSO₄↓ choʻkmasini kuzating.'],
          ['3-topshiriq (Sifat reaksiyasi):', 'Pb(NO₃)₂ va Na₂S yoki CuSO₄ va NaOH eritmalarini aralashtiring.'],
          ['4-topshiriq (Eritma 1–4):', 'Yuqoridan 5-sahna (Eritma 1–4) ni tanlab, nomaʼlum moddalarni aniqlang.'],
        ];
        tasks.forEach(([tHead, tBody], i) => {
          const y = 258 + i * 100;
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(tHead, 48, y);
          ctx.fillStyle = '#f8fafc';
          ctx.font = '22px Arial';
          ctx.fillText(tBody, 48, y + 36);
        });
      } else if (pg === 2) {
        // 3-SAHIFA: SIFAT REAKSIYALARI JADVALI
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 27px Arial';
        ctx.fillText('🎨 ASOSIY CHOʻKMALAR VA INDIKATORLAR JADVALI:', 40, 205);
        const rows = [
          '• Cu²⁺ + 2OH⁻ → Cu(OH)₂↓  (Moviy iviq choʻkma, qizdirilsa qora CuO↓)',
          '• Ba²⁺ + SO₄²⁻ → BaSO₄↓  (Kislotada erimaydigan oq kristall choʻkma)',
          '• Pb²⁺ + S²⁻ → PbS↓  (Qora rangli ogʻir choʻkma)',
          '• Ag⁺ + Cl⁻ → AgCl↓  (Oq tvorogsimon choʻkma)',
          '• Lakmus: Kislotada (pH < 5) — Qizil  |  Ishqorda (pH > 8) — Koʻk',
          '• Fenolftalein: Kislotada — Rangsiz  |  Ishqorda (NaOH) — Pushti-malina',
          '• Metiloranj: Kislotada — Qizil-toʻq sariq  |  Ishqorda — Sariq',
        ];
        rows.forEach((r, i) => {
          ctx.fillStyle = i < 4 ? '#f8fafc' : '#a7f3d0';
          ctx.font = 'bold 22px Arial';
          ctx.fillText(r, 48, 258 + i * 56);
        });
      } else {
        // 4-SAHIFA: QO'L VA BOSH BOSHQARUVI QOIDALARI
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 27px Arial';
        ctx.fillText('🖐 QOʻL VA 🙂 BOSH HARAKATI BILAN BOSHQARISH:', 40, 205);
        const guides = [
          '1. 🙂 Boshni oʻngga yoki chapga burish — Xona boʻylab 360° chapga-oʻngga qarash.',
          '2. ✊ Musht qilish yoki 👌 chimchilash — Reaktiv shishasi, pipetka yoki doskani ushlash.',
          '3. 🧪 Kolba ustiga olib borish — Shisha avtomatik egilib eritmani kolbaga quyadi.',
          '4. 📋 Doskani surish — Doskaning sariq tutqichidan ushlab istalgan joyga suring.',
          '5. 🖱️ Sichqoncha bilan — Chap tugma: ushlash/quyish, Oʻng tugma: xonani aylantirish.',
          '6. ⌨️ Klaviatura — [A]/[D] yoki [←]/[→] tugmalari bilan xonani chap/oʻngga burish.',
        ];
        guides.forEach((gTxt, i) => {
          ctx.fillStyle = '#f8fafc';
          ctx.font = '22px Arial';
          ctx.fillText(gTxt, 48, 260 + i * 62);
        });
      }

      boardTex.needsUpdate = true;
    }

    boardControlRef.current.drawBoard = drawUzbekBoard;
    drawUzbekBoard();

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. VR GHOST HANDS (Depth-Prepass + GLSL Fresnel Shader) VA ANIQ TEKISLIK PROYEKSIYASI
    // ═══════════════════════════════════════════════════════════════════════════
    const DEPTH_ONLY_MAT = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });

    const FRESNEL_GHOST_MAT = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPos);
          float rim = 1.0 - max(dot(N, V), 0.0);
          float fresnel = smoothstep(0.25, 0.92, pow(rim, 1.65));
          float alpha = mix(0.13, 0.96, fresnel);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
    });

    // ── HAQIQIY LABORATORIYA PERCHATKASI: ko'k nitril (yengil yaltiroq rezina) ──
    const NITRILE_MAT = new THREE.MeshPhysicalMaterial({
      color: '#1d6fe3',
      roughness: 0.34,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      sheen: 0.4,
      sheenColor: new THREE.Color('#7db6ff'),
      emissive: '#0a2a66',
      emissiveIntensity: 0.25,
    });
    const CUFF_MAT = new THREE.MeshStandardMaterial({ color: '#2b82f0', roughness: 0.45 });
    const SLEEVE_MAT = new THREE.MeshStandardMaterial({ color: '#f4f6f9', roughness: 0.85 });

    const BONES = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [9, 10], [10, 11], [11, 12],
      [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
      [0, 9], [0, 13], [1, 5],
    ];
    const RAD = i => i === 0 ? 0.022 : i <= 4 ? [0, 0.017, 0.014, 0.012, 0.0105][i] : i <= 8 ? [0.013, 0.0112, 0.010, 0.0092][i - 5] : i <= 12 ? [0.0135, 0.0115, 0.0102, 0.0094][i - 9] : i <= 16 ? [0.0125, 0.0108, 0.0096, 0.0088][i - 13] : [0.0112, 0.0096, 0.0086, 0.008][i - 17];
    const BRAD = (a, b) => (a === 0 && b === 9) || (a === 0 && b === 13) ? 0.020 : (a === 1 && b === 5) ? 0.016 : Math.min(RAD(a), RAD(b)) * 0.96;
    const sphereG = new THREE.SphereGeometry(1, 24, 18);
    const cylG = new THREE.CylinderGeometry(0.92, 1.02, 1, 20, 1, false);

    class SeamlessVRGhostHand {
      constructor() {
        this.g = new THREE.Group();
        scene.add(this.g);
        this.pos = Array.from({ length: 21 }, () => V3());
        this.ready = false;

        this.passes = [NITRILE_MAT].map((mat, passIdx) => {
          const order = 10 + passIdx;
          const joints = [];
          const bones = [];
          for (let i = 0; i < 21; i++) {
            const m = new THREE.Mesh(sphereG, mat);
            m.scale.setScalar(RAD(i));
            m.renderOrder = order;
            this.g.add(m);
            joints.push(m);
          }
          for (const [a, b] of BONES) {
            const m = new THREE.Mesh(cylG, mat);
            m.userData = { a, b, r: BRAD(a, b) };
            m.renderOrder = order;
            this.g.add(m);
            bones.push(m);
          }
          const palm = new THREE.Mesh(sphereG, mat);
          palm.renderOrder = order;
          this.g.add(palm);

          const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 1, 28, 1, false), mat);
          wrist.renderOrder = order;
          this.g.add(wrist);

          return { joints, bones, palm, wrist };
        });

        this.wristRim = new THREE.Mesh(
          new THREE.TorusGeometry(1, 0.055, 12, 32),
          CUFF_MAT
        );
        this.wristRim.renderOrder = 12;
        this.g.add(this.wristRim);
        // Perchatka manjeti va oq xalat yengi
        this.cuff = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.08, 1, 28, 1, true), CUFF_MAT);
        this.sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 1, 28, 1, false), SLEEVE_MAT);
        this.g.add(this.cuff, this.sleeve);

        this.pinch = false;
        this.held = null;
        this.hover = null;
        this.visible = true;
        this.pinchPt = V3();
      }

      setVisible(v) {
        this.g.visible = v;
        this.visible = v;
      }

      update(pts) {
        pts.forEach((p, i) => {
          if (this.ready) this.pos[i].lerp(p, 0.72);
          else this.pos[i].copy(p);
        });
        this.ready = true;
        const P = this.pos;
        const up = V3(0, 1, 0);

        const xA = V3().subVectors(P[5], P[17]);
        const w = Math.max(0.01, xA.length());
        xA.normalize();
        const yA = V3().subVectors(P[9], P[0]);
        const l = Math.max(0.01, yA.length());
        yA.addScaledVector(xA, -yA.dot(xA)).normalize();
        const zA = V3().crossVectors(xA, yA).normalize();
        const palmQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
        const wristQuat = new THREE.Quaternion().setFromUnitVectors(up, yA.clone().negate());

        this.passes.forEach(({ joints, bones, palm, wrist }) => {
          joints.forEach((m, i) => m.position.copy(P[i]));
          bones.forEach(m => {
            const { a, b, r } = m.userData;
            const A = P[a], B = P[b];
            const d = V3().subVectors(B, A);
            const len = Math.max(0.0001, d.length());
            m.position.copy(A).addScaledVector(d, 0.5);
            m.quaternion.setFromUnitVectors(up, d.normalize());
            m.scale.set(r, len, r);
          });
          palm.quaternion.copy(palmQuat);
          palm.position.copy(P[0]).lerp(P[9], 0.50).addScaledVector(xA, w * 0.04);
          palm.scale.set(w / 2 + 0.013, l / 2 + 0.008, 0.016);

          wrist.quaternion.copy(wristQuat);
          wrist.scale.set(0.022, 0.038, 0.016);
          wrist.position.copy(P[0]).addScaledVector(yA, -0.019);
        });

        this.wristRim.quaternion.copy(wristQuat).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2));
        this.wristRim.position.copy(P[0]).addScaledVector(yA, -0.038);
        this.wristRim.scale.set(0.023, 0.017, 0.023);
        this.cuff.quaternion.copy(wristQuat);
        this.cuff.position.copy(P[0]).addScaledVector(yA, -0.05);
        this.cuff.scale.set(0.0245, 0.05, 0.0195);
        this.sleeve.quaternion.copy(wristQuat);
        this.sleeve.position.copy(P[0]).addScaledVector(yA, -0.135);
        this.sleeve.scale.set(0.034, 0.13, 0.03);

        this.palmLen = l;
        this.pinchPt.addVectors(P[4], P[8]).multiplyScalar(0.5);
      }
    }

    const gloves = [new SeamlessVRGhostHand(), new SeamlessVRGhostHand()];

    const OPEN = [[0, 0, 0], [-0.026, 0.022, -0.01], [-0.046, 0.046, -0.016], [-0.06, 0.068, -0.022], [-0.068, 0.088, -0.028], [-0.022, 0.09, 0], [-0.026, 0.128, -0.01], [-0.028, 0.152, -0.02], [-0.029, 0.172, -0.03], [0, 0.095, 0], [0, 0.138, -0.01], [0, 0.165, -0.022], [0, 0.187, -0.032], [0.02, 0.09, 0], [0.022, 0.128, -0.012], [0.023, 0.152, -0.022], [0.024, 0.171, -0.032], [0.038, 0.08, 0], [0.043, 0.108, -0.012], [0.046, 0.128, -0.02], [0.048, 0.145, -0.028]];
    const PINCH = [[0, 0, 0], [-0.026, 0.022, -0.012], [-0.048, 0.05, -0.026], [-0.052, 0.08, -0.044], [-0.044, 0.113, -0.058], [-0.022, 0.09, 0], [-0.03, 0.124, -0.02], [-0.037, 0.133, -0.043], [-0.042, 0.124, -0.058], [0, 0.095, 0], [0, 0.13, -0.022], [0, 0.138, -0.047], [0, 0.126, -0.062], [0.02, 0.09, 0], [0.021, 0.121, -0.022], [0.022, 0.127, -0.045], [0.022, 0.116, -0.058], [0.038, 0.08, 0], [0.042, 0.1, -0.02], [0.044, 0.107, -0.04], [0.045, 0.097, -0.052]];
    const mouse = { x: W0 * 0.54, y: H0 * 0.48, down: false, rightDown: false, lastX: 0, lastY: 0, pinch: 0 };
    const poseRotR = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.12, 0.32, 0.12, 'YXZ'));
    const poseRotL = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.12, -0.32, -0.12, 'YXZ'));

    const toScreen = v => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const p = v.clone().project(camera);
      return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, z: p.z };
    };

    const beakerMouth = V3(BK.x, BK.top, BK.z);
    const _ray = new THREE.Raycaster();

    // Ekrandagi (sx, sy) nuqtani stol va javon ishchi tekisligiga (`zt`) aniq proyeksiyalash!
    function screenToLabTarget(sx, sy) {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      _ray.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), camera);
      const o = _ray.ray.origin, d = _ray.ray.direction;
      const mouthY = toScreen(beakerMouth).y;
      const k = clamp((mouthY - sy) / 165, 0, 1);
      // Kamera burchagi kichik bo`lganda aniq stol/javon Z tekisligi, burilganda esa kamera oldidagi masofa!
      const yawAbs = Math.abs(lookOffsetRef.current.yaw || 0);
      if (yawAbs < 0.45 && Math.abs(d.z) > 0.25) {
        const zt = THREE.MathUtils.lerp(BK.z + 0.02, -0.22, k);
        const tDist = (zt - o.z) / d.z;
        const target = o.clone().addScaledVector(d, clamp(tDist, 0.28, 1.65));
        target.y = Math.max(0.915, target.y);
        return target;
      }
      const reachDist = THREE.MathUtils.lerp(0.58, 0.88, k);
      const target = o.clone().addScaledVector(d, reachDist);
      target.y = Math.max(0.915, target.y);
      return target;
    }

    function mouseRightHandPoints() {
      mouse.pinch += ((mouse.down ? 1 : 0) - mouse.pinch) * 0.35;
      const target = screenToLabTarget(mouse.x, mouse.y);
      const pts = OPEN.map((p, i) => V3(...p).lerp(V3(...PINCH[i]), mouse.pinch).applyQuaternion(poseRotR));
      const pinchLocal = V3().addVectors(pts[4], pts[8]).multiplyScalar(0.5);
      return pts.map(p => p.sub(pinchLocal).add(target));
    }

    function idleLeftHandPoints(t) {
      const base = V3(-0.24, 0.94 + Math.sin(t * 1.4) * 0.005, 0.25);
      return OPEN.map((p) => V3(-p[0], p[1], p[2]).applyQuaternion(poseRotL).add(base));
    }

    // TUZATILGAN QO'L PROYEKSIYASI: Web-kameradagi qo'l har doim stol va javon
    // tekisligida (`screenToLabTarget`) harakatlanadi va hech qachon stol ostiga tushib ketmaydi!
    function camHandPoints(lm, isGrabbing = false) {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      const rawMidX = (lm[4].x + lm[8].x + lm[9].x) / 3;
      const rawMidY = (lm[4].y + lm[8].y + lm[9].y) / 3;
      const sx = (1 - rawMidX) * w;
      const sy = rawMidY * h;
      const target = screenToLabTarget(sx, sy);

      // Haqiqiy barmoq bo'g'inlari nisbiy shaklini saqlaymiz va `target` ga bog'laymiz
      const d = 0.68;
      const worldW = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const rawPts = lm.map(p => {
        _ray.setFromCamera(new THREE.Vector2((1 - p.x) * 2 - 1, -(p.y * 2 - 1)), camera);
        return _ray.ray.origin.clone().addScaledVector(_ray.ray.direction, d + (p.z || 0) * worldW * 0.45);
      });
      const k = 0.094 / Math.max(0.015, rawPts[0].distanceTo(rawPts[9]));
      const w0 = rawPts[0].clone();
      const scaled = rawPts.map(p => p.sub(w0).multiplyScalar(k).add(w0));

      // Agar foydalanuvchi musht qilsa (`isGrabbing`), barmoq uchlarini chimchilash nuqtasiga yaqinlashtiramiz
      if (isGrabbing) {
        const pinchCenter = V3().addVectors(scaled[4], scaled[8]).multiplyScalar(0.5);
        scaled[4].lerp(pinchCenter, 0.65);
        scaled[8].lerp(pinchCenter, 0.65);
      }

      const pinchMid = V3().addVectors(scaled[4], scaled[8]).multiplyScalar(0.5);
      return scaled.map(p => p.sub(pinchMid).add(target));
    }

    // ── ZARRACHALAR ──────────────────────────────────────────────────────────
    function instanced(geo, mat, n) {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      m.frustumCulled = false;
      scene.add(m);
      return m;
    }

    const bubbleMesh = instanced(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.65, roughness: 0, clearcoat: 1, depthWrite: false }), 400);
    const flakeMesh = instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.85 }), 400);
    const streamMesh = instanced(new THREE.SphereGeometry(1, 8, 6), liquidMat('#ffffff', 0.88), 160);
    const dropMesh = instanced(new THREE.SphereGeometry(1, 10, 8), liquidMat('#ffffff', 0.95), 24);
    const P = { bubbles: [], flakes: [], stream: [], drops: [] };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3(), _c = new THREE.Color();

    function writeInst(mesh, arr, fn, useColor = false) {
      let n = 0;
      for (const a of arr) {
        fn(a);
        _m.compose(_p, _q.identity(), _s);
        mesh.setMatrixAt(n, _m);
        if (useColor) mesh.setColorAt(n, _c.set(a.col || '#ffffff'));
        n++;
        if (n >= mesh.instanceMatrix.count) break;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    const surfaceY = () => BK.bottom + 0.004 + ST.level * (BK.h - 0.025);

    function resetBeaker() {
      firedRxRef.current.clear(); emitLab({ type: 'wash' });
      ST.items = [];
      ST.levelT = 0.24;
      ST.colT.set('#c8ccd0');
      ST.temp = 84.6;
      ST.ph = 7.0;
      ST.scaleGrams = 0.0;
      ST.lastEq = 'Idish tozalandi — yangi tajribaga tayyor';
      ST.lastTitle = 'Distillangan suv muhiti (pH 7.0)';
      ST.lastObs = 'Istalgan reaktiv shishasini ushlab markaziy kolbaga quying.';
      while (sediment.children.length) sediment.remove(sediment.children[0]);
      P.flakes = [];
      P.bubbles = [];
      drawPhHead(ST.ph);
      drawThermoScreen(ST.temp);
      drawScaleLcd(ST.scaleGrams);
      drawUzbekBoard();
      Sound.drain();
    }
    boardControlRef.current.resetFlask = resetBeaker;
    if (apiRef) apiRef.current = { reset: resetBeaker };

    function addReagentToBeaker(id) {
      ST.items.push(id);
      ST.levelT = Math.min(0.84, ST.levelT + 0.14);
      const res = evaluateMix(ST.items);
      ST.lastRes = res;
      const freshRx = res.events.filter(ev => ev.reaction && !firedRxRef.current.has(ev.reaction.id)).map(ev => ev.reaction);
      freshRx.forEach(r => firedRxRef.current.add(r.id));
      emitLab({ type: 'pour', id, name: SUB_MAP[id]?.name || id, ids: [...ST.items], items: ST.items.map(x => SUB_MAP[x]?.name || x), reactions: freshRx });

      if (res.state.medium === 'acid') ST.ph = 2.8;
      else if (res.state.medium === 'base') ST.ph = 11.4;
      else ST.ph = 7.0;
      drawPhHead(ST.ph);

      if (res.state.color) ST.colT.set(res.state.color);
      ST.temp = Math.min(100.0, ST.temp + 4.8);
      drawThermoScreen(ST.temp);
      ST.scaleGrams += 10.0;
      drawScaleLcd(ST.scaleGrams);

      const addedSub = SUB_MAP[id];
      if (res.events.length > 0) {
        const lastEv = res.events[res.events.length - 1];
        if (lastEv.reaction) {
          ST.lastEq = lastEv.reaction.eq || `${addedSub?.formula || id} qoʻshildi`;
          ST.lastTitle = lastEv.reaction.title || 'Kimyoviy reaksiya sodir boʻldi';
          ST.lastObs = lastEv.reaction.observation || lastEv.reaction.why || '';
        }
      } else if (addedSub) {
        ST.lastEq = `${addedSub.formula} (${addedSub.name}) eritmaga qoʻshildi`;
        ST.lastTitle = `${addedSub.name} aralashtirildi`;
        ST.lastObs = `Kolbaga ikkinchi reaktiv yoki indikator tomizib reaksiyani kuzating.`;
      }

      // Doskani 1-sahifaga o'tkazib yangilaymiz
      boardControlRef.current.page = 0;
      setBoardPage(0);
      drawUzbekBoard();

      res.events.forEach(ev => {
        if (!ev.reaction) return;
        const fx = ev.reaction.fx || {};
        if (fx.gas) {
          ST.emitters.push({ t: 0, d: 4.0, rate: 0.85 });
          Sound.fizz(2.5, 0.15);
        }
        if (fx.precipitate) {
          const c = fx.precipitate;
          ST.cloud = 0.7;
          ST.cloudCol.set(c);
          let layer = sediment.children.find(m => m.userData.c === c);
          if (!layer) {
            layer = new THREE.Mesh(
              new THREE.CylinderGeometry(LIQ_R - 0.002, LIQ_R - 0.002, 1, 36),
              new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
            );
            layer.userData = { c, h: 0.004 };
            layer.scale.y = 0.004;
            sediment.add(layer);
          }
          const sy = surfaceY();
          for (let i = 0; i < 160; i++) {
            const a = rand(0, 6.28), rr = rand(0, LIQ_R - 0.006);
            P.flakes.push({
              p: V3(BK.x + Math.cos(a) * rr, rand(BK.bottom + 0.015, Math.max(BK.bottom + 0.03, sy)), BK.z + Math.sin(a) * rr),
              v: rand(0.008, 0.022),
              r: rand(0.0018, 0.0032),
              col: c,
              layer,
              ph: rand(0, 6),
            });
          }
        }
        Sound.chime();
      });
    }

    function findTarget(gl) {
      const ps = toScreen(gl.pinchPt);
      let best = null, bd = 96; // Kengaytirilgan sezgir ushlash radiusi!
      for (const o of grabbableObjects) {
        if (o.userData.taken && o.userData.taken !== gl) continue;
        const centerPoint = o.userData.kind === 'board'
          ? o.position.clone().add(V3(0, 0.45, 0))
          : o.position.clone().add(V3(0, -o.userData.h * 0.45, 0));
        const s = toScreen(centerPoint);
        const dd = Math.hypot(s.x - ps.x, s.y - ps.y);
        if (dd < bd) { bd = dd; best = o; }
      }
      return best;
    }

    function inPourZone(gl) {
      const a = toScreen(gl.pinchPt);
      const b = toScreen(beakerMouth);
      return Math.hypot(a.x - b.x, (a.y - b.y) * 0.75) < 165;
    }

    const pourAnchor = V3(BK.x + 0.045, BK.top + 0.075, BK.z);

    function releaseObj(o) {
      o.userData.taken = null;
      if (o.userData.kind === 'board') {
        o.userData.returning = false;
        return;
      }
      o.userData.returning = true;
      Sound.pour(false);
      const cap = o.getObjectByName('cap');
      if (cap) cap.visible = true;
    }

    function emitStream(o, color, dt) {
      const mouthDir = V3(-Math.sin(o.rotation.z), Math.cos(o.rotation.z), 0);
      const p = o.position.clone().addScaledVector(mouthDir, 0.004);
      for (let i = 0; i < Math.max(1, Math.round(dt * 120)); i++) {
        P.stream.push({
          p: p.clone().add(V3(rand(-0.0015, 0.0015), 0, rand(-0.0015, 0.0015))),
          v: V3(0.045 + rand(-0.01, 0.01), -0.05, 0),
          col: color,
          r: rand(0.0025, 0.0035),
        });
      }
    }

    function spawnBubble() {
      if (ST.level < 0.02) return;
      const a = rand(0, 6.28), rr = rand(0, LIQ_R - 0.008);
      const base = V3(BK.x + Math.cos(a) * rr, BK.bottom + 0.01, BK.z + Math.sin(a) * rr);
      P.bubbles.push({ p: base, v: rand(0.05, 0.11), r: rand(0.0015, 0.0032), ph: rand(0, 6) });
    }

    function holdUpdate(gl, o, dt) {
      const u = o.userData;
      // Agar ushlangan obyekt DOSKA bo'lsa, uni xona bo'ylab erkin suramiz!
      if (u.kind === 'board') {
        boardControlRef.current.targetX = clamp(gl.pinchPt.x, -1.45, 0.85);
        boardControlRef.current.targetZ = clamp(gl.pinchPt.z - 0.12, -0.45, 0.22);
        return;
      }

      const zone = inPourZone(gl);
      const target = zone ? gl.pinchPt.clone().lerp(pourAnchor, 0.72) : gl.pinchPt.clone();
      o.position.lerp(target, 1 - Math.exp(-dt * 28));

      const want = zone && !u.poured ? -1.92 : 0;
      u.tilt = (u.tilt || 0) + (want - (u.tilt || 0)) * (1 - Math.exp(-dt * 6));
      o.rotation.set(0, 0, u.tilt);

      if (zone && !u.poured && u.tilt < want * 0.7) {
        u.pourT = (u.pourT || 0) + dt;
        const need = u.kind === 'dropper' ? 0.65 : 0.80;
        if (u.kind === 'bottle' || u.kind === 'jar') {
          Sound.pour(true);
          emitStream(o, u.sub.color, dt);
        } else if (u.kind === 'dropper' && Math.random() < dt * 6) {
          P.drops.push({ p: o.position.clone().add(V3(0, -0.01, 0)), v: 0, col: u.vrIndicator?.bodyCol || '#7e22ce' });
          Sound.drip();
        }
        if (u.pourT >= need) {
          u.poured = true;
          Sound.pour(false);
          addReagentToBeaker(u.sub.id);
        }
      } else if (!zone) {
        Sound.pour(false);
        u.pourT = 0;
        u.poured = false;
      }
    }

    function updateHand(gl, pts, forcePinchBool, dt = 1 / 60) {
      gl.update(pts);
      const r = gl.pos[4].distanceTo(gl.pos[8]) / Math.max(0.02, gl.palmLen);
      const was = gl.pinch;
      const localPinch = was ? r < 0.54 : r < 0.40;
      gl.pinch = Boolean(forcePinchBool || localPinch);

      if (!was && gl.pinch) {
        Sound.unlock();
        const t = findTarget(gl);
        if (t) {
          gl.held = t;
          t.userData.taken = gl;
          t.userData.poured = false;
          t.userData.pourT = 0;
          t.userData.tilt = 0;
          Sound.tap();
          emitLab({ type: 'grab', id: t.userData.sub?.id, name: t.userData.sub?.name || t.userData.sub?.formula });
          const cap = t.getObjectByName('cap');
          if (cap) cap.visible = false;
        }
      }
      if (was && !gl.pinch && gl.held) {
        releaseObj(gl.held);
        gl.held = null;
      }
      gl.hover = gl.held ? null : findTarget(gl);
      if (gl.held) holdUpdate(gl, gl.held, dt);
    }

    const domEl = renderer.domElement;
    const onContextMenu = e => e.preventDefault();
    const onPointerMove = e => {
      const rect = domEl.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      if (mouse.rightDown) {
        const dx = nx - mouse.lastX;
        const dy = ny - mouse.lastY;
        lookOffsetRef.current.manualYaw = clamp(lookOffsetRef.current.manualYaw - dx * 0.0045, -1.35, 1.35);
        lookOffsetRef.current.pitch = clamp(lookOffsetRef.current.pitch - dy * 0.003, -0.6, 0.6);
      }
      mouse.lastX = nx;
      mouse.lastY = ny;
      mouse.x = nx;
      mouse.y = ny;
    };
    const onPointerDown = e => {
      const rect = domEl.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      mouse.lastX = nx;
      mouse.lastY = ny;
      if (e.button === 2) {
        mouse.rightDown = true;
      } else {
        mouse.down = true;
        mouse.x = nx;
        mouse.y = ny;
        Sound.unlock();
      }
    };
    const onPointerUp = e => {
      if (e.button === 2) mouse.rightDown = false;
      else mouse.down = false;
    };

    const onKeyDown = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 'Shift') { shiftHeldRef.current = true; return; }
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') {
        lookOffsetRef.current.manualYaw = clamp(lookOffsetRef.current.manualYaw - 0.14, -1.35, 1.35);
      } else if (k === 'd' || k === 'arrowright') {
        lookOffsetRef.current.manualYaw = clamp(lookOffsetRef.current.manualYaw + 0.14, -1.35, 1.35);
      } else if (k === 'w' || k === 'arrowup') {
        lookOffsetRef.current.pitch = clamp(lookOffsetRef.current.pitch + 0.07, -0.6, 0.6);
      } else if (k === 's' || k === 'arrowdown') {
        lookOffsetRef.current.pitch = clamp(lookOffsetRef.current.pitch - 0.07, -0.6, 0.6);
      } else if (k === 'h' && !e.repeat) {
        setHeadMode(m => (m === 'auto' ? 'key' : m === 'key' ? 'off' : 'auto'));
      }
    };
    const onKeyUp = e => { if (e.key === 'Shift') shiftHeldRef.current = false; };
    const onBlur = () => { shiftHeldRef.current = false; };

    domEl.addEventListener('contextmenu', onContextMenu);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    let rafId;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const pr = presetRef.current;
      verifyGroup.visible = pr.id === 'verify';
      tabletGroup.visible = pr.id === 'overview';
      phExtraGroup.visible = pr.id === 'ph_meter';

      // 1. BOSH BURILISHI (YAW & PITCH) + QOʻLDA/KLAVIATURADA BURISH
      // ─ Gate: bosh faqat quyidagi holatda kamerani boshqaradi:
      //     'auto' rejimda: qoʻl kadrda YOʻQ yoki Shift bosib turilgan
      //     'key'  rejimda: faqat Shift bosib turilgan
      //   Qoʻl bilan ish qilinayotganda kamera MUZLAYDI — shunda qoʻl va bosh bir-biriga xalaqit bermaydi.
      const hState = handRef.current;
      const mode = headModeRef.current;
      const handBusy = Boolean(hState?.isTracking && (hState?.handsCount || 0) > 0);
      const faceOk = Boolean(hState?.headTracking);
      const gateOpen = faceOk && (
        mode === 'auto' ? (!handBusy || shiftHeldRef.current)
        : mode === 'key' ? shiftHeldRef.current
        : false
      );
      const gateState = mode === 'off' || !faceOk ? 'idle' : (gateOpen ? 'live' : 'frozen');
      if (gateState !== headGateRef.current) {
        headGateRef.current = gateState;
        setHeadGate(gateState);
      }

      // Burchak chegaralari (radian) va maksimal tezlik — bosh juda tez burilmasligi uchun
      const sens = headSensitivityRef.current || 1.0;
      const HEAD_YAW_RANGE = 0.85;     // ≈ 49°
      const HEAD_PITCH_RANGE = 0.42;   // ≈ 24°
      const MAX_YAW_SPEED = 0.9;       // rad/s ≈ 52°/s
      const MAX_PITCH_SPEED = 0.6;     // rad/s ≈ 34°/s
      const ha = headAppliedRef.current;
      if (gateOpen) {
        const yTarget = clamp((hState.headYaw || 0) * sens, -1, 1) * HEAD_YAW_RANGE;
        const pTarget = clamp((hState.headPitch || 0) * sens, -1, 1) * HEAD_PITCH_RANGE;
        ha.yaw += clamp(yTarget - ha.yaw, -MAX_YAW_SPEED * dt, MAX_YAW_SPEED * dt);
        ha.pitch += clamp(pTarget - ha.pitch, -MAX_PITCH_SPEED * dt, MAX_PITCH_SPEED * dt);
      }
      // 'off' rejimda bosh hissasi sekin nolga qaytadi; 'frozen' da esa joyida turadi
      if (mode === 'off') {
        ha.yaw -= clamp(ha.yaw, -MAX_YAW_SPEED * dt, MAX_YAW_SPEED * dt);
        ha.pitch -= clamp(ha.pitch, -MAX_PITCH_SPEED * dt, MAX_PITCH_SPEED * dt);
      }

      const totalYaw = clamp(lookOffsetRef.current.manualYaw + ha.yaw, -1.42, 1.42);
      lookOffsetRef.current.yaw += (totalYaw - lookOffsetRef.current.yaw) * Math.min(1, dt * 5);
      const totalPitch = clamp(lookOffsetRef.current.pitch + ha.pitch, -0.7, 0.7);
      lookOffsetRef.current.pitchSmooth = (lookOffsetRef.current.pitchSmooth || 0)
        + (totalPitch - (lookOffsetRef.current.pitchSmooth || 0)) * Math.min(1, dt * 5);

      // Bosh O'NGGA burilganda (yawVal > 0) -> kamera O'NGGA (+X) buriladi va siljiydi!
      // Bosh CHAPGA burilganda (yawVal < 0) -> kamera CHAPGA (-X) buriladi va siljiydi!
      const yawVal = lookOffsetRef.current.yaw;
      const baseDx = pr.lookAt[0] - pr.camPos[0];
      const baseDy = pr.lookAt[1] - pr.camPos[1];
      const baseDz = pr.lookAt[2] - pr.camPos[2];
      const horizDist = Math.max(0.45, Math.hypot(baseDx, baseDz));
      const baseAngle = Math.atan2(baseDx, -baseDz);
      const finalAngle = baseAngle + yawVal;

      camPosTarget.set(
        pr.camPos[0] + Math.sin(yawVal) * 0.52,
        pr.camPos[1],
        pr.camPos[2]
      );
      // Pitch: haqiqiy burchak sifatida (tan) qoʻllanadi — avvalgi 0.45×0.45 koeffitsiyent uni deyarli yoʻqotgan edi
      camLookTarget.set(
        camPosTarget.x + Math.sin(finalAngle) * horizDist,
        pr.camPos[1] + baseDy + Math.tan(lookOffsetRef.current.pitchSmooth) * horizDist,
        camPosTarget.z - Math.cos(finalAngle) * horizDist
      );
      camera.position.lerp(camPosTarget, Math.min(1, dt * 10));
      camLookCurrent.lerp(camLookTarget, Math.min(1, dt * 8));
      camera.lookAt(camLookCurrent);

      // 2. HARAKATLANUVCHI O'ZBEKCHA DOSKANI SILLIQ SURISH VA KAMERAGA YO'NALTIRISH
      doskaGroup.position.x += (boardControlRef.current.targetX - doskaGroup.position.x) * Math.min(1, dt * 8);
      doskaGroup.position.z += (boardControlRef.current.targetZ - doskaGroup.position.z) * Math.min(1, dt * 8);
      const angleToCam = Math.atan2(
        camera.position.x - doskaGroup.position.x,
        camera.position.z - doskaGroup.position.z
      );
      doskaGroup.rotation.y += (clamp(angleToCam * 0.65, -0.55, 0.75) - doskaGroup.rotation.y) * Math.min(1, dt * 6);

      // 3. VR GHOST HANDS YANGILASH (Web-kamera qo'l trekingi + Sichqoncha)
      // gloves[0] = O'NG qo'l, gloves[1] = CHAP qo'l. Kuzatilmayotgan qo'l EKRANDA KO'RINMAYDI va
      // ushlab turgan narsasini qo'yib yuboradi (qisqa miltillashga 0.3 s chidamlilik bilan).
      const seen = [false, false];
      if (hState?.isTracking && hState?.landmarks?.length) {
        hState.landmarks.slice(0, 2).forEach((lm, slot) => {
          const gi = hState.handSides?.[slot] === 'L' ? 1 : 0;
          const isGrab = slot === 0
            ? Boolean(
                hState.isPunchGrab ||
                hState.h1PinchNorm < 0.44 ||
                hState.gesture === 'EXPLODE_TOGGLE' ||
                hState.gesture === 'LASER_SELECT'
              )
            : Boolean(hState.h2PinchNorm < 0.44 || hState.hand2?.isPunchHoldCandidate);
          seen[gi] = true;
          gloves[gi].setVisible(true);
          updateHand(gloves[gi], camHandPoints(lm, isGrab), isGrab, dt);
        });
      } else {
        // Sichqoncha rejimi: faqat o'ng qo'l
        seen[0] = true;
        gloves[0].setVisible(true);
        updateHand(gloves[0], mouseRightHandPoints(), mouse.down, dt);
      }
      for (let gi = 0; gi < 2; gi++) {
        const gl = gloves[gi];
        if (seen[gi]) { gl.lastSeen = now; continue; }
        const lost = now - (gl.lastSeen || 0);
        if (lost > 300) {
          if (gl.held) { releaseObj(gl.held); gl.held = null; }
          gl.pinch = false;
          gl.hover = null;
          gl.setVisible(false);
        }
      }

      // Hover halqasini ko'rsatish
      const hoveredObj = gloves[0].hover || gloves[1].hover;
      if (hoveredObj && hoveredObj.userData.kind !== 'board') {
        hoverRing.visible = true;
        hoverRing.position.set(hoveredObj.position.x, 0.906, hoveredObj.position.z);
      } else {
        hoverRing.visible = false;
      }

      grabbableObjects.forEach(o => {
        const u = o.userData;
        if (!u.returning || u.kind === 'board') return;
        o.position.lerp(u.home, 1 - Math.exp(-dt * 9));
        u.tilt = (u.tilt || 0) * Math.exp(-dt * 12);
        o.rotation.set(0, u.homeRot || 0, u.tilt);
        if (o.position.distanceTo(u.home) < 0.002) {
          o.position.copy(u.home);
          u.returning = false;
          u.tilt = 0;
          Sound.clink();
        }
      });

      ST.level += (ST.levelT - ST.level) * Math.min(1, dt * 2.5);
      liquid.visible = ST.level > 0.01;
      liquid.scale.y = Math.max(0.001, ST.level * (BK.h - 0.025));
      liquid.position.y = 0.004 + liquid.scale.y / 2;
      ST.col.lerp(ST.colT, Math.min(1, dt * 1.4));
      _c.copy(ST.col);
      if (ST.cloud > 0.01) _c.lerp(ST.cloudCol, ST.cloud * 0.8);
      liquid.material.color.copy(_c);
      ST.cloud *= Math.pow(0.995, dt * 60);

      ST.emitters.forEach(e => {
        e.t += dt;
        if (Math.random() < 0.65) spawnBubble();
      });
      ST.emitters = ST.emitters.filter(e => e.t < e.d);

      const sy = surfaceY();
      P.bubbles.forEach(b => {
        b.p.y += b.v * dt;
        b.p.x += Math.sin(t * 7 + b.ph) * 0.0003;
        if (b.p.y > sy) b.dead = true;
      });
      P.bubbles = P.bubbles.filter(b => !b.dead).slice(-400);
      writeInst(bubbleMesh, P.bubbles, b => { _p.copy(b.p); _s.setScalar(b.r); });

      const sedTop = BK.bottom + 0.004 + sediment.children.reduce((a, m) => a + m.userData.h, 0);
      P.flakes.forEach(f => {
        f.p.y -= f.v * dt;
        if (f.p.y < sedTop) {
          f.dead = true;
          f.layer.userData.h = Math.min(0.022, f.layer.userData.h + 0.00006);
        }
      });
      P.flakes = P.flakes.filter(f => !f.dead);
      writeInst(flakeMesh, P.flakes, f => { _p.copy(f.p); _s.setScalar(f.r); }, true);
      let y0 = 0.004;
      sediment.children.forEach(m => {
        m.scale.y = m.userData.h;
        m.position.y = y0 + m.userData.h / 2;
        y0 += m.userData.h;
      });

      P.stream.forEach(s => {
        s.v.y -= 9.8 * dt;
        s.p.addScaledVector(s.v, dt);
        if (s.p.y < Math.max(sy, BK.bottom + 0.01)) s.dead = true;
      });
      P.stream = P.stream.filter(s => !s.dead).slice(-140);
      if (P.stream.length) streamMesh.material.color.set(P.stream[P.stream.length - 1].col);
      writeInst(streamMesh, P.stream, s => { _p.copy(s.p); _s.set(s.r, s.r * 2.2, s.r); });

      P.drops.forEach(d => {
        d.v -= 9.8 * dt;
        d.p.y += d.v * dt;
        if (d.p.y < sy) d.dead = true;
      });
      P.drops = P.drops.filter(d => !d.dead);
      if (P.drops.length) dropMesh.material.color.set(P.drops[0].col);
      writeInst(dropMesh, P.drops, d => { _p.copy(d.p); _s.set(0.0032, 0.0045, 0.0032); });

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      domEl.removeEventListener('contextmenu', onContextMenu);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      Sound.burner(false);
      Sound.pour(false);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }}>
      {/* To'liq Ekranli 3D VR Chemistry Lab Sahnasi */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Yuqori Rakurs Tanlash Paneli */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 190,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 5,
        background: 'rgba(15, 23, 42, 0.80)',
        padding: '5px 8px',
        borderRadius: 10,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
      }}>
        {SCENE_PRESETS.map((p) => {
          const act = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePresetChange(p.id)}
              style={{
                padding: '5px 9px',
                borderRadius: 7,
                border: act ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.18)',
                background: act ? '#1e78d6' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                fontSize: 10.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Pastki Chap: Bosh Burilishi (Xona bo'ylab harakat) va O'zbekcha Doska Boshqaruv Pulti */}
      <div style={{
        position: 'fixed',
        bottom: 12,
        left: 14,
        zIndex: 190,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(15, 23, 42, 0.84)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 11,
        padding: '7px 10px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}>
        {/* Bosh harakati va Xonani chap/o'ngga burish */}
        <button
          onClick={() => setHeadMode(m => (m === 'auto' ? 'key' : m === 'key' ? 'off' : 'auto'))}
          title="Bosh rejimi (H tugmasi): Avto — qoʻl yoʻq paytda ishlaydi; Shift — faqat Shift bosib turilganda; Oʻchiq"
          style={{
            padding: '5px 9px',
            borderRadius: 7,
            background: headMode === 'off' ? 'rgba(255,255,255,0.08)' : headGate === 'live' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(250, 204, 21, 0.18)',
            border: `1px solid ${headMode === 'off' ? 'rgba(255,255,255,0.2)' : headGate === 'live' ? '#10b981' : '#facc15'}`,
            color: headMode === 'off' ? '#cbd5e1' : headGate === 'live' ? '#a7f3d0' : '#fde68a',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🙂 Bosh: {headMode === 'auto' ? 'Avto' : headMode === 'key' ? 'Shift bilan' : 'Oʻchiq'}
          {headMode !== 'off' && (
            <span style={{ opacity: 0.85, fontWeight: 600 }}>
              {' · '}{headGate === 'live'
                ? `faol (${hand?.headAngleDeg > 0 ? '+' : ''}${hand?.headAngleDeg || 0}°)`
                : headGate === 'frozen'
                ? (headMode === 'key' ? 'Shift bosing' : 'qoʻl faol — qotgan')
                : 'yuz topilmadi'}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            hand?.recenterHead?.();
            lookOffsetRef.current.manualYaw = 0;
            lookOffsetRef.current.pitch = 0;
            headAppliedRef.current = { yaw: 0, pitch: 0 };
          }}
          title="Boshning hozirgi holatini Markaz (0°) deb kalibrlash"
          style={{
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(250, 204, 21, 0.2)',
            border: '1px solid #facc15',
            color: '#fde047',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🎯 0° Kalibrlash
        </button>
        <button
          onClick={() => setHeadSensitivity(s => s < 0.8 ? 1.0 : s < 1.2 ? 1.4 : 0.6)}
          title="Bosh burilishi sezgirligi"
          style={{
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(56, 189, 248, 0.16)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#7dd3fc',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ⚡ Sezgirlik: {headSensitivity > 1.2 ? 'Yuqori' : headSensitivity < 0.8 ? 'Past' : 'Oʻrta'}
        </button>

        <button
          onClick={() => panRoomManual(-0.28)}
          style={{
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ◀ Chapga qarash
        </button>
        <button
          onClick={() => { lookOffsetRef.current.manualYaw = 0; lookOffsetRef.current.pitch = 0; headAppliedRef.current = { yaw: 0, pitch: 0 }; }}
          style={{
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#38bdf8',
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🎯 Markaz
        </button>
        <button
          onClick={() => panRoomManual(0.28)}
          style={{
            padding: '5px 8px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Oʻngga qarash ▶
        </button>

        <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>

        {/* O'zbekcha Doskani surish va sahifalarini almashtirish */}
        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#fde047' }}>📋 Doska:</span>
        <button
          onClick={() => moveBoardDelta(-0.18, 0)}
          title="Doskani chapga surish"
          style={{
            padding: '4px 7px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.18)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            color: '#fde047',
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ◀ Surish
        </button>
        <button
          onClick={bringBoardToCenter}
          title="Doskani stol yoniga yaqinlashtirish"
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.28)',
            border: '1px solid #eab308',
            color: '#ffffff',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🔍 Yaqinlashtirish
        </button>
        <button
          onClick={() => moveBoardDelta(0.18, 0)}
          title="Doskani o'ngga surish"
          style={{
            padding: '4px 7px',
            borderRadius: 6,
            background: 'rgba(234, 179, 8, 0.18)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            color: '#fde047',
            fontSize: 10.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Surish ▶
        </button>

        {BOARD_PAGES.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setBoardPage(bp.id)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: boardPage === bp.id ? '#eab308' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: boardPage === bp.id ? '#0f172a' : '#e2e8f0',
              fontSize: 10,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {bp.short}
          </button>
        ))}

        <button
          onClick={() => boardControlRef.current.resetFlask?.()}
          style={{
            padding: '4px 9px',
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.22)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#fecaca',
            fontSize: 10.5,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ↺ Kolbani tozalash
        </button>
      </div>
    </div>
  );
}

export function ChemistryLab3DContent() {
  return null;
}

export function ChemistryLabHUD() {
  return null;
}
