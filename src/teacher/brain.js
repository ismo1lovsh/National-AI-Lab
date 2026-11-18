// ═══════════════════════════════════════════════════════════════════════════
// AI O'qituvchining «miyasi»
// Har bir harakatni kuzatadi va gapiradi, jahli chiqadi yoki tushadi.
// Jahli 80 dan oshsa — arazlab xonadan chiqib ketadi. Biroz o'tib nimanidir
// bahona qilib qaytib keladi:
//   • yo'qligida yaxshi ish qilingan bo'lsa — jahldan tushadi;
//   • yomon ish qilingan bo'lsa — to'ng'illab, yana chiqib ketadi.
// ═══════════════════════════════════════════════════════════════════════════
import { availableProviders, askWithFallback } from '../config/aiProviders';
import { speak, stopSpeech } from './voice';

const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (t, c = {}) => t.replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');

// voqea → jahl o'zgarishi
const DELTA = {
  kirish: 0, olish: 0, qadam: -6, ortiqcha: 6, notogri: 18, tartib: 12, reaksiya: -6,
  bajarildi: -35, kashfiyot: -25, portlash: 30, bekorchilik: 10, yuvish: -2, suhbat: 0, haqorat: 30,
  tanlov_togri: -8, tanlov_kam: 6, t_kirish: 0, quyish: 0, bekor: 12, qism: -4, ajratish: -2, yigish: 0, rentgen: -2, simulyatsiya: 0,
};
// muhimlik: yuqorisi gapirayotganni to'xtatadi
const PRIORITY = { quyish: 1, bekor: 3, t_kirish: 2, qism: 3, ajratish: 2, yigish: 1, rentgen: 2, simulyatsiya: 2, olish: 0, bekorchilik: 1, yuvish: 1, kirish: 2, qadam: 2, ortiqcha: 2, tanlov_togri: 2, tanlov_kam: 2, reaksiya: 2, tartib: 3, notogri: 3, suhbat: 3, haqorat: 3, kashfiyot: 3, bajarildi: 3, portlash: 4 };
const GOOD = new Set(['qism', 'qadam', 'reaksiya', 'bajarildi', 'kashfiyot', 'tanlov_togri']);
const BAD = new Set(['bekor', 'notogri', 'tartib', 'portlash', 'haqorat', 'ortiqcha']);

export function toneOf(anger) {
  if (anger < 30) return 'calm';
  if (anger < 55) return 'strict';
  if (anger < 80) return 'angry';
  return 'rage';
}
export const TONE_LABEL = { calm: 'Xotirjam', strict: 'Qattiqqo\'l', angry: 'Jahli chiqqan', rage: 'G\'azabda', happy: 'Xursand', sulky: 'Arazlagan' };

