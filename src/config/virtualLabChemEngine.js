// ═══════════════════════════════════════════════════════════════════════════════
// Virtual Lab 3D + National AI Lab — To'liq Kimyoviy Moddalar (33 ta) va Reaksiyalar (30 ta) Bazasi
// (`virtual_lab/chemistry.py` dan to'liq ko'chirilgan va miqdor/dozator hisoblagichi qo'shilgan!)
// ═══════════════════════════════════════════════════════════════════════════════

export const SUBSTANCES = [
  // 1. Kislotalar (Konus kolbalarda — Erlenmeyer Flask)
  { id: 'HCl', name: 'Xlorid kislota', formula: 'HCl', cat: 'Kislotalar', state: 'eritma', vesselShape: 'conical', defaultDose: 50, unit: 'mL', molarity: '1.0M', color: '#cfe8ff', ph: 'acid', level: 'maktab', hazard: "O'yuvchi: teri va ko'zni kuydiradi." },
  { id: 'H2SO4', name: 'Sulfat kislota', formula: 'H₂SO₄', cat: 'Kislotalar', state: 'eritma', vesselShape: 'conical', defaultDose: 50, unit: 'mL', molarity: '1.0M', color: '#d8e8fa', ph: 'acid', level: 'maktab', hazard: "O'yuvchi. Suyultirishda kislotani suvga quyiladi." },
  { id: 'CH3COOH', name: 'Sirka kislota', formula: 'CH₃COOH', cat: 'Kislotalar', state: 'eritma', vesselShape: 'conical', defaultDose: 45, unit: 'mL', molarity: '0.8M', color: '#e4f0fb', ph: 'acid', level: 'maktab', hazard: "Kuchli hidli kislota." },

  // 2. Ishqorlar / Asoslar (Konus kolbalarda)
  { id: 'NaOH', name: 'Natriy gidroksid', formula: 'NaOH', cat: 'Asoslar', state: 'eritma', vesselShape: 'conical', defaultDose: 50, unit: 'mL', molarity: '1.0M', color: '#d6e9ff', ph: 'base', level: 'maktab', hazard: "O'yuvchi ishqor: ko'z uchun xavfli." },
  { id: 'CaOH2', name: 'Ohak suvi', formula: 'Ca(OH)₂', cat: 'Asoslar', state: 'eritma', vesselShape: 'conical', defaultDose: 60, unit: 'mL', molarity: '0.5M', color: '#e6f2ff', ph: 'base', level: 'maktab', hazard: "Ishqoriy eritma." },
  { id: 'NH3', name: 'Ammiak eritmasi', formula: 'NH₃·H₂O', cat: 'Asoslar', state: 'eritma', vesselShape: 'florence', defaultDose: 40, unit: 'mL', molarity: '2.0M', color: '#d0ebff', ph: 'base', level: 'universitet', hazard: "O'tkir hidli, mo'rili shkafda ishlanadi." },

  // 3. Metallar (Shisha bankalarda — 3D metall bo'laklari bilan)
  { id: 'Na', name: 'Natriy (metall)', formula: 'Na', cat: 'Metallar', state: 'qattiq', vesselShape: 'jar', defaultDose: 3.5, unit: 'g', color: '#cbd5e1', ph: null, level: 'maktab', hazard: "Suv bilan shiddatli portlab reaksiyaga kirishadi!" },
  { id: 'Mg', name: 'Magniy lentasi', formula: 'Mg', cat: 'Metallar', state: 'qattiq', vesselShape: 'jar', defaultDose: 2.0, unit: 'g', color: '#e2e8f0', ph: null, level: 'maktab', hazard: "Yonganda ko'zni qamashtiruvchi chaqnash beradi." },
  { id: 'Zn', name: 'Rux donachalari', formula: 'Zn', cat: 'Metallar', state: 'qattiq', vesselShape: 'jar', defaultDose: 6.5, unit: 'g', color: '#94a3b8', ph: null, level: 'maktab', hazard: "Kam xavfli metall." },
  { id: 'Fe', name: 'Temir mix', formula: 'Fe', cat: 'Metallar', state: 'qattiq', vesselShape: 'jar', defaultDose: 8.0, unit: 'g', color: '#64748b', ph: null, level: 'maktab', hazard: "Kam xavfli metall." },
  { id: 'Cu', name: 'Mis spiral sim', formula: 'Cu', cat: 'Metallar', state: 'qattiq', vesselShape: 'jar', defaultDose: 6.0, unit: 'g', color: '#d97706', ph: null, level: 'maktab', hazard: "Kam xavfli metall." },

  // 4. Tuzlar (Laboratoriya reaktiv kolbalarida)
  { id: 'NaCl', name: 'Osh tuzi eritmasi', formula: 'NaCl', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 50, unit: 'mL', molarity: '0.5M', color: '#e0f2fe', ph: 'neutral', level: 'maktab', hazard: 'Xavfsiz tuz eritmasi.' },
  { id: 'CuSO4', name: 'Mis(II) sulfat', formula: 'CuSO₄', cat: 'Tuzlar', state: 'eritma', vesselShape: 'conical', defaultDose: 50, unit: 'mL', molarity: '0.5M', color: '#0284c7', ph: 'neutral', level: 'maktab', hazard: 'Zaharli, yutib yubormang.' },
  { id: 'AgNO3', name: 'Kumush nitrat', formula: 'AgNO₃', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 40, unit: 'mL', molarity: '0.2M', color: '#dbeafe', ph: 'neutral', level: 'maktab', hazard: "Terini qora dog' qiladi." },
  { id: 'BaCl2', name: 'Bariy xlorid', formula: 'BaCl₂', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 45, unit: 'mL', molarity: '0.5M', color: '#e0f2fe', ph: 'neutral', level: 'maktab', hazard: 'Zaharli bariy tuzi.' },
  { id: 'Na2CO3', name: 'Natriy karbonat', formula: 'Na₂CO₃', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 50, unit: 'mL', molarity: '0.5M', color: '#e0f2fe', ph: 'base', level: 'maktab', hazard: "Ko'zni ta'sirlaydi." },
  { id: 'NaHCO3', name: 'Choy sodasi', formula: 'NaHCO₃', cat: 'Tuzlar', state: 'qattiq', vesselShape: 'jar', defaultDose: 10.0, unit: 'g', color: '#f8fafc', ph: 'base', level: 'maktab', hazard: 'Xavfsiz kukun.' },
  { id: 'CaCO3', name: 'Marmar boʻlaklari', formula: 'CaCO₃', cat: 'Tuzlar', state: 'qattiq', vesselShape: 'jar', defaultDose: 12.0, unit: 'g', color: '#f1f5f9', ph: null, level: 'maktab', hazard: 'Xavfsiz mineral.' },
  { id: 'CaCl2', name: 'Kalsiy xlorid', formula: 'CaCl₂', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 45, unit: 'mL', molarity: '0.5M', color: '#e0f2fe', ph: 'neutral', level: 'maktab', hazard: "Ko'zni ta'sirlaydi." },
  { id: 'FeCl3', name: 'Temir(III) xlorid', formula: 'FeCl₃', cat: 'Tuzlar', state: 'eritma', vesselShape: 'conical', defaultDose: 45, unit: 'mL', molarity: '0.5M', color: '#d97706', ph: 'acid', level: 'maktab', hazard: "O'yuvchi, kiyimni bo'yaydi." },
  { id: 'FeSO4', name: 'Temir(II) sulfat', formula: 'FeSO₄', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 45, unit: 'mL', molarity: '0.5M', color: '#86efac', ph: 'acid', level: 'universitet', hazard: 'Yutib yubormang.' },
  { id: 'KI', name: 'Kaliy yodid', formula: 'KI', cat: 'Tuzlar', state: 'eritma', vesselShape: 'conical', defaultDose: 45, unit: 'mL', molarity: '1.0M', color: '#fef08a', ph: 'neutral', level: 'maktab', hazard: 'Kam xavfli reaktiv.' },
  { id: 'PbNO32', name: 'Qoʻrgʻoshin(II) nitrat', formula: 'Pb(NO₃)₂', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 45, unit: 'mL', molarity: '0.3M', color: '#e2e8f0', ph: 'neutral', level: 'universitet', hazard: 'Zaharli ogʻir metall tuzi!' },
  { id: 'KSCN', name: 'Kaliy tiosianat', formula: 'KSCN', cat: 'Tuzlar', state: 'eritma', vesselShape: 'bottle', defaultDose: 40, unit: 'mL', molarity: '0.5M', color: '#f1f5f9', ph: 'neutral', level: 'universitet', hazard: 'Ehtiyotkorlik bilan ishlang.' },
  { id: 'NH4Cl', name: 'Ammoniy xlorid', formula: 'NH₄Cl', cat: 'Tuzlar', state: 'qattiq', vesselShape: 'jar', defaultDose: 8.0, unit: 'g', color: '#f8fafc', ph: 'acid', level: 'maktab', hazard: 'Qizdirilganda ammiak ajraladi.' },
  { id: 'KMnO4', name: 'Kaliy permanganat', formula: 'KMnO₄', cat: 'Tuzlar', state: 'eritma', vesselShape: 'florence', defaultDose: 40, unit: 'mL', molarity: '0.2M', color: '#9333ea', ph: 'neutral', level: 'universitet', hazard: 'Kuchli oksidlovchi!' },

  // 5. Boshqalar va Organik moddalar
  { id: 'H2O', name: 'Distillangan suv', formula: 'H₂O', cat: 'Boshqalar', state: 'suyuq', vesselShape: 'conical', defaultDose: 60, unit: 'mL', molarity: 'Toza', color: '#bae6fd', ph: 'neutral', level: 'maktab', hazard: 'Xavfsiz erituvchi.', solvent: true },
  { id: 'H2O2', name: 'Vodorod peroksid', formula: 'H₂O₂', cat: 'Boshqalar', state: 'eritma', vesselShape: 'conical', defaultDose: 55, unit: 'mL', molarity: '30%', color: '#7dd3fc', ph: 'neutral', level: 'maktab', hazard: 'Kuchli oksidlovchi!' },
  { id: 'MnO2', name: 'Marganes(IV) oksid', formula: 'MnO₂', cat: 'Boshqalar', state: 'qattiq', vesselShape: 'jar', defaultDose: 5.0, unit: 'g', color: '#334155', ph: null, level: 'maktab', hazard: 'Katalizator kukun.' },
  { id: 'CO2', name: 'Karbonat angidrid', formula: 'CO₂', cat: 'Boshqalar', state: 'gaz', vesselShape: 'gas', defaultDose: 100, unit: 'mL gaz', color: '#cbd5e1', ph: 'acid', level: 'maktab', hazard: 'Bosimli gaz balloni.' },
  { id: 'I2', name: 'Yod eritmasi', formula: 'I₂', cat: 'Boshqalar', state: 'eritma', vesselShape: 'bottle', defaultDose: 30, unit: 'mL', molarity: '5%', color: '#b45309', ph: 'neutral', level: 'maktab', hazard: "Terini bo'yaydi." },
  { id: 'kraxmal', name: 'Kraxmal eritmasi', formula: '(C₆H₁₀O₅)ₙ', cat: 'Organik', state: 'eritma', vesselShape: 'florence', defaultDose: 50, unit: 'mL', color: '#fef9c3', ph: 'neutral', level: 'maktab', hazard: 'Xavfsiz organik polisaxarid.' },
  { id: 'C2H5OH', name: 'Etil spirti', formula: 'C₂H₅OH', cat: 'Organik', state: 'suyuq', vesselShape: 'florence', defaultDose: 40, unit: 'mL', molarity: '96%', color: '#e0f2fe', ph: 'neutral', level: 'universitet', hazard: 'Tez alangalanuvchi suyuqlik!' },
  { id: 'glukoza', name: 'Glyukoza eritmasi', formula: 'C₆H₁₂O₆', cat: 'Organik', state: 'eritma', vesselShape: 'florence', defaultDose: 45, unit: 'mL', molarity: '1.0M', color: '#fefce8', ph: 'neutral', level: 'universitet', hazard: 'Xavfsiz uglevod.' },
  { id: 'tollens', name: 'Tollens reaktivi', formula: '[Ag(NH₃)₂]OH', cat: 'Organik', state: 'eritma', vesselShape: 'bottle', defaultDose: 35, unit: 'mL', color: '#e2e8f0', ph: 'base', level: 'universitet', hazard: 'Kumush koʻzgu reaktivi.' },

  // 6. Indikatorlar (Tomizgichli flakonlarda — Dropper)
  { id: 'fenolftalein', name: 'Fenolftalein', formula: 'Fenolftalein', cat: 'Indikatorlar', state: 'eritma', vesselShape: 'dropper', defaultDose: 5, unit: 'tomchi', color: '#f472b6', ph: null, level: 'maktab', hazard: 'pH indikatori (ishqorda malina rang).', indicator: true },
  { id: 'lakmus', name: 'Lakmus indikatori', formula: 'Lakmus', cat: 'Indikatorlar', state: 'eritma', vesselShape: 'dropper', defaultDose: 5, unit: 'tomchi', color: '#a855f7', ph: null, level: 'maktab', hazard: 'pH indikatori (kislotada qizil, ishqorda koʻk).', indicator: true },
  { id: 'metiloranj', name: 'Metilzargʻaldoq', formula: 'Metiloranj', cat: 'Indikatorlar', state: 'eritma', vesselShape: 'dropper', defaultDose: 5, unit: 'tomchi', color: '#fb923c', ph: null, level: 'maktab', hazard: 'pH indikatori.', indicator: true },

  // 7. Qizdirish va yashirin mahsulotlar
  { id: 'qizdirish', name: 'Spirt lampasi (Qizdirish)', formula: 't°', cat: 'Asboblar', state: 'asbob', defaultDose: 1, unit: 'rejim', color: '#f97316', ph: null, level: 'maktab', hidden: true },
  { id: 'NaOH_aq', name: 'Natriy gidroksid', formula: 'NaOH', cat: '', state: 'eritma', color: '#F3F6FA', ph: 'base', level: 'maktab', hidden: true },
  { id: 'CuOH2', name: 'Mis(II) gidroksid', formula: 'Cu(OH)₂', cat: '', state: 'qattiq', color: '#4FA3E3', ph: null, level: 'maktab', hidden: true },
  { id: 'CaCO3_p', name: 'Kalsiy karbonat (choʻkma)', formula: 'CaCO₃', cat: '', state: 'qattiq', color: '#FFFFFF', ph: null, level: 'maktab', hidden: true },
  { id: 'NaCl_aq', name: 'Natriy xlorid', formula: 'NaCl', cat: '', state: 'eritma', color: '#F5F8FB', ph: 'neutral', level: 'maktab', hidden: true },
  { id: 'CO2_g', name: 'Karbonat angidrid', formula: 'CO₂', cat: '', state: 'gaz', color: '#FFFFFF', ph: null, level: 'maktab', hidden: true },
  { id: 'FeSO4_p', name: 'Temir(II) sulfat', formula: 'FeSO₄', cat: '', state: 'eritma', color: '#C8E3C0', ph: 'acid', level: 'maktab', hidden: true },
  { id: 'ZnSO4', name: 'Rux sulfat', formula: 'ZnSO₄', cat: '', state: 'eritma', color: '#F4F7FA', ph: 'neutral', level: 'maktab', hidden: true },
  { id: 'Cu_p', name: 'Mis (choʻkma)', formula: 'Cu', cat: '', state: 'qattiq', color: '#B5652D', ph: null, level: 'maktab', hidden: true },
  { id: 'CaO', name: 'Kalsiy oksid', formula: 'CaO', cat: '', state: 'qattiq', color: '#F5F5F0', ph: null, level: 'maktab', hidden: true },
  { id: 'CuO', name: 'Mis(II) oksid', formula: 'CuO', cat: '', state: 'qattiq', color: '#1E1A18', ph: null, level: 'maktab', hidden: true },
  { id: 'MgO', name: 'Magniy oksid', formula: 'MgO', cat: '', state: 'qattiq', color: '#FFFFFF', ph: null, level: 'maktab', hidden: true },
];

