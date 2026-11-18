import { useEffect, useRef, useState } from 'react';
import { AI_PROVIDERS, hasKey } from '../config/aiProviders';

const SANS = "'Manrope', system-ui, -apple-system, sans-serif";
const PANEL_BG = 'linear-gradient(180deg, rgba(16, 12, 38, 0.96) 0%, rgba(8, 6, 22, 0.98) 100%)';
const PANEL_BORDER = '1.5px solid rgba(168, 85, 247, 0.55)';

const TEACH_BTNS = [
  { id: 'explain', icon: '💡', label: 'Soddaroq' },
  { id: 'deeper',  icon: '🔬', label: 'Chuqurroq' },
  { id: 'example', icon: '🌍', label: 'Misol' },
  { id: 'compare', icon: '⚖️', label: 'Taqqosla' },
  { id: 'quiz',    icon: '📝', label: 'Test' },
];

// Rasmdagi yoqimli ko'k ko'zli 3D Robot AI Ustoz Avatari (SVG)
function RobotAvatar({ active }) {
  return (
    <div style={{
      width: 54,
      height: 54,
      borderRadius: 14,
      background: 'radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.32), rgba(15, 23, 42, 0.95))',
      border: `1.5px solid ${active ? '#00e5ff' : 'rgba(168, 85, 247, 0.6)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: active ? '0 0 18px rgba(0, 229, 255, 0.45)' : '0 0 14px rgba(168, 85, 247, 0.25)',
      position: 'relative',
    }}>
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        {/* Robot boshi */}
        <rect x="8" y="10" width="32" height="26" rx="12" fill="url(#roboHead)" stroke="#93c5fd" strokeWidth="1.5" />
        {/* Quloq antennalari */}
        <rect x="4" y="18" width="4" height="10" rx="2" fill="#38bdf8" />
        <rect x="40" y="18" width="4" height="10" rx="2" fill="#38bdf8" />
        {/* Yuz ekrani */}
        <rect x="12" y="15" width="24" height="15" rx="7" fill="#041022" stroke="#0284c7" strokeWidth="1" />
        {/* Yorqin moviy ko'zlar */}
        <circle cx="19" cy="22.5" r="3.2" fill="#00e5ff" />
        <circle cx="29" cy="22.5" r="3.2" fill="#00e5ff" />
        <circle cx="18" cy="21.5" r="1" fill="#ffffff" />
        <circle cx="28" cy="21.5" r="1" fill="#ffffff" />
        {/* Tabassum */}
        <path d="M21 26.5 Q24 28.5 27 26.5" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <defs>
          <linearGradient id="roboHead" x1="8" y1="10" x2="40" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function VoiceAssistant({
  isListening, isTranscribing, isWaitingConfirm, isLoading, isSpeaking,
  pendingTranscript, history, error,
  onMicToggle, onStopSpeaking, onConfirm, onDiscard,
  providerId, onProviderChange, onSendText, onTeach, selectedPartName,
  activeModelLabel,
}) {
  const chatRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [typed, setTyped]       = useState('');

  useEffect(() => {
    if (isListening || isTranscribing || isWaitingConfirm || isLoading || isSpeaking) {
      setChatOpen(true);
    }
  }, [isListening, isTranscribing, isWaitingConfirm, isLoading, isSpeaking]);

  useEffect(() => {
    if (history.length > 0) setChatOpen(true);
  }, [history.length]);

  useEffect(() => {
    if (pendingTranscript) setEditText(pendingTranscript);
  }, [pendingTranscript]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, isLoading, isWaitingConfirm]);

  const handleConfirm = () => {
    const text = editText.trim();
    if (text) onConfirm(text);
  };

  const handleSendTyped = (e) => {
    e?.preventDefault?.();
    const t = typed.trim();
    if (!t || isLoading) return;
    setTyped('');
    setChatOpen(true);
    onSendText?.(t);
  };

  const keyedProviders = AI_PROVIDERS.filter(hasKey);
  const hasActivity = isListening || isTranscribing || isWaitingConfirm || isLoading || isSpeaking;

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      right: 16,
      width: 288,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Kengaytirilgan Chat Oynasi */}
      <div style={{
        maxHeight: chatOpen ? 460 : 0,
        opacity: chatOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        pointerEvents: chatOpen ? 'auto' : 'none',
        marginBottom: chatOpen ? 8 : 0,
      }}>
        <div style={{
          background: PANEL_BG,
          border: PANEL_BORDER,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(0,0,0,0.75), 0 0 24px rgba(168, 85, 247, 0.25)',
        }}>
          {/* Header */}
          <div style={{
            padding: '9px 12px',
            borderBottom: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(124, 58, 237, 0.16)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>✨</span>
              <span style={{ fontSize: 11, fontFamily: SANS, color: '#f3e8ff', fontWeight: 800 }}>
                AI USTOZ CHAT
              </span>
              {keyedProviders.length > 0 && (
                <select
                  value={providerId || ''}
                  onChange={e => onProviderChange?.(e.target.value)}
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    borderRadius: 4,
                    color: '#e9d5ff',
                    fontSize: 9,
                    fontFamily: 'monospace',
                    padding: '2px 4px',
                    cursor: 'pointer',
                  }}
                >
                  {keyedProviders.map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#0f0720', color: '#f3e8ff' }}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 5,
                width: 20,
                height: 20,
                color: '#e9d5ff',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{
            minHeight: 70,
            maxHeight: 220,
            overflowY: 'auto',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            scrollbarWidth: 'thin',
          }}>
            {history.length === 0 && !isWaitingConfirm && !isLoading && (
              <div style={{ fontSize: 11, color: 'rgba(233, 213, 255, 0.7)', textAlign: 'center', padding: '10px 4px', fontFamily: SANS }}>
                {selectedPartName
                  ? `"${selectedPartName}" haqida savolingizni yozing yoki 🎙 bosing`
                  : `"${activeModelLabel || '3D Model'}" bo'yicha savol bering`}
              </div>
            )}

            {isWaitingConfirm && (
              <div style={{
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(192, 132, 252, 0.45)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(192, 132, 252, 0.35)',
                    borderRadius: 5,
                    padding: '6px 8px',
                    color: '#f3e8ff',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleConfirm} style={{ flex: 1, background: '#9333ea', border: 'none', borderRadius: 5, padding: '5px 0', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    ✓ Yuborish
                  </button>
                  <button onClick={onDiscard} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, padding: '5px 0', color: '#fda4af', fontSize: 11, cursor: 'pointer' }}>
                    ✕ Bekor
                  </button>
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '94%',
                  background: msg.role === 'user' ? 'rgba(147, 51, 234, 0.32)' : 'rgba(255, 255, 255, 0.07)',
                  border: `1px solid ${msg.role === 'user' ? '#a855f7' : 'rgba(192, 132, 252, 0.25)'}`,
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  color: '#f3e8ff',
                  fontFamily: SANS,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Tezkor tugmalar */}
          <div style={{
            padding: '6px 10px',
            borderTop: '1px solid rgba(168, 85, 247, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}>
            {TEACH_BTNS.map(b => (
              <button
                key={b.id}
                onClick={() => { setChatOpen(true); onTeach?.(b.id); }}
                disabled={isLoading}
                style={{
                  flex: '1 1 auto',
                  background: 'rgba(168, 85, 247, 0.14)',
                  border: '1px solid rgba(192, 132, 252, 0.3)',
                  borderRadius: 5,
                  padding: '4px 6px',
                  color: '#e9d5ff',
                  fontSize: 10,
                  fontFamily: SANS,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>

          {/* Matn yozish */}
          <form onSubmit={handleSendTyped} style={{
            padding: '6px 10px 10px',
            display: 'flex',
            gap: 6,
          }}>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Savolingizni yozing…"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(192, 132, 252, 0.35)',
                borderRadius: 6,
                padding: '7px 10px',
                color: '#f3e8ff',
                fontSize: 11.5,
                fontFamily: SANS,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!typed.trim() || isLoading}
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #9333ea, #6366f1)',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* ── Rasmdagidek O'ng-Pastki AI USTOZ Kartochkasi (image_e16263.jpg!) ──── */}
      <div style={{
        background: PANEL_BG,
        border: PANEL_BORDER,
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: '0 14px 36px rgba(0,0,0,0.65), 0 0 24px rgba(168, 85, 247, 0.22)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #9333ea, #6366f1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#fff',
            }}>
              ✦
            </span>
            <span style={{
              fontSize: 11.5,
              fontFamily: SANS,
              fontWeight: 800,
              color: '#f3e8ff',
              letterSpacing: '0.03em',
            }}>
              AI USTOZ
            </span>
          </div>

          <button
            onClick={() => setChatOpen(o => !o)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(233, 213, 255, 0.6)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {chatOpen ? '▾' : '›'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <RobotAvatar active={hasActivity} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11,
              color: 'rgba(226, 232, 240, 0.88)',
              lineHeight: 1.45,
              fontFamily: SANS,
              marginBottom: 7,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {isListening
                ? '🔴 Ovozli savolingiz tinglanmoqda...'
                : selectedPartName
                ? `Tanlangan qism: ${selectedPartName} — tuzilishi va vazifasi.`
                : 'Salom! Men AI Ustozman. Ushbu 3D model va texnologiya haqida soʻrang!'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setChatOpen(true)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(90deg, #7c3aed, #9333ea)',
                  border: '1px solid rgba(216, 180, 254, 0.45)',
                  borderRadius: 16,
                  padding: '5px 11px',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  fontFamily: SANS,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 14px rgba(147, 51, 234, 0.4)',
                }}
              >
                Batafsil ma'lumot →
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setChatOpen(true); onMicToggle(); }}
                title="Ovozli savol berish"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isListening ? 'rgba(251, 113, 133, 0.25)' : 'rgba(0, 229, 255, 0.15)',
                  border: `1px solid ${isListening ? '#fb7185' : '#00e5ff'}`,
                  color: isListening ? '#fb7185' : '#00e5ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {isListening ? '⏹' : '🎙'}
              </button>

              {(isSpeaking || isLoading) && (
                <button
                  onClick={onStopSpeaking}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: '1px solid #fb7185',
                    background: 'rgba(251, 113, 133, 0.2)',
                    color: '#fb7185',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}