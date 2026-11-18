# National AI Lab — Hujayradan Koinotgacha

**Brauzerda ishlaydigan 3D ta'lim laboratoriyasi.** O'quvchi modelni qo'l
harakati bilan boshqaradi, istalgan qismini tanlaydi va AI ustozdan o'zbek
tilida tushuntirish oladi.

Server yo'q. Ma'lumotlar bazasi yo'q. O'rnatish yo'q. Oddiy maktab
kompyuteri, veb-kamera va brauzer yetarli.

Qamrov: **ribosoma (2×10⁻⁸ m) dan galaktika (10²¹ m) gacha.**

> **Sinab ko'rish:** saytda **«Demo sifatida kirish»** tugmasini bosing —
> login/parol kerak emas. Qo'lda kirmoqchi bo'lsangiz:
> `talaba / talaba123` yoki `admin / admin123`.

---

## Muammo

O'zbek maktablarida biologiya, anatomiya va astronomiya ko'pincha darslikdagi
yassi rasm orqali o'rgatiladi. Hujayra organoidlari, skelet tuzilishi yoki
sayyoralar masshtabi — bularning hammasi **fazoviy** tushunchalar, lekin
o'quvchi ularni ikki o'lchamda ko'radi. Laboratoriya jihozi esa qimmat va
har maktabda yo'q.

## Yechim

Butun laboratoriya brauzer ichida ishlaydi:

- **Qo'l bilan boshqarish** — o'qituvchi doska oldida turib, sinfga qarab
  turib modelni aylantiradi. Sichqoncha ham, sensor ekran ham shart emas.
- **AI ustoz** — tanlangan qism haqida o'zbek (yoki rus) tilida dars beradi.
- **Testlar** — ochiq va yopiq turdagi, yopiq testda javobni AI baholaydi.
- **Taqqoslash** — ikkita modelni yonma-yon qo'yib, AI ularning **farqini**
  jadval ko'rinishida chiqaradi.

---

## Nimasi bilan ajralib turadi

| | |
|---|---|
| **Backend umuman yo'q** | Barcha hisob brauzerda. Hosting narxi nol, o'quvchi ma'lumoti hech qayerga ketmaydi, oddiy statik hostingda ishlaydi. |
| **Qo'l kuzatish brauzerda** | MediaPipe WASM. Python ham, server ham, maxsus qurilma ham kerak emas — faqat veb-kamera. |
| **AI uzilmaydi** | To'rtta provayder navbat bilan sinaladi (Gemini → Groq → Cerebras → OpenRouter). Bittasining kunlik limiti tugasa, dars to'xtamaydi. |
| **Sekin internetga moslangan** | Modellar 270 MB dan **28 MB** gacha siqilgan (Draco + WebP). Draco dekoderi ham loyiha ichida — CDN ga bog'liq emas. |
| **Taqqoslash darsi** | AI ikkita modelni solishtirib, xususiyat bo'yicha jadval beradi — doskaga ko'chirishga tayyor. |
| **O'zbek tilida** | Interfeys ham, AI javoblari ham. Rus tili tugma bilan almashadi. |

---

## Tarkibi

| Papka | Nima | Texnologiya | Port |
|---|---|---|---|
| `/` (ildiz) | **Lab** — 3D sahna, qo'l kuzatish, AI, testlar | Vite + React + three.js | 5173 |
| `/frontend` | **Sayt** — landing, kirish, Ta'lim sahifasi | Create React App | 3000 |

Sayt labni `<iframe>` ichida ochadi va unga URL orqali sozlama uzatadi
(`?model=…&lesson=…&lang=…&embed=1`).

**7 ta 3D model:** hayvon hujayrasi (23 organoid), o'simlik hujayrasi
(23 qism), skelet, miya, yurak, qon tomirlar, quyosh tizimi.

---

## Ishga tushirish

```bash
npm install && npm --prefix frontend install
```

```bash
npm run dev
```

Sayt → `http://localhost:3000`, lab → `http://localhost:5173`.

Faqat labni ishga tushirish:

```bash
npm run dev:lab
```

### AI kaliti