export const SUB_MAP = Object.fromEntries(SUBSTANCES.map(s => [s.id, s]));

export const REACTIONS = [
  {
    id: 'na_h2o', reactants: ['Na', 'H2O'], products: ['NaOH_aq'], escapes: ['H₂'], sinf: '8-sinf',
    eq: '2Na + 2H₂O → 2NaOH + H₂↑ + 💥 Chaqnash!', type: "O'rin olish (Ekzotermik portlash-chaqnash)",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 1.0 }, heat: 3, flame: '#FFC23A', flash: true, smoke: '#eef0f3', shake: true, explosion: true },
    observe: "Natriy bo'lakchasi suv yuzasida shiddatli aylanib eriydi, vodorod gazi alangalanib kuchli chaqnash va zarba to'lqini hosil bo'ladi!",
    explain: "Natriy suvdagi vodorodni shiddat bilan siqib chiqaradi va katta issiqlik ajralishi hisobiga vodorod alangalanadi. Eritmada NaOH ishqori hosil bo'ladi.",
    safety: "Himoya ekrani ortida va ko'zoynakda bajariladi.",
  },
  {
    id: 'na_acid_boom', reactants: ['Na', 'HCl'], products: ['NaCl_aq'], escapes: ['H₂'], sinf: '8-sinf',
    eq: '2Na + 2HCl → 2NaCl + H₂↑ + 💥 KUCHLI PORTLASH!', type: "Shiddatli ekzotermik chaqnash",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 1.0 }, heat: 4, flame: '#ff5500', flash: true, smoke: '#cbd5e1', shake: true, explosion: true },
    observe: "Ishqoriy metall kislota bilan bir zumda portlab reaksiyaga kirishadi, olovli shar va uchqunlar otiladi!",
    explain: "Natriy kislota tarkibidagi vodorod ionlarini o'ta yuqori tezlikda qaytaradi.",
    safety: "O'ta xavfli ekzotermik reaksiya!",
  },
  {
    id: 'mg_hcl', reactants: ['Mg', 'HCl'], products: [], escapes: ['H₂'], sinf: '8-sinf',
    eq: 'Mg + 2HCl → MgCl₂ + H₂↑', type: "O'rin olish",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 0.9 }, heat: 1 },
    observe: "Magniy lentasi shiddatli ko'piklanib eriydi, kolba isiydi.",
    explain: "Magniy faollik qatorida vodoroddan oldinda turgani uchun kislotadan vodorodni siqib chiqaradi.",
    safety: "Vodorod olovdan uzoq tutilsin.",
  },
  {
    id: 'zn_hcl', reactants: ['Zn', 'HCl'], products: [], escapes: ['H₂'], sinf: '8-sinf',
    eq: 'Zn + 2HCl → ZnCl₂ + H₂↑', type: "O'rin olish",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 0.55 }, heat: 1 },
    observe: "Rux donachalari yuzasidan gaz pufakchalari ajraladi.",
    explain: "Laboratoriyada vodorod olishning klassik Kipp apparati reaksiyasi.",
    safety: "Ajralayotgan gazni olovdan uzoq tuting.",
  },
  {
    id: 'zn_h2so4', reactants: ['Zn', 'H2SO4'], products: ['ZnSO4'], escapes: ['H₂'], sinf: '8-sinf',
    eq: 'Zn + H₂SO₄ → ZnSO₄ + H₂↑', type: "O'rin olish",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 0.5 }, heat: 1 },
    observe: "Rux yuzasida pufakchalar paydo bo'lib, asta-sekin eriydi.",
    explain: "Suyultirilgan sulfat kislota faol metallar bilan vodorod ajratadi.",
    safety: "Sulfat kislota o'yuvchi.",
  },
  {
    id: 'fe_hcl', reactants: ['Fe', 'HCl'], products: [], escapes: ['H₂'], sinf: '8-sinf',
    eq: 'Fe + 2HCl → FeCl₂ + H₂↑', type: "O'rin olish",
    fx: { gas: { color: '#FFFFFF', name: 'H₂', rate: 0.3 }, solution: '#D6EBCB' },
    observe: "Temir yuzasidan sekin gaz ajraladi, eritma och yashil tusga kiradi.",
    explain: "Temir xlorid kislota bilan och yashil temir(II) xlorid hosil qiladi.",
    safety: "Kislota bilan ehtiyot bo'ling.",
  },
  {
    id: 'fe_cuso4', reactants: ['Fe', 'CuSO4'], products: ['FeSO4_p', 'Cu_p'], sinf: '8-sinf',
    eq: 'Fe + CuSO₄ → FeSO₄ + Cu↓', type: "O'rin olish (Metall siqib chiqarish)",
    fx: { solution: '#9FCFB0', deposit: '#B5652D' },
    observe: "Temir mix yuzasi qizg'ish mis qatlami bilan qoplanadi, ko'k eritma yashilroq tusga o'tadi.",
    explain: "Temir misdan faolroq bo'lgani uchun uni tuzidan siqib chiqaradi.",
    safety: "Mis sulfat zaharli.",
  },
  {
    id: 'zn_cuso4', reactants: ['Zn', 'CuSO4'], products: ['ZnSO4', 'Cu_p'], sinf: '8-sinf',
    eq: 'Zn + CuSO₄ → ZnSO₄ + Cu↓', type: "O'rin olish",
    fx: { solution: '#EEF3F8', deposit: '#9A4E22', heat: 1 },
    observe: "Rux qoramtir-qizil mis bilan qoplanadi, eritma rangsizlanadi.",
    explain: "Rux misni siqib chiqarib rangsiz rux sulfat hosil qiladi.",
    safety: "—",
  },
  {
    id: 'cu_agno3', reactants: ['Cu', 'AgNO3'], products: [], sinf: '9-sinf',
    eq: 'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag↓', type: "O'rin olish",
    fx: { solution: '#8CC4EC', deposit: '#E8ECEF' },
    observe: "Mis sim kumushrang kristallar bilan qoplanadi, eritma havorang tusga kiradi.",
    explain: "Mis kumushdan faolroq bo'lgani uchun kumushni eritmadan siqib chiqaradi.",
    safety: "Kumush nitrat teriga tegsa qora dog' qoldiradi.",
  },
  {
    id: 'hcl_naoh', reactants: ['HCl', 'NaOH'], products: ['NaCl_aq'], sinf: '8-sinf',
    eq: 'HCl + NaOH → NaCl + H₂O + Q', type: "Neytrallanish",
    fx: { heat: 1 },
    observe: "Kislota va ishqor neytrallanadi, eritma iliqlashadi, indikator rangi o'zgaradi.",
    explain: "H⁺ va OH⁻ ionlari birikib suv molekulasini hosil qiladi.",
    safety: "Ikkala modda ham o'yuvchi.",
  },
  {
    id: 'h2so4_naoh', reactants: ['H2SO4', 'NaOH'], products: [], sinf: '8-sinf',
    eq: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O', type: "Neytrallanish",
    fx: { heat: 1 },
    observe: "Eritma isiydi, indikator rangi o'zgaradi.",
    explain: "Ikki negizli kislota ikki mol ishqor bilan to'liq neytrallanadi.",
    safety: "O'yuvchi moddalar.",
  },
  {
    id: 'hcl_na2co3', reactants: ['HCl', 'Na2CO3'], products: ['NaCl_aq', 'CO2_g'], escapes: ['CO₂'], sinf: '8-sinf',
    eq: '2HCl + Na₂CO₃ → 2NaCl + H₂O + CO₂↑', type: "Almashinish",
    fx: { gas: { color: '#FFFFFF', name: 'CO₂', rate: 0.85 }, foam: true },
    observe: "Eritma shiddatli ko'piklanib karbonat angidrid gazi ajraladi.",
    explain: "Kuchli kislota karbonatlarni parchalab CO₂ gazini chiqaradi.",
    safety: "—",
  },
  {
    id: 'ch3cooh_nahco3', reactants: ['CH3COOH', 'NaHCO3'], products: ['CO2_g'], escapes: ['CO₂'], sinf: '8-sinf',
    eq: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑', type: "Almashinish (Endotermik)",
    fx: { gas: { color: '#FFFFFF', name: 'CO₂', rate: 1.0 }, foam: true, heat: -1 },
    observe: "Ko'p ko'pik hosil bo'ladi va kolba devori soviydi.",
    explain: "Endotermik reaksiya bo'lgani uchun issiqlik yutiladi.",
    safety: "Xavfsiz.",
  },
  {
    id: 'hcl_caco3', reactants: ['HCl', 'CaCO3'], products: ['CO2_g'], escapes: ['CO₂'], sinf: '8-sinf',
    eq: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑', type: "Almashinish",
    fx: { gas: { color: '#FFFFFF', name: 'CO₂', rate: 0.65 } },
    observe: "Marmar bo'lakchalari vishillab gaz ajratadi va eriydi.",
    explain: "Laboratoriyada CO₂ olishning asosiy usuli.",
    safety: "—",
  },
  {
    id: 'agno3_nacl', reactants: ['AgNO3', 'NaCl'], products: [], sinf: '9-sinf',
    eq: 'AgNO₃ + NaCl → AgCl↓ (Oq choʻkma) + NaNO₃', type: "Ion almashinish (Cho'kma)",
    fx: { precipitate: '#FFFFFF' },
    observe: "Tvorogsimon quyuq oq AgCl↓ cho'kmasi kolba tubiga tushadi.",
    explain: "Kumush va xlorid ionlari suvda erimaydigan AgCl cho'kmasini hosil qiladi.",
    safety: "Kumush nitrat terini bo'yaydi.",
  },
  {
    id: 'agno3_hcl', reactants: ['AgNO3', 'HCl'], products: [], sinf: '9-sinf',
    eq: 'AgNO₃ + HCl → AgCl↓ + HNO₃', type: "Ion almashinish (Cho'kma)",
    fx: { precipitate: '#FFFFFF' },
    observe: "Oq AgCl cho'kmasi tushadi.",
    explain: "Xlorid ionlariga sifat reaksiyasi.",
    safety: "—",
  },
  {
    id: 'bacl2_h2so4', reactants: ['BaCl2', 'H2SO4'], products: [], sinf: '9-sinf',
    eq: 'BaCl₂ + H₂SO₄ → BaSO₄↓ + 2HCl', type: "Ion almashinish (Cho'kma)",
    fx: { precipitate: '#FFFFFF' },
    observe: "Zich oq BaSO₄ cho'kmasi hosil bo'ladi.",
    explain: "Sulfat ionlariga sifat reaksiyasi.",
    safety: "Bariy tuzlari zaharli.",
  },
  {
    id: 'cuso4_naoh', reactants: ['CuSO4', 'NaOH'], products: ['CuOH2'], sinf: '8-sinf',
    eq: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ (Moviy) + Na₂SO₄', type: "Ion almashinish (Cho'kma)",
    fx: { precipitate: '#38bdf8', solution: '#EAF2F8' },
    observe: "Yorqin moviy jele-simon Cu(OH)₂ cho'kmasi tushadi. Spirt lampasini yoqib qizdirsangiz, qora CuO ga aylanadi!",
    explain: "Mis(II) gidroksid suvda erimaydi, qizdirilganda esa CuO va suvga parchalanadi.",
    safety: "—",
  },
  {
    id: 'cuoh2_heat', reactants: ['CuOH2', 'qizdirish'], products: ['CuO'], sinf: '8-sinf',
    eq: 'Cu(OH)₂ —(t° qizdirish)→ CuO↓ (Qora) + H₂O', type: "Termik parchalanish",
    fx: { precipitate: '#1E1A18', heat: 1 },
    observe: "Moviy cho'kma qizdirilganda qorayib, qora mis(II) oksidga aylanadi.",
    explain: "Erimaydigan asoslar qizdirilganda metall oksidi va suvga parchalanadi.",
    safety: "Issiq idishga ehtiyot bo'ling.",
  },
  {
    id: 'fecl3_naoh', reactants: ['FeCl3', 'NaOH'], products: [], sinf: '8-sinf',
    eq: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl', type: "Ion almashinish (Cho'kma)",
    fx: { precipitate: '#8B4513', solution: '#F2EDE6' },
    observe: "Qo'ng'ir-qizil (zang rangli) Fe(OH)₃ cho'kmasi tushadi.",
    explain: "Fe³⁺ ionlariga sifat reaksiyasi.",
    safety: "—",
  },
  {
    id: 'caoh2_co2', reactants: ['CaOH2', 'CO2'], products: ['CaCO3_p'], sinf: '8-sinf',
    eq: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O', type: "Birikish",
    fx: { precipitate: '#FFFFFF', solution: '#F2F2F0' },
    observe: "Tiniq ohak suvi loyqalanib, oq cho'kma tushadi.",
    explain: "Karbonat angidrid gaziga sifat reaksiyasi.",
    safety: "—",
  },
  {
    id: 'na2co3_cacl2', reactants: ['Na2CO3', 'CaCl2'], products: ['CaCO3_p'], sinf: '9-sinf',
    eq: 'Na₂CO₃ + CaCl₂ → CaCO₃↓ + 2NaCl', type: "Ion almashinish",
    fx: { precipitate: '#FFFFFF' },
    observe: "Oq CaCO₃ cho'kmasi tushadi.",
    explain: "Suvning qattiqligini yo'qotish reaksiyasi.",
    safety: "—",
  },
  {
    id: 'mg_heat', reactants: ['Mg', 'qizdirish'], products: ['MgO'], sinf: '8-sinf',
    eq: '2Mg + O₂ —(t°)→ 2MgO + 💥 Koʻzni qamashtiruvchi chaqnash!', type: "Birikish (Yonish va Chaqnash)",
    fx: { flash: true, flame: '#FFFFFF', heat: 3, smoke: '#F4F4F4', explosion: true },
    observe: "Magniy ko'zni qamashtiruvchi yorqin oq chaqnash bilan yonadi va oq tutun chiqaradi!",
    explain: "Magniy kislorodda juda katta yorug'lik va issiqlik energiyasi chiqarib yonadi.",
    safety: "Alangaga to'g'ridan-to'g'ri qaramang!",
  },
  {
    id: 'h2o2_mno2', reactants: ['H2O2', 'MnO2'], products: [], keep: ['MnO2'], escapes: ['O₂'], sinf: '8-sinf',
    eq: '2H₂O₂ —(MnO₂ katalizator)→ 2H₂O + O₂↑', type: "Katalitik parchalanish",
    fx: { gas: { color: '#FFFFFF', name: 'O₂', rate: 0.95 }, foam: true, heat: 2, smoke: '#f8fafc' },
    observe: "Shiddatli ko'piklanib kislorod gazi va bug' ajraladi.",
    explain: "MnO₂ katalizator sifatida vodorod peroksidni bir zumda suv va kislorodga parchalaydi.",
    safety: "—",
  },
  {
    id: 'h2o2_ki', reactants: ['H2O2', 'KI'], products: [], keep: ['KI'], escapes: ['O₂'], sinf: 'Universitet',
    eq: '2H₂O₂ —(KI katalizator)→ 2H₂O + O₂↑ + 🌋 Koʻpik Favvorasi!', type: "Katalitik otilish («Fil tish pastasi»)",
    fx: { gas: { color: '#FFFFFF', name: 'O₂', rate: 1.0 }, foam: true, heat: 2, solution: '#facc15', smoke: '#fef08a', explosion: true },
    observe: "Sarg'ish-oltin ko'pik bir zumda kolbadan favvora bo'lib otilib chiqadi, idish qiziydi!",
    explain: "Yodid ionlari peroksidning ekzotermik parchalanishini keskin tezlashtiradi.",
    safety: "Konsentrlangan peroksid bilan reaksiya juda shiddatli boradi.",
  },
  {
    id: 'kraxmal_i2', reactants: ['kraxmal', 'I2'], products: [], sinf: '10-sinf',
    eq: 'Kraxmal + I₂ → Toʻq koʻk-binafsha kompleks', type: "Sifat reaksiyasi",
    fx: { solution: '#1e1b4b' },
    observe: "Eritma darhol to'q ko'k-binafsha rangga kiradi.",
    explain: "Yod molekulalari kraxmalning amiloza spirali ichiga kirib kompleks hosil qiladi.",
    safety: "—",
  },
  {
    id: 'ki_pb', reactants: ['KI', 'PbNO32'], products: [], sinf: 'Universitet',
    eq: 'Pb(NO₃)₂ + 2KI → PbI₂↓ («Oltin yomgʻir») + 2KNO₃', type: "Ion almashinish (Kristallanish)",
    fx: { precipitate: '#F4C20D', solution: '#fef08a' },
    observe: "Yaltiroq oltinrang-sariq PbI₂↓ kristallari — «oltin yomg'ir» bo'lib cho'kadi!",
    explain: "Qo'rg'oshin(II) yodid oltiburchakli yaltiroq oltin tangachalar hosil qiladi.",
    safety: "Qo'rg'oshin birikmalari zaharli!",
  },
  {
    id: 'fecl3_kscn', reactants: ['FeCl3', 'KSCN'], products: [], sinf: 'Universitet',
    eq: 'FeCl₃ + 3KSCN ⇌ Fe(SCN)₃ (Qon-qizil) + 3KCl', type: "Kompleks hosil bo'lishi",
    fx: { solution: '#991b1b' },
    observe: "Eritma bir zumda to'q qon-qizil rangga kiradi.",
    explain: "Fe³⁺ ionlariga eng sezgir sifat reaksiyasi (temir rodanid kompleksi).",
    safety: "—",
  },
  {
    id: 'cuso4_nh3', reactants: ['CuSO4', 'NH3'], products: [], sinf: 'Universitet',
    eq: 'CuSO₄ + 4NH₃ → [Cu(NH₃)₄]SO₄ (Toʻq koʻk-zumrad)', type: "Kompleks hosil bo'lishi",
    fx: { solution: '#1d4ed8' },
    observe: "Eritma chuqur zumrad-ko'k (siyohrang) tusga kiradi.",
    explain: "Mis(II) ionlari ammiak bilan tetraamminmis(II) kompleksini hosil qiladi.",
    safety: "Ammiak o'tkir hidli.",
  },
  {
    id: 'kmno4_h2o2', reactants: ['KMnO4', 'H2O2'], products: [], escapes: ['O₂'], sinf: 'Universitet',
    eq: '2KMnO₄ + 3H₂O₂ → 2MnO₂↓ + 2KOH + 2H₂O + 3O₂↑ + 💥', type: "Oksidlanish-qaytarilish",
    fx: { solution: '#F4EEF3', precipitate: '#3A3532', gas: { color: '#FFFFFF', name: 'O₂', rate: 0.9 }, foam: true, heat: 2, smoke: '#e2e8f0' },
    observe: "Binafsha rang yo'qolib, shiddatli kislorod gazi va bug' otilib chiqadi!",
    explain: "Permanganat peroksidni kislorodgacha oksidlaydi.",
    safety: "Kuchli oksidlovchilar.",
  },
  {
    id: 'kumush_kozgu', reactants: ['glukoza', 'tollens', 'qizdirish'], products: [], sinf: 'Universitet',
    eq: 'C₆H₁₂O₆ + 2[Ag(NH₃)₂]OH —(t°)→ 2Ag↓ (Kumush koʻzgu) + 3NH₃ + H₂O', type: "Kumush ko'zgu reaksiyasi",
    fx: { deposit: '#E9EEF2', solution: '#D9DDE2' },
    observe: "Kolba ichki devorlari haqiqiy ko'zgu kabi yaltiroq kumush qatlami bilan qoplanadi!",
    explain: "Glyukozadagi aldegid guruhi kumush ionlarini metall kumushgacha qaytaradi.",
    safety: "Tollens reaktivi yangi tayyorlangan bo'lishi shart.",
  },
];

