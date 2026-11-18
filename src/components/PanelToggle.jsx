/**
 * Panelni yig'ish/yoyish tugmasi va yig'ilgan holatdagi yorliq.
 *
 * O'qituvchi doskada faqat modelni ko'rsatmoqchi bo'lganda kerak emas
 * panellarni bittalab yashira oladi. Tanlov localStorage da saqlanadi —
 * har safar qaytadan yopib chiqish shart emas.
 */

const SANS = "'Manrope', system-ui, -apple-system, sans-serif";

/** Panel sarlavhasidagi kichik ▾ / ▸ tugmasi */
export function CollapseBtn({ collapsed, onClick, title }) {
  return (
    <button onClick={onClick} title={title || (collapsed ? 'Yoyish' : "Yig'ish")}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='rgba(255,255,255,0.92)';}}
      onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(147,168,212,0.5)';}}
      style={{
        background:'transparent', border:'1px solid rgba(126,158,226,0.2)',
        borderRadius:3, width:19, height:19, flexShrink:0, padding:0,
        color:'rgba(147,168,212,0.5)', cursor:'pointer', fontSize:9,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background .15s, color .15s',
      }}>
      {collapsed ? '▸' : '▾'}
    </button>
  );
}

/** Yig'ilgan panel o'rnida qoladigan ixcham yorliq — bosilsa qayta ochiladi */
export function CollapsedPill({ icon, label, onClick, style }) {
  return (
    <button onClick={onClick} title={`${label} — ochish`}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(77,147,218,0.16)';e.currentTarget.style.borderColor='rgba(77,147,218,0.42)';}}
      onMouseLeave={e=>{e.currentTarget.style.background='rgba(3,6,28,0.9)';e.currentTarget.style.borderColor='rgba(126,158,226,0.22)';}}
      style={{
        position:'fixed', zIndex:150,
        display:'flex', alignItems:'center', gap:6,
        background:'rgba(3,6,28,0.9)',
        border:'1px solid rgba(126,158,226,0.22)',
        borderRadius:3, padding:'6px 11px',
        color:'rgba(195,211,242,0.82)', fontSize:10.5, fontWeight:600,
        fontFamily:SANS, cursor:'pointer', whiteSpace:'nowrap',
        boxShadow:'0 8px 22px rgba(0,0,0,0.38)',
        transition:'background .15s, border-color .15s',
        ...style,
      }}>
      <span style={{ fontSize:12 }}>{icon}</span>{label}<span style={{ opacity:.5 }}>▸</span>
    </button>
  );
}
