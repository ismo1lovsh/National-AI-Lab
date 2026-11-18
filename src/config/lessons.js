// ═══════════════════════════════════════════════════════════════════════════
// National AI Lab — Dars ketma-ketliklari
// ═══════════════════════════════════════════════════════════════════════════

export const LESSONS = [
  {
    id: 'military-tech',
    icon: '🛡️',
    title:   { uz: 'Harbiy texnika va Dron muhandisligi', ru: 'Военная техника и БПЛА' },
    subject: { uz: 'Harbiy-texnik tayyorgarlik',          ru: 'Военно-техническая подготовка' },
    steps: [
      { modelId: 'gun_m4a1', partKey: null,
        note: { uz: "Asosiy jangovar tankning umumiy tuzilishi bilan tanishing. ☝️ Ko'rsatkich barmoq bilan 360° aylantiring.",
                ru: 'Ознакомьтесь с общим устройством танка. Вращайте модель указательным пальцем ☝️.' } },
      { modelId: 'gun_m4a1', partKey: 'mesh_9',
        note: { uz: "✌️ Ikki barmoq (Rentgen) yoki ✊→🖐 (Ajratish) orqali korpus ichidagi 1500 ot kuchiga ega AGT1500 gaz-turbinali dvigatelni ko'ring.",
                ru: 'Используйте ✌️ (Рентген) или ✊→🖐 (Разборка), чтобы увидеть газотурбинный двигатель AGT1500.' } },
      { modelId: 'tactical_drone', partKey: null,
        note: { uz: "AX-47 Taktik Razvedka Droni. Karbon shassi va 4 ta cho'tkasiz motor aerodinamikasini kuzating.",
                ru: 'Тактический БПЛА AX-47. Изучите карбоновую раму и аэродинамику 4 бесколлекторных моторов.' } },
      { modelId: 'tactical_drone', partKey: 'camera_gimbal',
        note: { uz: "3-o'qli optik-termal kamera va lazerli dalnomer — 200 m+ masofada obyektlarni aniqlash va kuzatish vazifasini bajaradi.",
                ru: '3-осевая оптико-тепловизионная камера и лазерный дальномер для обнаружения целей.' } },
    ],
  },
  {
    id: 'cell-basics',
    icon: '🦠',
    title:   { uz: 'Hujayra — hayot asosi', ru: 'Клетка — основа жизни' },
    subject: { uz: 'Biologiya · 7-sinf',    ru: 'Биология · 7 класс' },
    steps: [
      { modelId:'animal_cell', partKey:null,
        note:{ uz:'Hayvon hujayrasi bilan tanishtiring. Modelni aylantirib, umumiy shaklini ko\'rsating.',
               ru:'Познакомьте с животной клеткой. Поверните модель и покажите общую форму.' } },
      { modelId:'animal_cell', partKey:'mesh_15',
        note:{ uz:'✊→🖐 harakati bilan hujayra qismlarini ajrating va ✌️ Rentgen rejimida Yadro hamda Mitoxondriyalarni ko\'rsating.',
               ru:'Жестом ✊→🖐 разберите части клетки и покажите Ядро и Митохондрии в режиме рентгена.' } },
      { modelId:'plant_cell', partKey:null,
        note:{ uz:'Endi o\'simlik hujayrasi. Taqqoslash rejimini yoqib, farqni so\'rang.',
               ru:'Теперь растительная клетка. Включите сравнение и спросите об отличиях.' } },
      { modelId:'plant_cell', partKey:'mesh_6',
        note:{ uz:'Hujayra devori va xloroplast — o\'simlikda bor, hayvonda yo\'q. Nima uchun?',
               ru:'Клеточная стенка и хлоропласт есть у растений, но не у животных. Почему?' } },
    ],
  },
  {
    id: 'human-body',
    icon: '🧍',
    title:   { uz: 'Inson tanasi tizimlari', ru: 'Системы организма человека' },
    subject: { uz: 'Anatomiya · 8-sinf',     ru: 'Анатомия · 8 класс' },
    steps: [
      { modelId:'skeleton', partKey:null,
        note:{ uz:'Skelet — tananing tayanchi. 206 ta suyak. ✌️ Rentgen rejimida ko\'krak qafasi ichini ko\'rsating.',
               ru:'Скелет — опора тела. 206 костей. Включите рентген для обзора грудной клетки.' } },
      { modelId:'heart', partKey:null,
        note:{ uz:'Yurak — qo\'shaloq mushakli nasos. Minutiga 60-80 marta urib, qonni haydaydi.',
               ru:'Сердце — двойной мышечный насос. Бьётся 60-80 раз в минуту.' } },
      { modelId:'angiology', partKey:null,
        note:{ uz:'Qon tomirlar tarmog\'i — yurakdan butun tanaga. Umumiy uzunligi ~100 000 km.',
               ru:'Сосудистая сеть — от сердца ко всему телу. Общая длина ~100 000 км.' } },
      { modelId:'brain', partKey:null,
        note:{ uz:'Miya — boshqaruv markazi. Qismlarni tanlab, har birining vazifasini so\'rang.',
               ru:'Мозг — центр управления. Выбирайте части и спрашивайте об их функциях.' } },
    ],
  },
  {
    id: 'solar-system',
    icon: '🪐',
    title:   { uz: 'Quyosh tizimi', ru: 'Солнечная система' },
    subject: { uz: 'Astronomiya · 6-sinf', ru: 'Астрономия · 6 класс' },
    steps: [
      { modelId:'solar_system', partKey:'sun',
        note:{ uz:'Quyosh — markaziy yulduz, tizim massasining 99.86% i.',
               ru:'Солнце — центральная звезда, 99,86% массы системы.' } },
      { modelId:'solar_system', partKey:'earth',
        note:{ uz:'Yer — hayot mavjud yagona sayyora. Oy bilan birga aylanadi.',
               ru:'Земля — единственная планета с жизнью. Вращается вместе с Луной.' } },
      { modelId:'solar_system', partKey:'jupiter',
        note:{ uz:'Yupiter — eng katta sayyora, gaz giganti. Katta Qizil Dog\'i 300 yillik bo\'ron.',
               ru:'Юпитер — крупнейшая планета. Большое Красное Пятно — шторм 300 лет.' } },
      { modelId:'solar_system', partKey:'saturn',
        note:{ uz:'Saturn halqalari — muz va tosh. Ajratish harakati bilan orbitalarni keng oching.',
               ru:'Кольца Сатурна — лёд и камень. Жестом «разобрать» раздвиньте орбиты.' } },
    ],
  },
];

export function lessonTitle(lesson, lang) {
  return lesson.title[lang] ?? lesson.title.uz;
}
export function lessonSubject(lesson, lang) {
  return lesson.subject[lang] ?? lesson.subject.uz;
}
export function stepNote(step, lang) {
  return step.note?.[lang] ?? step.note?.uz ?? '';
}
