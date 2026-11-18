// ═══════════════════════════════════════════════════════════════════════════
// AI O'qituvchi — 3D
// O'z xonasida (doska va eshik) turadi, gapiradi (lab harakati ovozga mos),
// qo'l harakatlari qiladi, jahli chiqsa yuzi qizaradi va boshidan bug' chiqadi,
// arazlasa eshikdan chiqib ketadi va bahona bilan qaytib keladi.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mouthLevel, unlockAudio, listen, listVoices, setVoice, voiceInfo } from '../teacher/voice';
import { TONE_LABEL } from '../teacher/brain';
import './teacher.css';

const TONE_COL = { calm: '#22c55e', strict: '#eab308', angry: '#f97316', rage: '#ef4444', happy: '#38bdf8', sulky: '#a78bfa' };
const lerp = THREE.MathUtils.lerp;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function buildRoom(scene) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshStandardMaterial({ color: '#dfe6ee', roughness: .9 }));
  wall.position.set(0, 1.6, -0.7); scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ color: '#b9c3cf', roughness: .7 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(6, .1, .02), new THREE.MeshStandardMaterial({ color: '#1e78d6' }));
  skirt.position.set(0, .05, -0.69); scene.add(skirt);
  // doska
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .66), new THREE.MeshStandardMaterial({
    roughness: .95, map: canvasTex(540, 312, (g, w, h) => {
      g.fillStyle = '#1f4d3a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#8b6b3e'; g.lineWidth = 14; g.strokeRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.88)'; g.font = 'italic 30px Georgia';
      g.fillText('2H₂ + O₂ → 2H₂O', 40, 70); g.fillText('pH = −lg[H⁺]', 40, 128);
      g.fillText('Zn + 2HCl → ZnCl₂ + H₂↑', 40, 186); g.font = '22px Georgia'; g.fillText('n = m / M', 360, 250);
    }),
  }));
  board.position.set(-0.42, 1.78, -0.68); scene.add(board);
  // eshik
  const frameMat = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: .6 });
  const doorX = 0.6;
  [[-0.29, 1.05, .06, 2.1], [0.29, 1.05, .06, 2.1], [0, 2.1, .64, .06]].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), frameMat); m.position.set(doorX + x, y, -0.66); scene.add(m);
  });
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(.52, 2.05), new THREE.MeshBasicMaterial({ color: '#3a4250' }));
  dark.position.set(doorX, 1.03, -0.695); scene.add(dark);
  const doorPivot = new THREE.Group(); doorPivot.position.set(doorX - 0.26, 0, -0.66); scene.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(.52, 2.04, .04), new THREE.MeshStandardMaterial({ color: '#b58a5a', roughness: .5 }));
  door.position.set(.26, 1.02, 0); doorPivot.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.025, 16, 12), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: .8, roughness: .3 }));
  knob.position.set(.46, 1.0, .04); doorPivot.add(knob);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.3, .09), new THREE.MeshBasicMaterial({
    map: canvasTex(300, 90, (g, w, h) => { g.fillStyle = '#1e3a5f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText('Kafedra', w / 2, 58); }),
  }));
  sign.position.set(.26, 1.62, .025); doorPivot.add(sign);
  return { doorPivot, doorX };
}