// ── tayyor gaplar (AI kaliti bo'lmasa ham doim gapiradi) ─────────────────────
const L = {
  kirish: {
    calm: ['Assalomu alaykum! Bugun «{exp}» tajribasini qilamiz. Avval kerakli moddalar jadvaliga qarang.', 'Xush kelibsiz, laboratoriyaga! Xalat, qo\'lqop — hammasi joyidami? Boshladik!'],
  },
  ombor: {
    calm: ['Ombordan faqat jadvaldagi moddalarni oling. Ortiqcha narsa — ortiqcha xavf.', 'Qani, tanlang. «{exp}» uchun nima kerakligini jadvalda ko\'rib turibsiz.'],
  },
  tanlov_togri: { calm: ['Barakalla, hamma kerakli moddalar savatda. Kiring!', 'To\'g\'ri tanladingiz. Endi laboratoriyaga marhamat.'] },
  tanlov_kam: { calm: ['Shoshmang, jadvaldagi hamma modda olinmagan.'], strict: ['Ro\'yxatni o\'qing! Moddalar yetishmayapti.'] },
  ortiqcha: {
    calm: ['{name}? Bu tajribaga kerak emas-ku. Mayli, lekin ehtiyot bo\'ling.'],
    strict: ['Yana ortiqcha modda! Jadvalga qarab ishlang!'],
    angry: ['Nega keraksiz narsalarni olyapsiz?! Bu bozor emas!'],
    rage: ['Sen jadvalni umuman o\'qimayapsanmi?!'],
  },
  olish: {
    calm: ['{name} — qo\'lingizda. Ehtiyot bo\'ling.', 'Ha, {name}. Endi markaziy kolbaga quying.', '{name}ni oldingiz. Yorlig\'iga qarang.'],
    strict: ['{name}... Ishonchingiz komilmi?', 'Sekinroq! {name} o\'yinchoq emas.'],
    angry: ['{name}ni ehtiyot qiling! Yana xato qilmang!'],
    rage: ['{name}! Bu safar to\'g\'ri qil!'],
  },
  qadam: {
    calm: ['Juda yaxshi! Endi: {next}', 'To\'g\'ri! Keyingi qadam: {next}', 'Barakalla. {next}'],
    strict: ['Mana bu boshqa gap. Endi: {next}'],
    angry: ['Hm. Nihoyat to\'g\'ri. {next}'],
    rage: ['Xo\'sh... bu safar to\'g\'ri. {next}'],
  },
  notogri: {
    calm: ['Voy! {name} bu tajribada yo\'q edi-ku. Jadvalga qarang.', 'To\'xtang! {name} — noto\'g\'ri modda. Kolbani yuvish kerak bo\'ladi.'],
    strict: ['Yana noto\'g\'ri modda! Diqqat bilan ishlang!', 'Hoy! {name}ni kim qo\'sh dedi?!'],
    angry: ['Bo\'ldi-ye! Necha marta aytaman — jadvalga qara!', 'Nima qilyapsiz?! {name} umuman kerak emas!'],
    rage: ['Sen meni jinni qilasanmi?! Yana {name}!'],
  },
  tartib: {
    calm: ['Shoshmang, tartib buzildi. Avval: {next}'],
    strict: ['Tartib bilan! Avval {next}'],
    angry: ['Qadamlarni aralashtirmang! Avval {next}'],
    rage: ['Tartib degan narsa bormi senda?!'],
  },
  reaksiya: {
    calm: ['Reaksiya ketdi! {eq}', 'Ana, ko\'rdingizmi? {eq}'],
    strict: ['Reaksiya bo\'ldi: {eq}. Lekin bu reja emas edi.'],
    angry: ['Reaksiya ketdi... Kuzatib turing!'],
    rage: ['Ha, reaksiya! Endi kolbani yuv!'],
  },
  bajarildi: {
    calm: ['Ofarin! Tajriba muvaffaqiyatli! {sci} ham faxrlanardi!', 'Barakalla! «{exp}» bajarildi. Siz haqiqiy kimyogarsiz!'],
    strict: ['Mana! Qo\'lingizdan keladi-ku. Tajriba bajarildi!'],
    angry: ['Hmm... Mayli, tajriba bajarildi. Jahlim biroz tushdi.'],
    rage: ['Nima?! Bajarding?! Xo\'p... ofarin, tan olaman.'],
  },
  kashfiyot: {
    calm: ['Voy-bo\'! Yangi reaksiya topdingiz: {eq}. U {num}-tajriba bo\'lib ro\'yxatga qo\'shildi!'],
    strict: ['Qarang-a! Yangi kashfiyot: {eq}. Ro\'yxatga qo\'shdim.'],
    angry: ['Kashfiyot! Mayli, buning uchun jahlimdan tushaman.'],
    rage: ['Hm... yangi reaksiya. Bu yaxshi. Juda yaxshi.'],
  },
  portlash: {
    calm: ['Voy! Portladi! Hammasi joyidami? Bunday moddalar bilan ehtiyot bo\'ling!'],
    strict: ['Portlash! Xavfsizlik qoidalari nima uchun bor?!'],
    angry: ['Bo\'ldi! Laboratoriyani portlatib yuborasiz-ku!'],
    rage: ['Tavba-e! Yana portlatdi! Bu yer laboratoriya, poligon emas!'],
  },
  bekorchilik: {
    calm: ['Nima bo\'ldi? Jadvalga qarang — keyingi qadam: {next}', 'Qo\'l qimirlamayapti-ku. Davom eting.'],
    strict: ['Vaqt ketyapti! Ishlang!'],
    angry: ['Uxlab qoldingizmi?! Ishlang!'],
    rage: ['Turib qolma! Ishla!'],
  },
  yuvish: { calm: ['To\'g\'ri, kolba toza. Boshidan boshlaymiz.'], strict: ['Yuvdingizmi? Endi to\'g\'ri qiling.'] },
  haqorat: {
    calm: ['Iltimos, odob bilan gapiring.'], strict: ['Menga bunday gapirmang!'], angry: ['Nima dedingiz?! Odobingiz qani?!'], rage: ['Meni haqorat qilyapsanmi?!'],
  },
  ketish: ['Bo\'ldi! Tavba qildim! Ishlab o\'tir o\'zing, men ketdim!', 'Yetar! Asabim qolmadi! Men ketdim, o\'zing bilganingni qil!', 'Ey, tavba-e! Bu laboratoriya emas, bozor! Ketdim!', 'Uh, la\'nati xatolar! Boshim og\'rib ketdi! Chiqib ketaman!'],
  bahona: ['Ehem... choy damlab qo\'ygan ekanman, olib keldim.', 'Direktor chaqirgan ekan, endi qaytdim.', 'Ko\'zoynagimni unutib qoldirgan ekanman... Xo\'sh.', 'Telefon jiringladi, shunga chiqqandim. Xo\'sh, nima qildingiz?', 'Qo\'shni xonadan reaktiv olib keldim. Qani, ko\'raylik.'],
  yarashish: ['Ko\'rdim, yo\'qligimda yaxshi ishlabsiz. Mayli, jahlim tushdi.', 'Hmm, to\'g\'ri ishlabsiz-ku! Xo\'p, yarashdik.', 'Mana bu boshqa gap! Ofarin, jahlim tarqadi.'],
  yana_ketish: ['Nima?! Men yo\'g\'imda yana xato qildingmi?! Uf! La\'nati kun! Yana ketdim!', 'Tavba-e! Bir minut yo\'q edim, hammasini buzibsan! Ketdim!'],
  qaytish_jim: ['Xo\'sh, davom etamiz. Lekin ehtiyot bo\'ling.', 'Mayli. Boshladik. Bu safar diqqat bilan.'],
  yoq: 'O\'qituvchi xonada yo\'q…',
  // ── texnika laboratoriyalari (mudofaa, dronlar, transport)
  quyish: {
    calm: ['{name} kolbaga tushdi. Endi ikkinchi reaktivni qo\'shib ko\'ring.', 'Yaxshi, {name} quyildi. Qani, nima bo\'larkin?'],
    strict: ['{name}... Nima kutyapsiz, o\'ylab ko\'ring.'], angry: ['Yana {name}! Maqsadingiz nima o\'zi?'], rage: ['{name}? Bas qil!'],
  },
  bekor: {
    calm: ['Hech qanday reaksiya yo\'q. Hamma narsani aralashtiravermang — kolbani tozalab, qaytadan boshlang.'],
    strict: ['Bu tajriba emas, sho\'rva-ku! Kolbani tozalang!'], angry: ['Bo\'ldi! Hamma narsani aralashtirma! Tozalab qaytadan!'], rage: ['Tavba-e! Bu kolba emas, axlat qutisi bo\'lib qoldi!'],
  },
  t_kirish: { calm: ['Assalomu alaykum! Bu — {name}. Qaysi qismidan boshlaymiz? Qismni tanlang yoki «Ajratish»ni bosing.', 'Qarang: {name}. Keling, uni qismlarga ajratib o\'rganamiz!'] },
  qism: {
    calm: ['Bu — {part}. {info}', 'Yaxshi tanlov! {part}. {info}'],
    strict: ['{part}. {info} Diqqat bilan o\'qing.'],
    angry: ['{part}. Mana, nihoyat ishga o\'tdingiz. {info}'],
    rage: ['{part}! {info}'],
  },
  ajratish: { calm: ['Ajratdik! Endi har bir qism alohida ko\'rinadi. Birortasini tanlang.', 'Mana ichki tuzilishi! Qaysi qismi qiziq?'] },
  yigish: { calm: ['Yana yig\'dik. Butun holatda qanday ko\'rinishini eslab qoling.'] },
  rentgen: { calm: ['Rentgen rejimi! Endi ichki qismlar ko\'rinadi.', 'Ichini ko\'ramiz — rentgen yoqildi.'] },
  simulyatsiya: { calm: ['Boshqaruv sizda! Ehtiyotkor bo\'ling.', 'Simulyatsiya boshlandi — qani, ko\'raylik qanday boshqarasiz!'] },
};
const SCI = ['Mendeleyev', 'Lavuazye', 'Al-Beruniy', 'Ibn Sino', 'Mariya Kyuri', 'Faradey'];

