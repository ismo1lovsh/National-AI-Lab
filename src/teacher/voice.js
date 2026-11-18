// ═══════════════════════════════════════════════════════════════════════════
// AI O'qituvchi ovozi: matn → nutq, his-tuyg'u bilan
//  1) VoiceLab (o'zbekcha, pullik) — Vite server orqali (kalit brauzerga chiqmaydi)
//  2) Gemini TTS — ohangni so'z bilan buyurish mumkin («jahl bilan o'qi»)
//  3) Brauzer ovozi (speechSynthesis) — zaxira
// Har qanday manbadan kelgan ovozga brauzerda his-tuyg'u effekti beriladi:
// jahlda — pastroq, keskin, baland; xursandlikda — ingichka, yorqin.
// ═══════════════════════════════════════════════════════════════════════════
/* global __VOICELAB__, __VOICELAB_VOICE__ */

const VL_ON = typeof __VOICELAB__ !== 'undefined' && __VOICELAB__;
const VL_ENV_VOICE = typeof __VOICELAB_VOICE__ !== 'undefined' ? __VOICELAB_VOICE__ : '';
const GEMINI_KEY = (import.meta.env.VITE_GEMINI_KEY || '').trim();

export const EMO = {
  calm:   { rate: 1.0,  detune: 0,    gain: 1.0, presence: 0, drive: 0,   label: 'xotirjam',  style: 'xotirjam, iliq, mehribon o\'qituvchi ohangida' },
  happy:  { rate: 1.04, detune: 150,  gain: 1.05, presence: 3, drive: 0,  label: 'xursand',   style: 'juda quvnoq, xursand, maqtayotgan ohangda' },
  strict: { rate: 1.03, detune: -60,  gain: 1.15, presence: 3, drive: .15, label: 'qattiq',   style: 'qattiqqo\'l, norozi, sabri tugayotgan o\'qituvchi ohangida' },
  angry:  { rate: 1.07, detune: -120, gain: 1.4, presence: 7, drive: .45, label: 'jahldor',  style: 'jahl bilan, baland ovozda, keskin va tez' },
  rage:   { rate: 1.1,  detune: -180, gain: 1.6, presence: 9, drive: .75, label: 'g\'azabda', style: 'qattiq g\'azab bilan, baqirib, juda keskin' },
  sulky:  { rate: .96,  detune: -80,  gain: 1.0, presence: 1, drive: .1,  label: 'arazlagan', style: 'arazlagan, xafa, to\'ng\'illab' },
};

let ctx = null, analyser = null, levelBuf = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.connect(ctx.destination);
    levelBuf = new Uint8Array(analyser.fftSize);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
export function unlockAudio() { try { audio(); } catch { /* ovoz yo'q */ } }

let fake = 0;
export function mouthLevel() {
  if (fake) return 0.25 + 0.35 * Math.abs(Math.sin(performance.now() / 85));
  if (!analyser || !playing) return 0;
  analyser.getByteTimeDomainData(levelBuf);
  let sum = 0;
  for (let i = 0; i < levelBuf.length; i++) { const v = (levelBuf[i] - 128) / 128; sum += v * v; }
  return Math.min(1, Math.sqrt(sum / levelBuf.length) * 5.5);
}

function fxChain(c, emo) {
  const f = EMO[emo] || EMO.calm;
  const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2600; pres.Q.value = .9; pres.gain.value = f.presence;
  const low = c.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 180; low.gain.value = f.drive ? 3 : 0;
  const sh = c.createWaveShaper(); const n = 1024, cur = new Float32Array(n), k = f.drive * 30;
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cur[i] = k ? (1 + k) * x / (1 + k * Math.abs(x)) : x; }
  sh.curve = cur;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
  const g = c.createGain(); g.gain.value = f.gain;
  pres.connect(low); low.connect(sh); sh.connect(comp); comp.connect(g); g.connect(analyser);
  return { input: pres, f };
}

// ── manbalar ──────────────────────────────────────────────────────────────
const cache = new Map();
let vlVoices = null, vlEmotionOk = true;
export const voiceInfo = { provider: VL_ON ? 'VoiceLab' : GEMINI_KEY ? 'Gemini' : 'Brauzer', error: '' };

export async function listVoices() {
  if (!VL_ON) return [];
  if (vlVoices) return vlVoices;
  try {
    const r = await fetch('/voicelab/v1/voices?language=uz');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    vlVoices = (j.data || j.voices || (Array.isArray(j) ? j : [])).map(v => ({ id: v.id, name: v.display_name || v.name || v.id, desc: v.short_description || v.description || '' }));
  } catch (e) { voiceInfo.error = 'VoiceLab ovozlar ro\'yxati: ' + e.message; vlVoices = []; }
  return vlVoices;
}
function chosenVoice() {
  try { return localStorage.getItem('domla-voice') || VL_ENV_VOICE || (vlVoices && vlVoices[0] && vlVoices[0].id) || ''; } catch { return VL_ENV_VOICE; }
}
export function setVoice(id) { try { localStorage.setItem('domla-voice', id || ''); } catch { /* saqlanmadi */ } }