function buildTeacher() {
  const skin = new THREE.MeshStandardMaterial({ color: '#e7b48f', roughness: .62 });
  const coat = new THREE.MeshStandardMaterial({ color: '#f5f7fa', roughness: .55 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#2b3445', roughness: .7 });
  const hair = new THREE.MeshStandardMaterial({ color: '#a7adb6', roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: .4 });
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  // oyoqlar
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group(); hip.position.set(s * .1, .92, 0); body.add(hip);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.07, .06, .86, 16), trousers); leg.position.y = -.43; leg.castShadow = true; hip.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(.11, .07, .24), dark); shoe.position.set(0, -.86, .05); hip.add(shoe);
    return hip;
  });
  // xalat
  const coatG = new THREE.LatheGeometry([[0, .52], [.27, .52], [.25, .8], [.22, 1.1], [.23, 1.32], [.2, 1.42], [.08, 1.47], [0, 1.47]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
  const torso = new THREE.Mesh(coatG, coat); torso.scale.z = .72; torso.castShadow = true; body.add(torso);
  // ko'ylak, galstuk, lacqlar, cho'ntak
  const shirt = new THREE.Mesh(new THREE.PlaneGeometry(.13, .3), new THREE.MeshStandardMaterial({ color: '#cfe0f5' }));
  shirt.position.set(0, 1.3, .166); body.add(shirt);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(.045, .27, .01), new THREE.MeshStandardMaterial({ color: '#b91c1c' }));
  tie.position.set(0, 1.28, .172); body.add(tie);
  [-1, 1].forEach(s => {
    const lap = new THREE.Mesh(new THREE.BoxGeometry(.07, .32, .012), coat); lap.position.set(s * .075, 1.28, .172); lap.rotation.z = s * -.28; body.add(lap);
  });
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(.09, .07, .01), new THREE.MeshStandardMaterial({ color: '#e5e9ef' }));
  pocket.position.set(.11, 1.2, .168); body.add(pocket);
  ['#2563eb', '#dc2626'].forEach((c, i) => { const pen = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .08, 8), new THREE.MeshStandardMaterial({ color: c })); pen.position.set(.095 + i * .02, 1.25, .172); body.add(pen); });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(.08, .03), new THREE.MeshBasicMaterial({ map: canvasTex(160, 60, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e3a5f'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('USTOZ', w / 2, 42); }) }));
  badge.position.set(-.11, 1.24, .17); body.add(badge);
  // bo'yin va bosh
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .055, .1, 16), skin); neck.position.y = 1.5; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.64; body.add(head);
  const faceMat = skin.clone();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 24), faceMat); skull.scale.set(1, 1.12, 1); skull.castShadow = true; head.add(skull);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(.127, 32, 16, 0, Math.PI * 2, 0, Math.PI * .42), hair); hairTop.position.set(0, .015, -.012); hairTop.scale.set(1, 1.08, 1.02); head.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(.126, 24, 16, Math.PI * .15, Math.PI * .7, Math.PI * .25, Math.PI * .45), hair); hairBack.rotation.y = Math.PI; head.add(hairBack);
  [-1, 1].forEach(s => { const ear = new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 10), faceMat); ear.position.set(s * .118, 0, 0); ear.scale.set(.5, 1, .8); head.add(ear); });
  const eyes = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * .043, .02, .1); head.add(g);
    const white = new THREE.Mesh(new THREE.SphereGeometry(.021, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .2 })); white.scale.z = .6; g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.0105, 12, 10), dark); pupil.position.z = .011; g.add(pupil);
    return g;
  });
  const brows = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .011, .012), hair.clone()); b.material.color.set('#6b7280'); b.position.set(s * .045, .062, .112); head.add(b); return b; });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#111827', metalness: .6, roughness: .3 });
  [-1, 1].forEach(s => { const rim = new THREE.Mesh(new THREE.TorusGeometry(.03, .0035, 8, 28), glassMat); rim.position.set(s * .043, .02, .122); head.add(rim); });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(.026, .004, .004), glassMat); bridge.position.set(0, .026, .124); head.add(bridge);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.019, 12, 10), faceMat); nose.position.set(0, -.012, .122); nose.scale.set(.85, 1.1, 1); head.add(nose);
  const stache = new THREE.Mesh(new THREE.CapsuleGeometry(.009, .055, 4, 8), hair); stache.rotation.z = Math.PI / 2; stache.position.set(0, -.045, .115); head.add(stache);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: '#5b1414', roughness: .5 })); mouth.position.set(0, -.072, .108); head.add(mouth);
  const blush = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.CircleGeometry(.022, 16), new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0, depthWrite: false })); b.position.set(s * .068, -.028, .112); b.rotation.y = s * .45; head.add(b); return b; });
  // qo'llar
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * .245, 1.38, 0); body.add(sh);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(.058, .05, .3, 14), coat); up.position.y = -.15; up.castShadow = true; sh.add(up);
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el);
    const fo = new THREE.Mesh(new THREE.CylinderGeometry(.05, .045, .27, 14), coat); fo.position.y = -.135; fo.castShadow = true; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), skin); hand.position.y = -.3; hand.scale.set(.85, 1.1, .7); el.add(hand);
    return { sh, el, hand };
  });
  // bug' (g'azabda)
  const steamTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const steam = Array.from({ length: 10 }, (_, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false })); sp.userData.ph = i / 10; head.add(sp); return sp; });
  return { root, body, legs, head, eyes, brows, mouth, faceMat, blush, arms, steam };
}