const ROLE = {
  kimyo: 'virtual kimyo laboratoriyasidagi talabchan, lekin adolatli kimyo o\'qituvchisisan',
  texnika: 'National AI Lab 3D texnika laboratoriyasidagi talabchan, lekin adolatli muhandis-o\'qituvchisan (harbiy texnika, dronlar, transport). Qism haqida so\'ralsa — vazifasi va qanday ishlashini oddiy tilda, aniq tushuntir',
};
const PROMPT = `Sen «O'qituvchi» — {role}.
Faqat o'zbek tilida (lotin) jonli so'zlashuvda gapir. 1–2 qisqa gap, 170 belgidan oshmasin. Matn ovozga aylantiriladi: emoji, markdown, qavs ishlatma.
Hozirgi kayfiyating: {tone}. {addr}
His-tuyg'u ovozda eshitilsin: undovlar (Voy!, Ofarin!, Hoy!, To'xta!), tinish belgilari. Jahlda qisqa keskin gaplar.
Haqorat, so'kinish, kamsitish QAT'IYAN mumkin emas. Jahl — qattiqqo'l, biroz kulgili tarbiyaviy uslubda.
Faqat berilgan ma'lumotga tayan, reaksiya natijasini to'qima.`;
const TONE_DESC = { calm: 'xotirjam, iliq', strict: 'qattiqqo\'l, norozi', angry: 'jahli chiqqan, baland ohangda', rage: 'g\'azabda', happy: 'juda xursand' };