const VL_EMO = { happy: 'happy', angry: 'angry', rage: 'angry', strict: 'serious', sulky: 'sad' };
async function voicelab(text, emo) {
  if (!vlVoices) await listVoices();
  const voice_id = chosenVoice();
  if (!voice_id) throw new Error('o\'zbekcha ovoz topilmadi');
  const body = { text, language: 'uz', voice_id, speed: emo === 'rage' ? 1.12 : emo === 'angry' ? 1.06 : 1.0 };
  if (vlEmotionOk && VL_EMO[emo]) body.emotion = VL_EMO[emo];
  const send = () => fetch('/voicelab/v1/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }, body: JSON.stringify(body) });
  let r = await send();
  if (!r.ok && body.emotion && (r.status === 400 || r.status === 422)) { vlEmotionOk = false; delete body.emotion; r = await send(); }
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('VoiceLab HTTP ' + r.status + ' ' + t.slice(0, 120)); }
  return await r.arrayBuffer();
}

function pcmToWav(bytes, rate = 24000) {
  const buf = new ArrayBuffer(44 + bytes.length), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, bytes.length, true);
  new Uint8Array(buf, 44).set(bytes);
  return buf;
}
async function gemini(text, emo) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Quyidagi o'zbekcha matnni ${(EMO[emo] || EMO.calm).style} ovoz chiqarib o'qi: ${text}` }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } },
    }),
  });
  if (!res.ok) throw new Error('Gemini TTS HTTP ' + res.status);
  const j = await res.json();
  const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error('Gemini TTS: ovoz yo\'q');
  const bytes = Uint8Array.from(atob(part.inlineData.data), ch => ch.charCodeAt(0));
  const m = /rate=(\d+)/.exec(part.inlineData.mimeType || '');
  return /wav/i.test(part.inlineData.mimeType || '') ? bytes.buffer : pcmToWav(bytes, m ? +m[1] : 24000);
}

// ── ijro ─────────────────────────────────────────────────────────────────
let playing = null, stopFn = null, token = 0;
export function stopSpeech() {
  token++;
  if (stopFn) { const f = stopFn; stopFn = null; f(); }
  try { if (playing) playing.stop(); } catch { /* to'xtagan */ }
  playing = null; fake = 0;
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* yo'q */ }
}

/** Gapni o'qiydi. Oldingi gap darhol to'xtaydi (ustma-ust o'qilmaydi). */
export async function speak(text, emo = 'calm', { muted = false } = {}) {
  stopSpeech();
  const my = token;
  if (muted) { await waitText(text, my); return; }
  const key = emo + '|' + text;
  try {
    const c = audio();
    let buf = cache.get(key);
    if (!buf) {
      let raw = null;
      if (VL_ON) { try { raw = await voicelab(text, emo); voiceInfo.provider = 'VoiceLab'; voiceInfo.error = ''; } catch (e) { voiceInfo.error = e.message; } }
      if (!raw && GEMINI_KEY) { try { raw = await gemini(text, emo); voiceInfo.provider = 'Gemini'; } catch (e) { voiceInfo.error = e.message; } }
      if (my !== token) return;
      if (raw) { buf = await c.decodeAudioData(raw.slice(0)); cache.set(key, buf); if (cache.size > 80) cache.delete(cache.keys().next().value); }
    }
    if (my !== token) return;
    if (buf) {
      await new Promise(res => {
        const ch = fxChain(c, emo);
        const src = c.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = ch.f.rate; src.detune.value = ch.f.detune;
        src.connect(ch.input); src.onended = res; stopFn = res; playing = src; src.start();
      });
      playing = null;
      return;
    }
  } catch (e) { voiceInfo.error = e.message; }
  if (my !== token) return;
  // brauzer ovozi
  const ss = window.speechSynthesis;
  const vs = ss ? ss.getVoices() : [];
  const v = vs.find(x => /^uz/i.test(x.lang)) || vs.find(x => /^tr/i.test(x.lang)) || vs.find(x => /^ru/i.test(x.lang));
  if (v) {
    voiceInfo.provider = 'Brauzer (' + v.lang + ')';
    fake = 1;
    await new Promise(res => {
      stopFn = res;
      const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang;
      const f = EMO[emo] || EMO.calm; u.rate = f.rate; u.pitch = emo === 'happy' ? 1.25 : /angry|rage/.test(emo) ? .8 : 1;
      u.onend = res; u.onerror = res; ss.speak(u);
      setTimeout(res, 2500 + text.length * 110);
    });
    fake = 0;
    return;
  }
  await waitText(text, my);
}
function waitText(text, my) {
  fake = 1;
  return new Promise(res => { stopFn = res; setTimeout(res, 900 + text.length * 55); }).then(() => { if (my === token) fake = 0; });
}

// ── nutqni tanish (mikrofon) ───────────────────────────────────────────────
export function listen(onText, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR(); r.lang = 'uz-UZ'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = e => onText(e.results[0][0].transcript);
  r.onend = () => onEnd && onEnd(); r.onerror = () => onEnd && onEnd();
  r.start();
  return r;
}
