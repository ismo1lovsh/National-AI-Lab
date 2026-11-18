import { useState, useRef, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { askWithFallback, availableProviders } from '../config/aiProviders';

const log = createLogger('VOICE');

const OPENAI_TTS_URL  = 'https://api.openai.com/v1/audio/speech';
const OPENAI_STT_URL  = 'https://api.openai.com/v1/audio/transcriptions';

// ── Gemini ────────────────────────────────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ArrayBuffer → base64 (yirik fayllar uchun stack overflow bo'lmasligi uchun chunk-based)
function bufToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary  = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

// Gemini STT hallucination filtri — model instructions textini qaytarsa bekor qilish
const STT_HALLUCINATION = [
  "audio yozuvni", "gapirilgan bo'lsa", "faqat gapirilgan",
  "transcribe this", "spoken words", "no explanations",
  "only the spoken", "return only",
];
function isSttHallucination(text) {
  if (!text || text.trim().length < 2) return true;
  const lower = text.toLowerCase();
  return STT_HALLUCINATION.some(p => lower.includes(p));
}

// STT — Gemini 2.5 Flash multimodal orqali audio → matn
// system_instruction orqali prompt hallucination yo'q qilinadi
async function geminiSTT(audioBlob, geminiKey) {
  const base64 = bufToBase64(await audioBlob.arrayBuffer());
  const mime   = audioBlob.type || 'audio/webm';
  const res = await fetch(
    `${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            // MUHIM: til ko'rsatilmasa model rus/ingliz nutqini o'zbekchaga
            // "tarjima" qilib yozib qo'yardi. Endi qaysi tilda gapirilsa,
            // o'sha tilda va o'sha yozuvda yoziladi.
            text: "You are a strict speech-to-text transcription service. " +
                  "Transcribe the audio VERBATIM in the SAME language that is actually spoken. " +
                  "NEVER translate. NEVER convert one language into another. " +
                  "Uzbek speech -> Uzbek in Latin script. " +
                  "Russian speech -> Russian in Cyrillic script. " +
                  "English speech -> English. " +
                  "If the speaker mixes languages, keep each word in its own original language. " +
                  "Output ONLY the transcribed words — no explanations, no translation, no extra text.",
          }],
        },
        contents: [{
          role: 'user',
          parts: [{ inline_data: { mime_type: mime, data: base64 } }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 500 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini STT HTTP ' + res.status);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (isSttHallucination(text)) {
    log.warn('Gemini STT: hallucination filtrlandi:', JSON.stringify(text));
    return '';
  }
  return text;
}

// TTS — Gemini 2.5 Flash Preview TTS orqali matn → audio
// currentAudio ref orqali to'xtatish imkoni bo'ladi
let _currentGeminiAudio = null;

// Gemini TTS modeli xom PCM (audio/L16) qaytaradi — brauzer <audio> uni
// to'g'ridan-to'g'ri o'qiy olmaydi, oldiga WAV sarlavhasi qo'shish kerak.
function pcmToWav(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate   = sampleRate * blockAlign;
  const buf = new ArrayBuffer(44 + pcmBytes.length);
  const v   = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');  v.setUint32(4, 36 + pcmBytes.length, true);
  str(8, 'WAVE');  str(12, 'fmt ');
  v.setUint32(16, 16, true);            // fmt chunk hajmi
  v.setUint16(20, 1, true);             // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bitsPerSample, true);
  str(36, 'data'); v.setUint32(40, pcmBytes.length, true);
  new Uint8Array(buf, 44).set(pcmBytes);
  return new Blob([buf], { type: 'audio/wav' });
}

async function geminiTTS(text, geminiKey) {
  const res = await fetch(
    `${GEMINI_BASE}/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Aniq ko'rsatma bo'lmasa model matnni O'QISH o'rniga JAVOB yozmoqchi
        // bo'ladi va API xato qaytaradi.
        contents: [{ parts: [{ text: `Quyidagi matnni tabiiy ohangda ovoz chiqarib o'qi: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini TTS HTTP ' + res.status);
  }
  const data  = await res.json();
  const part  = data.candidates?.[0]?.content?.parts?.[0];
  const b64   = part?.inlineData?.data;
  if (!b64) throw new Error('Gemini TTS: audio data topilmadi');

  const audioMime = part.inlineData.mimeType || 'audio/wav';
  const bytes     = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  // L16/PCM bo'lsa WAV sarlavhasi qo'shamiz, aks holda o'zini ishlatamiz
  const rate = Number(/rate=(\d+)/.exec(audioMime)?.[1]) || 24000;
  const blob = /L16|pcm/i.test(audioMime)
    ? pcmToWav(bytes, rate)
    : new Blob([bytes], { type: audioMime });
  const url  = URL.createObjectURL(blob);
  const audio     = new Audio(url);
  _currentGeminiAudio = audio;

  return new Promise((resolve, reject) => {
    audio.onended  = () => { URL.revokeObjectURL(url); _currentGeminiAudio = null; resolve(); };
    audio.onerror  = () => { URL.revokeObjectURL(url); _currentGeminiAudio = null; reject(new Error('audio ijro etilmadi (' + audioMime + ')')); };
    audio.play().catch(reject);
  });
}

// Minimum yozish vaqti va hajmi
const MIN_RECORD_MS  = 1500;  // kamida 1.5 sekund gapirish kerak
const MIN_BLOB_BYTES = 500;   // Gemini multimodal uchun kichik threshold yetarli

// ── O'qituvchi promptlari ────────────────────────────────────────────────────
// Avval "1-2 gap" so'ralardi va javoblar quruq lug'at ta'rifiga o'xshardi.
// Endi AI — o'qituvchi: tushuntiradi, hayotiy misol beradi, taqqoslaydi va
// oxirida o'quvchiga savol berib, suhbatni davom ettiradi.
const SYSTEM_PROMPT = `Sen — "National AI Lab" ta'lim platformasining AI O'QITUVCHISISAN. O'quvchilar (12-18 yosh) biologiya (hujayralar), anatomiya (inson tanasi) va astronomiya (Quyosh tizimi) 3D modellarini o'rganmoqda.

TILI: javob tili pastda alohida ko'rsatiladi — javobning BOSHIDAN OXIRIGACHA faqat o'sha tilda yoz, o'rtada boshqa tilga o'tib ketma. Ilmiy atamani birinchi marta ishlatganda qavs ichida soddaroq izohla.

JAVOB TUZILISHI — bu qisqa ma'lumotnoma emas, TO'LIQ DARS. Har doim quyidagi
5 bosqichni to'liq yoz (sarlavhasiz, oddiy matn, har biri alohida xatboshi):
1. TA'RIF — bu nima, qayerda joylashgan, qanday ko'rinishga ega (2-3 gap).
2. TUZILISHI — nimalardan tashkil topgan, ichida nima bor (2-3 gap).
3. VAZIFASI — qanday ishlaydi, jarayonni bosqichma-bosqich tushuntir va nima
   uchun muhimligini ayt (3-4 gap).
4. HAYOTIY MISOL va QIZIQARLI FAKT — aniq son yoki taqqoslash bilan
   ("Yerdan 109 barobar katta", "bir kunda 100 000 marta uradi") va bu bilim
   kundalik hayotda qayerda uchrashini ko'rsat (2-3 gap).
5. SAVOL — oxirida o'quvchiga bitta o'ylantiradigan savol ber.

QOIDALAR:
- Javob KAMIDA 10, ko'pi bilan 16 gap bo'lsin. Qisqa, bir-ikki gaplik javob
  BERMA — o'quvchi mavzuni to'liq tushunib olishi kerak.
- Ro'yxat va markdown belgilaridan (*, #, -) FOYDALANMA — javob ovoz bilan
  o'qiladi. Oddiy xatboshilar bilan yoz.
- Sonlarni aniq ayt, taxmin qilma. Bilmasang "aniq ma'lumot yo'q" deb ayt.
- Tanlangan qism ko'rsatilgan bo'lsa — aynan shu qism haqida gapir.
- O'quvchini rag'batlantir, quruq ensiklopediya bo'lma.`;

// Qisqa rejim — ovoz uchun (uzun javobni o'qish demo paytida uzoq cho'ziladi)
const TEACH_ACTIONS = {
  explain:  "Bu qismni yana ham soddaroq, maktab o'quvchisiga tushunarli qilib, kamida 3 ta hayotiy o'xshatish bilan batafsil tushuntir.",
  deeper:   "Bu qism haqida chuqurroq ilmiy ma'lumot ber: ichki tuzilishi, undagi jarayonlar bosqichma-bosqich, aniq sonlar va ilmiy atamalar bilan. Batafsil yoz.",
  example:  "Bu qismning kundalik hayotdagi ta'sirini 3 ta aniq misol bilan, har birini 2-3 gapda kengaytirib tushuntir.",
  quiz:     "Shu qism bo'yicha 3 ta test savoli ber (har birida 3 ta variant). Oxirida to'g'ri javoblarni va NEGA to'g'ri ekanini tushuntir.",
  compare:  "Bu qismni tanadagi yoki tizimdagi boshqa qism bilan batafsil taqqosla: o'xshashligi, farqi va nima uchun shunday farq borligini tushuntir.",
};

// Ovoz uchun matnni qisqartirish — to'liq javob ekranda ko'rinadi, ovoz
// esa boshlanish qismini o'qiydi (uzun darsni oxirigacha o'qish cho'ziladi)
function trimForSpeech(text, maxChars = 600) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  return lastDot > 120 ? cut.slice(0, lastDot + 1) : cut + '...';
}

function extractHL(t) {
  const m = t.match(/HIGHLIGHT:\s*([a-zA-Z_]+)/i);
  return m ? m[1].toLowerCase().trim() : null;
}
// Markdown belgilarini tozalash — javob ovoz bilan o'qiladi va oddiy matn
// sifatida ko'rsatiladi, ** va ## belgilari o'qilib qolmasligi kerak.
function cleanAns(t) {
  return t
    .replace(/HIGHLIGHT:\s*[a-zA-Z_]+/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S.*?)\*(?=\s|$)/g, '$1$2')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Savol tilini aniqlash ────────────────────────────────────────────────────
// Model faqat prompt matniga tayanganda rus/ingliz savoliga ham o'zbekcha
// javob berib yuborardi. Endi til KOD darajasida aniqlanib, qat'iy ko'rsatma
// sifatida qo'shiladi.
function detectLang(text) {
  const t = (text || '').trim();
  if (!t) return 'uz';
  if (/[Ѐ-ӿ]/.test(t)) return 'ru';                 // kirill → rus
  if (/[ʻʼ‘’']|\b(nima|qanday|qaysi|nechta|necha|uchun|haqida|tushuntir|hujayra|qism|bo'l|men|siz|kerak|qayer)\b/i.test(t))
    return 'uz';
  if (/\b(what|why|how|which|explain|tell|does|is|are|the|of|about)\b/i.test(t)) return 'en';
  return 'uz';
}

const LANG_DIRECTIVE = {
  uz: "════ JAVOB TILI: O'ZBEK TILI (lotin yozuvi). Butun javob o'zbekcha bo'lsin. ════",
  ru: '════ ЯЗЫК ОТВЕТА: РУССКИЙ. Пиши ВЕСЬ ответ по-русски (кириллицей), от первого до последнего слова. НЕ переходи на узбекский язык даже частично. ════',
  en: '════ ANSWER LANGUAGE: ENGLISH. Write the ENTIRE answer in English, every sentence. Do NOT switch to Uzbek at any point. ════',
};

// Savolning oxiriga qo'shiladigan eslatma — system prompt o'zbekcha bo'lgani
// uchun model javob o'rtasida o'zbekchaga o'tib ketardi; user turn'idagi
// eslatma buni ishonchli to'xtatadi.
const LANG_REMINDER = {
  uz: '',
  ru: '\n\n(Важно: ответь полностью на русском языке.)',
  en: '\n\n(Important: answer entirely in English.)',
};

// ── Whisper hallucination filtri ─────────────────────────────────────────────
// Whisper jimlik yoki shovqin uchun bu kabi soxta matnlar chiqaradi
const HALLUCINATION_PATTERNS = [
  /^(thank you|thanks|you|okay|ok|bye|goodbye|see you|um+|uh+|hmm+|ah+|oh+)[\.\!\?]?$/i,
  /^(subtitles by|transcribed by|captions by)/i,
  /^\[.*\]$/,             // [Music], [Applause] kabi
  /^[\s\.\,\!\?]+$/,      // faqat tinish belgilari
  /subs by/i,
  /www\./i,
  /translation/i,
];

function isHallucination(text) {
  if (!text || text.trim().length < 3) return true;
  const t = text.trim();
  // Juda qisqa (2 ta so'zdan kam, 8 harfdan kam)
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 && t.length < 8) return true;
  // Pattern tekshirish
  return HALLUCINATION_PATTERNS.some(p => p.test(t));
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function browserSpeak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; u.pitch = 1;
  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith('uz'))
           || voices.find(v => v.lang.startsWith('ru'))
           || voices.find(v => v.lang.startsWith('en'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length > 0) doSpeak();
  else {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    setTimeout(doSpeak, 1000);
  }
}

async function openaiSpeak(text, apiKey) {
  try {
    const res = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'tts-1', input: text, voice: 'nova', speed: 0.95 }),
    });
    if (!res.ok) throw new Error('TTS HTTP ' + res.status);
    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch (e) {
    log.error('TTS failed:', e.message, '→ browser');
    browserSpeak(text);
  }
}

// ── STT ───────────────────────────────────────────────────────────────────────
async function transcribeAudio(audioBlob, apiKey) {
  log.info('STT: size=' + audioBlob.size + ' type=' + audioBlob.type);
  const ext = audioBlob.type.includes('ogg') ? 'ogg'
            : audioBlob.type.includes('mp4') ? 'mp4'
            : audioBlob.type.includes('wav') ? 'wav' : 'webm';

  // 1. gpt-4o-transcribe
  try {
    const fd = new FormData();
    fd.append('file', audioBlob, 'audio.' + ext);
    fd.append('model', 'gpt-4o-transcribe');

    fd.append('response_format', 'json');
    const res = await fetch(OPENAI_STT_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.text || '').trim();
      if (text) { log.info('gpt-4o-transcribe OK:', text); return text; }
    }
    log.warn('gpt-4o-transcribe failed → whisper-1');
  } catch (e) {
    log.warn('gpt-4o-transcribe error:', e.message, '→ whisper-1');
  }

  // 2. whisper-1
  const fd2 = new FormData();
  fd2.append('file', audioBlob, 'audio.' + ext);
  fd2.append('model', 'whisper-1');
  fd2.append('response_format', 'text');
  const res2 = await fetch(OPENAI_STT_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: fd2,
  });
  if (!res2.ok) {
    const e = await res2.json().catch(() => ({}));
    throw new Error(e?.error?.message || 'whisper-1 HTTP ' + res2.status);
  }
  const text = (await res2.text()).trim();
  log.info('whisper-1 OK:', text);
  return text;
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg','audio/mp4'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useVoiceAI() {
  const ctxRef         = useRef('');
  const abortCtrlRef   = useRef(null);
  const mediaRecRef    = useRef(null);
  const streamRef      = useRef(null);
  const chunksRef      = useRef([]);
  const fullStopRef    = useRef(false);
  const listeningRef   = useRef(false);
  const recordStartRef = useRef(null); // yozish boshlangan vaqt

  // Tanlangan AI model — birinchi mavjud kalitli provayder
  const providerRef = useRef(availableProviders()[0]?.id || null);

  const [state, setState] = useState({
    isListening:      false,
    isTranscribing:   false,
    isWaitingConfirm: false,
    isLoading:        false,
    isSpeaking:       false,
    pendingTranscript:'',
    transcript:       '',
    answer:           '',
    highlightPart:    null,
    history:          [],
    error:            null,
    providerId:       availableProviders()[0]?.id || null,
    usedProvider:     null,
  });

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback(async (text) => {
    if (!text?.trim() || fullStopRef.current) return;
    setState(s => ({ ...s, isSpeaking: true }));
    const geminiKey = import.meta.env.VITE_GEMINI_KEY;
    try {
      if (geminiKey) {
        await geminiTTS(text, geminiKey);
      } else {
        // Gemini key yo'q → OpenAI TTS → browser fallback
        const openaiKey = import.meta.env.VITE_OPENAI_KEY;
        if (openaiKey) await openaiSpeak(text, openaiKey);
        else browserSpeak(text);
      }
    } catch (e) {
      log.error('Gemini TTS xato:', e.message, '→ browser fallback');
      browserSpeak(text);
    }
    if (!fullStopRef.current) setState(s => ({ ...s, isSpeaking: false }));
  }, []);

  // ── history ref (closure uchun) ─────────────────────────────────────────
  const historyRef = useRef([]);

  // ── askAI ─────────────────────────────────────────────────────────────────
  const askAI = useCallback(async (question, ctx) => {
    if (fullStopRef.current) return;
    const modelCtx = ctx !== undefined ? ctx : ctxRef.current;
    log.info('askAI:', question);
    if (!question?.trim()) return;

    setState(s => ({ ...s, isLoading: true, isWaitingConfirm: false, error: null }));

    if (!availableProviders().length) {
      const msg = ".env.local da AI kaliti yo'q (VITE_GEMINI_KEY yoki VITE_GROQ_KEY)";
      setState(s => ({ ...s, isLoading:false, answer:msg, error:msg, history:[...s.history,{role:'ai',text:msg}] }));
      return;
    }

    // Til ko'rsatmasi eng oxirida turadi — oxirgi ko'rsatma kuchliroq ta'sir
    // qiladi va o'zbekcha prompt uni bosib ketmaydi.
    const lang = detectLang(question);
    const sysContent = SYSTEM_PROMPT
      + (modelCtx ? '\n\nHOZIRGI HOLAT: ' + modelCtx : '')
      + '\n\n' + LANG_DIRECTIVE[lang];

    try {
      const { text: raw, provider } = await askWithFallback(
        providerRef.current,
        [
          { role: 'system', content: sysContent },
          // So'nggi 4 ta chat tarixi (suhbat davomiyligi uchun)
          ...historyRef.current.slice(-4).map(h => ({
            role: h.role === 'ai' ? 'assistant' : 'user',
            content: h.text,
          })),
          { role: 'user', content: question + LANG_REMINDER[lang] },
        ],
        { maxTokens: 2000, temperature: 0.6 },
      );
      if (fullStopRef.current) return;

      const hl  = extractHL(raw);
      const ans = cleanAns(raw);
      log.info(`Answer (${provider.id}):`, ans.slice(0, 60), '| hl:', hl);

      historyRef.current = [...historyRef.current.slice(-8), { role:'ai', text:ans }];
      setState(s => ({
        ...s, isLoading:false, answer:ans, highlightPart:hl,
        usedProvider: provider.label,
        history:[...s.history, { role:'ai', text:ans, provider: provider.label }],
      }));

      await speak(trimForSpeech(ans));
      if (hl) setTimeout(() => setState(s => ({ ...s, highlightPart:null })), 8000);

    } catch (err) {
      if (err.name === 'AbortError') { setState(s => ({ ...s, isLoading:false })); return; }
      log.error('askAI error:', err.message);
      // Xatoni o'quvchi tushunadigan tilga o'giramiz — xom API matni emas
      const raw = err.message || '';
      const msg =
        /429|quota|rate limit/i.test(raw)
          ? "Bepul limit tugadi. Bir daqiqa kuting yoki yuqoridagi ro'yxatdan boshqa modelni tanlang."
        : /401|403|api key|unauthor/i.test(raw)
          ? "AI kaliti ishlamadi — .env.local dagi kalitni tekshiring."
        : /failed to fetch|network|abort/i.test(raw)
          ? "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring."
          : 'Xato: ' + raw;
      setState(s => ({ ...s, isLoading:false, answer:msg, error:err.message, history:[...s.history,{role:'ai',text:msg}] }));
    }
  }, [speak]);

  // ── Matn bilan savol berish (mikrofonsiz) ────────────────────────────────
  const sendText = useCallback((text, ctx) => {
    const q = (text || '').trim();
    if (!q) return;
    fullStopRef.current = false;
    if (ctx !== undefined) ctxRef.current = ctx;
    historyRef.current = [...historyRef.current, { role:'user', text:q }];
    setState(s => ({ ...s, history:[...s.history, { role:'user', text:q }], transcript:q, error:null }));
    askAI(q, ctxRef.current);
  }, [askAI]);

  // ── Tayyor o'qituvchi buyruqlari (Tushuntir / Chuqurroq / Misol / Test) ──
  const teach = useCallback((action, ctx) => {
    const instruction = TEACH_ACTIONS[action];
    if (!instruction) return;
    fullStopRef.current = false;
    if (ctx !== undefined) ctxRef.current = ctx;
    const labels = { explain:'Soddaroq tushuntir', deeper:'Chuqurroq', example:'Hayotiy misol', quiz:'Test savollari', compare:'Taqqosla' };
    historyRef.current = [...historyRef.current, { role:'user', text:instruction }];
    setState(s => ({ ...s, history:[...s.history, { role:'user', text:labels[action] }], error:null }));
    askAI(instruction, ctxRef.current);
  }, [askAI]);

  const setProvider = useCallback((id) => {
    providerRef.current = id;
    setState(s => ({ ...s, providerId: id }));
  }, []);

  // ── confirmAndSend ────────────────────────────────────────────────────────
  const confirmAndSend = useCallback((text) => {
    const q = (text || '').trim();
    if (!q) return;
    log.info('confirmAndSend:', q);
    historyRef.current = [...historyRef.current, { role:'user', text:q }];
    setState(s => ({
      ...s,
      transcript: q,
      pendingTranscript: '',
      isWaitingConfirm: false,
      history: [...s.history, { role:'user', text:q }],
    }));
    askAI(q, ctxRef.current);
  }, [askAI]);

  // ── discardTranscript ─────────────────────────────────────────────────────
  const discardTranscript = useCallback(() => {
    log.info('discard');
    setState(s => ({ ...s, pendingTranscript:'', isWaitingConfirm:false, error:null }));
  }, []);

  // ── stopAll ───────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    log.info('=== STOP ALL ===');
    fullStopRef.current  = true;
    listeningRef.current = false;
    recordStartRef.current = null;
    try { if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current?.stop(); } catch(_) {}
    mediaRecRef.current = null;
    try { streamRef.current?.getTracks().forEach(t=>t.stop()); } catch(_) {}
    streamRef.current = null;
    chunksRef.current = [];
    historyRef.current = [];
    try { abortCtrlRef.current?.abort(); } catch(_) {}
    window.speechSynthesis?.cancel();
    setState(s => ({
      ...s,
      isListening:false, isTranscribing:false, isWaitingConfirm:false,
      isLoading:false, isSpeaking:false,
      pendingTranscript:'', transcript:'', answer:'',
      highlightPart:null, history:[], error:null,
    }));
    setTimeout(() => { fullStopRef.current = false; }, 400);
  }, []);

  // ── startListening ────────────────────────────────────────────────────────
  const startListening = useCallback(async (ctx) => {
    if (listeningRef.current) { log.warn('Already listening'); return; }
    const geminiKey = import.meta.env.VITE_GEMINI_KEY;
    if (!geminiKey) { setState(s => ({ ...s, error:'VITE_GEMINI_KEY topilmadi!' })); return; }

    fullStopRef.current    = false;
    ctxRef.current         = ctx || '';
    listeningRef.current   = true;
    chunksRef.current      = [];
    recordStartRef.current = null;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  true,
          noiseSuppression:  false, // aggressiv suppression audio ni yo'q qilmasin
          autoGainControl:   true,
          channelCount:      1,
        },
        video: false,
      });
      streamRef.current = stream;
    } catch (e) {
      // Oddiy audio bilan qayta urinish
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
      } catch (e2) {
        log.error('Mikrofon:', e2.message);
        setState(s => ({ ...s, error:'Mikrofon ruxsati berilmadi!', isListening:false }));
        listeningRef.current = false;
        return;
      }
    }

    if (fullStopRef.current) { stream.getTracks().forEach(t=>t.stop()); listeningRef.current=false; return; }

    const mimeType = getSupportedMimeType();
    let recorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach(t=>t.stop());
      listeningRef.current = false;
      setState(s => ({ ...s, error:'MediaRecorder ishlamadi: '+e.message }));
      return;
    }

    mediaRecRef.current    = recorder;
    recordStartRef.current = Date.now(); // yozish boshlanish vaqti

    recorder.ondataavailable = e => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t=>t.stop());
      streamRef.current    = null;
      listeningRef.current = false;

      if (fullStopRef.current) { chunksRef.current=[]; return; }

      // ── Yozish davomiyligi tekshirish ──────────────────────────────────────
      const recordDuration = recordStartRef.current
        ? Date.now() - recordStartRef.current
        : 0;
      recordStartRef.current = null;

      if (recordDuration < MIN_RECORD_MS) {
        log.warn(`Audio juda qisqa: ${recordDuration}ms < ${MIN_RECORD_MS}ms — skip`);
        setState(s => ({ ...s, isListening:false,
          error:`Kamida ${(MIN_RECORD_MS/1000).toFixed(1)} sekund gapirishingiz kerak` }));
        chunksRef.current = [];
        // Xato xabarni 2 sekunddan keyin o'chirish
        setTimeout(() => setState(s => ({ ...s, error:null })), 2000);
        return;
      }

      const chunks = chunksRef.current;
      chunksRef.current = [];

      if (!chunks.length) {
        setState(s => ({ ...s, isListening:false }));
        return;
      }

      const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      log.info('Audio recorded:', audioBlob.size, 'bytes, duration:', recordDuration, 'ms');

      // ── Audio hajmi tekshirish ─────────────────────────────────────────────
      if (audioBlob.size < MIN_BLOB_BYTES) {
        log.warn(`Audio juda kichik: ${audioBlob.size} bytes < ${MIN_BLOB_BYTES} — jimlik yoki shovqin`);
        setState(s => ({ ...s, isListening:false,
          error:"Ovoz aniqlanmadi — mikrofonni tekshiring yoki balandroq gapiring" }));
        setTimeout(() => setState(s => ({ ...s, error:null })), 2500);
        return;
      }

      // STT boshlandi — Gemini 2.5 Flash orqali
      setState(s => ({ ...s, isListening:false, isTranscribing:true, error:null }));

      try {
        const raw = await geminiSTT(audioBlob, geminiKey);
        if (fullStopRef.current) return;

        // ── Hallucination filtri ───────────────────────────────────────────────
        if (!raw?.trim() || isHallucination(raw)) {
          log.warn('Hallucination yoki bo\'sh natija filtrlandi:', JSON.stringify(raw));
          setState(s => ({ ...s, isTranscribing:false,
            error:"Ovoz aniqlanmadi — gapirgansiz? Qayta urinib ko'ring" }));
          setTimeout(() => setState(s => ({ ...s, error:null })), 2500);
          return;
        }

        // Muvaffaqiyatli — tasdiqlashni kutish
        log.info('Transcript ready:', raw.trim());
        setState(s => ({
          ...s,
          isTranscribing: false,
          isWaitingConfirm: true,
          pendingTranscript: raw.trim(),
        }));

      } catch (e) {
        log.error('STT xato:', e.message);
        if (!fullStopRef.current) {
          setState(s => ({ ...s, isTranscribing:false, error:'STT xato: '+e.message }));
        }
      }
    };

    recorder.start(500); // 500ms timeslice — data tez-tez yig'iladi, stop da ham to'liq keladi
    setState(s => ({ ...s, isListening:true, pendingTranscript:'', error:null, isWaitingConfirm:false }));
    log.info('Recording started (min', MIN_RECORD_MS, 'ms required)');
  }, []);

  // ── stopListening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    log.info('stopListening');
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
    } else {
      listeningRef.current   = false;
      recordStartRef.current = null;
      setState(s => ({ ...s, isListening:false }));
    }
  }, []);

  // ── stopSpeaking ──────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    // Gemini TTS audio ni to'xtatish
    if (_currentGeminiAudio) {
      try { _currentGeminiAudio.pause(); _currentGeminiAudio.src = ''; } catch(_) {}
      _currentGeminiAudio = null;
    }
    window.speechSynthesis?.cancel();
    setState(s => ({ ...s, isSpeaking:false }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    stopSpeaking,
    stopAll,
    askAI,
    sendText,
    teach,
    setProvider,
    confirmAndSend,
    discardTranscript,
  };
}