const INDICATOR_COLORS = {
  fenolftalein: { acid: null, neutral: null, base: '#D81B7A' },
  lakmus:       { acid: '#D3302F', neutral: '#8A4FA8', base: '#2F57C9' },
  metiloranj:   { acid: '#E0413A', neutral: '#F2A23A', base: '#F2C230' },
};

const INDICATOR_TEXT = {
  fenolftalein: { acid: 'rangsiz (kislotali muhit, pH < 7)', neutral: 'rangsiz (neytral muhit, pH ≈ 7)', base: 'malina-pushti rang (ishqoriy muhit, pH > 8.2)' },
  lakmus:       { acid: 'qizil (kislotali muhit)', neutral: 'binafsha (neytral muhit)', base: "ko'k (ishqoriy muhit)" },
  metiloranj:   { acid: 'qizil (kislotali muhit)', neutral: "zarg'aldoq (neytral muhit)", base: 'sariq (ishqoriy muhit)' },
};

function getMedium(species) {
  let acid = 0, base = 0;
  for (const id of species) {
    const ph = SUB_MAP[id]?.ph;
    if (ph === 'acid') acid++;
    if (ph === 'base') base++;
  }
  if (acid > base) return 'acid';
  if (base > acid) return 'base';
  return 'neutral';
}

