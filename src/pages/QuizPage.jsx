// ═══════════════════════════════════════════════════════════════════════
// National AI Lab — Quiz sahifasi
// Chap: 3D model (mouse bilan aylantiriladi)
// O'ng: QuizPanel (savollar)
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useCallback } from 'react';
import ModelScene  from '../components/ModelScene';
import QuizPanel   from '../components/quiz/QuizPanel';
import useQuiz     from '../hooks/useQuiz';
import { getLeaderboard, toStars, FAMOUS_SCORES } from '../hooks/useQuiz';
import { MODELS }  from '../config/models';

const STAR = '★';
const EMPTY_STAR = '☆';

// ─── Leaderboard modal ──────────────────────────────────────────────────
function LeaderboardModal({ onClose, currentPct }) {
  const board = getLeaderboard();
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440, maxHeight: '80vh',
          background: 'linear-gradient(135deg, #081828 0%, #050d1a 100%)',
          border: '1px solid rgba(90,210,240,0.3)',
          borderRadius:3, padding: '28px 28px 24px',
          overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🏆</span>
            <div>
              <div style={{ color: '#fff', fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 20 }}>
                Reyting Jadvali
              </div>
              <div style={{ color: 'rgba(90,210,240,0.7)', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                National AI Lab — Top o'yinchilar
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius:3, width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 16 }}>
            ✕
          </button>
        </div>

        {/* Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {board.slice(0, 15).map((entry, i) => {
            const isMe = entry.flag === '🧑';
            const medal = medals[i] || null;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: isMe
                  ? 'rgba(90,210,240,0.12)'
                  : i < 3 ? 'rgba(248,201,140,0.07)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isMe ? 'rgba(90,210,240,0.4)' : i < 3 ? 'rgba(248,201,140,0.2)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius:3,
              }}>
                {/* Rank */}
                <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 18 : 13, color: 'rgba(200,220,255,0.5)', fontWeight: 700 }}>
                  {medal || (i + 1)}
                </div>

                {/* Flag/emoji */}
                <span style={{ fontSize: 18 }}>{entry.flag || '🧑'}</span>

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ color: isMe ? '#5ad2f0' : i < 3 ? '#f8c98c' : '#eef3ff', fontWeight: isMe || i < 3 ? 700 : 500, fontSize: 14 }}>
                    {entry.name}
                    {isMe && <span style={{ fontSize: 11, color: 'rgba(90,210,240,0.7)', marginLeft: 6 }}>(siz)</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                    {Array.from({ length: 5 }, (_, j) => (
                      <span key={j} style={{ color: j < entry.stars ? '#f8c98c' : 'rgba(255,255,255,0.15)', fontSize: 12 }}>
                        {j < entry.stars ? STAR : EMPTY_STAR}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    color: entry.pct >= 90 ? '#5ce0a8' : entry.pct >= 70 ? '#f8c98c' : '#94a3b8',
                    fontWeight: 800, fontSize: 16, fontFamily: "'Manrope',sans-serif",
                  }}>
                    {entry.pct}%
                  </div>
                  <div style={{ color: 'rgba(200,220,255,0.4)', fontSize: 11 }}>
                    {entry.correct}/{entry.total}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(200,220,255,0.3)', fontSize: 11, marginTop: 18, fontFamily: 'monospace' }}>
          Quiz tugatgandan so'ng natijangiz avtomatik saqlanadi
        </p>
      </div>
    </div>
  );
}

// ─── QuizPage ───────────────────────────────────────────────────────────
export default function QuizPage({ onBack }) {
  const quiz = useQuiz();

  // 3D model rotation (mouse drag)
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  const [showLB, setShowLB] = useState(false);

  // Current model based on active question
  const currentModel = React.useMemo(() => {
    if (!quiz.currentQ) return MODELS[0];
    return MODELS.find(m => m.id === quiz.currentQ.modelId) || MODELS[0];
  }, [quiz.currentQ]);

  // Mouse handlers for 3D rotation
  const onPointerDown = useCallback(e => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.style.cursor = 'grabbing';
  }, []);
  const onPointerMove = useCallback(e => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setRotation(r => ({ x: r.x + dy * 0.007, y: r.y - dx * 0.007 }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onPointerUp = useCallback(e => {
    isDragging.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
  }, []);

  // Reset rotation when model changes between questions
  React.useEffect(() => {
    setRotation({ x: 0, y: 0 });
  }, [currentModel?.id]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at 30% 40%, #081828 0%, #050d1a 100%)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        height: 54, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16, flexShrink: 0,
        borderBottom: '1px solid rgba(90,210,240,0.12)',
        background: 'rgba(4,14,36,0.6)', backdropFilter: 'blur(10px)',
      }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius:3, padding: '6px 14px', color: 'rgba(200,220,255,0.8)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
          }}>
          ← Explore
        </button>

        {/* Logo */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 18, fontWeight: 800, letterSpacing: '0.15em',
            color: '#5ad2f0', fontFamily: 'monospace',
            textShadow: '0 0 14px rgba(90,210,240,0.5)',
          }}>
            National AI Lab
          </span>
          <span style={{ color: 'rgba(90,210,240,0.35)', fontFamily: 'monospace', fontSize: 11 }}>
            / QUIZ
          </span>
        </div>

        {/* Hint */}
        <span style={{ color: 'rgba(200,220,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>
          🖱 3D ni suring
        </span>

        {/* Leaderboard button */}
        <button
          onClick={() => setShowLB(true)}
          style={{
            background: 'rgba(248,201,140,0.1)', border: '1px solid rgba(248,201,140,0.3)',
            borderRadius:3, padding: '6px 14px', color: '#f8c98c',
            fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          🏆 Reyting
        </button>
      </div>

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: 3D model */}
        <div
          style={{ flex: '0 0 60%', position: 'relative', cursor: 'grab', overflow: 'hidden' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <ModelScene
            modelCfg={currentModel}
            rotation={rotation}
            scale={1.0}
            highlightPart={quiz.phase === 'playing' ? (quiz.currentQ?.highlightMesh || null) : null}
            onPartHover={() => {}}
            onPartClick={() => {}}
            hoverLabel={null}
            explodeOpen={false}
            selectedMeshKey={null}
            meshRotation={{ x: 0, y: 0 }}
            pinchPoint={null}
          />

          {/* Overlay: model label */}
          <div style={{
            position: 'absolute', bottom: 20, left: 20,
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(90,210,240,0.2)',
            borderRadius:3, padding: '6px 14px',
            color: 'rgba(90,210,240,0.8)', fontFamily: 'monospace', fontSize: 12,
            pointerEvents: 'none',
          }}>
            {currentModel.icon} {currentModel.label}
          </div>

          {/* Quiz idle — motivator overlay */}
          {quiz.phase === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5,13,26,0.35)', pointerEvents: 'none',
            }}>
              <div style={{
                background: 'rgba(4,14,36,0.85)', border: '1px solid rgba(90,210,240,0.3)',
                borderRadius:3, padding: '20px 28px', textAlign: 'center',
              }}>
                <div style={{ color: 'rgba(90,210,240,0.7)', fontSize: 13, fontFamily: 'monospace' }}>
                  3D modelni mouse bilan aylantiring
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quiz Panel */}
        <div style={{ flex: '0 0 40%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <QuizPanel quiz={quiz} />
        </div>
      </div>

      {/* Leaderboard modal */}
      {showLB && (
        <LeaderboardModal
          onClose={() => setShowLB(false)}
          currentPct={quiz.phase === 'finished' ? quiz.pct : null}
        />
      )}
    </div>
  );
}
