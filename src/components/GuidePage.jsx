// GuidePage.jsx — National AI Lab Boshlang'ich qo'llanma (Onboarding)
import { useState, useEffect } from 'react';

const SLIDES = [
  {
    id: 1,
    title: 'National AI Lab ga Xush Kelibsiz',
    desc: "Harbiy texnika, biologiya, anatomiya va astronomiya 3D modellarini VR ko'zoynaksiz, oddiy veb-kamera va sun'iy intellekt yordamida qo'l harakatlari bilan tadqiq qiling.",
    icon: '🛡️',
    color: '#00e5ff',
    anim: 'pulse',
    hint: 'Widepipe yuqori aniqlikdagi qoʻl kuzatuvi avtomatik yoqiladi',
  },
  {
    id: 2,
    title: 'Yangilangan Qoʻl Harakatlari',
    desc: null,
    icon: '☝️',
    color: '#00ff88',
    anim: 'gestures',
    hint: '1-Euro adaptiv filtri orqali tez va titroqsiz boshqaruv',
  },
  {
    id: 3,
    title: 'Ichki Tuzilish (Rentgen) va Ajratish',
    desc: "Modelni musht qilib ochish (✊→🖐) orqali me'yoriy masofada qismlarga ajrating yoki ikki barmoq (✌️) ko'rsatib tashqi qobiqni shaffoflashtiring va ichki mexanizmlarni ko'ring.",
    icon: '✌️',
    color: '#38bdf8',
    anim: 'model',
    hint: 'Qismni tanlash uchun 0.35s chimchilab (🤏) ushlab turing',
  },
  {
    id: 4,
    title: 'AI Ustoz va Sinov Testlari',
    desc: "Tanlangan har bir detal haqida AI Ustozdan ovozli yoki matnli so'rang, ikkita 3D modelni yonma-yon taqqoslang va bilimingizni interaktiv testda sinab ko'ring.",
    icon: '🧑‍🏫',
    color: '#fbbf24',
    anim: 'voice',
    hint: 'Har bir 3D qism uchun avtomatik tahlil va tushuntirish',
  },
];

const GESTURES = [
  { icon: '☝️', label: "Ko'rsatkich barmoq", desc: 'Barmoqni harakatlantirib 3D modelni 360° aylantirish' },
  { icon: '✊→🖐', label: 'Musht → Ochiq kaft', desc: "Modelni me'yoriy masofada qismlarga ajratish va yig'ish" },
  { icon: '✌️', label: 'Ikki barmoq (V)', desc: 'Tashqi qobiqni shaffoflashtirib ichki qismlarni koʻrish (Rentgen)' },
  { icon: '🤏', label: 'Chimchilash (Pinch)', desc: "0.35s ushlab turish → qismni tanlash · Harakat → aylantirish" },
  { icon: '🙌', label: 'Ikki kaft orasi', desc: 'Qoʻllarni uzoqlashtirish / yaqinlashtirish → Masshtab (Zoom)' },
  { icon: '🤙', label: 'Bekor qilish', desc: 'Tanlangan qismdan chiqish (yoki Esc tugmasi)' },
];