`.env.local` faylini yarating (git'ga tushmaydi):

```bash
cp .env.example .env.local
```

| Provayder | Qayerdan | Bepul limit |
|---|---|---|
| **Groq** | console.groq.com | ~14 000/kun — **tavsiya etiladi** |
| Gemini | aistudio.google.com/apikey | ~20/kun |
| Cerebras | cloud.cerebras.ai | katta |
| OpenRouter | openrouter.ai | modelga qarab |

Kamida **ikkita** kalit qo'ying: biri limitga yetsa ilova avtomatik
keyingisiga o'tadi. Kalitsiz ham lab ishlaydi — 3D, qo'l harakati va
qismlarning yozma ta'rifi mustaqil. Faqat AI javoblari o'chadi.

> OpenAI kaliti brauzerdan **ishlamaydi** — CORS bloklaydi.

---

## Ekranda nima qayerda

![National AI Lab — hujayra modeli va qo'l kuzatish](docs/01-umumiy.png)

| Joy | Nima turadi |
|---|---|
| **Yuqori chap** | Logotip · **🧠 Quiz** tugmasi · **UZ / RU** tili |
| **Yuqori markaz** | Ochiq model nomi · zoom darajasi (`×1.00`) · qism tanlansa uning nomi va **✕ [Esc]** |
| **Yuqori o'ng** | **3 TA HARAKAT** — imo-ishora eslatmasi · **HAND TRACKING** — kamera oynasi, FPS va joriy holat |
| **Markaz** | 3D model (sinf stolining ustida) |
| **O'ng** | **Doska** — model nomi, fani, tanlangan qism va uning tushuntirishi |
| **Chap** | Qism tanlanganda — **TANLANGAN QISM** paneli: aylanuvchi 3D ko'rinish, ta'rif, **AI USTOZ** darsi |
| **Past markaz** | Fan va model tanlagich: Biologiya · Anatomiya · Astronomiya |
| **Past o'ng** | AI bilan gaplashish: mikrofon yoki matn maydoni |

---

## Qo'l harakatlari

Kamerani yoqish: **`C`** tugmasi yoki yuqori o'ngdagi kamera oynasidagi ⏻ tugmasi.
Brauzer ruxsat so'raydi — **Allow** bosing.

Qo'lingiz aniqlansa, kamera oynasida barmoq suyaklari chiziladi va pastda
joriy holat yoziladi: `ACTIVE 🤏 Tanlash / Aylantirish`.

### 1 · Aylantirish — chimdib suring

![Chimdish bilan aylantirish](docs/02-aylantirish.png)

Bosh barmoq va ko'rsatkich barmoq uchini **birlashtiring** (chimdish), so'ng
qo'lingizni suring. Model qo'l harakati ortidan aylanadi.

- Chapga/o'ngga surish → model gorizontal aylanadi
- Yuqoriga/pastga surish → vertikal ag'dariladi
- Barmoqlarni ajratsangiz aylantirish to'xtaydi

### 2 · Tanlash — chimdib **turing**

Barmoqlarni chimdilgan holda **0.4 soniya qimirlatmay ushlab turing**.
Chimdigan nuqtangizdagi qism tanlanadi.

Nima bo'ladi: qism yonib turadi, uning ustida yorliq chiqadi, chapda
**Tanlangan qism** paneli ochiladi va **doskaga** yoziladi. AI ustoz
o'sha zahoti shu qism haqida dars tayyorlaydi.

Bekor qilish: **`Esc`** yoki panelning ✕ tugmasi.

> Aylantirish va tanlash bitta harakat: **sursangiz** — aylanadi,
> **to'xtab tursangiz** — tanlanadi.

### 3 · Qismlarga ajratish — musht → kaft

![Musht ochilganda model qismlarga ajraladi](docs/03-ajratish.png)

**Mushtingizni yuming**, so'ng **kaftingizni oching**. Model organoidlarga
ajraladi — yadro, mitoxondriya, ribosomalar va boshqalar alohida uchib chiqadi.

Yana yig'ish uchun **yana musht qilib oching**. Klaviaturada: **`E`**.

### 4 · Kattalashtirish — ikki kaft

![Ikki kaft bilan zoom](docs/04-zoom.png)

**Ikkala kaftingizni** kameraga ko'rsating. Kaftlar orasidagi masofa
zoom darajasini boshqaradi:

- Kaftlarni **uzoqlashtiring** → model kattalashadi
- **Yaqinlashtiring** → kichrayadi

Yuqori markazda joriy daraja ko'rinadi (`×1.36`). **`R`** — boshlang'ich
holatga qaytaradi.

### Ishlamasa

| Muammo | Sabab / yechim |
|---|---|
| Kamera oynasi qora, `XATO` yozuvi | Brauzer ruxsat bermagan. Manzil satridagi 🎥 belgisini bosib **Allow** qiling |
| Qo'l aniqlanmayapti | Yorug'lik yetarli emas yoki qo'l juda uzoq. Kaftni kameraga **to'liq** ko'rsating |
| FPS past (10 dan kam) | Boshqa ilovalarni yoping; proyektor rejimida (`P`) yengilroq ishlaydi |
| Musht ishlamayapti | Bosh barmoqni kaft ichiga yig'ing — tashqariga chiqib tursa "chimdish" deb o'qiladi |

Kamera umuman bo'lmasa — hamma narsa **sichqoncha** bilan ham ishlaydi:
modelni sudrab aylantiring, qismni bosib tanlang.

---

## Klaviatura

| Tugma | Amal |
|---|---|
| `E` | Qismlarga ajratish / yig'ish |
| `R` | Aylanish va zoomni boshlang'ich holatga qaytarish |
| `C` | Kamerani yoqish / o'chirish |
| `P` | Proyektor rejimi (katta shrift — sinf uchun) |
| `Esc` | Tanlovni bekor qilish |
| `←` `→` | Modelni almashtirish |

---

## AI ustoz bilan ishlash

**Uchta yo'l bor:**

1. **Qismni tanlang** — AI avtomatik dars tayyorlaydi (chapdagi panelda).
2. **Past o'ngdagi maydonga savol yozing** — istalgan savol, o'zbek yoki rus tilida.
3. **Mikrofonni bosing** va savolni **gapiring** — AI ovoz bilan javob beradi.

AI siz qaysi tilda murojaat qilsangiz — **o'sha tilda** javob beradi.

---

## Panellar

Har panelning burchagida **▾** tugmasi bor — panelni yig'ib qo'yish mumkin.
Tanlov brauzerda saqlanadi, har dars qaytadan yopish shart emas.

**Boshqaruv** (yorliqlar, taqqoslash, rasmga olish, proyektor) ·
**Darslar** (tayyor ketma-ketliklar) · **Fanlar** (model tanlash) ·
**Harakatlar** (imo-ishora eslatmasi)

---

## Testlar

Yuqori chapdagi **🧠 Quiz** tugmasi:

- **Ochiq test** — 10 savol, variantlardan tanlash, har biriga 30 soniya
- **Yopiq test** — 5 savol, javobni **o'z so'zingiz** bilan yozasiz, AI uni
  foizda baholaydi va nima yetishmaganini aytadi

---

## Taqqoslash

**Boshqaruv → Taqqoslash** ni yoqing, so'ng ikkala tomonga model tanlang
(◧ chap, ◨ o'ng). Ikkala model yonma-yon chiqadi.

Chapda **"Farqi nimada"** paneli ochiladi — AI ikkisini solishtirib beradi:

```
UMUMIY   Ikkalasi ham eukariot hujayra…
FARQ     Hujayra devori   │ Yo'q          │ Bor, sellyulozadan
FARQ     Xloroplast       │ Yo'q          │ Bor, fotosintez
FARQ     Vakuola          │ Kichik, ko'p  │ Bitta markaziy
MUHIM    Shu farqlar o'simlikning tik turishini ta'minlaydi…
```

Har qator bitta xususiyat — doskaga ko'chirishga tayyor. Natija keshlanadi,
qayta yoqqanda so'rov ketmaydi.

Taqqoslash rejimida ham **ikkala** modelning qismlarini tanlash mumkin.

---

## Vercel'ga joylash

**Bitta loyiha yetarli.** Build ikkala ilovani yig'adi:

```
/       →  landing sayt
/lab    →  3D laboratoriya
```

| Sozlama | Qiymat |
|---|---|
| Root Directory | `.` (ildiz) |
| Build Command | `npm run build:all` |
| Output Directory | `dist_all` |

`vercel.json` repoda tayyor — Vercel buni o'zi oladi.

**Environment Variables** (Settings → Environment Variables). Build
paytida o'qiladi, ya'ni keyin qo'shsangiz **qayta deploy** kerak:

| Nom | Qiymat |
|---|---|
| `VITE_GROQ_KEY` | `gsk_...` (console.groq.com) |
| `VITE_GEMINI_KEY` | `AIza...` (aistudio.google.com/apikey) |

`REACT_APP_LAB_URL` **kerak emas** — sayt labni avtomatik `/lab` dan
ochadi. Faqat labni alohida domenga chiqarsangiz o'shanda yozasiz.

Kamera faqat HTTPS da ishlaydi — Vercel buni beradi.

### Lokal tekshirish

```bash
npm run build:all && npx serve dist_all
```

---

## ⚠️ Kalit haqida

Backend yo'qligi sababli AI kaliti brauzer bundle'iga tushadi va uni
ko'rish mumkin. Demo uchun maqbul, lekin:

- Google Cloud'da kalitga **HTTP referrer cheklovi** qo'ying,
- faqat bepul/limitli kalitdan foydalaning,
- to'lovli kalitni bu yerga **qo'ymang**.

Ishlab chiqarish uchun AI so'rovlarini kichik serverless funksiya orqali
o'tkazish kerak — shunda kalit serverda qoladi.

---

## Texnologiyalar

| Qism | Nima |
|---|---|
| 3D | three.js, @react-three/fiber, @react-three/drei |
| Qo'l kuzatish | MediaPipe Hands (WASM, brauzerda) |
| AI | Gemini · Groq · Cerebras · OpenRouter (zaxira navbati) |
| Ovoz | Web Speech API + Gemini TTS |
| Modellar | GLB, Draco + WebP (270 MB → 28 MB) |
| Lab | React + Vite |
| Sayt | React (CRA) |

**Backend, ma'lumotlar bazasi va Python ishlatilmagan.**

Dizayn tizimi: [DESIGN.md](DESIGN.md) · Litsenziya: [MIT](LICENSE)

---

## English summary

**National AI Lab** is a browser-based 3D science lab for Uzbek schools, covering
biology, anatomy and astronomy — from a ribosome to a galaxy.

Students rotate and explode 3D models using **hand gestures** through a plain
webcam, select any part, and get an explanation from an **AI tutor in Uzbek**.
A compare mode places two models side by side and has the AI generate a
structured **difference table**.

The whole system is **client-side**: no backend, no database, no Python. Hand
tracking runs as MediaPipe WASM in the browser, and the AI layer chains four
free providers so an exhausted quota never ends a lesson. 3D assets were
compressed from 270 MB to 28 MB with a locally vendored Draco decoder, so it
works on slow school connections.

Run with `npm run dev`. See the sections above for setup and deployment.

## Rollar va kirish

Ilova login sahifasidan boshlanadi. Uchta rol bor:

| Rol | Nima qiladi | Namuna hisob |
|---|---|---|
| O'quvchi / Talaba | Vazifalarni bajaradi, erkin tajriba qiladi, bahosini ko'radi. Login sahifasida o'zi ro'yxatdan o'tadi. | `talaba` / `talaba123` |
| O'qituvchi | Sinf yoki guruhga tajriba bo'yicha vazifa yuklaydi, natijalarni (xatolar, vaqt, baho) ko'radi. | `ustoz` / `ustoz123` |
| Admin | Kimyo dvigateli biladigan reaksiyalardan yangi tajriba qo'shadi, o'qituvchi hisoblarini ochadi. | `admin` / `admin123` |

Baho: 0 xato — 5, 1–2 xato — 4, ko'proq — 3. Xato hisoblanadi: ortiqcha modda olish, kolbaga keraksiz modda quyish, qadamlar tartibini buzish, xavfli reaksiya.

Ma'lumotlar hozircha brauzer xotirasida (`src/platform/db.js`). Bu demo va pilot uchun: hamma narsa bitta brauzerda saqlanadi. Maktabda bir nechta kompyuterda ishlatish uchun `db.js` funksiyalarini server API ga ulash kerak — boshqa fayllarga tegish shart emas.
