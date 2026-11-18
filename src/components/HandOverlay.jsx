import { useRef, useEffect, useCallback } from 'react';

const HAND_CONN = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],[0,17],
];
const TIPS = new Set([4, 8, 12, 16, 20]);

export default function HandOverlay({
  landmarks,
  gesture,
  pinchHoldMs,
  hand1PinchMid,
  fistArmed,
  xrayHoldMs,
}) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mx = x => (1 - x) * W;
    const my = y => y * H;

    if (landmarks?.length) {
      landmarks.forEach((hand, hi) => {
        if (!hand?.length) return;
        const primary = hi === 0;
        const strokeCol = primary ? 'rgba(0, 229, 255, 0.55)' : 'rgba(0, 255, 136, 0.55)';

        ctx.save();
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1.5;
        HAND_CONN.forEach(([a, b]) => {
          if (!hand[a] || !hand[b]) return;
          ctx.beginPath();
          ctx.moveTo(mx(hand[a].x), my(hand[a].y));
          ctx.lineTo(mx(hand[b].x), my(hand[b].y));
          ctx.stroke();
        });

        hand.forEach((pt, i) => {
          if (!pt) return;
          const isTip = TIPS.has(i);
          ctx.beginPath();
          ctx.arc(mx(pt.x), my(pt.y), isTip ? 3.4 : 1.9, 0, Math.PI * 2);
          ctx.fillStyle = i === 8
            ? '#00e5ff'
            : isTip
            ? '#38bdf8'
            : 'rgba(56, 189, 248, 0.75)';
          ctx.fill();
        });

        // ── ☝️ Ko'rsatkich barmoq (+ musht) 360° Aylantirish Kursori ─────────
        if (primary && gesture === 'POINT_ROTATE' && hand[8]) {
          const ix = mx(hand[8].x);
          const iy = my(hand[8].y);

          ctx.beginPath();
          ctx.arc(ix, iy, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ix, iy, 26, 0, Math.PI * 2);
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = "700 11px 'Manrope', monospace";
          ctx.fillStyle = '#00e5ff';
          ctx.textAlign = 'center';
          ctx.fillText('☝️ 360° AYLANTIRISH', ix, iy - 32);
        }

        // ── ✊ Musht tayyorligi halqasi ───────────────────────────────────────
        if (primary && fistArmed && hand[9]) {
          const cx = mx(hand[9].x);
          const cy = my(hand[9].y);
          ctx.beginPath();
          ctx.arc(cx, cy, 34, 0, Math.PI * 2);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.font = "700 11px 'Manrope', monospace";
          ctx.fillStyle = '#fde68a';
          ctx.textAlign = 'center';
          ctx.fillText('✊ KAFTNI OCHING → AJRATISH', cx, cy - 42);
        }

        // ── ✌️ Rentgen (X-Ray) indikatori ────────────────────────────────────
        if (primary && gesture === 'XRAY_TOGGLE' && hand[8] && hand[12]) {
          const vx = (mx(hand[8].x) + mx(hand[12].x)) / 2;
          const vy = (my(hand[8].y) + my(hand[12].y)) / 2;
          const prog = Math.min(1, (xrayHoldMs || 0) / 420);

          ctx.beginPath();
          ctx.arc(vx, vy, 24, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
          ctx.lineWidth = 3;
          ctx.stroke();

          if (prog > 0) {
            ctx.beginPath();
            ctx.arc(vx, vy, 24, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          ctx.font = "700 11px 'Manrope', monospace";
          ctx.fillStyle = '#67e8f9';
          ctx.textAlign = 'center';
          ctx.fillText('✌️ X-RAY REJIMI', vx, vy - 32);
        }

        ctx.restore();
      });
    }

    // ── 👌 / 🖖 Qismni Tanlash (LASER_SELECT) Nishoni ─────────────────────────
    if (hand1PinchMid && pinchHoldMs > 0) {
      const px = mx(hand1PinchMid.x);
      const py = my(hand1PinchMid.y);
      const progress = Math.min(1, pinchHoldMs / 360);
      const isComplete = progress >= 1;

      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (progress > 0) {
        ctx.beginPath();
        ctx.arc(px, py, 22, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = isComplete ? '#00ff88' : '#c084fc';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px, py, isComplete ? 7 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isComplete ? '#00ff88' : '#c084fc';
      ctx.fill();

      ctx.font = "700 10.5px 'Manrope', monospace";
      ctx.fillStyle = '#e9d5ff';
      ctx.textAlign = 'center';
      ctx.fillText('👌/🖖 QISM TANLASH', px, py - 30);
    }
  }, [landmarks, gesture, pinchHoldMs, hand1PinchMid, fistArmed, xrayHoldMs]);

  const drawRef = useRef(draw);
  useEffect(() => { drawRef.current = draw; }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      drawRef.current?.();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
}