// ═══ Skeletga bog'liq bo'lmagan animatsiya ═══════════════════════════════
// Qo'l/oyoq «yo'nalish» bilan beriladi (personaj koordinatasida: +x — chap,
// +y — yuqori, +z — oldinga). Bu ham ichki Domlaga, ham istalgan Mixamo /
// Ready Player Me GLB personajga bir xil ishlaydi.
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const DIRS = {
  rest:     { R: [V(-.12, -1, .03), V(-.05, -1, .14)], L: [V(.12, -1, .03), V(.05, -1, .14)] },
  talk:     { R: [V(-.25, -.85, .45), V(-.1, .15, 1)], L: [V(.12, -1, .05), V(.05, -1, .2)] },
  talk2:    { R: [V(-.12, -1, .05), V(-.05, -1, .2)], L: [V(.25, -.85, .45), V(.1, .15, 1)] },
  explain:  { R: [V(-.3, -.85, .4), V(-.4, .05, 1)], L: [V(.3, -.85, .4), V(.4, .05, 1)] },
  emph:     { R: [V(-.3, -.25, .9), V(-.1, .95, .35)], L: [V(.15, -1, .1), V(.1, -.6, .8)] },
  point:    { R: [V(-.3, .05, 1), V(.2, .12, 1)], L: [V(.2, -.95, -.05), V(-.6, -.2, .2)] },
  fist:     { R: [V(-.45, .78, .2), V(-.05, 1, .12)], L: [V(.55, -.8, -.15), V(-.8, -.2, .2)] },
  clap:     { R: [V(-.1, -.8, .6), V(.8, .2, .6)], L: [V(.1, -.8, .6), V(-.8, .2, .6)] },
  facepalm: { R: [V(-.05, -.45, .9), V(.55, 1, .1)], L: [V(.15, -1, .05), V(.05, -1, .2)] },
  hips:     { R: [V(-.55, -.8, -.15), V(.75, -.25, .25)], L: [V(.55, -.8, -.15), V(-.75, -.25, .25)] },
  cross:    { R: [V(-.2, -.92, .3), V(1, .05, .2)], L: [V(.2, -.92, .3), V(-1, .12, .25)] },
  glasses:  { R: [V(-.05, -.45, .9), V(.4, 1, .12)], L: [V(.12, -1, .05), V(.05, -1, .2)] },
};
const TALK_CALM = ['talk', 'talk2', 'explain', 'emph', 'talk'];
const TALK_ANGRY = ['point', 'emph', 'fist', 'point'];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qi = new THREE.Quaternion();
function aimBone(bone, child, dirW, w = 1) {
  if (!bone || !child || !bone.parent || w <= 0) return;
  bone.updateWorldMatrix(true, false); child.updateWorldMatrix(true, false);
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  const cur = _b.sub(_a); if (cur.lengthSq() < 1e-12) return; cur.normalize();
  _q1.setFromUnitVectors(cur, dirW); if (w < 1) _q1.copy(_qi.identity().slerp(_q1, w));
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q1);
  bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}
function rotWorld(bone, axisW, ang) {
  if (!bone || !bone.parent || !ang) return;
  _q1.setFromAxisAngle(axisW, ang);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q1);
  bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

// GLB personaj: suyaklarni nomidan topish (Mixamo, Ready Player Me, Unreal)
const BONE_ALIAS = {
  head: ['head'], neck: ['neck', 'neck_01'], spine: ['spine2', 'spine1', 'spine_03', 'chest', 'spine'], hips: ['hips', 'pelvis'], jaw: ['jaw'],
  rArm: ['rightarm', 'upperarm_r', 'r_upperarm'], rFore: ['rightforearm', 'lowerarm_r', 'r_forearm'], rHand: ['righthand', 'hand_r', 'r_hand'],
  lArm: ['leftarm', 'upperarm_l', 'l_upperarm'], lFore: ['leftforearm', 'lowerarm_l', 'l_forearm'], lHand: ['lefthand', 'hand_l', 'l_hand'],
  rUp: ['rightupleg', 'thigh_r'], rLeg: ['rightleg', 'calf_r'], rFoot: ['rightfoot', 'foot_r'],
  lUp: ['leftupleg', 'thigh_l'], lLeg: ['leftleg', 'calf_l'], lFoot: ['leftfoot', 'foot_l'],
};
function findBones(root) {
  const map = {};
  root.traverse(o => { if (o.isBone || o.type === 'Object3D') { const n = o.name.replace(/^.*?(mixamorig|rig|armature)[:_]?/i, '').toLowerCase(); if (!map[n]) map[n] = o; } });
  const out = {};
  for (const [k, al] of Object.entries(BONE_ALIAS)) out[k] = al.map(a => map[a]).find(Boolean) || null;
  return out;
}
const MORPH = { mouth: ['viseme_aa', 'jawOpen', 'mouthOpen', 'MouthOpen', 'mouth_open'], blinkL: ['eyeBlinkLeft', 'eyeBlink_L', 'blink'], blinkR: ['eyeBlinkRight', 'eyeBlink_R'],
  browL: ['browDownLeft'], browR: ['browDownRight'], browUp: ['browInnerUp'], smile: ['mouthSmile', 'mouthSmileLeft'], smile2: ['mouthSmileRight'], frown: ['mouthFrownLeft'], frown2: ['mouthFrownRight'] };

