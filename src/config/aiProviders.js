// ═══════════════════════════════════════════════════════════════════════════
// AI provayderlar — bir nechta BEPUL model, biri ishlamasa ikkinchisi
// ═══════════════════════════════════════════════════════════════════════════
// Har bir provayder bitta `chat(messages)` funksiyasini beradi. Kalitlar
// .env.local da (.env.example ga qarang). Kalitsiz provayder ro'yxatda
// "kalit yo'q" deb ko'rinadi va tanlanmaydi.
//
// AUTO rejimi: ro'yxatdagi birinchi ishlaydigan modelni tanlaydi, xato
// bo'lsa (limit tugadi, tarmoq yo'q) keyingisiga o'tadi — demo paytida
// bitta kalit tugab qolsa ham AI ishlashda davom etadi.

const env = (k) => (import.meta.env[k] || '').trim();

const TIMEOUT_MS = 30000;

async function postJSON(url, headers, body) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// OpenAI-mos API (OpenAI, Groq, OpenRouter, Cerebras — hammasi bir xil format)
function openaiCompatible({ url, keyEnv, model, extraHeaders = {} }) {
  return async (messages, { maxTokens = 2000, temperature = 0.6 } = {}) => {
    const data = await postJSON(
      url,
      { Authorization: `Bearer ${env(keyEnv)}`, ...extraHeaders },
      { model, messages, max_tokens: maxTokens, temperature },
    );
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Bo'sh javob");
    return text;
  };
}

// Gemini boshqa formatda — system alohida, rollar "user"/"model".
//
// MUHIM: "thinking" modellari (2.5, 3.x) ichki mulohaza uchun ham shu
// maxOutputTokens byudjetidan sarflaydi. Byudjet cheklangani uchun javob
// yarmida uzilib qolardi (finishReason: MAX_TOKENS) yoki mulohaza parchasi
// javob o'rniga ko'rinardi. Shuning uchun:
//   1. thinkingBudget: 0 yuboriladi (model qo'llasa),
//   2. javob matni `thought` bo'lmagan BARCHA qismlardan yig'iladi.
function geminiChat(model) {
  return async (messages, { maxTokens = 2000, temperature = 0.6 } = {}) => {
    const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env('VITE_GEMINI_KEY')}`;
    const body = {
      ...(sys ? { system_instruction: { parts: [{ text: sys }] } } : {}),
      contents: rest.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    let data;
    try {
      data = await postJSON(url, {}, body);
    } catch (e) {
      // Ba'zi modellar thinkingConfig ni qabul qilmaydi — usiz qayta yuboramiz
      if (/invalid argument/i.test(e.message)) {
        delete body.generationConfig.thinkingConfig;
        body.generationConfig.maxOutputTokens = maxTokens * 3; // mulohazaga ham joy
        data = await postJSON(url, {}, body);
      } else throw e;
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
    if (!text) throw new Error("Bo'sh javob");
    return text;
  };
}

// Eslatma: modellar API orqali tekshirilgan (2026-08).
//  · gemini-2.0-flash — Google o'chirgan (404).
//  · OpenAI — brauzerdan CORS bilan bloklanadi, shuning uchun yo'q.
//  · gemini-3.6-flash / gemini-flash-latest — "thinking" ni o'chirishga
//    ruxsat bermaydi va butun token byudjetini mulohazaga sarflab, javobni
//    yarmida uzib qo'yadi. Shuning uchun asosiy model — 2.5 Flash.
export const AI_PROVIDERS = [
  {
    id: 'gemini-flash',
    label: 'Gemini 2.5 Flash',
    badge: 'BEPUL · TAVSIYA',
    keyEnv: 'VITE_GEMINI_KEY',
    chat: geminiChat('gemini-2.5-flash'),
  },
  {
    id: 'groq-llama',
    label: 'Groq · Llama 3.3 70B',
    badge: 'BEPUL · TEZ',
    keyEnv: 'VITE_GROQ_KEY',
    chat: openaiCompatible({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      keyEnv: 'VITE_GROQ_KEY',
      model: 'llama-3.3-70b-versatile',
    }),
  },
  {
    id: 'cerebras-llama',
    label: 'Cerebras · Llama 3.3 70B',
    badge: 'BEPUL · ENG TEZ',
    keyEnv: 'VITE_CEREBRAS_KEY',
    chat: openaiCompatible({
      url: 'https://api.cerebras.ai/v1/chat/completions',
      keyEnv: 'VITE_CEREBRAS_KEY',
      model: 'llama-3.3-70b',
    }),
  },
  {
    id: 'openrouter-free',
    label: 'OpenRouter · Llama 3.3',
    badge: 'BEPUL',
    keyEnv: 'VITE_OPENROUTER_KEY',
    chat: openaiCompatible({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      keyEnv: 'VITE_OPENROUTER_KEY',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      extraHeaders: { 'X-Title': 'National AI Lab' },
    }),
  },
  {
    // 3.x "thinking" modeli: thinkingConfig ni rad etadi, shuning uchun
    // geminiChat avtomatik ravishda usiz va kattaroq byudjet bilan qayta
    // yuboradi. Alohida limit paketiga ega — 2.5 Flash limiti tugaganda
    // zaxira sifatida ishlaydi.
    id: 'gemini-pro',
    label: 'Gemini 3.6 Flash',
    badge: 'BEPUL · KUCHLI',
    keyEnv: 'VITE_GEMINI_KEY',
    chat: geminiChat('gemini-3.6-flash'),
  },
];

export function hasKey(p) {
  return !!env(p.keyEnv);
}

export function availableProviders() {
  return AI_PROVIDERS.filter(hasKey);
}

/**
 * Tanlangan provayder bilan so'raydi. Xato bo'lsa qolgan ishlaydigan
 * provayderlarni navbat bilan sinaydi. {text, provider} qaytaradi.
 */
export async function askWithFallback(providerId, messages, opts) {
  const usable = availableProviders();
  if (!usable.length) throw new Error('AI kaliti topilmadi — .env.local ni tekshiring');

  const first = usable.find((p) => p.id === providerId);
  const chain = first ? [first, ...usable.filter((p) => p.id !== providerId)] : usable;

  let lastErr;
  for (const p of chain) {
    try {
      const text = await p.chat(messages, opts);
      return { text, provider: p };
    } catch (e) {
      lastErr = e;
      if (e.name === 'AbortError') throw e;
      console.warn(`[AI] ${p.id} ishlamadi → keyingisi:`, e.message);
    }
  }
  throw lastErr || new Error('Hech bir AI model javob bermadi');
}