export function evaluateMix(items) {
  const species = [];
  const events = [];
  const used = new Set();
  let solution = null;
  const deposits = [];
  const precipitates = [];

  items.forEach((item, step) => {
    if (!SUB_MAP[item]) return;
    species.push(item);
    const queue = [item];

    while (queue.length > 0) {
      const newSub = queue.shift();
      const aq = species.some(x => ['eritma', 'suyuq'].includes(SUB_MAP[x]?.state));
      const has = (x) => species.includes(x) || (x === 'H2O' && aq);

      for (const r of REACTIONS) {
        if (used.has(r.id) || !r.reactants.includes(newSub)) continue;
        if (r.reactants.every(has)) {
          used.add(r.id);
          if (!r.none) {
            const keep = new Set(r.keep || []);
            for (const x of r.reactants) {
              if (!keep.has(x) && species.includes(x)) {
                species.splice(species.indexOf(x), 1);
              }
            }
            for (const p of (r.products || [])) {
              species.push(p);
              queue.push(p);
            }
            const fx = r.fx || {};
            if (fx.solution) solution = fx.solution;
            if (fx.precipitate) precipitates.push(fx.precipitate);
            if (fx.deposit) deposits.push(fx.deposit);
          }
          events.push({ step, reaction: r, none: Boolean(r.none) });
        }
      }
    }
  });

  const medium = getMedium(species);
  const inds = species.filter(s => INDICATOR_COLORS[s]);
  let indInfo = null;
  if (inds.length > 0) {
    const lastInd = inds[inds.length - 1];
    const ic = INDICATOR_COLORS[lastInd][medium];
    if (ic) solution = ic;
    indInfo = {
      id: lastInd,
      name: SUB_MAP[lastInd].name,
      medium,
      color: ic,
      text: `${SUB_MAP[lastInd].name}: ${INDICATOR_TEXT[lastInd][medium]}`,
    };
  }

  if (!solution) {
    const colored = species
      .filter(s => !INDICATOR_COLORS[s] && ['eritma', 'suyuq'].includes(SUB_MAP[s]?.state) && !['#F5F8FB', '#EAF4FF', '#F3F6FA', '#EEF3FA', '#F5F7FA'].includes(SUB_MAP[s]?.color))
      .map(s => SUB_MAP[s].color);
    solution = colored.length > 0 ? colored[colored.length - 1] : '#dfeefc';
  }

  return {
    events,
    state: {
      species: species.filter(s => s !== 'qizdirish').map(s => SUB_MAP[s]),
      medium,
      color: solution,
      precipitates,
      deposits,
      indicator: indInfo,
    },
  };
}
