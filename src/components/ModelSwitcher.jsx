import { CATEGORIES } from '../config/models';
import { CollapseBtn } from './PanelToggle';

export default function ModelSwitcher({ models, activeId, onSwitch, onCollapse }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 14,
      rowGap: 8,
      maxWidth: 'max(360px, calc(100vw - 660px))',
      zIndex: 100,
      background: 'linear-gradient(180deg, rgba(6, 16, 36, 0.88) 0%, rgba(3, 9, 22, 0.94) 100%)',
      border: '1px solid rgba(0, 229, 255, 0.26)',
      borderRadius: 12,
      padding: '9px 16px',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(0, 229, 255, 0.08)',
    }}>
      {onCollapse && (
        <div style={{ position: 'absolute', top: 6, right: 8 }}>
          <CollapseBtn collapsed={false} onClick={onCollapse} />
        </div>
      )}
      {CATEGORIES.map((cat, ci) => {
        const group = models.filter(m => m.category === cat.id);
        if (!group.length) return null;
        return (
          <div key={cat.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            paddingLeft: ci > 0 ? 14 : 0,
            borderLeft: ci > 0 ? '1px solid rgba(0, 229, 255, 0.16)' : 'none',
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textAlign: 'center',
              color: '#38bdf8',
              fontFamily: 'monospace',
            }}>
              {cat.icon} {cat.label}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {group.map((m) => {
                const active = m.id === activeId;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSwitch(m.id)}
                    title={`${m.label} ga o'tish`}
                    onMouseOver={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                        e.currentTarget.style.color = '#f0f9ff';
                      }
                    }}
                    onMouseOut={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = 'rgba(203, 226, 255, 0.65)';
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 11px',
                      borderRadius: 7,
                      border: active ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: active
                        ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.22), rgba(0, 255, 136, 0.12))'
                        : 'rgba(255, 255, 255, 0.03)',
                      color: active ? '#e0f2fe' : 'rgba(203, 226, 255, 0.65)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: "'Manrope', sans-serif",
                      fontWeight: active ? 700 : 500,
                      transition: 'all 0.18s ease',
                      boxShadow: active ? '0 0 16px rgba(0, 229, 255, 0.28)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
