import { t } from '../config/i18n';
import { CollapseBtn } from './PanelToggle';

const SANS = "'Manrope', system-ui, -apple-system, sans-serif";

function SideSelect({ label, value, models, exclude, onChange, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: accent, width: 14, flexShrink: 0 }}>{label}</span>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'rgba(4, 12, 28, 0.92)',
          border: `1px solid ${accent}55`,
          borderRadius: 5,
          color: accent,
          fontSize: 10.5,
          fontFamily: 'monospace',
          padding: '4px 6px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {models.filter(m => m.id !== exclude).map(m => (
          <option key={m.id} value={m.id} style={{ background: '#04122a' }}>
            {m.icon} {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ on, icon, label, onClick, accent = '#00e5ff' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        flex: '1 1 calc(50% - 4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        background: on ? `${accent}24` : 'rgba(255, 255, 255, 0.04)',
        border: `1px solid ${on ? accent : 'rgba(0, 229, 255, 0.2)'}`,
        borderRadius: 5,
        padding: '6px 8px',
        color: on ? accent : 'rgba(214, 232, 255, 0.82)',
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: SANS,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: on ? `0 0 12px ${accent}33` : 'none',
        transition: 'all 0.16s ease',
      }}
    >
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Chap Yuqori Panel: Jarvis Electric Cyan (#00e5ff) CAD Boshqaruvi ────────
export default function ViewControls({
  lang,
  activeModel,
  explodeOpen,
  onToggleExplode,
  explodeFactor = 1.0,
  onChangeExplodeFactor,
  xrayMode = false,
  onToggleXray,
  xrayOpacity = 0.16,
  onChangeXrayOpacity,
  showCadEdges = true,
  onToggleCadEdges,
  showLabels,
  onToggleLabels,
  compareOn,
  onToggleCompare,
  onScreenshot,
  projector,
  onToggleProjector,
  hidden,
  models,
  leftId,
  rightId,
  onPickLeft,
  onPickRight,
  onCollapse,
}) {
  if (hidden) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 66,
      left: 18,
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      background: 'linear-gradient(180deg, rgba(4, 18, 38, 0.94) 0%, rgba(2, 10, 24, 0.96) 100%)',
      border: '1.5px solid rgba(0, 229, 255, 0.5)',
      clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
      padding: '10px 12px',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 14px 36px rgba(0, 0, 0, 0.6), 0 0 22px rgba(0, 229, 255, 0.14)',
      width: 282,
      maxHeight: 252,
      overflowY: 'auto',
      scrollbarWidth: 'thin',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#00e5ff',
            boxShadow: '0 0 8px #00e5ff',
          }} />
          <span style={{
            fontSize: 9.5,
            fontFamily: 'monospace',
            letterSpacing: '0.14em',
            color: '#00e5ff',
            fontWeight: 800,
          }}>
            {t('controls', lang)}
          </span>
        </div>
        {onCollapse && <CollapseBtn collapsed={false} onClick={onCollapse} />}
      </div>

      {/* Texnik ko'rsatkichlar qatori */}
      {activeModel?.specs?.length > 0 && (
        <div style={{
          background: 'rgba(0, 229, 255, 0.06)',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: 5,
          padding: '6px 8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3px 8px',
        }}>
          {activeModel.specs.slice(0, 4).map((sp, i) => (
            <div key={i} style={{ fontSize: 9.5, fontFamily: SANS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'rgba(148, 184, 224, 0.7)' }}>{sp.label}: </span>
              <b style={{ color: '#e0f2fe', fontFamily: 'monospace' }}>{sp.val}</b>
            </div>
          ))}
        </div>
      )}

      {/* Asosiy CAD boshqaruv tugmalari */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <Toggle
          on={explodeOpen}
          icon="💥"
          label={explodeOpen ? t('assemble', lang) : t('explode', lang)}
          onClick={onToggleExplode}
          accent="#fbbf24"
        />
        <Toggle
          on={xrayMode}
          icon="✌️"
          label={t('xray', lang)}
          onClick={onToggleXray}
          accent="#00ff88"
        />
        <Toggle
          on={showCadEdges}
          icon="📐"
          label={t('cadEdges', lang)}
          onClick={onToggleCadEdges}
          accent="#00e5ff"
        />
        <Toggle
          on={showLabels}
          icon="🏷"
          label={t('labels', lang)}
          onClick={onToggleLabels}
          accent="#38bdf8"
        />
        <Toggle
          on={compareOn}
          icon="⇋"
          label={t('compare', lang)}
          onClick={onToggleCompare}
          accent="#c084fc"
        />
        <Toggle
          on={false}
          icon="📸"
          label={t('screenshot', lang)}
          onClick={onScreenshot}
          accent="#00e5ff"
        />
      </div>

      {/* Ajratish masofasi slayderi */}
      {explodeOpen && onChangeExplodeFactor && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          borderRadius: 5,
          padding: '5px 8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontFamily: 'monospace', color: '#fde68a' }}>
            <span>{t('explodeDist', lang)}</span>
            <span>{Math.round(explodeFactor * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="1.6"
            step="0.05"
            value={explodeFactor}
            onChange={e => onChangeExplodeFactor(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#fbbf24', cursor: 'pointer', height: 4 }}
          />
        </div>
      )}

      {/* Rentgen (Shaffoflik) slayderi */}
      {xrayMode && onChangeXrayOpacity && (
        <div style={{
          background: 'rgba(0, 255, 136, 0.08)',
          border: '1px solid rgba(0, 255, 136, 0.35)',
          borderRadius: 5,
          padding: '5px 8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontFamily: 'monospace', color: '#6ee7b7' }}>
            <span>{t('xrayDepth', lang)}</span>
            <span>{Math.round((1 - xrayOpacity) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.08"
            max="0.45"
            step="0.02"
            value={xrayOpacity}
            onChange={e => onChangeXrayOpacity(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#00ff88', cursor: 'pointer', height: 4 }}
          />
        </div>
      )}

      {compareOn && models && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '5px 7px',
          borderRadius: 5,
          background: 'rgba(192, 132, 252, 0.08)',
          border: '1px solid rgba(192, 132, 252, 0.28)',
        }}>
          <SideSelect label="◧" value={leftId} models={models} exclude={rightId} onChange={onPickLeft} accent="#38bdf8" />
          <SideSelect label="◨" value={rightId} models={models} exclude={leftId} onChange={onPickRight} accent="#d8b4fe" />
        </div>
      )}
    </div>
  );
}