async function loadTeacherGLB() {
  const url = (import.meta.env.BASE_URL || '/') + 'models/teacher.glb';
  try {
    const h = await fetch(url, { method: 'HEAD' });
    if (!h.ok || /text\/html/i.test(h.headers.get('content-type') || '')) return null;
  } catch { return null; }
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const mats = [];
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); mats.push(o.material); } } });
  // o'lchami: bo'yi 1.75 m, oyog'i polda, markazda
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true), size = box.getSize(new THREE.Vector3());
  const k = 1.75 / (size.y || 1);
  const wrap = new THREE.Group(); wrap.add(root);
  root.scale.multiplyScalar(k); root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root, true);
  root.position.sub(new THREE.Vector3((b2.min.x + b2.max.x) / 2, b2.min.y, (b2.min.z + b2.max.z) / 2));
  const bones = findBones(root);
  // yuzini kameraga (+z) qaratamiz: chap yelka − o'ng yelka = «chap», oldinga = chap × yuqori
  const lb = bones.lArm || bones.lUp, rb = bones.rArm || bones.rUp;
  if (lb && rb) {
    wrap.updateMatrixWorld(true);
    const l = lb.getWorldPosition(new THREE.Vector3()).sub(rb.getWorldPosition(new THREE.Vector3()));
    const fwd = l.cross(new THREE.Vector3(0, 1, 0));
    if (fwd.lengthSq() > 1e-8) { const yaw = Math.atan2(fwd.x, fwd.z); root.rotation.y -= yaw; root.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw); }
  }
  const morphs = [];
  root.traverse(o => { if (o.isMesh && o.morphTargetDictionary) morphs.push(o); });
  const mixer = gltf.animations.length ? new THREE.AnimationMixer(root) : null;
  const clip = (re) => gltf.animations.find(c => re.test(c.name));
  const acts = {};
  if (mixer) {
    for (const [key, re] of Object.entries({ idle: /idle|stand|breath/i, walk: /walk/i, talk: /talk|speak/i, angry: /angry|mad|yell|shout/i, clap: /clap|cheer|happy|applau/i })) {
      const c = clip(re); if (c) { acts[key] = mixer.clipAction(c); }
    }
    if (!acts.idle) acts.idle = mixer.clipAction(gltf.animations.find(c => !/walk|run|t-?pose/i.test(c.name)) || gltf.animations[0]);
  }
  // animatsiyasiz personaj uchun: har kadrda suyaklar dastlabki holatga qaytariladi (burilishlar yig'ilib ketmasin)
  const restQ = new Map();
  root.traverse(o => { if (o.isBone) restQ.set(o, o.quaternion.clone()); });
  // jahlda faqat yuz/teri qizaradi (kiyim emas)
  const skinMats = mats.filter(m => /skin|head|face/i.test(m.name || ''));
  return { root: wrap, bones, morphs, mixer, acts, mats: skinMats.length ? skinMats : mats, restQ };
}
function setMorph(meshes, names, v) {
  // har bir to'r uchun ro'yxatdagi birinchi mavjud shakl (bir nechtasi qo'shilib ketmasin)
  for (const m of meshes) for (const n of names) { const i = m.morphTargetDictionary[n]; if (i !== undefined) { m.morphTargetInfluences[i] = v; break; } }
}

