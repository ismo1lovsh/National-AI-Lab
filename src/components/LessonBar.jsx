import { LESSONS, lessonTitle, lessonSubject, stepNote } from '../config/lessons';
import { t } from '../config/i18n';
import { CollapseBtn } from './PanelToggle';

const SANS = "'Manrope', system-ui, -apple-system, sans-serif";

/**
 * Dars rejimi. O'qituvchi tayyor ketma-ketlikni tanlaydi va strelkalar
 * bilan qadam-baqadam yuradi — dars o'rtasida menyudan model qidirmaydi.
 */
export default function LessonBar({
  lang, lesson, stepIdx, onPick, onPrev, onNext, onExit, projector, onCollapse,
}) {
  // Dars tanlanmagan — ro'yxat
  if (!lesson) {
    return (
      <div style={{
        position:'fixed', bottom:16, left:20, zIndex:150, width:250,
        background:'linear-gradient(180deg, rgba(9,15,46,0.96) 0%, rgba(3,6,28,0.96) 100%)',
        border:'1px solid rgba(126,158,226,0.22)', borderRadius:3,
        padding:'10px 11px', boxShadow:'0 14px 34px rgba(0,0,0,0.42)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:8, marginBottom:8 }}>
          <span style={{ fontSize:8.5, fontFamily:'monospace', letterSpacing:'1.6px',
            color:'rgba(147,168,212,0.5)', fontWeight:600 }}>
            {t('lessons', lang)}
          </span>
          {onCollapse && <CollapseBtn collapsed={false} onClick={onCollapse} />}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {LESSONS.map(l => (
            <button key={l.id} onClick={() => onPick(l.id)}
              onMouseOver={e=>{e.currentTarget.style.background='rgba(77,147,218,0.14)';}}
              onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.045)';}}
              style={{
                display:'flex', alignItems:'center', gap:8, textAlign:'left',
                background:'rgba(255,255,255,0.045)',
                border:'1px solid rgba(126,158,226,0.16)',
                borderRadius:3, padding:'8px 10px', cursor:'pointer',
                transition:'background 0.15s',
              }}>
              <span style={{ fontSize:17 }}>{l.icon}</span>
              <span style={{ minWidth:0 }}>
                <span style={{ display:'block', fontSize:11.5, fontWeight:700,
                  color:'#eef3ff', fontFamily:SANS, lineHeight:1.3 }}>
                  {lessonTitle(l, lang)}
                </span>
                <span style={{ display:'block', fontSize:9.5,
                  color:'rgba(147,168,212,0.55)', fontFamily:'monospace' }}>
                  {lessonSubject(l, lang)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Dars ketmoqda
  const total = lesson.steps.length;
  const step  = lesson.steps[stepIdx];
  return (
    <div style={{
      position:'fixed', bottom:16, left:'50%', transform:'translateX(-50%)',
      zIndex:150, width: projector ? 760 : 560, maxWidth:'92vw',
      background:'linear-gradient(180deg, rgba(9,15,46,0.97) 0%, rgba(3,6,28,0.97) 100%)',
      border:'1px solid rgba(126,158,226,0.28)', borderRadius:3,
      padding: projector ? '14px 18px' : '11px 14px',
      boxShadow:'0 16px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Sarlavha qatori */}
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>{lesson.icon}</span>
        <span style={{ flex:1, minWidth:0, fontSize: projector ? 15 : 12.5,
          fontWeight:700, color:'#eef3ff', fontFamily:SANS,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {lessonTitle(lesson, lang)}
        </span>
        <span style={{ fontSize: projector ? 12 : 10, fontFamily:'monospace',
          color:'rgba(160,200,240,0.6)', whiteSpace:'nowrap' }}>
          {stepIdx + 1}/{total} {t('step', lang)}
        </span>
        <button onClick={onExit} title={t('exitLesson', lang)}
          style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.14)',
            borderRadius:'50%', width:20, height:20, color:'rgba(255,255,255,0.45)',
            cursor:'pointer', fontSize:10, flexShrink:0 }}>✕</button>
      </div>

      {/* Progress */}
      <div style={{ display:'flex', gap:3, marginBottom:9 }}>
        {lesson.steps.map((_, i) => (
          <div key={i} style={{ flex:1, height:3, borderRadius:2,
            background: i <= stepIdx ? '#5ad2f0' : 'rgba(255,255,255,0.12)',
            transition:'background 0.25s' }} />
        ))}
      </div>

      {/* Eslatma */}
      <div style={{ fontSize: projector ? 15 : 12.5, lineHeight:1.65,
        color:'rgba(195,211,242,0.92)', fontFamily:SANS, marginBottom:10 }}>
        {stepNote(step, lang)}
      </div>

      {/* Navigatsiya */}
      <div style={{ display:'flex', gap:7 }}>
        <button onClick={onPrev} disabled={stepIdx === 0}
          style={{
            flex:1, padding: projector ? '10px' : '7px', borderRadius:3,
            background: stepIdx === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
            border:'1px solid rgba(126,158,226,0.16)',
            color: stepIdx === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(210,232,255,0.85)',
            fontSize: projector ? 13 : 11.5, fontWeight:600, fontFamily:SANS,
            cursor: stepIdx === 0 ? 'not-allowed' : 'pointer',
          }}>← {t('prev', lang)}</button>
        <button onClick={onNext} disabled={stepIdx >= total - 1}
          style={{
            flex:2, padding: projector ? '10px' : '7px', borderRadius:3,
            background: stepIdx >= total - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(77,147,218,0.18)',
            border:`1px solid ${stepIdx >= total - 1 ? 'rgba(126,158,226,0.14)' : 'rgba(77,147,218,0.5)'}`,
            color: stepIdx >= total - 1 ? 'rgba(255,255,255,0.2)' : '#8ae0f7',
            fontSize: projector ? 13 : 11.5, fontWeight:700, fontFamily:SANS,
            cursor: stepIdx >= total - 1 ? 'not-allowed' : 'pointer',
          }}>{t('next', lang)} →</button>
      </div>
    </div>
  );
}