export class TeacherBrain {
  constructor() {
    this.anger = 10;
    this.phase = 'present';      // present | leaving | away | returning
    this.mood = 'calm';          // calm | strict | angry | rage | happy | sulky
    this.text = '';
    this.speaking = false;
    this.muted = false;
    this.ctx = {};               // tajriba haqida ma'lumot
    this.ledger = { good: 0, bad: 0 };
    this.leaves = 0;
    this.listeners = new Set();
    this.queue = null;
    this.lastAct = performance.now();
    this.history = [];
    this.gesture = null;         // 'clap' | 'fist' | 'point' | 'facepalm' | null
    this.gestureT = 0;
  }
  start() { clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 1000); }
  stop() { clearInterval(this.timer); clearTimeout(this.awayTimer); stopSpeech(); }
  on(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }
  changed() { this.listeners.forEach(f => f(this)); }
  setContext(c) { this.ctx = { ...this.ctx, ...c }; }
  get tone() { return this.mood === 'happy' || this.mood === 'sulky' ? this.mood : toneOf(this.anger); }

  setAnger(v) { this.anger = Math.max(0, Math.min(100, v)); if (this.mood !== 'happy' && this.mood !== 'sulky') this.mood = toneOf(this.anger); this.changed(); }
  gest(g, ms = 2200) { this.gesture = g; this.gestureT = performance.now() + ms; this.changed(); }

  tick() {
    const now = performance.now();
    if (this.gesture && now > this.gestureT) { this.gesture = null; this.changed(); }
    // bekorchilik
    if (this.ctx.inLab !== false && this.phase === 'present' && !this.speaking && now - this.lastAct > 40000) {
      this.lastAct = now; this.event('bekorchilik');
    }
    // jahl asta-sekin pasayadi
    if (this.phase === 'present' && this.anger > 12 && now - this.lastAct > 8000) this.setAnger(this.anger - 0.4);
  }

  /** O'quvchining har bir harakati shu yerga keladi. */
  event(name, c = {}) {
    if (name !== 'bekorchilik') this.lastAct = performance.now();
    const d = DELTA[name] ?? 0;
    if (this.phase !== 'present') {
      // yo'qligida — faqat hisob yuritiladi
      if (GOOD.has(name)) this.ledger.good++;
      if (BAD.has(name)) this.ledger.bad++;
      this.setAnger(this.anger + d * 0.6);
      return;
    }
    this.setAnger(this.anger + d);
    if (GOOD.has(name) && name !== 'qadam') { this.mood = 'happy'; this.gest('clap'); setTimeout(() => { if (this.mood === 'happy') { this.mood = toneOf(this.anger); this.changed(); } }, 6000); }
    if (BAD.has(name)) this.gest(this.anger >= 55 ? 'fist' : 'point');
    if (name === 'portlash') this.gest('facepalm', 2600);
    if (this.anger >= 80 && BAD.has(name)) { this.leave(); return; }

    const pr = PRIORITY[name] ?? 1;
    if (this.speaking && pr < 3) { if (pr >= 1 && (!this.queue || (PRIORITY[this.queue[0]] ?? 0) <= pr)) this.queue = [name, c]; return; }
    const line = this.line(name, c);
    if (!line) return;
    const useAI = pr >= 3 && availableProviders().length > 0 && name !== 'olish';
    if (useAI) this.aiSay(name, c, line); else this.say(line);
  }

  line(name, c) {
    const pool = L[name]; if (!pool) return '';
    const t = toneOf(this.anger);
    const arr = Array.isArray(pool) ? pool : (pool[t] || pool.strict || pool.calm);
    return fill(pick(arr), { exp: this.ctx.title || 'bugungi', next: this.ctx.next || 'jadvaldagi keyingi qadam', sci: pick(SCI), ...c });
  }

  async say(text, emo) {
    this.text = text; this.speaking = true;
    const e = emo || (this.mood === 'happy' ? 'happy' : this.phase === 'leaving' ? 'rage' : toneOf(this.anger));
    this.history.push({ role: 'assistant', content: text }); this.history = this.history.slice(-8);
    this.changed();
    const my = (this.sayId = (this.sayId || 0) + 1);
    await speak(text, e, { muted: this.muted });
    if (my !== this.sayId) return;
    this.speaking = false; this.changed();
    if (this.queue && this.phase === 'present') { const [n, c] = this.queue; this.queue = null; setTimeout(() => this.event(n, c), 350); }
  }

  async aiSay(name, c, fallback) {
    const my = (this.aiId = (this.aiId || 0) + 1);
    this.speaking = true; this.text = '…'; this.changed();
    const t = toneOf(this.anger);
    const sys = fill(PROMPT, { role: ROLE[this.ctx.domain || 'kimyo'], tone: TONE_DESC[this.mood === 'happy' ? 'happy' : t], addr: t === 'rage' ? 'O\'quvchiga «sen» deb murojaat qil.' : 'O\'quvchiga «siz» deb murojaat qil.' });
    const info = [
      this.ctx.domain === 'texnika' ? `Model: ${this.ctx.title}. ${(this.ctx.about || '').slice(0, 500)}` : `Tajriba: ${this.ctx.title || 'erkin tajriba'}.`, c.part ? `Tanlangan qism: ${c.part}. ${c.info || ''}` : '', this.ctx.recipe ? `Kerakli moddalar: ${this.ctx.recipe}.` : '',
      this.ctx.items ? `Kolbada: ${this.ctx.items}.` : '', `Voqea: ${name}.`, c.eq ? `Reaksiya: ${c.eq}.` : '', c.name ? `Modda: ${c.name}.` : '',
      this.ctx.next ? `Keyingi qadam: ${this.ctx.next}.` : '', c.message ? `O'quvchi dedi: «${c.message}»` : '', `Namuna javob: ${fallback}`,
    ].filter(Boolean).join(' ');
    let text = fallback;
    try {
      const ctrl = await Promise.race([
        askWithFallback(null, [{ role: 'system', content: sys }, ...this.history.slice(-4), { role: 'user', content: info }], { maxTokens: 160, temperature: 0.85 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('vaqt tugadi')), 9000)),
      ]);
      text = (ctrl.text || '').replace(/[*_#`]/g, '').replace(/^["«]|["»]$/g, '').trim().slice(0, 240) || fallback;
    } catch (e) { console.warn('[O\'qituvchi] AI javob bermadi:', e.message); }
    if (my !== this.aiId || this.phase !== 'present') return;
    this.say(text);
  }

  /** Arazlab chiqib ketish */
  async leave(again = false) {
    if (this.phase === 'leaving' || this.phase === 'away') return;
    this.queue = null; this.mood = 'rage'; this.leaves++;
    this.phase = 'leaving'; this.gest('fist', 2500); this.changed();
    await this.say(pick(again ? L.yana_ketish : L.ketish), 'rage');
    this.changed();
    await new Promise(r => setTimeout(r, 2600));          // eshik tomon yurib chiqib ketadi
    this.phase = 'away'; this.ledger = { good: 0, bad: 0 }; this.text = L.yoq; this.mood = 'sulky'; this.changed();
    clearTimeout(this.awayTimer);
    this.awayTimer = setTimeout(() => this.comeBack(), (14 + Math.random() * 8 + Math.min(this.leaves, 3) * 4) * 1000);
  }

  async comeBack() {
    this.phase = 'returning'; this.changed();
    await new Promise(r => setTimeout(r, 2900));          // eshikdan kirib kelish animatsiyasi
    this.phase = 'present'; this.mood = 'sulky'; this.changed();
    await this.say(pick(L.bahona), 'sulky');
    const { good, bad } = this.ledger;
    if (bad > good) { this.setAnger(92); this.leave(true); return; }
    if (good > 0) { this.mood = 'happy'; this.setAnger(Math.min(this.anger, 22)); this.gest('clap'); await this.say(pick(L.yarashish), 'happy'); }
    else { this.setAnger(Math.min(this.anger, 55)); this.mood = toneOf(this.anger); await this.say(pick(L.qaytish_jim), 'strict'); }
    this.mood = toneOf(this.anger); this.changed();
  }

  /** O'quvchi yozgan yoki aytgan gap */
  chat(message) {
    this.history.push({ role: 'user', content: message });
    const rude = /ahmoq|tentak|jinni|yomon o'qituvchi|bor-e|o'chir|eshak|dura|tupoy|idiot/i.test(message);
    if (this.phase !== 'present') { this.text = 'O\'qituvchi xonada yo\'q. U qaytib kelganda gapiring.'; this.changed(); return; }
    if (rude) { this.event('haqorat', { message }); return; }
    this.lastAct = performance.now();
    if (availableProviders().length) this.aiSay('suhbat', { message }, 'Savolingizni tushundim. Avval tajribani tugatamiz, keyin batafsil gaplashamiz.');
    else this.say(pick(['Yaxshi savol! Hozir tajribaga e\'tibor bering, javobni natijada ko\'rasiz.', 'Tushundim. Jadvalga qarang — hamma javob o\'sha yerda.']));
  }

  mute(v) { this.muted = v; if (v) stopSpeech(); this.changed(); }
}
