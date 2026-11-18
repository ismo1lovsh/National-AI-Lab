import { useEffect, useRef } from 'react';

const CONN = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],[0,17],
];
const TIP = new Set([4, 8, 12, 16, 20]);

const GESTURE_LABELS = {
  POINT_ROTATE:   '☝️ 360° Aylantirish',
  LASER_SELECT:   '👌/🖖 Qism Tanlash',
  EXPLODE_TOGGLE: '✊ Ushlash / Ajratish',
  XRAY_TOGGLE:    '✌️ X-Ray Rejimi',
  OPEN_PALM:      '🖐 Ochiq kaft',
  ZOOM:           '🙌 Ikki qoʻl Zoom',
  IDLE:           '',
};

export default function CameraFeed({
  videoRef, landmarks, gesture, pinchNorm, isTracking,
  handsCount, fps, syncQuality = 100, fistArmed = false,
  xrayHoldMs = 0, error, status, tooFar, camOn = true, onToggleCamera,
  headYaw = 0, headAngleDeg = 0, headCenter = null,
  headLeftCheek = null, headRightCheek = null,
  headTracking = false, onRecenterHead,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 1. Bosh (Yuz) burun va yonoq nuqtalari hamda burilish yo'nalishi vektori
    if (headTracking && headCenter) {
      const nx = headCenter.x * W;
      const ny = headCenter.y * H;
      ctx.save();

      // Chap va o'ng yonoq chizig'i
      if (headLeftCheek && headRightCheek) {
        const lx = headLeftCheek.x * W, ly = headLeftCheek.y * H;
        const rx = headRightCheek.x * W, ry = headRightCheek.y * H;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Yuz doirasi
      ctx.strokeStyle = Math.abs(headYaw) > 0.08 ? '#10b981' : 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(nx, ny, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Burun uchi va yo'nalish strelkasi (O'ngga burilsa o'ngga, chapga burilsa chapga!)
      const arrowLen = headYaw * 42;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + arrowLen, ny);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(nx + arrowLen, ny, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (!landmarks?.length) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-W, 0);

    landmarks.forEach((hand, hi) => {
      if (!hand?.length) return;
      const primary = hi === 0;
      const lineCol = primary ? '#00e5ff' : '#00ff88';

      ctx.shadowColor = lineCol;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = primary ? 'rgba(0, 229, 255, 0.9)' : 'rgba(0, 255, 136, 0.9)';
      ctx.lineWidth = 2.0;

      CONN.forEach(([a, b]) => {
        if (!hand[a] || !hand[b]) return;
        ctx.beginPath();
        ctx.moveTo(hand[a].x * W, hand[a].y * H);
        ctx.lineTo(hand[b].x * W, hand[b].y * H);
        ctx.stroke();
      });

      hand.forEach((pt, i) => {
        if (!pt) return;
        const isTip = TIP.has(i);
        const isIndexTip = i === 8;
        ctx.beginPath();
        ctx.arc(pt.x * W, pt.y * H, isIndexTip ? 5.5 : isTip ? 4.0 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = isIndexTip
          ? '#00e5ff'
          : isTip
          ? '#38bdf8'
          : '#0284c7';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      });

      if (primary && gesture === 'POINT_ROTATE' && hand[8]) {
        const ix = hand[8].x * W;
        const iy = hand[8].y * H;
        ctx.beginPath();
        ctx.arc(ix, iy, 11, 0, Math.PI * 2);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [landmarks, pinchNorm, gesture, headYaw, headCenter, headLeftCheek, headRightCheek, headTracking]);

  const headDirLabel = headYaw < -0.07
    ? `◀ Chapga (${headAngleDeg}°)`
    : headYaw > 0.07
    ? `Oʻngga (${headAngleDeg > 0 ? '+' : ''}${headAngleDeg}°) ▶`
    : '● Markaz (0°)';

  return (
    <div style={{
      position: 'fixed',
      top: 66,
      right: 16,
      width: 256,
      height: 204,
      borderRadius: 10,
      overflow: 'hidden',
      border: `1.5px solid ${
        error
          ? '#fb7185'
          : fistArmed
          ? '#fbbf24'
          : (isTracking || headTracking)
          ? 'rgba(0, 229, 255, 0.65)'
          : 'rgba(56, 189, 248, 0.35)'
      }`,
      boxShadow: '0 14px 36px rgba(0, 0, 0, 0.65), 0 0 22px rgba(0, 229, 255, 0.14)',
      background: 'linear-gradient(180deg, rgba(6, 18, 38, 0.94) 0%, rgba(3, 10, 24, 0.96) 100%)',
      backdropFilter: 'blur(16px)',
      zIndex: 130,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Yuqori qator: Qo'l va Bosh Treking | ● Active */}
      <div style={{
        height: 28,
        padding: '0 10px',
        background: 'rgba(4, 14, 30, 0.92)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 700,
          color: '#e2f1ff',
        }}>
          Qoʻl va 3D Bosh Treking
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {onRecenterHead && (
            <button
              onClick={onRecenterHead}
              title="Boshning joriy holatini Markaz (0°) deb belgilash"
              style={{
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(250, 204, 21, 0.16)',
                border: '1px solid rgba(250, 204, 21, 0.45)',
                color: '#fde047',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🎯 0°
            </button>
          )}
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: (isTracking || headTracking) ? '#10b981' : '#f59e0b',
            boxShadow: (isTracking || headTracking) ? '0 0 8px #10b981' : 'none',
          }} />
          <span style={{
            fontSize: 10,
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            color: (isTracking || headTracking) ? '#10b981' : '#fbbf24',
          }}>
            {(isTracking || headTracking) ? 'Active' : status === 'off' ? 'Off' : 'Ready'}
          </span>
          {onToggleCamera && (
            <button
              onClick={onToggleCamera}
              title={camOn ? "Kamerani o'chirish [C]" : "Kamerani yoqish [C]"}
              style={{
                marginLeft: 2,
                width: 19,
                height: 19,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                color: '#bae6fd',
                fontSize: 9.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              {camOn ? '✕' : '▶'}
            </button>
          )}
        </div>
      </div>

      {/* Kamera tasviri + To'r + Skeleton */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#030917' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <canvas
          ref={canvasRef}
          width={256}
          height={146}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {isTracking && gesture && gesture !== 'IDLE' && (
          <div style={{
            position: 'absolute',
            top: 6,
            left: 8,
            background: 'rgba(3, 12, 28, 0.84)',
            border: '1px solid rgba(0, 229, 255, 0.45)',
            borderRadius: 5,
            padding: '2px 7px',
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#00e5ff',
            fontWeight: 700,
            pointerEvents: 'none',
          }}>
            {GESTURE_LABELS[gesture] || gesture}
          </div>
        )}

        {headTracking && (
          <div style={{
            position: 'absolute',
            top: 6,
            right: 8,
            background: 'rgba(3, 12, 28, 0.88)',
            border: `1px solid ${Math.abs(headYaw) > 0.07 ? '#10b981' : 'rgba(250, 204, 21, 0.5)'}`,
            borderRadius: 5,
            padding: '2px 7px',
            fontSize: 9,
            fontFamily: 'monospace',
            color: Math.abs(headYaw) > 0.07 ? '#6ee7b7' : '#fde047',
            fontWeight: 800,
            pointerEvents: 'none',
          }}>
            🙂 {headDirLabel}
          </div>
        )}

        {fistArmed && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            right: 8,
            background: 'rgba(245, 158, 11, 0.28)',
            border: '1px solid #fbbf24',
            borderRadius: 5,
            padding: '2px 8px',
            fontSize: 9.5,
            fontFamily: 'monospace',
            color: '#fef3c7',
            fontWeight: 700,
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            ✊ Kaftni oching → Ajratish
          </div>
        )}

        {status === 'off' && (
          <div
            onClick={onToggleCamera}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: 'rgba(3, 9, 22, 0.94)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 20 }}>📷</div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#bae6fd' }}>
              Kamera oʻchiq · [C]
            </div>
          </div>
        )}
      </div>

      {/* Pastki qator: FPS: 60 | Sifat: Yuqori */}
      <div style={{
        height: 28,
        background: 'rgba(3, 10, 24, 0.96)',
        borderTop: '1px solid rgba(0, 229, 255, 0.18)',
        padding: '0 11px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 10.5,
        fontFamily: "'Manrope', monospace",
      }}>
        <span style={{ color: '#e2f1ff', fontWeight: 700 }}>
          FPS: <b style={{ color: '#00e5ff' }}>{fps > 0 ? fps : 60}</b>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#bae6fd', fontSize: 10 }}>
            Sifat: <b style={{ color: '#10b981' }}>Yuqori</b>
          </span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 11 }}>
            {[4, 6, 8, 11].map((h, i) => (
              <div key={i} style={{ width: 2.5, height: h, borderRadius: 1, background: '#10b981' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}