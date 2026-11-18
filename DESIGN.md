# National AI Lab — vizual tizim

Qurilgan natijadan yozilgan (niyatdan emas). Ikkala ilova ham shu
tizimdan rang va shrift oladi: `frontend/` (landing, CRA) va `src/` (lab, Vite).

## Kelib chiqishi

Palitra **taxmin qilinmagan** — fon videosidan o'lchab olingan. Videoning
to'yingan piksellari beshta rang oilasiga tushadi va bu oilalar aynan
mahsulotning o'zi o'rgatadigan ketma-ketlik:

| Burchak | Rang | Roli | Fan |
|---|---|---|---|
| 180° | `#5ad2f0` | `--cyan` | Biologiya · hujayra |
| 200° | `#4d93da` | `--azure` | oraliq |
| 240° | `#7b78e8` | `--indigo` | Anatomiya · inson |
| 280° | `#a962dd` | `--violet` | oraliq |
| 320° | `#e878ae` | `--rose` | Astronomiya · koinot |

`#f8c98c` (`--gold`) — galaktika yadrosining iliq rangi. Sahifadagi
**yagona iliq signal**, faqat asosiy amal tugmasi uchun. Boshqa joyda
ishlatilmaydi, aks holda ma'nosini yo'qotadi.

Asos: `--void #03061c`, `--deep #070c26`, `--field #0d1440`.
Matn: `--t1 #eef3ff`, `--t2 #c3d3f2`, `--t3 #93a8d4` (eng past — 7.7:1).

## Shrift

- **Unbounded** — display (sarlavha, wordmark, tugma). Keng, geometrik,
  kosmik registr. Kirill mavjud (RU tugmasi uchun kerak).
- **Manrope** — matn va interfeys. Kirill mavjud.

Ikkalasi ham ataylab tanlangan: Space Grotesk, Inter-display, DM Sans,
Plus Jakarta kabi "sukut" yuzlar ishlatilmaydi.

Labda o'lchov va ko'rsatkichlar (`×1.00`, `1/4 qadam`, panel sarlavhalari)
**monospace** da qoladi — bu kostyum emas, haqiqiy o'lchov registri.

## Shakl

- Burchak radiusi 2–4px. Yumaloq kartochka yo'q; ingichka chiziqli
  observatoriya/asbob jadvali.
- Chegara: 1px `--brd rgba(126,158,226,.20)`.
- Soya: ofset + yumshoq blur (`--sh-md`, `--sh-lg`). **Rangli gardish yo'q.**
- Gradient matn yo'q — urg'u og'irlik va o'lcham bilan beriladi.

## Fon videosi

`frontend/public/olamlab-bg.mp4` — palindrom (oldinga + orqaga, 20s),
shuning uchun halqa choki sezilmaydi. 2.0 MB, 1280×720, ovozsiz.
Poster: `olamlab-bg.jpg`, video ostida `<img>` sifatida turadi.

`prefers-reduced-motion` da video yashiriladi, poster qoladi.
Avtoijro bloklansa — birinchi teginishda yoqiladi.

## Kompozitsiya qoidasi (landing)

Sahifa — masshtab bo'ylab sayohat. Chapda uzluksiz spektr relsi;
har bo'lim shu chiziqning bir nuqtasida. Bir xil o'lchamdagi
ikonka-kartochkalar **ishlatilmaydi** — kartochka masshtabni ko'rsata
olmaydi, to'liq kenglikdagi band ko'rsatadi.

## Rejim

- `frontend/` — **Persuade**. O'qituvchi bir qarashda tushunishi kerak:
  nima, nima uchun, qayerdan boshlanadi.
- `src/` (lab) — **Operate**. Ifoda vazifani to'sib qo'ymaydi:
  panellar zich, yorliqlar qisqa, holat har doim ko'rinadi.
