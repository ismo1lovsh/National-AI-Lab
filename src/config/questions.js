// ═══════════════════════════════════════════════════════════════════════
// National AI Lab — Savollar banki
// highlightMesh: 'mesh_N' → modelda o'sha qism yonib turadi (ixtiyoriy)
// ═══════════════════════════════════════════════════════════════════════
import { MODELS } from './models';

export const QUESTIONS = [

  // ─── MIYA (brain) — 10 savol ─────────────────────────────────────────
  {
    id: 23, modelId: 'brain',
    q: "Inson miyasining o'rtacha og'irligi qancha?",
    options: ["800 gramm", "1400 gramm", "2000 gramm", "600 gramm"],
    answer: 1,
    explanation: "Inson miyasi o'rtacha ~1400 gramm (1.3–1.5 kg orasida) og'irlikka ega."
  },
  {
    id: 24, modelId: 'brain',
    q: "Inson miyasida taxminan nechta neyron mavjud?",
    options: ["1 milliard", "10 milliard", "86 milliard", "1 trillion"],
    answer: 2,
    explanation: "So'nggi tadqiqotlarga ko'ra inson miyasida ~86 milliard neyron mavjud."
  },
  {
    id: 25, modelId: 'brain',
    q: "Mantiqiy fikrlash, qaror qabul qilish va shaxsiyat uchun qaysi lob mas'ul?",
    options: ["Oksipital lob", "Parietal lob", "Frontal lob", "Temporal lob"],
    answer: 2,
    explanation: "Frontal lob (peshona bo'lagi) oliy fikrlash, ijodiy va ijtimoiy xulq-atvori boshqaradi."
  },
  {
    id: 26, modelId: 'brain',
    q: "Ko'ruv ma'lumotlarini qayta ishlovchi markaziy lob qaysi?",
    options: ["Frontal lob", "Temporal lob", "Parietal lob", "Oksipital lob"],
    answer: 3,
    explanation: "Oksipital lob (ensa bo'lagi) ko'ruv korteksini o'z ichiga oladi va vizual axborotni qayta ishlaydi."
  },
  {
    id: 27, modelId: 'brain',
    q: "Muvozanat, harakat koordinatsiyasi va nozik motorikani qaysi qism boshqaradi?",
    options: ["Gipokamp", "Amigdala", "Miyacha (Cerebellum)", "Talamus"],
    answer: 2,
    explanation: "Miyacha harakat koordinatsiyasi, muvozanat va nozik motorikani tartibga soladi."
  },
  {
    id: 28, modelId: 'brain',
    q: "Nafas olish va yurak ritmini qaysi miya tuzilmasi asosiy tartibga soladi?",
    options: ["Miya yarim korteksi", "Miya poyasi (Brainstem)", "Miyacha", "Gipofiz"],
    answer: 1,
    explanation: "Miya poyasi hayotiy funksiyalar — nafas, yurak urishi va qon bosimini boshqaradi."
  },
  {
    id: 29, modelId: 'brain',
    q: "Nutq markazi (Broca markazi) qaysi lobda joylashgan?",
    options: ["Parietal lob", "Temporal lob", "Frontal lob", "Oksipital lob"],
    answer: 2,
    explanation: "Broca markazi chap frontal lobning pastki qismida joylashgan va nutqni ishlab chiqarish uchun mas'ul."
  },
  {
    id: 30, modelId: 'brain',
    q: "Gipokamp (Hippocampus) asosan qaysi funksiya uchun muhim?",
    options: ["Ko'rish", "Xotira shakllantirish va yo'nalish", "Hidlash", "Eshitish"],
    answer: 1,
    explanation: "Gipokamp yangi xotiralarni shakllantirishda va fazoviy yo'nalishda muhim rol o'ynaydi."
  },
  {
    id: 31, modelId: 'brain',
    q: "Miya chap va o'ng yarim sharlarini birlashtiruvchi asosiy tuzilma?",
    options: ["Talamus", "Gipotalamus", "Corpus Callosum", "Pons"],
    answer: 2,
    explanation: "Corpus callosum 200-250 million asab tolasidan iborat va ikkala yarim sharni bog'laydi."
  },
  {
    id: 32, modelId: 'brain',
    q: "Sezgi ma'lumotlarini (teri sezgisi, og'riq) birlamchi qayta ishlovchi lob qaysi?",
    options: ["Frontal lob", "Temporal lob", "Parietal lob", "Oksipital lob"],
    answer: 2,
    explanation: "Parietal lob somatosensor korteksni o'z ichiga oladi — teri sezgisi, og'riq, harorat qayta ishlanadi."
  },

  // ─── YURAK (heart) — 10 savol ─────────────────────────────────────────
  {
    id: 33, modelId: 'heart',
    q: "Sog'lom inson yuragi minutiga o'rtacha necha marta uradi?",
    options: ["30–50", "60–100", "110–130", "150–180"],
    answer: 1,
    explanation: "Normal dam olish holatida yurakning urish chastotasi 60–100 marta/min (o'rtacha ~72)."
  },
  {
    id: 34, modelId: 'heart',
    q: "Yurakning o'rtacha og'irligi qancha?",
    options: ["~100 gramm", "~300 gramm", "~600 gramm", "~1 kilogramm"],
    answer: 1,
    explanation: "Inson yuragi o'rtacha ~250–350 gramm (erkaklar ~300 g, ayollar ~250 g)."
  },
  {
    id: 35, modelId: 'heart',
    q: "Yurakning nechta kamerasi (bo'shlig'i) mavjud?",
    options: ["2 ta", "3 ta", "4 ta", "6 ta"],
    answer: 2,
    explanation: "Yurak 4 ta kameradan iborat: o'ng bo'lma, o'ng qorincha, chap bo'lma, chap qorincha."
  },
  {
    id: 36, modelId: 'heart',
    q: "O'ng qorincha qonga qayerga yo'naltiradi?",
    options: ["Butun tanaga", "O'pkaga", "Miyaga", "Jigar va buyraklarga"],
    answer: 1,
    explanation: "O'ng qorincha o'pkaga venoz qon yuboradi (kichik qon aylanish doirasi)."
  },
  {
    id: 37, modelId: 'heart',
    q: "Chap qorincha devori nima uchun boshqa kameralardan qalinroq?",
    options: [
      "Ichida ko'proq qon saqlaydi",
      "Butun tana bo'ylab yuqori bosimda qon haydashi kerak",
      "Ko'p qon tomirlarga ulangan",
      "Aksincha, o'ng qorincha qalinroq"
    ],
    answer: 1,
    explanation: "Chap qorincha butun katta qon aylanish doirasi uchun yuqori bosim yaratishi sababli devori eng qalin."
  },
  {
    id: 38, modelId: 'heart',
    q: "Aorta qaysi yurak kamerasidan chiqadi?",
    options: ["O'ng bo'lma", "O'ng qorincha", "Chap bo'lma", "Chap qorincha"],
    answer: 3,
    explanation: "Aorta — eng yirik arteriya — chap qorinchadan chiqib butun tanaga oksigenlangan qon yetkazadi."
  },
  {
    id: 39, modelId: 'heart',
    q: "Sinoatrial (SA) tugun qanday rol o'ynaydi?",
    options: [
      "Yurak qopqoqlarini boshqaradi",
      "Yurak ritmini belgilaydigan asosiy elektr импулс generatori",
      "Qon bosimini o'lchaydi",
      "O'pkadan qon qabul qiladi"
    ],
    answer: 1,
    explanation: "SA tugun o'ng bo'lmada joylashgan va 'yurak peysmekeri' vazifasini bajarib elektr impulslari yaratadi."
  },
  {
    id: 40, modelId: 'heart',
    q: "Koronar arteriyalar qanday vazifani bajaradi?",
    options: [
      "Miyaga qon olib boradi",
      "O'pkani oziqlantradi",
      "Yurak muskulini (miokardni) oziqlantradi",
      "Buyraklarni oziqlantradi"
    ],
    answer: 2,
    explanation: "Koronar arteriyalar bevosita yurak mushagini oksigen va ozuqa bilan ta'minlaydi."
  },
  {
    id: 41, modelId: 'heart',
    q: "Miokard infarkti ('yurak xurujи') nima?",
    options: [
      "Yurak ritmining buzilishi",
      "Yurak qopqog'ining shikastlanishi",
      "Koronar arteriya tiqilib qon oqimi to'xtashi natijasida yurak muskulining o'lishi",
      "Yurak bo'shlig'iga suyuqlik to'planishi"
    ],
    answer: 2,
    explanation: "Miokard infarkti — koronar arteriya ateroskleroz yoki trombus bilan to'silib, yurak muskuliga qon bormasligi."
  },
  {
    id: 42, modelId: 'heart',
    q: "Yurakning qaysi qopqog'i chap bo'lma va chap qorincha o'rtasida joylashgan?",
    options: ["Trikuspidal qopqoq", "Mitral (ikki bargli) qopqoq", "Aortal qopqoq", "O'pka qopqog'i"],
    answer: 1,
    explanation: "Mitral (bikuspidal) qopqoq chap bo'lma va chap qorincha orasini ajratadi."
  },

  // ─── BIOLOGIYA (hujayralar) — 10 savol ───────────────────────────────
  {
    id: 53, modelId: 'plant_cell', highlightMesh: 'mesh_8',
    q: "Fotosintez jarayoni qaysi organoidda kechadi?",
    options: ["Mitoxondriya", "Xloroplast", "Golji apparati", "Lizosoma"],
    answer: 1,
    explanation: "Xloroplastlar xlorofill pigmenti yordamida yorug'lik energiyasini kimyoviy energiyaga aylantiradi — bu fotosintez."
  },
  {
    id: 54, modelId: 'plant_cell', highlightMesh: 'mesh_17',
    q: "Hujayraning 'energiya stansiyasi' deb qaysi organoid ataladi?",
    options: ["Yadro", "Ribosoma", "Mitoxondriya", "Vakuola"],
    answer: 2,
    explanation: "Mitoxondriya hujayra nafas olishida glyukozadan ATF energiya ishlab chiqaradi."
  },
  {
    id: 55, modelId: 'plant_cell', highlightMesh: 'mesh_6',
    q: "Faqat o'simlik hujayrasida mavjud bo'lgan qattiq tashqi qobiq nima?",
    options: ["Plazma membrana", "Hujayra devori", "Sitoskelet", "Yadro membranasi"],
    answer: 1,
    explanation: "Sellyulozadan tashkil topgan hujayra devori faqat o'simlik hujayralarida bor — shakl va mustahkamlik beradi."
  },
  {
    id: 56, modelId: 'plant_cell', highlightMesh: 'mesh_19',
    q: "Hujayraning irsiy ma'lumoti (DNK) qayerda saqlanadi?",
    options: ["Yadroda", "Mitoxondriyada", "Golji apparatida", "Lizosomada"],
    answer: 0,
    explanation: "Yadro — hujayraning boshqaruv markazi, DNK asosan shu yerda xromatin ko'rinishida saqlanadi."
  },
  {
    id: 57, modelId: 'plant_cell', highlightMesh: 'mesh_3',
    q: "O'simlik hujayrasi hajmining 80% gacha qismini egallashi mumkin bo'lgan organoid?",
    options: ["Yadro", "Xloroplast", "Markaziy vakuola", "Endoplazmatik to'r"],
    answer: 2,
    explanation: "Markaziy vakuola suv saqlaydi va turgor bosimini ushlab turadi — yetuk hujayrada hajmning 80% gacha egallaydi."
  },
  {
    id: 58, modelId: 'animal_cell',
    q: "Hayvon hujayrasida quyidagilardan qaysi biri YO'Q?",
    options: ["Mitoxondriya", "Xloroplast", "Ribosoma", "Yadro"],
    answer: 1,
    explanation: "Xloroplast va hujayra devori faqat o'simlik hujayrasida bor — hayvon hujayrasida mavjud emas."
  },
  {
    id: 59, modelId: 'plant_cell', highlightMesh: 'mesh_22',
    q: "Oqsillarni qayta ishlab, saralab, kerakli joyga jo'natuvchi organoid?",
    options: ["Golji apparati", "Lizosoma", "Yadrocha", "Sitoskelet"],
    answer: 0,
    explanation: "Golji apparati yassi membrana qopchalaridan iborat — oqsillarni saralab 'jo'natish markazi' vazifasini bajaradi."
  },
  {
    id: 60, modelId: 'plant_cell', highlightMesh: 'mesh_12',
    q: "Hazm fermentlari saqlanadigan va eskirgan organoidlarni parchalaydigan pufakchalar?",
    options: ["Vakuolalar", "Lizosomalar", "Ribosomalar", "Xloroplastlar"],
    answer: 1,
    explanation: "Lizosomalar hazm fermentlariga boy — eskirgan organoidlar va zararli moddalarni parchalaydi."
  },
  {
    id: 61, modelId: 'animal_cell',
    q: "Ribosomalarning asosiy vazifasi nima?",
    options: ["Energiya ishlab chiqarish", "Oqsil sintezi", "Moddalarni saqlash", "Hujayra bo'linishi"],
    answer: 1,
    explanation: "Ribosomalar RNK ma'lumoti asosida aminokislotalardan oqsil yig'adi — oqsil sintezi markazi."
  },
  {
    id: 62, modelId: 'plant_cell', highlightMesh: 'mesh_14',
    q: "Endoplazmatik to'rning 'donador' (g'adir-budir) ko'rinishini nima hosil qiladi?",
    options: ["Lizosomalar", "Xlorofill", "Ribosomalar", "Kraxmal donalari"],
    answer: 2,
    explanation: "Donador ER yuzasiga ribosomalar birikkan — shu yerda membrana va eksport oqsillari sintez qilinadi."
  },

  // ─── ASTRONOMIYA (Quyosh tizimi) — 10 savol ──────────────────────────
  {
    id: 63, modelId: 'solar_system', highlightMesh: 'mesh_21',
    q: "Quyosh tizimi umumiy massasining ~99.86% ini nima tashkil qiladi?",
    options: ["Yupiter", "Quyosh", "Barcha sayyoralar birgalikda", "Asteroidlar kamari"],
    answer: 1,
    explanation: "Quyosh tizim massasining 99.86% ini tashkil qiladi — barcha sayyoralar birgalikda 0.14% dan kam."
  },
  {
    id: 64, modelId: 'solar_system', highlightMesh: 'mesh_0',
    q: "Quyoshga eng yaqin sayyora qaysi?",
    options: ["Venera", "Mars", "Merkuriy", "Yer"],
    answer: 2,
    explanation: "Merkuriy Quyoshga eng yaqin sayyora — atrofini atigi 88 kunda aylanib chiqadi."
  },
  {
    id: 65, modelId: 'solar_system', highlightMesh: 'mesh_1',
    q: "Quyosh tizimidagi ENG ISSIQ sayyora qaysi?",
    options: ["Merkuriy", "Venera", "Mars", "Yupiter"],
    answer: 1,
    explanation: "Venera (+465°C) Merkuriydan ham issiq — qalin CO₂ atmosferasi issiqxona effektini yaratadi."
  },
  {
    id: 66, modelId: 'solar_system', highlightMesh: 'mesh_4',
    q: "Quyosh tizimidagi eng katta sayyora qaysi?",
    options: ["Saturn", "Neptun", "Yupiter", "Uran"],
    answer: 2,
    explanation: "Yupiter — gaz giganti, diametri 139 820 km, qolgan barcha sayyoralar massasidan 2.5 barobar og'ir."
  },
  {
    id: 67, modelId: 'solar_system', highlightMesh: 'mesh_6',
    q: "Saturn halqalari asosan nimadan tashkil topgan?",
    options: ["Gaz bulutlari", "Muz va tosh bo'laklari", "Chang zarralari", "Metall parchalar"],
    answer: 1,
    explanation: "Saturn halqalari millionlab muz va tosh bo'laklaridan iborat — kengligi ~280 000 km, qalinligi esa juda yupqa."
  },
  {
    id: 68, modelId: 'solar_system', highlightMesh: 'mesh_3',
    q: "'Qizil sayyora' deb qaysi sayyora ataladi?",
    options: ["Venera", "Yupiter", "Merkuriy", "Mars"],
    answer: 3,
    explanation: "Mars yuzasidagi temir oksidi (zang) unga qizil rang beradi. Eng baland tog' — Olympus Mons ham shu yerda."
  },
  {
    id: 69, modelId: 'solar_system', highlightMesh: 'mesh_9',
    q: "2006-yilda sayyoralar ro'yxatidan chiqarilib, 'mitti sayyora' maqomini olgan osmon jismi?",
    options: ["Pluton", "Neptun", "Seres", "Eris"],
    answer: 0,
    explanation: "Pluton 2006-yilda Xalqaro Astronomiya Ittifoqi qarori bilan mitti sayyora deb qayta tasniflandi."
  },
  {
    id: 70, modelId: 'solar_system', highlightMesh: 'mesh_2',
    q: "Yer Quyosh atrofini qancha vaqtda to'liq aylanib chiqadi?",
    options: ["24 soat", "30 kun", "365.25 kun", "687 kun"],
    answer: 2,
    explanation: "Yer Quyosh atrofini 365.25 kunda aylanadi — shu chorak kun tufayli har 4 yilda kabisa yili bo'ladi."
  },
  {
    id: 71, modelId: 'solar_system', highlightMesh: 'mesh_8',
    q: "Quyosh tizimidagi eng kuchli shamollar qaysi sayyorada kuzatiladi?",
    options: ["Mars", "Yupiter", "Saturn", "Neptun"],
    answer: 3,
    explanation: "Neptunda shamollar tezligi 2100 km/soatgacha yetadi — Quyosh tizimidagi eng kuchli shamollar."
  },
  {
    id: 72, modelId: 'solar_system', highlightMesh: 'mesh_10',
    q: "Yer okeanlaridagi suv ko'tarilishi (to'lqin) hodisasini asosan nima boshqaradi?",
    options: ["Quyosh shamoli", "Oyning tortishish kuchi", "Yer magnit maydoni", "Mars ta'siri"],
    answer: 1,
    explanation: "Oyning tortishish kuchi okean suvlarini o'ziga tortadi — suv ko'tarilishi va qaytishi shundan kelib chiqadi."
  },

];

// Savol yo'nalishi — modelId orqali aniqlanadi
const categoryOf = (modelId) => MODELS.find(m => m.id === modelId)?.category || null;

export function getQuestionsByCategory(category) {
  return category ? QUESTIONS.filter(q => categoryOf(q.modelId) === category) : QUESTIONS;
}

// Tasodifiy savollar tanlash (category berilsa — faqat shu yo'nalishdan)
export function getRandomQuestions(count = 10, category = null) {
  const pool = getQuestionsByCategory(category);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
