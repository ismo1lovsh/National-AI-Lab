import { CollapseBtn } from './PanelToggle';

const SANS = "'Manrope', system-ui, -apple-system, sans-serif";
const L = '#8ae0f7';   // chap model rangi
const R = '#c48ce8';   // o'ng model rangi

/**
 * Taqqoslash darsi.
 *
 * Ikkita model yonma-yon turganda o'quvchiga eng kerak bo'lgan narsa —
 * ULARNING FARQI. Shuning uchun AI javobi erkin matn emas, tuzilgan
 * jadval: har qatorda bitta xususiyat va uning ikkala modeldagi holati.
 * Shu ko'rinish doskaga ko'chirishga ham qulay.
 */
export default function CompareAI({
  leftLabel, rightLabel, data, onRetry, onCollapse,
}) {
  const rows = data?.rows || [];

  return (
    <div style={{
      // Chap ustunda, "Boshqaruv" panelidan pastda. Balandligi pastdagi
      // "Darslar" panelidan yuqorida tugaydi — ular ustma-ust tushmasin.
      position:'fixed', left:20, top:276, zIndex:150, width:326,
      maxHeight:'calc(100vh - 466px)', minHeight:118,
      display:'flex', flexDirection:'column',
      background:'linear-gradient(180deg, rgba(9,15,46,0.97) 0%, rgba(3,6,28,0.97) 100%)',
      border:'1px solid rgba(126,158,226,0.28)',
      borderRadius:3, boxShadow:'0 14px 34px rgba(0,0,0,0.5)',
    }}>
      {/* Sarlavha */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    gap:8, padding:'10px 11px 8px', flexShrink:0 }}>
        <span style={{ fontSize:8.5, fontFamily:'monospace', letterSpacing:'1.6px',
                       color:'rgba(147,168,212,0.6)', fontWeight:600 }}>
          FARQI NIMADA
        </span>
        {onCollapse && <CollapseBtn collapsed={false} onClick={onCollapse} />}
      </div>

      {/* Qaysi model qaysi tomonda */}
      <div style={{ display:'flex', gap:6, padding:'0 11px 9px', flexShrink:0 }}>
        <span style={{ flex:1, minWidth:0, fontSize:10.5, fontWeight:700, color:L,
                       fontFamily:SANS, overflow:'hidden', textOverflow:'ellipsis',
                       whiteSpace:'nowrap' }}>◧ {leftLabel}</span>
        <span style={{ flex:1, minWidth:0, fontSize:10.5, fontWeight:700, color:R,
                       fontFamily:SANS, textAlign:'right', overflow:'hidden',
                       textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rightLabel} ◨</span>
      </div>

      <div style={{ overflowY:'auto', padding:'0 11px 11px', scrollbarWidth:'thin' }}>
        {data?.loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
            <div style={{ width:12, height:12, flexShrink:0, border:'2px solid #5ad2f0',
                          borderTopColor:'transparent', borderRadius:'50%',
                          animation:'pdvSpin 0.8s linear infinite' }}/>
            <span style={{ fontSize:11.5, color:'rgba(147,168,212,0.75)', fontFamily:SANS }}>
              Farqlar tayyorlanmoqda…
            </span>
          </div>
        )}

        {data?.error && (
          <div style={{ display:'flex', flexDirection:'column', gap:7, padding:'4px 0' }}>
            <span style={{ fontSize:11.5, color:'rgba(248,201,140,0.9)',
                           fontFamily:SANS, lineHeight:1.5 }}>{data.error}</span>
            {onRetry && (
              <button onClick={onRetry} style={{
                alignSelf:'flex-start', background:'rgba(90,210,240,0.08)',
                border:'1px solid rgba(90,210,240,0.32)', borderRadius:3,
                padding:'5px 11px', color:'#5ad2f0', fontSize:11, fontWeight:600,
                fontFamily:SANS, cursor:'pointer' }}>↻ Qayta urinish</button>
            )}
          </div>
        )}

        {!data?.loading && !data?.error && (
          <>
            {data?.same && (
              <div style={{ marginBottom:11, paddingBottom:10,
                            borderBottom:'1px solid rgba(126,158,226,0.16)' }}>
                <div style={{ fontSize:8, fontFamily:'monospace', letterSpacing:'1.4px',
                              color:'rgba(92,224,168,0.75)', marginBottom:5 }}>UMUMIY</div>
                <div style={{ fontSize:11.5, color:'rgba(195,211,242,0.9)',
                              lineHeight:1.6, fontFamily:SANS }}>{data.same}</div>
              </div>
            )}

            {/* Farqlar jadvali — har qator bitta xususiyat */}
            {rows.map((r, i) => (
              <div key={i} style={{ marginBottom:9, paddingBottom:9,
                borderBottom: i < rows.length - 1
                  ? '1px solid rgba(126,158,226,0.12)' : 'none' }}>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#eef3ff',
                              fontFamily:SANS, marginBottom:5 }}>{r.feature}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1, minWidth:0, paddingLeft:7,
                                borderLeft:`1px solid ${L}` }}>
                    <span style={{ fontSize:11, color:'rgba(195,211,242,0.92)',
                                   lineHeight:1.5, fontFamily:SANS }}>{r.left}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0, paddingLeft:7,
                                borderLeft:`1px solid ${R}` }}>
                    <span style={{ fontSize:11, color:'rgba(195,211,242,0.92)',
                                   lineHeight:1.5, fontFamily:SANS }}>{r.right}</span>
                  </div>
                </div>
              </div>
            ))}

            {data?.why && (
              <div style={{ marginTop:4, paddingTop:9,
                            borderTop:'1px solid rgba(126,158,226,0.16)' }}>
                <div style={{ fontSize:8, fontFamily:'monospace', letterSpacing:'1.4px',
                              color:'rgba(248,201,140,0.8)', marginBottom:5 }}>NEGA MUHIM</div>
                <div style={{ fontSize:11.5, color:'rgba(195,211,242,0.9)',
                              lineHeight:1.6, fontFamily:SANS }}>{data.why}</div>
              </div>
            )}

            {/* Erkin matn — model formatga rioya qilmagan holat */}
            {!rows.length && !data?.same && data?.raw && (
              <div style={{ fontSize:11.5, color:'rgba(195,211,242,0.9)', lineHeight:1.65,
                            fontFamily:SANS, whiteSpace:'pre-wrap' }}>{data.raw}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
