// ═══════════════════════════════════════════════════════════════════════════
// National AI Lab — platforma ma'lumotlari (foydalanuvchilar, tajribalar,
// vazifalar, natijalar).
// Hozircha brauzer xotirasida (localStorage) saqlanadi — demo va pilot uchun.
// Barcha o'qish/yozish shu fayl orqali o'tadi, shuning uchun keyin uni server
// API (masalan, /api/users, /api/assignments) bilan almashtirish oson.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { EXPERIMENTS } from '../config/experiments';
import { REACTIONS, SUB_MAP } from '../config/virtualLabChemEngine';

const KEY = 'national-ai-lab-db-v1';
const SKEY = 'national-ai-lab-session-v1';
const subs = new Set();

export const ROLES = {
  admin: { label: 'Admin', icon: '🛡️' },
  teacher: { label: "O'qituvchi", icon: '👩‍🏫' },
  student: { label: "O'quvchi / Talaba", icon: '🎓' },
};

// ── parol xeshi (SHA-256 + tuz). Brauzer crypto.subtle faqat HTTPS/localhost
//    da ishlaydi, shuning uchun kichik sof JS SHA-256 ishlatilgan.
function sha256(str) {
  const K = [], H = [];
  let n = 2, c = 0;
  const frac = x => ((x - Math.floor(x)) * 4294967296) | 0;
  while (c < 64) { let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; } if (p) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c] = frac(Math.pow(n, 1 / 3)); c++; } n++; }
  const bytes = unescape(encodeURIComponent(str)).split('').map(ch => ch.charCodeAt(0));
  const l = bytes.length * 8; bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  const rotr = (x, r) => (x >>> r) | (x << (32 - r));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, cc, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
const salt = () => Math.random().toString(36).slice(2, 10);
const hashPass = (pass, s) => sha256(s + ':' + pass);
const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── boshlang'ich ma'lumotlar (namuna hisoblar) ──────────────────────────────
function seedUser(role, login, pass, name, extra = {}) {
  const s = salt();
  return { id: uid('u'), role, login, salt: s, hash: hashPass(pass, s), name, createdAt: Date.now(), ...extra };
}
function seed() {
  const admin = seedUser('admin', 'admin', 'admin123', 'Platforma administratori');
  const teacher = seedUser('teacher', 'ustoz', 'ustoz123', 'Kimyo o\'qituvchisi', { subject: 'Kimyo' });
  const s1 = seedUser('student', 'talaba', 'talaba123', 'Namuna o\'quvchi', { kind: 'maktab', group: '8-A sinf' });
  const s2 = seedUser('student', 'talaba2', 'talaba123', 'Namuna talaba', { kind: 'talaba', group: 'KM-21 guruh' });
  const a1 = { id: uid('a'), expId: 'cuoh2', group: '8-A sinf', due: dayPlus(7), note: 'Cho\'kma rangini kuzating va daftarga yozing.', teacherId: teacher.id, createdAt: Date.now() };
  return { v: 1, users: [admin, teacher, s1, s2], experiments: [], assignments: [a1], submissions: [] };
}
function dayPlus(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// ── saqlash ────────────────────────────────────────────────────────────────
let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { cache = null; }
  if (!cache || cache.v !== 1) { cache = seed(); persist(); }
  return cache;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* xotira to'la */ }
  subs.forEach(f => f());
}
if (typeof window !== 'undefined') {
  // Boshqa oynada o'zgarsa (masalan, o'qituvchi vazifa berdi) — darhol yangilanadi
  window.addEventListener('storage', (e) => { if (e.key === KEY) { cache = null; subs.forEach(f => f()); } });
}
export function useDb() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set(x => x + 1); subs.add(f); return () => subs.delete(f); }, []);
  return load();
}
const pub = (u) => u && ({ id: u.id, role: u.role, login: u.login, name: u.name, group: u.group, kind: u.kind, subject: u.subject });

// ── kirish / chiqish ────────────────────────────────────────────────────────
export function login(loginName, pass, role) {
  const db = load();
  const u = db.users.find(x => x.login.toLowerCase() === String(loginName).trim().toLowerCase());
  if (!u || u.hash !== hashPass(pass, u.salt)) return { error: 'Login yoki parol noto\'g\'ri' };
  if (role && u.role !== role) return { error: `Bu hisob «${ROLES[u.role].label}» roliga tegishli. Yuqoridan to'g'ri rolni tanlang.` };
  try { localStorage.setItem(SKEY, JSON.stringify({ id: u.id, at: Date.now() })); } catch { /* */ }
  return { user: pub(u) };
}
export function logout() { try { localStorage.removeItem(SKEY); } catch { /* */ } subs.forEach(f => f()); }
export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SKEY) || 'null');
    if (!s) return null;
    return pub(load().users.find(u => u.id === s.id)) || null;
  } catch { return null; }
}

