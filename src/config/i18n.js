// ═══════════════════════════════════════════════════════════════════════════
// National AI Lab — Interfeys tillari (O'zbek / Rus)
// ═══════════════════════════════════════════════════════════════════════════

export const LANGS = [
  { id: 'uz', label: "O'zbekcha", short: 'UZ' },
  { id: 'ru', label: 'Русский',   short: 'RU' },
];

const STR = {
  subtitle:      { uz: 'J.A.R.V.I.S. 3D CAD VA SIMULYATOR TIZIMI', ru: 'J.A.R.V.I.S. 3D CAD И СИМУЛЯТОР' },
  navModels:     { uz: 'Modellar',       ru: 'Модели' },
  nav3D:         { uz: '3D CAD',         ru: '3D CAD' },
  navInternal:   { uz: 'Ichki Rentgen',  ru: 'Рентген (Внутр.)' },
  navExplode:    { uz: 'Qismlarga Ajrat',ru: 'Разобрать' },
  navSim:        { uz: 'Simulyator / Haydash', ru: 'Симулятор / Привод' },
  navFirstAid:   { uz: '1-Yordam Protokoli', ru: 'Первая Помощь' },
  navInfo:       { uz: "Ma'lumot",       ru: 'Справка' },
  navAI:         { uz: 'AI Ustoz',       ru: 'ИИ-Учитель' },
  quiz:          { uz: 'Test',           ru: 'Тест' },
  selectedPart:  { uz: 'TANLANGAN DETAL',ru: 'ВЫБРАННАЯ ДЕТАЛЬ' },
  noInfo:        { uz: "Ma'lumot yo'q",  ru: 'Нет данных' },
  cancelHint:    { uz: 'Esc yoki ✕ → bekor qilish', ru: 'Esc или ✕ → отменить' },
  askAI:         { uz: "AI Ustozdan so'rash", ru: 'Спросить ИИ-учителя' },
  aiTeacher:     { uz: 'AI USTOZ · J.A.R.V.I.S.', ru: 'ИИ-УЧИТЕЛЬ · J.A.R.V.I.S.' },
  preparing:     { uz: 'Tahlil tayyorlanmoqda…', ru: 'Готовлю анализ…' },

  controls:      { uz: 'CAD BOSHQARUV PANELI', ru: 'ПАНЕЛЬ УПРАВЛЕНИЯ' },
  labels:        { uz: 'Yorliqlar',      ru: 'Метки' },
  cadEdges:      { uz: 'CAD Qirralar',   ru: 'CAD Грани' },
  xray:          { uz: 'Rentgen (Motor)',ru: 'Рентген (Мотор)' },
  explode:       { uz: 'Qismlarga ajrat',ru: 'Разобрать' },
  assemble:      { uz: "Qismlarni yig'", ru: 'Собрать' },
  explodeDist:   { uz: 'Ajratish masofasi', ru: 'Дистанция разборки' },
  xrayDepth:     { uz: 'Qobiq shaffofligi', ru: 'Прозрачность корпуса' },
  compare:       { uz: 'Taqqoslash',     ru: 'Сравнить' },
  screenshot:    { uz: 'Rasmga olish',   ru: 'Снимок' },
  projector:     { uz: 'Proyektor',      ru: 'Проектор' },
  specsTitle:    { uz: 'TEXNIK KOʻRSATKICHLAR', ru: 'ТЕХ. ПАРАМЕТРЫ' },
  partsList:     { uz: 'TARKIBIY QISMLAR', ru: 'СОСТАВНЫЕ ЧАСТИ' },

  lessons:       { uz: 'DARSLAR',        ru: 'УРОКИ' },
  chooseLesson:  { uz: 'Dars tanlang',   ru: 'Выберите урок' },
  step:          { uz: 'qadam',          ru: 'шаг' },
  next:          { uz: 'Keyingi',        ru: 'Далее' },
  prev:          { uz: 'Oldingi',        ru: 'Назад' },
  exitLesson:    { uz: 'Darsni tugatish',ru: 'Завершить урок' },

  camOff:        { uz: "Kamera o'chiq",  ru: 'Камера выключена' },
  camOnHint:     { uz: 'yoqish uchun bosing', ru: 'нажмите, чтобы включить' },
  showHand:      { uz: "Qo'lingizni ko'rsating", ru: 'Покажите руку' },
  handCloser:    { uz: "Qo'lingizni kameraga yaqinroq tuting", ru: 'Держите руку ближе к камере' },
  syncLabel:     { uz: 'Sinxron',        ru: 'Синхрон' },

  gestures:      { uz: 'WIDEPIPE SENSOR BOSHQARUVI', ru: 'УПРАВЛЕНИЕ WIDEPIPE' },
};

export function t(key, lang = 'uz') {
  const e = STR[key];
  if (!e) return key;
  return e[lang] ?? e.uz;
}
