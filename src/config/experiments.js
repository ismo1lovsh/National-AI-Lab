// ═══════════════════════════════════════════════════════════════════════════
// Kimyo laboratoriyasi — tajribalar ro'yxati
// Har bir tajriba: nima olinadi, qaysi moddalar kerak (miqdori va vazifasi),
// qadamlar va qaysi reaksiya bajarilganda tajriba tugaydi.
// Erkin tajribada topilgan yangi reaksiyalar «kashfiyot» bo'lib 6, 7, ...
// raqam bilan shu ro'yxatga qo'shiladi (brauzer xotirasida saqlanadi).
// ═══════════════════════════════════════════════════════════════════════════
import { REACTIONS, SUB_MAP } from './virtualLabChemEngine';


// Laboratoriya omborida ko'rinadigan barcha moddalar (yashirin mahsulotlarsiz)
export const STORE = Object.values(SUB_MAP).filter(s => !s.hidden && s.cat);
export const STORE_CATS = [...new Set(STORE.map(s => s.cat))];

const R = (id, amount, role) => ({ id, amount, role });

export const EXPERIMENTS = [
  {
    id: 'vodorod', num: 1, icon: '🫧',
    title: 'Vodorod olish',
    goal: 'Rux metali va xlorid kislotadan vodorod gazini olish',
    product: 'H₂ — vodorod (gaz)',
    reagents: [R('Zn', '6,5 g', 'metall — vodorodni siqib chiqaradi'), R('HCl', '50 mL, 1M', 'kislota — vodorod manbai')],
    steps: [
      { id: 'Zn', text: 'Rux donachalarini markaziy kolbaga soling' },
      { id: 'HCl', text: 'Ustidan xlorid kislota quying' },
    ],
    target: 'zn_hcl',
    watch: 'Rux yuzasida pufakchalar paydo bo\'ladi — bu vodorod.',
    level: '8-sinf',
  },
  {
    id: 'co2', num: 2, icon: '🌫️',
    title: 'Karbonat angidrid olish',
    goal: 'Marmar (kalsiy karbonat) ga kislota ta\'sir ettirib CO₂ gazini olish',
    product: 'CO₂ — karbonat angidrid (gaz)',
    reagents: [R('CaCO3', '12 g', 'karbonat — CO₂ manbai'), R('HCl', '50 mL, 1M', 'kislota — karbonatni parchalaydi')],
    steps: [
      { id: 'CaCO3', text: 'Marmar bo\'lakchalarini kolbaga soling' },
      { id: 'HCl', text: 'Xlorid kislota quying' },
    ],
    target: 'hcl_caco3',
    watch: 'Shiddatli «qaynash» — karbonat angidrid ajralmoqda.',
    level: '8-sinf',
  },
  {
    id: 'cuoh2', num: 3, icon: '💧',
    title: 'Mis(II) gidroksid olish',
    goal: 'Mis kuporosi eritmasiga ishqor qo\'shib moviy cho\'kma olish',
    product: 'Cu(OH)₂ — moviy cho\'kma',
    reagents: [R('CuSO4', '50 mL, 0,5M', 'mis tuzi — Cu²⁺ ionlari manbai'), R('NaOH', '50 mL, 1M', 'ishqor — OH⁻ ionlari manbai')],
    steps: [
      { id: 'CuSO4', text: 'Mis(II) sulfat eritmasini quying' },
      { id: 'NaOH', text: 'Natriy gidroksid eritmasini qo\'shing' },
    ],
    target: 'cuso4_naoh',
    watch: 'Ko\'k eritmada moviy iviqsimon cho\'kma tushadi.',
    level: '8-sinf',
  },
  {
    id: 'mis', num: 4, icon: '🟠',
    title: 'Temir yordamida mis ajratib olish',
    goal: 'Faolroq metall (temir) misni tuzidan siqib chiqaradi',
    product: 'Cu — sof mis (qizg\'ish qatlam)',
    reagents: [R('CuSO4', '50 mL, 0,5M', 'mis tuzi eritmasi'), R('Fe', '8 g', 'temir mix — faolroq metall')],
    steps: [
      { id: 'CuSO4', text: 'Mis(II) sulfat eritmasini quying' },
      { id: 'Fe', text: 'Temir mixni eritmaga tushiring' },
    ],
    target: 'fe_cuso4',
    watch: 'Temir yuzasi qizg\'ish mis bilan qoplanadi, eritma yashillanadi.',
    level: '8-sinf',
  },
  {
    id: 'neytral', num: 5, icon: '🎨',
    title: 'Neytrallanish reaksiyasi',
    goal: 'Indikator yordamida kislota va ishqor bir-birini neytrallashini ko\'rish',
    product: 'NaCl + H₂O — neytral eritma',
    reagents: [R('NaOH', '50 mL, 1M', 'ishqor'), R('fenolftalein', '5 tomchi', 'indikator — ishqorda pushti'), R('HCl', '50 mL, 1M', 'kislota — ishqorni neytrallaydi')],
    steps: [
      { id: 'NaOH', text: 'Natriy gidroksid quying' },
      { id: 'fenolftalein', text: 'Fenolftalein tomizing — eritma pushti bo\'ladi' },
      { id: 'HCl', text: 'Xlorid kislota qo\'shing — rang yo\'qoladi' },
    ],
    ordered: true,
    target: 'hcl_naoh',
    watch: 'Pushti rang kislota qo\'shilgach yo\'qoladi — muhit neytral.',
    level: '8-sinf',
  },
];

export const FREE = {
  id: 'erkin', num: 0, icon: '🧪',
  title: 'Erkin tajriba',
  goal: 'Xohlagan moddalaringizni tanlang va aralashtiring. Yangi modda hosil bo\'lsa — u yangi tajriba sifatida ro\'yxatga qo\'shiladi.',
  reagents: [], steps: [], free: true,
};

export const MAX_PICK = 8;

// ── Kashfiyotlar (erkin tajribada topilgan reaksiyalar) ─────────────────────
const KEY = 'national-ai-lab-kashfiyotlar-v1';
export function loadDiscoveries() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveDiscovery(reaction) {
  const list = loadDiscoveries();
  const builtIn = EXPERIMENTS.some(e => e.target === reaction.id);
  if (builtIn || list.some(d => d.target === reaction.id)) return null;
  const reag = reaction.reactants.filter(id => SUB_MAP[id] && !SUB_MAP[id].hidden);
  if (!reag.length) return null;
  const num = EXPERIMENTS.length + list.length + 1;
  const d = {
    id: 'kashf_' + reaction.id, num, icon: '✨', discovered: true,
    title: reaction.type.replace(/\s*\(.*\)\s*$/, '') + ': ' + reag.map(id => SUB_MAP[id].formula).join(' + '),
    goal: reaction.eq.replace(/\s*\+?\s*💥.*$|🌋.*$/u, ''),
    product: reaction.eq.split('→')[1]?.trim().replace(/💥.*|🌋.*/u, '') || '',
    reagents: reag.map(id => R(id, `${SUB_MAP[id].defaultDose} ${SUB_MAP[id].unit}`, SUB_MAP[id].cat.toLowerCase())),
    steps: reag.map(id => ({ id, text: `${SUB_MAP[id].name} qo'shing` })),
    target: reaction.id,
    watch: reaction.observe,
    level: reaction.sinf,
  };
  list.push(d);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* xotira to'la */ }
  return d;
}

export const REACTION_BY_ID = Object.fromEntries(REACTIONS.map(r => [r.id, r]));