function checkLogin(login) {
  const l = String(login || '').trim();
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(l)) return 'Login 3–24 belgi: lotin harflari, raqam, _ . -';
  if (load().users.some(u => u.login.toLowerCase() === l.toLowerCase())) return 'Bu login band';
  return null;
}
export function registerStudent({ name, login: l, pass, group, kind }) {
  if (!name?.trim()) return { error: 'Ism-familiyani kiriting' };
  if (!group?.trim()) return { error: kind === 'talaba' ? 'Guruhni kiriting' : 'Sinfni kiriting' };
  const e = checkLogin(l); if (e) return { error: e };
  if (!pass || pass.length < 6) return { error: 'Parol kamida 6 belgi bo\'lsin' };
  const u = seedUser('student', l.trim(), pass, name.trim(), { kind, group: group.trim() });
  load().users.push(u); persist();
  return login(l, pass, 'student');
}
export function addTeacher({ name, login: l, pass, subject }) {
  if (!name?.trim()) return { error: 'Ism-familiyani kiriting' };
  const e = checkLogin(l); if (e) return { error: e };
  if (!pass || pass.length < 6) return { error: 'Parol kamida 6 belgi bo\'lsin' };
  load().users.push(seedUser('teacher', l.trim(), pass, name.trim(), { subject: subject?.trim() || 'Kimyo' })); persist();
  return { ok: true };
}
export function removeUser(id) {
  const db = load();
  const u = db.users.find(x => x.id === id);
  if (!u) return;
  if (u.role === 'admin' && db.users.filter(x => x.role === 'admin').length < 2) return { error: 'Oxirgi adminni o\'chirib bo\'lmaydi' };
  db.users = db.users.filter(x => x.id !== id);
  db.submissions = db.submissions.filter(s => s.studentId !== id);
  persist(); return { ok: true };
}
export const listUsers = (role) => load().users.filter(u => !role || u.role === role).map(pub);
export const userName = (id) => load().users.find(u => u.id === id)?.name || '—';
export const groupsList = () => [...new Set(load().users.filter(u => u.role === 'student').map(u => u.group))].sort();

// ── tajribalar ──────────────────────────────────────────────────────────────
// Admin faqat kimyo dvigateli biladigan reaksiyalardan tajriba tuza oladi —
// shunda har bir yangi tajriba 3D laboratoriyada haqiqatan bajariladi.
export const STORE_IDS = new Set(Object.values(SUB_MAP).filter(s => !s.hidden && s.cat).map(s => s.id));
export const ADDABLE_REACTIONS = REACTIONS.filter(r => r.reactants.every(id => STORE_IDS.has(id)));

export function customExperiments() { return load().experiments; }
export function allExperiments() {
  return [...EXPERIMENTS.map(e => ({ ...e, builtIn: true })), ...load().experiments].map((e, i) => ({ ...e, num: i + 1 }));
}
export const expById = (id) => allExperiments().find(e => e.id === id);
export function addExperiment(data, by) {
  if (!data.title?.trim()) return { error: 'Tajriba nomini kiriting' };
  if (!data.target) return { error: 'Reaksiyani tanlang' };
  if (!data.reagents?.length) return { error: 'Moddalar ro\'yxati bo\'sh' };
  const e = {
    id: uid('adm'), icon: data.icon || '⚗️', title: data.title.trim(), goal: (data.goal || '').trim(),
    product: data.product || '', reagents: data.reagents, steps: data.steps, ordered: !!data.ordered,
    target: data.target, watch: (data.watch || '').trim(), level: data.level || '8-sinf', createdBy: by, createdAt: Date.now(),
  };
  load().experiments.push(e); persist();
  return { ok: true, exp: e };
}
export function removeExperiment(id) {
  const db = load();
  db.experiments = db.experiments.filter(e => e.id !== id);
  persist();
}

// ── vazifalar va natijalar ──────────────────────────────────────────────────
export function addAssignment({ expId, group, due, note }, teacherId) {
  if (!expId) return { error: 'Tajribani tanlang' };
  if (!group) return { error: 'Sinf yoki guruhni tanlang' };
  const a = { id: uid('a'), expId, group, due: due || '', note: (note || '').trim(), teacherId, createdAt: Date.now() };
  load().assignments.unshift(a); persist();
  return { ok: true };
}
export function removeAssignment(id) {
  const db = load();
  db.assignments = db.assignments.filter(a => a.id !== id);
  db.submissions = db.submissions.filter(s => s.assignmentId !== id);
  persist();
}
export const assignmentsOfTeacher = (tid) => load().assignments.filter(a => a.teacherId === tid);
export const assignmentsForStudent = (st) => load().assignments.filter(a => a.group === '*' || a.group === st.group);
export const studentsOf = (group) => load().users.filter(u => u.role === 'student' && (group === '*' || u.group === group)).map(pub);
export const submissionsOf = (assignmentId) => load().submissions.filter(s => s.assignmentId === assignmentId);
export const bestSubmission = (assignmentId, studentId) =>
  load().submissions.filter(s => s.assignmentId === assignmentId && s.studentId === studentId).sort((a, b) => b.grade - a.grade || a.mistakes - b.mistakes)[0] || null;

export function gradeOf(mistakes) { return mistakes === 0 ? 5 : mistakes <= 2 ? 4 : 3; }
export function submitResult({ assignmentId, studentId, expId, mistakes, seconds }) {
  const s = { id: uid('s'), assignmentId, studentId, expId, mistakes, seconds, grade: gradeOf(mistakes), at: Date.now() };
  load().submissions.push(s); persist();
  return s;
}
export function isOverdue(a) { return a.due && a.due < new Date().toISOString().slice(0, 10); }
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