function AnimPulse({ color }) {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes g-ring { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.15);opacity:1} }
        @keyframes g-dna  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          width: 120 - i * 24,
          height: 120 - i * 24,
          border: `1.5px solid ${color}`,
          opacity: 0.65 - i * 0.15,
          animation: `g-ring ${2 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
        }} />
      ))}
      <div style={{ fontSize: 48, zIndex: 2 }}>🛡️</div>
    </div>
  );
}

function AnimGestures() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % GESTURES.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {GESTURES.map((g, i) => (
          <div key={i} style={{
            padding: '8px 6px',
            borderRadius: 8,
            textAlign: 'center',
            background: i === active ? 'rgba(0, 255, 136, 0.16)' : 'rgba(255, 255, 255, 0.04)',
            border: `1.5px solid ${i === active ? '#00ff88' : 'rgba(0, 229, 255, 0.14)'}`,
            transition: 'all 0.25s',
          }}>
            <div style={{ fontSize: 20, marginBottom: 3 }}>{g.icon}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: i === active ? '#00ff88' : '#e0f2fe', marginBottom: 2 }}>{g.label}</div>
            <div style={{ fontSize: 9, color: 'rgba(186, 230, 253, 0.65)', lineHeight: 1.35 }}>{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimModel({ color }) {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes g-orbit{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 76,
        height: 76,
        borderRadius: 16,
        background: 'radial-gradient(circle at 35% 35%, rgba(0, 229, 255, 0.45), rgba(6, 24, 52, 0.9))',
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 34,
        boxShadow: `0 0 24px ${color}44`,
      }}>
        🚁
      </div>
      <div style={{
        position: 'absolute',
        inset: -6,
        borderRadius: '50%',
        border: `1px dashed ${color}88`,
        animation: 'g-orbit 5s linear infinite',
      }} />
    </div>
  );
}

function AnimVoice({ color }) {
  const [bars, setBars] = useState([3, 6, 8, 4, 7, 9, 4, 6, 7, 5]);
  useEffect(() => {
    const t = setInterval(() => {
      setBars(b => b.map(() => 2 + Math.floor(Math.random() * 9)));
    }, 160);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        boxShadow: `0 0 20px ${color}44`,
      }}>🎙️</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 4,
            borderRadius: 2,
            height: h * 3,
            background: color,
            transition: 'height 0.12s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

function SlideAnim({ slide }) {
  if (slide.anim === 'pulse')    return <AnimPulse color={slide.color} />;
  if (slide.anim === 'gestures') return <AnimGestures />;
  if (slide.anim === 'model')    return <AnimModel color={slide.color} />;
  if (slide.anim === 'voice')    return <AnimVoice color={slide.color} />;
  return null;
}

export default function GuidePage({ onDone }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setStep(s => s + 1);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(2, 7, 18, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div key={step} style={{
        width: 468,
        maxWidth: '93vw',
        background: 'linear-gradient(180deg, rgba(7, 19, 42, 0.98) 0%, rgba(3, 10, 24, 0.98) 100%)',
        border: `1.5px solid ${slide.color}55`,
        borderRadius: 14,
        boxShadow: `0 0 60px ${slide.color}22, 0 32px 80px rgba(0,0,0,0.75)`,
        overflow: 'hidden',
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${slide.color}, transparent)` }} />

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0 0' }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 26 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? slide.color : 'rgba(255,255,255,0.18)',
              transition: 'all 0.3s',
              cursor: 'pointer',
            }} />
          ))}
        </div>

        <div style={{
          minHeight: 175,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px 0',
        }}>
          <SlideAnim key={step} slide={slide} />
        </div>

        <div style={{ padding: '18px 28px 24px', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 20,
            fontWeight: 900,
            color: '#f0f9ff',
            marginBottom: 10,
          }}>
            {slide.title}
          </h2>

          {slide.desc && (
            <p style={{
              fontSize: 13.5,
              color: 'rgba(203, 226, 255, 0.85)',
              lineHeight: 1.7,
              marginBottom: 14,
            }}>
              {slide.desc}
            </p>
          )}

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 13px',
            borderRadius: 100,
            background: `${slide.color}16`,
            border: `1px solid ${slide.color}44`,
            fontSize: 11,
            color: slide.color,
            marginBottom: 20,
          }}>
            <span>💡</span> {slide.hint}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!isLast && (
              <button onClick={onDone} style={{
                flex: 1,
                padding: '11px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(226,241,255,0.6)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                O'tkazib yuborish
              </button>
            )}

            <button onClick={next} style={{
              flex: 2,
              padding: '12px',
              borderRadius: 8,
              background: `linear-gradient(135deg, ${slide.color}, #0284c7)`,
              border: 'none',
              color: '#021324',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 8px 24px ${slide.color}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              {isLast ? <><span>🚀</span> Laboratoriyani Boshlash</> : <>Keyingi <span>→</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}