export default function Teacher3D({ brain, compact = false, dock = false }) {
  const mount = useRef(null);
  const [st, setSt] = useState({ text: '', tone: 'calm', anger: 10, phase: 'present', speaking: false, muted: false });
  const [shown, setShown] = useState('');
  const [msg, setMsg] = useState('');
  const [rec, setRec] = useState(false);
  const [min, setMin] = useState(false);
  const [voices, setVoices] = useState([]);
  const [vsel, setVsel] = useState(() => { try { return localStorage.getItem('domla-voice') || ''; } catch { return ''; } });

  useEffect(() => brain.on(b => setSt({ text: b.text, tone: b.tone, anger: b.anger, phase: b.phase, speaking: b.speaking, muted: b.muted })), [brain]);
  useEffect(() => { listVoices().then(setVoices); }, []);

  // matnni yozib chiqarish effekti
  useEffect(() => {
    if (!st.text) { setShown(''); return; }
    const t = st.text, t0 = performance.now(); setShown('');
    const id = setInterval(() => { const i = Math.ceil((performance.now() - t0) / 22); setShown(t.slice(0, i)); if (i >= t.length) clearInterval(id); }, 40);
    return () => clearInterval(id);
  }, [st.text]);

  useEffect(() => {
    const el = mount.current; if (!el) return;
    const W = el.clientWidth || 280, H = el.clientHeight || 260;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    el.innerHTML = ''; el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe6ee');
    const cam = new THREE.PerspectiveCamera(26, W / H, .1, 20);
    if (dock) { cam.position.set(-0.1, 1.52, 2.05); cam.lookAt(-0.12, 1.42, 0); } else { cam.position.set(0.12, 1.42, 2.55); cam.lookAt(0.12, 1.27, 0); }
    scene.add(new THREE.HemisphereLight('#ffffff', '#9aa6b5', 1.4));
    const key = new THREE.DirectionalLight('#fff6ea', 2.2); key.position.set(1.5, 3, 2.5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const rim = new THREE.DirectionalLight('#9fd3ff', 1.1); rim.position.set(-2, 2, -1.5); scene.add(rim);
    const redLight = new THREE.PointLight('#ff3b2f', 0, 3); redLight.position.set(0, 1.7, .9); scene.add(redLight);
    const room = buildRoom(scene);
    const T = buildTeacher(); scene.add(T.root);
    let G = null;                                     // yuklangan GLB personaj (bo'lsa)
    let disposed = false;
    loadTeacherGLB().then(g => {
      if (!g || disposed) return;
      G = g; scene.add(g.root); T.root.visible = false;
      if (g.acts.idle) g.acts.idle.play();
    }).catch(e => console.warn('[O\'qituvchi] teacher.glb yuklanmadi:', e.message));
    const steamTex = T.steam[0].material.map;
    const steamG = new THREE.Group(); scene.add(steamG);
    const gSteam = Array.from({ length: 10 }, (_, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false })); sp.userData.ph = i / 10; steamG.add(sp); return sp; });

    const A = { x: -0.12, z: 0, yaw: 0, walk: 0, door: 0, visible: true, mouth: 0, red: 0, gw: 0, look: 0, nod: 0 };
    const cur = {}; for (const s2 of ['R', 'L']) cur[s2] = DIRS.rest[s2].map(v => v.clone());
    let talkPose = 'talk', talkT = 0, idlePose = 'rest', idleT = 4, lastAct = null;
    const up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(1, 0, 0), dW = new THREE.Vector3(), qRoot = new THREE.Quaternion();
    let raf, last = performance.now();
    const frame = (now) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
      const b = brain; const tone = b.tone; const angry = tone === 'angry' || tone === 'rage';
      // ── yurish: eshik tomon borib chiqib ketadi, o'sha eshikdan qaytadi
      const DX = room.doorX, HOME = -0.12, OUT = -1.0, sp = dt * .9;
      let walking = false, targetYaw = 0;
      const step = (axis, to) => { const d = to - A[axis]; if (Math.abs(d) < .015) { A[axis] = to; return true; } A[axis] += Math.sign(d) * Math.min(Math.abs(d), sp); walking = true; return false; };
      if ((b.phase === 'leaving' && !b.speaking) || b.phase === 'away') {
        if (A.z > OUT + .02 && Math.abs(A.x - DX) > .015) { step('x', DX); targetYaw = Math.PI / 2; }
        else { step('z', OUT); targetYaw = Math.PI; }
        A.visible = A.z > OUT + .05;
      } else if (b.phase === 'leaving') { targetYaw = .35; }
      else if (b.phase === 'returning') {
        if (!A.visible) { A.visible = true; A.x = DX; A.z = OUT; }
        if (A.z < -0.01) { step('z', 0); targetYaw = 0; } else { step('x', HOME); targetYaw = -Math.PI / 2; }
      } else { A.visible = true; if (Math.abs(A.z) > .01 || Math.abs(A.x - HOME) > .015) { if (A.z < -0.01) step('z', 0); else step('x', HOME); targetYaw = A.z < -0.01 ? 0 : -Math.PI / 2; } }
      if (!walking && b.phase !== 'leaving' && b.phase !== 'away') targetYaw = 0;
      let dy = targetYaw - A.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      A.yaw += dy * Math.min(1, dt * 6);
      A.walk += walking ? dt * 7 : 0;
      const doorOpen = (b.phase === 'leaving' || b.phase === 'returning' || (b.phase === 'away' && A.visible)) && A.x > .25 ? 1 : 0;
      A.door += (doorOpen - A.door) * Math.min(1, dt * 4);
      room.doorPivot.rotation.y = -A.door * 1.45;
      const actor = G ? G.root : T.root;
      actor.visible = A.visible; actor.position.set(A.x, 0, A.z); actor.rotation.y = A.yaw;
      if (!G) T.root.visible = A.visible;

      // ── qaysi poza: imo-ishora > gapirish > kayfiyat > bo'sh turish
      talkT -= dt; idleT -= dt;
      if (b.speaking && talkT <= 0) { const pool = angry ? TALK_ANGRY : TALK_CALM; let n; do { n = pool[Math.floor(Math.random() * pool.length)]; } while (n === talkPose && pool.length > 1); talkPose = n; talkT = 1.1 + Math.random() * 1.1; A.nod = .25; }
      if (!b.speaking && idleT <= 0) {
        const pool = tone === 'strict' ? ['cross', 'rest', 'cross'] : tone === 'sulky' || tone === 'rage' ? ['hips', 'cross'] : ['rest', 'rest', 'glasses', 'rest', 'cross'];
        idlePose = pool[Math.floor(Math.random() * pool.length)]; idleT = idlePose === 'glasses' ? 1.6 : 4 + Math.random() * 4;
        A.look = (Math.random() - .5) * .9;          // goh laboratoriyaga, goh o'quvchiga qaraydi
      }
      let pose = 'rest';
      if (walking) pose = 'rest';
      else if (b.gesture && DIRS[b.gesture]) pose = b.gesture;
      else if (b.phase === 'away') pose = 'rest';
      else if (b.speaking) pose = talkPose;
      else pose = idlePose;
      // ── animatsiya kliplari (GLB da bo'lsa)
      if (G && G.mixer) {
        const want = walking && G.acts.walk ? 'walk' : (b.speaking && G.acts.talk ? 'talk' : (angry && G.acts.angry ? 'angry' : (b.gesture === 'clap' && G.acts.clap ? 'clap' : 'idle')));
        if (want !== lastAct) { const nx = G.acts[want] || G.acts.idle; const pv = lastAct && (G.acts[lastAct] || G.acts.idle); if (nx) { nx.reset().fadeIn(.35).play(); if (pv && pv !== nx) pv.fadeOut(.35); } lastAct = want; }
        G.mixer.update(dt * (angry ? 1.25 : 1));
      } else if (G) {
        G.restQ.forEach((q, bone) => bone.quaternion.copy(q));
      }
      // ── qo'llar
      const k = Math.min(1, dt * 6);
      for (const side of ['R', 'L']) for (let i = 0; i < 2; i++) cur[side][i].lerp(DIRS[pose][side][i], k).normalize();
      const wob = b.speaking ? Math.sin(t * 7) * .18 : Math.sin(t * 1.3) * .03;
      const clap = b.gesture === 'clap' ? Math.sin(t * 16) * .35 : 0;
      const shake = b.gesture === 'fist' || (angry && b.speaking && pose === 'point') ? Math.sin(t * 22) * .22 : 0;
      actor.updateMatrixWorld(true); actor.getWorldQuaternion(qRoot);
      const toW = (v, ox = 0, oy = 0, oz = 0) => dW.set(v.x + ox, v.y + oy, v.z + oz).normalize().applyQuaternion(qRoot);
      const hasAnimRest = G && G.mixer && G.acts.idle;
      const gwT = (pose !== 'rest' || !hasAnimRest) && !(walking && G && G.acts.walk) ? 1 : 0;
      A.gw += (gwT - A.gw) * Math.min(1, dt * 5);
      const W2 = G ? A.gw : 1;
      const arm = G ? { R: [G.bones.rArm, G.bones.rFore, G.bones.rHand], L: [G.bones.lArm, G.bones.lFore, G.bones.lHand] }
                    : { R: [T.arms[0].sh, T.arms[0].el, T.arms[0].hand], L: [T.arms[1].sh, T.arms[1].el, T.arms[1].hand] };
      const swing = walking ? Math.sin(A.walk) * .45 : 0;
      for (const side of ['R', 'L']) {
        const sg = side === 'R' ? -1 : 1;
        const [u, f] = cur[side];
        const ws = walking ? swing * (side === 'R' ? 1 : -1) : 0;
        aimBone(arm[side][0], arm[side][1], toW(u, clap * sg * -1, 0, ws + (side === 'R' ? shake * .3 : 0)), W2);
        aimBone(arm[side][1], arm[side][2], toW(f, clap * sg * -1.2, side === 'R' ? wob + shake : wob * .6, 0), W2);
      }
      // ── oyoqlar
      if (G) {
        if (!(G.mixer && G.acts.walk) || !walking) {
          const s1 = walking ? Math.sin(A.walk) * .5 : 0;
          if (!hasAnimRest || walking) {
            aimBone(G.bones.rUp, G.bones.rLeg, toW(new THREE.Vector3(-.06, -1, s1)), 1); aimBone(G.bones.rLeg, G.bones.rFoot, toW(new THREE.Vector3(0, -1, s1 > 0 ? 0 : -s1 * .8)), 1);
            aimBone(G.bones.lUp, G.bones.lLeg, toW(new THREE.Vector3(.06, -1, -s1)), 1); aimBone(G.bones.lLeg, G.bones.lFoot, toW(new THREE.Vector3(0, -1, s1 < 0 ? 0 : s1 * .8)), 1);
          }
        }
      } else {
        const sw = walking ? Math.sin(A.walk) * .55 : 0;
        T.legs[0].rotation.x = sw; T.legs[1].rotation.x = -sw;
        T.body.position.y = walking ? Math.abs(Math.cos(A.walk)) * .025 : Math.sin(t * 1.6) * .004;
      }
      // ── bosh: atrofga qarash, bosh irg'ash, jahlda oldinga engashish
      A.nod *= Math.exp(-dt * 3);
      const yaw = b.phase === 'present' && !walking ? Math.sin(t * .6) * .1 + A.look * (b.speaking ? .35 : 1) : 0;
      const pitch = (b.speaking ? Math.sin(t * 5.2) * .07 + A.nod * Math.sin(t * 14) : 0) + (tone === 'sulky' ? -.15 : 0) + (b.gesture === 'facepalm' ? .3 : 0) + (angry ? .08 : 0);
      const roll = tone === 'happy' ? Math.sin(t * 2) * .08 : tone === 'sulky' ? .12 : 0;
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qRoot), rgt = right.clone().applyQuaternion(qRoot);
      if (G) {
        rotWorld(G.bones.neck, up, yaw * .4); rotWorld(G.bones.head, up, yaw * .6);
        rotWorld(G.bones.head, rgt, pitch); rotWorld(G.bones.head, fwd, roll);
        rotWorld(G.bones.spine, rgt, (angry ? .07 : 0) + Math.sin(t * 1.6) * .015);
      } else {
        T.head.rotation.set(pitch, yaw, roll);
        T.body.rotation.x = angry ? .05 : 0;
      }
      // ── yuz: og'iz, ko'z, qosh, qizarish
      A.mouth = lerp(A.mouth, b.speaking ? mouthLevel() : 0, Math.min(1, dt * 18));
      const blink = (t % 3.7) < .12 ? 1 : 0;
      const browAng = tone === 'rage' ? .55 : tone === 'angry' ? .4 : tone === 'strict' ? .2 : tone === 'happy' ? -.18 : tone === 'sulky' ? -.3 : 0;
      A.red = lerp(A.red, tone === 'rage' ? 1 : tone === 'angry' ? .55 : tone === 'strict' ? .18 : 0, Math.min(1, dt * 2));
      if (G) {
        setMorph(G.morphs, MORPH.mouth, A.mouth * .9);
        setMorph(G.morphs, MORPH.blinkL, blink); setMorph(G.morphs, MORPH.blinkR, blink);
        setMorph(G.morphs, MORPH.browL, Math.max(0, browAng) * 1.6); setMorph(G.morphs, MORPH.browR, Math.max(0, browAng) * 1.6);
        setMorph(G.morphs, MORPH.browUp, tone === 'sulky' ? .7 : 0);
        setMorph(G.morphs, MORPH.smile, tone === 'happy' ? .7 : 0); setMorph(G.morphs, MORPH.smile2, tone === 'happy' ? .7 : 0);
        setMorph(G.morphs, MORPH.frown, angry ? .6 : 0); setMorph(G.morphs, MORPH.frown2, angry ? .6 : 0);
        if (!G.morphs.length && G.bones.jaw) rotWorld(G.bones.jaw, rgt, A.mouth * .25);
        G.mats.forEach(m => { if (m.emissive) m.emissive.setRGB(A.red * .22, 0, 0); });
      } else {
        T.mouth.scale.set(angry ? .036 : .03, .004 + A.mouth * .022, .012);
        T.eyes.forEach(e => { e.scale.y = blink ? .1 : 1; });
        T.brows[0].rotation.z = lerp(T.brows[0].rotation.z, -browAng, k); T.brows[1].rotation.z = lerp(T.brows[1].rotation.z, browAng, k);
        T.brows.forEach(br => { br.position.y = lerp(br.position.y, angry ? .052 : tone === 'happy' ? .07 : .062, k); });
        T.faceMat.color.set('#e7b48f').lerp(new THREE.Color('#e0564a'), A.red * .7);
        T.blush.forEach(bl => { bl.material.opacity = A.red * .55; });
      }
      redLight.intensity = A.red > .6 ? (A.red - .6) * 6 * (0.7 + .3 * Math.sin(t * 9)) : 0;
      // jahlda titrash
      const tremble = tone === 'rage' ? .012 : tone === 'angry' && b.speaking ? .006 : 0;
      actor.position.x += tremble ? Math.sin(t * 60) * tremble : 0;
      // bug' (g'azabda boshidan chiqadi)
      const headObj = G ? (G.bones.head || G.root) : T.head;
      headObj.getWorldPosition(_a);
      steamG.position.copy(_a);
      const sprites = G ? gSteam : T.steam;
      if (!G) gSteam.forEach(s3 => { s3.material.opacity = 0; });
      sprites.forEach((sp2, i) => {
        const on = tone === 'rage' && A.visible;
        const ph = (t * .6 + sp2.userData.ph) % 1;
        sp2.position.set((i % 2 ? 1 : -1) * (.09 + ph * .05), (G ? .1 : .12) + ph * .28, -.02);
        sp2.scale.setScalar(.05 + ph * .12);
        sp2.material.opacity = on ? (1 - ph) * .75 : 0;
      });
      renderer.render(scene, cam);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (w && h) { renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } });
    ro.observe(el);
    return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); };
  }, [brain, dock]);

  const send = (e) => { e.preventDefault(); const v = msg.trim(); if (!v) return; setMsg(''); unlockAudio(); brain.chat(v); };
  const mic = () => {
    unlockAudio();
    if (rec) return;
    const r = listen(t => brain.chat(t), () => setRec(false));
    if (r) setRec(true); else brain.say('Brauzeringiz ovozni tanimaydi. Yozib yuboring.');
  };
  const col = TONE_COL[st.tone] || '#22c55e';
  const away = st.phase === 'away';

  return (
    <div className={`domla3d tone-${st.tone}${min ? ' min' : ''}${compact ? ' compact' : ''}${dock ? ' dock' : ''}`} style={{ '--tc': col }} onPointerDown={unlockAudio}>
      {shown && !min && !dock && <div className={`d-bubble${away ? ' away' : ''}`}>{shown}</div>}
      <div className="d-card">
        <div className="d-head">
          <b>O'qituvchi</b>
          <span className="d-mood">{away ? 'Xonada yo\'q' : st.phase === 'returning' ? 'Qaytib kelyapti' : TONE_LABEL[st.tone]}</span>
          <button title={st.muted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'} onClick={() => brain.mute(!st.muted)}>{st.muted ? '🔇' : '🔊'}</button>
          <button title={min ? 'Kattalashtirish' : 'Kichraytirish'} onClick={() => setMin(m => !m)}>{min ? '▢' : '—'}</button>
        </div>
        <div className="d-meter" title={`Jahl: ${Math.round(st.anger)}%`}><i style={{ width: `${st.anger}%` }} /></div>
        <div className="d-stage" ref={mount} hidden={min} />
        {dock && !min && <div className={`d-text${away ? ' away' : ''}`}>{shown || 'Savolingiz bo\'lsa, yozing yoki mikrofonni bosing.'}</div>}
        {!min && (
          <form className="d-form" onSubmit={send}>
            <button type="button" className={`d-mic${rec ? ' on' : ''}`} onClick={mic} title="Gapirish">🎙</button>
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="O'qituvchiga savol yoki javob…" />
          </form>
        )}
        {!min && voices.length > 0 && (
          <select className="d-voice" value={vsel} onChange={e => { setVsel(e.target.value); setVoice(e.target.value); unlockAudio(); brain.say('Salom! Endi shu ovozda gapiraman.'); }}>
            <option value="">Ovoz: avtomatik</option>
            {voices.map(v => <option key={v.id} value={v.id}>{v.name}{v.desc ? ' — ' + v.desc.slice(0, 32) : ''}</option>)}
          </select>
        )}
        {!min && <div className="d-src" title={voiceInfo.error}>Ovoz: {voiceInfo.provider}{voiceInfo.error ? ' · xato: ' + voiceInfo.error.slice(0, 70) : ''}</div>}
      </div>
    </div>
  );
}
