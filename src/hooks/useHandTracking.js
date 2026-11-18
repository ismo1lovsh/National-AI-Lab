import { useEffect, useRef, useState, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('HAND');

function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function remap01(v, from, to) { return clamp((v - from) / (to - from)); }
function expSmooth(prev, next, alpha) { return prev + (next - prev) * alpha; }
function dist2D(a, b) { if (!a || !b) return 0; return Math.hypot(a.x - b.x, a.y - b.y); }
function dist3D(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

// ─── 1-Euro Filter (Titroqsiz va kechikishsiz kursor va bosh filtri) ─────────
class OneEuroFilter {
  constructor(minCutoff = 1.45, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
  alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / Math.max(dt, 0.001));
  }
  filter(x, tMs) {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = tMs;
      return x;
    }
    const dt = Math.max(0.004, Math.min(0.1, (tMs - this.tPrev) / 1000));
    this.tPrev = tMs;
    const dx = (x - this.xPrev) / dt;
    const edx = this.dxPrev + this.alpha(this.dCutoff, dt) * (dx - this.dxPrev);
    this.dxPrev = edx;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const out = this.xPrev + this.alpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = out;
    return out;
  }
}

const PINCH_CLOSED  = 0.09;
const PINCH_OPEN    = 0.95;
const PINCH_THRESH  = 0.34;
const MIN_HAND_SIZE = 0.045;
const CONFIRM       = 2;

function handSize(lm) {
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of lm) {
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return Math.hypot(maxX - minX, maxY - minY);
}

function fingerStraightness(lm, mcp, pip, dip, tip) {
  if (!lm[mcp] || !lm[pip] || !lm[dip] || !lm[tip]) return 0;
  const seg1 = dist3D(lm[mcp], lm[pip]);
  const seg2 = dist3D(lm[pip], lm[dip]);
  const seg3 = dist3D(lm[dip], lm[tip]);
  const totalBone = seg1 + seg2 + seg3;
  if (totalBone < 1e-4) return 0;
  return dist3D(lm[mcp], lm[tip]) / totalBone;
}

function analyzeHand(lm) {
  if (!lm || lm.length < 21) return null;

  const wrist0 = lm[0];
  const handSpan = Math.max(0.04, dist2D(wrist0, lm[9]));

  const palmCenter = {
    x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
    y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5,
  };

  const rawPinch   = dist3D(lm[4], lm[8]);
  const pinchNorm  = remap01(rawPinch / handSpan, PINCH_CLOSED, PINCH_OPEN);
  const pinchClose = pinchNorm < PINCH_THRESH;

  const idxStr  = fingerStraightness(lm, 5, 6, 7, 8);
  const midStr  = fingerStraightness(lm, 9, 10, 11, 12);
  const ringStr = fingerStraightness(lm, 13, 14, 15, 16);
  const pinkStr = fingerStraightness(lm, 17, 18, 19, 20);

  const isExtended = (mcp, pip, tip, str) => {
    const dTipPalm  = dist2D(lm[tip], palmCenter);
    const dPipPalm  = dist2D(lm[pip], palmCenter);
    const dTipWrist = dist2D(lm[tip], wrist0);
    const dPipWrist = dist2D(lm[pip], wrist0);
    return str > 0.70 && dTipPalm > dPipPalm * 1.08 && dTipWrist > dPipWrist * 1.04;
  };

  const isClosedInFist = (mcp, pip, tip, str) => {
    const dTipPalm  = dist2D(lm[tip], palmCenter);
    const dPipPalm  = dist2D(lm[pip], palmCenter);
    const dTipWrist = dist2D(lm[tip], wrist0);
    const dPipWrist = dist2D(lm[pip], wrist0);
    return str < 0.78 || dTipPalm < dPipPalm * 1.15 || dTipWrist < dPipWrist * 1.12;
  };

  const idx  = isExtended(5, 6, 8, idxStr);
  const mid  = isExtended(9, 10, 12, midStr);
  const ring = isExtended(13, 14, 16, ringStr);
  const pink = isExtended(17, 18, 20, pinkStr);
  const extCount = [idx, mid, ring, pink].filter(Boolean).length;

  const idxCurled  = isClosedInFist(5, 6, 8, idxStr);
  const midCurled  = isClosedInFist(9, 10, 12, midStr);
  const ringCurled = isClosedInFist(13, 14, 16, ringStr);
  const pinkCurled = isClosedInFist(17, 18, 20, pinkStr);
  const curledCount = [idxCurled, midCurled, ringCurled, pinkCurled].filter(Boolean).length;

  const avgTipToPalm = (
    dist2D(lm[8], palmCenter) +
    dist2D(lm[12], palmCenter) +
    dist2D(lm[16], palmCenter) +
    dist2D(lm[20], palmCenter)
  ) / 4;
  const compactness = avgTipToPalm / handSpan;

  const isFist = Boolean(!idx && !mid && !ring && !pink && (curledCount >= 3 || compactness < 1.12));
  const isPunchHoldCandidate = Boolean(
    isFist ||
    (curledCount >= 3 && compactness < 1.18) ||
    pinchNorm < 0.42
  );

  const isOpen = Boolean(!isFist && extCount >= 4 && compactness > 1.02);

  const indexLongerThanOthers = dist2D(lm[8], palmCenter) > Math.max(
    dist2D(lm[12], palmCenter),
    dist2D(lm[16], palmCenter),
    dist2D(lm[20], palmCenter)
  ) * 1.08;

  const isIndexOnly = Boolean(
    idx &&
    !mid && !ring && !pink &&
    indexLongerThanOthers
  );

  const isOkGesture = Boolean(pinchClose && (mid || ring) && !isFist && !isIndexOnly);
  const isThreeFingerSelect = Boolean(!pinchClose && idx && mid && ring && !pink);
  const isSelectGesture = Boolean(isOkGesture || isThreeFingerSelect);

  const selectCursor = isOkGesture
    ? { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 }
    : { x: lm[12].x, y: lm[12].y };

  const vSpread = dist2D(lm[8], lm[12]) > handSpan * 0.16;
  const isPeaceXray = Boolean(
    !isFist && !isIndexOnly && idx && mid && !ring && !pink && vSpread
  );

  return {
    isPinch: isSelectGesture,
    isSelectGesture,
    isOkGesture,
    isThreeFingerSelect,
    pinchNorm,
    isOpen,
    isIndexOnly,
    isFist,
    isPunchHoldCandidate,
    isPeaceXray,
    idx, mid, ring, pink, extCount,
    compactness,
    handSpan,
    wrist: lm[0],
    palmCenter,
    pinchMid: selectCursor,
    indexTip: lm[8],
    rawPinchDist: rawPinch,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MEDIAPIPE FACEMESH 468-NUQTALI HAQIQIY 3D BOSH BURILISHI (YAW & PITCH)
// ═══════════════════════════════════════════════════════════════════════════════
// Bosh joyida turib o'ngga yoki chapga burilganda:
//   • Burun uchi: lm[1] (yoki lm[4])
//   • Chap va o'ng yonoq chetlari: lm[234] va lm[454]
//   • Ko'z tashqi burchaklari: lm[33] va lm[263]
//   • Peshona va iyak: lm[10] va lm[152]
// Oyna (mirrored) koordinatalarida: mx = 1 - p.x
// Foydalanuvchi boshini O'NGGA bursa -> burun uchi (noseMX) yonoqlar markazidan O'NGGA (+X) siljiydi!
// Foydalanuvchi boshini CHAPGA bursa -> burun uchi (noseMX) yonoqlar markazidan CHAPGA (-X) siljiydi!
function analyzeFaceMeshHeadPose(faceLm) {
  if (!faceLm || faceLm.length < 455) return null;

  const nose      = faceLm[1] || faceLm[4];
  const cheekA    = faceLm[234];
  const cheekB    = faceLm[454];
  const eyeA      = faceLm[33];
  const eyeB      = faceLm[263];
  const forehead  = faceLm[10];
  const chin      = faceLm[152];

  if (!nose || !cheekA || !cheekB || !eyeA || !eyeB) return null;

  // Oyna (ekrandagi) gorizontal koordinatalar (0 = Chap, 1 = O'ng)
  const noseMX   = 1.0 - nose.x;
  const noseY    = nose.y;
  const cheek1MX = 1.0 - cheekA.x;
  const cheek2MX = 1.0 - cheekB.x;
  const eye1MX   = 1.0 - eyeA.x;
  const eye2MX   = 1.0 - eyeB.x;

  const leftCheekMX  = Math.min(cheek1MX, cheek2MX);
  const rightCheekMX = Math.max(cheek1MX, cheek2MX);
  const faceWidth    = Math.max(0.035, rightCheekMX - leftCheekMX);
  const cheekMidMX   = 0.5 * (leftCheekMX + rightCheekMX);

  const leftEyeMX    = Math.min(eye1MX, eye2MX);
  const rightEyeMX   = Math.max(eye1MX, eye2MX);
  const eyeMidMX     = 0.5 * (leftEyeMX + rightEyeMX);

  // 1) Burun uchining yonoqlar o'rtasiga nisbatan siljishi (eng sezgir 3D Yaw ko'rsatkichi!)
  //    Bosh o'ngga burilganda noseMX > cheekMidMX -> musbat (+)
  //    Bosh chapga burilganda noseMX < cheekMidMX -> manfiy (-)
  const noseCheekAsym = (noseMX - cheekMidMX) / (faceWidth * 0.5);

  // 2) Burun uchining ko'zlar o'rtasiga nisbatan siljishi
  const noseEyeAsym = (noseMX - eyeMidMX) / (faceWidth * 0.42);

  // 3) 3D Z-chuqurlik farqi (agar FaceMesh z qiymatlari mavjud bo'lsa)
  //    O'ng yonoq uzoqlashib, chap yonoq kameraga yaqinlashadi
  const leftCheekZ  = cheek1MX < cheek2MX ? (cheekA.z || 0) : (cheekB.z || 0);
  const rightCheekZ = cheek1MX < cheek2MX ? (cheekB.z || 0) : (cheekA.z || 0);
  const zYaw = (rightCheekZ - leftCheekZ) * 4.5;

  // Umumiy Yaw (-1.0 chap .. +1.0 o'ng).
  // DIQQAT: boshning kadrdagi joylashuvi (gavda siljishi) YAW ga QOʻSHILMAYDI —
  // aks holda qoʻlni uzatib gavda siljiganda kamera oʻz-oʻzidan burilib ketardi.
  const rawYaw = clamp(
    noseCheekAsym * 1.35 + noseEyeAsym * 0.55 + zYaw * 0.30,
    -1.0,
    1.0
  );

  // Vertikal Pitch (tepaga / pastga qarash).
  // Burun uchi koʻz chizigʻi va iyak orasida qayerda turishiga qarab oʻlchanadi:
  //   tepaga qaraganda burun koʻzga yaqinlashadi (ratio kamayadi)  -> pitch > 0
  //   pastga qaraganda burun iyakka yaqinlashadi (ratio ortadi)     -> pitch < 0
  let rawPitch = 0;
  if (chin) {
    const eyeY = 0.5 * (eyeA.y + eyeB.y);
    const span = Math.max(0.04, chin.y - eyeY);
    const ratio = (noseY - eyeY) / span;           // odatda ~0.45–0.55
    rawPitch = clamp((0.5 - ratio) * 5.0, -1.0, 1.0);
  }
  // Yuz qoʻl bilan toʻsilgan-toʻsilmaganini aniqlash uchun yuz oynasi (bbox)
  const faceBox = {
    minX: Math.min(cheek1MX, cheek2MX),
    maxX: Math.max(cheek1MX, cheek2MX),
    minY: forehead ? forehead.y : noseY - 0.1,
    maxY: chin ? chin.y : noseY + 0.1,
  };

  return {
    yaw: rawYaw,
    pitch: rawPitch,
    nose: { x: noseMX, y: noseY },
    leftCheek: { x: leftCheekMX, y: cheek1MX < cheek2MX ? cheekA.y : cheekB.y },
    rightCheek: { x: rightCheekMX, y: cheek1MX < cheek2MX ? cheekB.y : cheekA.y },
    eyeMid: { x: eyeMidMX, y: 0.5 * (eyeA.y + eyeB.y) },
    faceBox,
  };
}

// Qoʻl yuzni qanchalik yopayotganini (0..1) hisoblaydi. Hands landmarklari xom (oynalanmagan)
// koordinatada, faceBox esa oynalangan (mirror) koordinatada — shuning uchun x ni aylantiramiz.
function handFaceOverlap(handsLm, faceBox) {
  if (!handsLm?.length || !faceBox) return 0;
  const faceArea = Math.max(1e-4, (faceBox.maxX - faceBox.minX) * (faceBox.maxY - faceBox.minY));
  let best = 0;
  for (const lm of handsLm) {
    if (!lm?.length) continue;
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of lm) {
      const mx = 1 - p.x;
      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const ix = Math.max(0, Math.min(maxX, faceBox.maxX) - Math.max(minX, faceBox.minX));
    const iy = Math.max(0, Math.min(maxY, faceBox.maxY) - Math.max(minY, faceBox.minY));
    best = Math.max(best, (ix * iy) / faceArea);
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ZAHIRA: LUCAS-KANADE OPTIK OQIM + YUZ SIMMETRIYASI TREKERI
//    (FaceMesh yuklanayotgan paytda yoki offline rejimda ham 100% ishlaydi!)
// ═══════════════════════════════════════════════════════════════════════════════
function estimateOpticalHeadYaw(video, handLandmarks, stateObj) {
  if (!video || video.readyState < 2 || !video.videoWidth) return null;
  const W = 80, H = 60;
  if (!stateObj.canvas) {
    stateObj.canvas = document.createElement('canvas');
    stateObj.canvas.width = W;
    stateObj.canvas.height = H;
    stateObj.ctx = stateObj.canvas.getContext('2d', { willReadFrequently: true });
    stateObj.prevGray = null;
    stateObj.accumYaw = 0;
  }

  const { ctx } = stateObj;
  ctx.drawImage(video, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  const gray = new Float32Array(W * H);

  // Qo'l sohalarini maskalash
  const handBoxes = (handLandmarks || []).map(lm => {
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const p of lm) {
      if (!p) continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX - 0.08, maxX: maxX + 0.08, minY: minY - 0.08, maxY: maxY + 0.08 };
  });

  let sumSkinX = 0, sumSkinY = 0, sumSkinW = 0;

  for (let y = 0; y < H; y++) {
    const ny = y / H;
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[y * W + x] = luma;

      if (ny >= 0.08 && ny <= 0.72 && x >= W * 0.12 && x <= W * 0.88) {
        const nx = x / W;
        let inHand = false;
        for (const hb of handBoxes) {
          if (nx >= hb.minX && nx <= hb.maxX && ny >= hb.minY && ny <= hb.maxY) {
            inHand = true;
            break;
          }
        }
        if (!inHand) {
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          if (luma > 35 && luma < 245 && cb >= 75 && cb <= 130 && cr >= 132 && cr <= 178) {
            // Markazga yaqin teri piksellariga yuqori vazn beramiz (orqa fon devorlarini kesish uchun)
            const distCenter = Math.hypot(nx - 0.5, ny - 0.36);
            if (distCenter < 0.36) {
              const w = Math.max(0.1, 1.0 - distCenter * 2.2);
              sumSkinX += (1.0 - nx) * w; // mirrored X
              sumSkinY += ny * w;
              sumSkinW += w;
            }
          }
        }
      }
    }
  }

  const cx = sumSkinW > 8 ? sumSkinX / sumSkinW : 0.5;
  const cy = sumSkinW > 8 ? sumSkinY / sumSkinW : 0.36;

  // Lucas-Kanade 1D gorizontal optik oqim (ko'z, qosh, burun qirralari harakati)
  let flowVx = 0;
  if (stateObj.prevGray) {
    let num = 0, den = 0;
    const x0 = Math.max(2, Math.floor((1.0 - cx - 0.20) * W));
    const x1 = Math.min(W - 3, Math.ceil((1.0 - cx + 0.20) * W));
    const y0 = Math.max(2, Math.floor((cy - 0.18) * H));
    const y1 = Math.min(H - 3, Math.ceil((cy + 0.18) * H));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const ix = (gray[i + 1] - gray[i - 1]) * 0.5;
        if (Math.abs(ix) < 6) continue; // faqat aniq konturlar (ko'z, burun, qosh)
        const it = gray[i] - stateObj.prevGray[i];
        num += (-ix * it);
        den += ix * ix;
      }
    }
    if (den > 250) {
      // Kamera tasviri teskari bo'lgani uchun: -num / den = mirrored yo'nalishdagi siljish!
      const rawStep = -(num / den);
      if (Math.abs(rawStep) > 0.04 && Math.abs(rawStep) < 3.5) {
        flowVx = rawStep;
      }
    }
  }
  stateObj.prevGray = gray;

  // Optik oqimni integrallaymiz va pozitsiya bilan uyg'unlashtiramiz
  const posYaw = clamp((cx - 0.5) * 3.8, -1.0, 1.0);
  stateObj.accumYaw = clamp(stateObj.accumYaw * 0.94 + flowVx * 0.22 + (posYaw - stateObj.accumYaw) * 0.18, -1.0, 1.0);

  return {
    yaw: stateObj.accumYaw,
    pitch: 0, // optik zahira vertikalni ishonchli oʻlchay olmaydi — drift boʻlmasligi uchun 0
    nose: { x: cx + stateObj.accumYaw * 0.06, y: cy },
    leftCheek: { x: cx - 0.08, y: cy },
    rightCheek: { x: cx + 0.08, y: cy },
    eyeMid: { x: cx, y: cy - 0.03 },
  };
}

export default function useHandTracking(videoRef, enabled = true) {
  const handsRef         = useRef(null);
  const faceMeshRef      = useRef(null);
  const rafRef           = useRef(null);
  const mountedRef       = useRef(true);
  const streamRef        = useRef(null);
  const inFlightRef      = useRef(false);
  const faceInFlightRef  = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const frameCounterRef  = useRef(0);
  const opticalStateRef  = useRef({});
  const latestHandsRef   = useRef([]);

  // Foydalanuvchi boshining boshlang'ich "Markaz" (0°) kalibrlash nuqtasi
  const headZeroOffsetRef = useRef({ yaw: 0, pitch: 0, calibrated: false, samples: [] });
  const lastFaceMeshAtRef = useRef(0);
  const noHandStateAtRef = useRef(0);
  const lastSingleSideRef = useRef({ side: null, at: 0, x: 0, y: 0 });

  const filtersRef = useRef({
    palmX:     new OneEuroFilter(1.6, 0.06),
    palmY:     new OneEuroFilter(1.6, 0.06),
    idxX:      new OneEuroFilter(1.7, 0.07),
    idxY:      new OneEuroFilter(1.7, 0.07),
    selX:      new OneEuroFilter(1.6, 0.06),
    selY:      new OneEuroFilter(1.6, 0.06),
    headYaw:   new OneEuroFilter(1.35, 0.055),
    headPitch: new OneEuroFilter(1.25, 0.045),
    lm: Array.from({ length: 2 }, () =>
      Array.from({ length: 21 }, () => ({
        x: new OneEuroFilter(2.1, 0.085),
        y: new OneEuroFilter(2.1, 0.085),
        z: new OneEuroFilter(1.4, 0.05),
      }))
    ),
  });

  const sm        = useRef({ h1Pinch: 1.0, h2Pinch: 1.0 });
  const buf       = useRef({ name: 'IDLE', count: 0 });
  const fpsRef    = useRef({ n: 0, last: performance.now(), val: 60 });
  const prevH2Raw = useRef(null);

  const headStateRef = useRef({
    yaw: 0,
    pitch: 0,
    rawYaw: 0,
    rawPitch: 0,
    angleDeg: 0,
    centerX: 0.5,
    centerY: 0.38,
    leftCheek: { x: 0.42, y: 0.38 },
    rightCheek: { x: 0.58, y: 0.38 },
    active: false,
    updatedAt: 0,
    mode: 'ready',
  });

  const fistStateRef = useRef({
    armed: false,
    armedAt: 0,
    fistFrames: 0,
    minCompactness: 1.0,
    lastExplodeAt: 0,
  });
  const explodeTickRef = useRef(0);

  const xrayStateRef = useRef({
    startAt: 0,
    fired: false,
    lastToggleAt: 0,
  });
  const xrayTickRef = useRef(0);

  const recenterHead = useCallback(() => {
    headZeroOffsetRef.current = {
      yaw: headStateRef.current.rawYaw || 0,
      pitch: headStateRef.current.rawPitch || 0,
      calibrated: true,
      samples: [],
    };
    if (opticalStateRef.current) {
      opticalStateRef.current.accumYaw = 0;
    }
    filtersRef.current.headYaw.reset();
    filtersRef.current.headPitch.reset();
    headStateRef.current.yaw = 0;
    headStateRef.current.pitch = 0;
    headStateRef.current.angleDeg = 0;
    setState(s => ({ ...s, headYaw: 0, headPitch: 0, headAngleDeg: 0 }));
  }, []);

  const [state, setState] = useState({
    hand1: null,
    hand2: null,
    gesture: 'IDLE',
    h1PalmCenter: { x: 0.5, y: 0.5 },
    h1IndexCenter: { x: 0.5, y: 0.5 },
    h1PinchNorm: 1.0,
    h2PinchNorm: 1.0,
    h1PinchMid: null,
    zoomDelta: 0,
    landmarks: null,
    scalpelHand: null,
    isTracking: false,
    handsCount: 0,
    fps: 0,
    syncQuality: 100,
    error: null,
    status: 'idle',
    tooFar: false,
    fistArmed: false,
    isPunchGrab: false,
    xrayHoldMs: 0,
    explodeTick: 0,
    xrayTick: 0,
    headYaw: 0,
    headPitch: 0,
    headAngleDeg: 0,
    headCenter: { x: 0.5, y: 0.38 },
    headLeftCheek: { x: 0.42, y: 0.38 },
    headRightCheek: { x: 0.58, y: 0.38 },
    headTracking: false,
    recenterHead: () => {},
  });

  const applyHeadPoseEstimate = useCallback((pose, modeLabel, now) => {
    if (!pose) return;
    const zCal = headZeroOffsetRef.current;
    if (!zCal.calibrated) {
      zCal.samples.push({ yaw: pose.yaw, pitch: pose.pitch });
      if (zCal.samples.length >= 8) {
        const avgYaw = zCal.samples.reduce((a, b) => a + b.yaw, 0) / zCal.samples.length;
        const avgPitch = zCal.samples.reduce((a, b) => a + b.pitch, 0) / zCal.samples.length;
        // Agar foydalanuvchi o'rtada o'tirgan bo'lsa avto-kalibrlaymiz
        if (Math.abs(avgYaw) < 0.35) {
          zCal.yaw = avgYaw;
          zCal.pitch = avgPitch;
        }
        zCal.calibrated = true;
      }
    }

    // Bitta kadrda keskin sakrashni (FaceMesh xatosi / qoʻl yuzdan oʻtishi) cheklaymiz
    const hs = headStateRef.current;
    const MAX_STEP = 0.22;
    const stepYaw = clamp(pose.yaw - (hs.rawYaw || 0), -MAX_STEP, MAX_STEP);
    const stepPitch = clamp(pose.pitch - (hs.rawPitch || 0), -MAX_STEP, MAX_STEP);
    const limYaw = hs.active ? (hs.rawYaw || 0) + stepYaw : pose.yaw;
    const limPitch = hs.active ? (hs.rawPitch || 0) + stepPitch : pose.pitch;

    const calYaw = clamp((limYaw - zCal.yaw) * 1.15, -1.0, 1.0);
    const calPitch = clamp((limPitch - zCal.pitch) * 1.0, -1.0, 1.0);

    const syaw = filtersRef.current.headYaw.filter(calYaw, now);
    const spitch = filtersRef.current.headPitch.filter(calPitch, now);

    // Yumshoq oʻlik zona: kichik titroq yoʻqoladi, lekin 0 dan keyin sakrash boʻlmaydi
    const soft = (v, dz) => {
      const a = Math.abs(v);
      return a <= dz ? 0 : Math.sign(v) * (a - dz) / (1 - dz);
    };
    const cleanYaw = clamp(soft(syaw, 0.06), -1.0, 1.0);
    const cleanPitch = clamp(soft(spitch, 0.07), -1.0, 1.0);

    headStateRef.current = {
      yaw: cleanYaw,
      pitch: cleanPitch,
      rawYaw: limYaw,
      rawPitch: limPitch,
      angleDeg: Math.round(cleanYaw * 50),
      centerX: pose.nose.x,
      centerY: pose.nose.y,
      leftCheek: pose.leftCheek,
      rightCheek: pose.rightCheek,
      active: true,
      updatedAt: now,
      mode: modeLabel,
    };
  }, []);

  const onFaceResults = useCallback((results) => {
    if (!mountedRef.current) return;
    const faces = results?.multiFaceLandmarks;
    if (faces && faces.length > 0 && faces[0].length >= 455) {
      const now = performance.now();
      lastFaceMeshAtRef.current = now;
      const pose = analyzeFaceMeshHeadPose(faces[0]);
      if (pose) {
        // Qoʻl yuzni yopib turgan paytda FaceMesh ishonchsiz — oxirgi yaxshi qiymat saqlanadi
        if (handFaceOverlap(latestHandsRef.current, pose.faceBox) > 0.18) return;
        applyHeadPoseEstimate(pose, 'facemesh', now);
      }
    }
  }, [applyHeadPoseEstimate]);

  const onResults = useCallback((results) => {
    if (!mountedRef.current) return;
    const now = performance.now();
    fpsRef.current.n++;
    if (now - fpsRef.current.last >= 1000) {
      fpsRef.current.val = Math.round((fpsRef.current.n * 1000) / (now - fpsRef.current.last));
      fpsRef.current.n = 0;
      fpsRef.current.last = now;
    }

    const detected = results.multiHandLandmarks || [];
    latestHandsRef.current = detected;

    // Agar FaceMesh hali kadr qaytarmagan bo'lsa (yoki 250ms dan oshgan bo'lsa),
    // Lucas-Kanade optik oqim trekeri darhol bosh burilishini hisoblab turadi!
    if (videoRef?.current && !faceMeshRef.current && (now - lastFaceMeshAtRef.current > 220)) {
      const optPose = estimateOpticalHeadYaw(videoRef.current, detected, opticalStateRef.current);
      if (optPose) {
        applyHeadPoseEstimate(optPose, 'optical', now);
      }
    }

    const handedness = results.multiHandedness || [];
    const ranked = detected
      .map((lm, i) => ({ lm, label: handedness[i]?.label || handedness[i]?.categoryName || null }))
      .filter(h => h.lm && h.lm.length >= 21)
      .map(h => ({ ...h, size: handSize(h.lm) }))
      .sort((a, b) => b.size - a.size);

    const validHands = ranked.filter(h => h.size >= MIN_HAND_SIZE).slice(0, 2);

    // ── CHAP / O'NG QO'LNI ANIQLASH ────────────────────────────────────────
    // Kamera kadri oynalanmagan: foydalanuvchining O'NG qo'li kadrning CHAP tomonida (kichik x) ko'rinadi.
    //  • 2 ta qo'l: bilak x bo'yicha ajratiladi (eng ishonchli).
    //  • 1 ta qo'l: MediaPipe belgisi (oynalanmagan kadrda belgi teskari) yoki joylashuvi.
    if (validHands.length === 2) {
      const [a, b] = validHands;
      const aIsRight = a.lm[0].x <= b.lm[0].x;
      a.side = aIsRight ? 'R' : 'L';
      b.side = aIsRight ? 'L' : 'R';
    } else if (validHands.length === 1) {
      const h = validHands[0];
      let side = h.label === 'Left' ? 'R' : h.label === 'Right' ? 'L' : (h.lm[0].x < 0.5 ? 'R' : 'L');
      // Qo'l bir xil joyda uzluksiz kuzatilayotgan bo'lsa, tomon o'zgarib ketmasin (belgi miltillashiga qarshi)
      const prev = lastSingleSideRef.current;
      if (prev.side && now - prev.at < 400 && Math.hypot(h.lm[0].x - prev.x, h.lm[0].y - prev.y) < 0.12) {
        side = prev.side;
      }
      lastSingleSideRef.current = { side, at: now, x: h.lm[0].x, y: h.lm[0].y };
      h.side = side;
    }
    // O'ng qo'l birinchi (slot 0), chap qo'l ikkinchi (slot 1) — tartib barqaror qoladi
    validHands.sort((a, b) => (a.side === 'R' ? 0 : 1) - (b.side === 'R' ? 0 : 1));
    const farOnly = validHands.length === 0 && ranked.length > 0;

    if (!validHands.length) {
      buf.current = { name: 'IDLE', count: 0 };
      prevH2Raw.current = null;
      filtersRef.current.palmX.reset();
      filtersRef.current.palmY.reset();
      filtersRef.current.idxX.reset();
      filtersRef.current.idxY.reset();
      filtersRef.current.selX.reset();
      filtersRef.current.selY.reset();
      // Qoʻl yoʻq paytda har kadrda React re-render qilmaymiz (~30 Hz yetarli) — qotishni kamaytiradi
      if (now - (noHandStateAtRef.current || 0) < 33) return;
      noHandStateAtRef.current = now;
      setState(s => ({
        ...s,
        landmarks: null,
        handSides: [],
        gesture: 'IDLE',
        hand1: null,
        hand2: null,
        isTracking: false,
        handsCount: 0,
        fps: fpsRef.current.val,
        zoomDelta: 0,
        h1PinchMid: null,
        fistArmed: false,
        isPunchGrab: false,
        xrayHoldMs: 0,
        tooFar: farOnly,
        headYaw: headStateRef.current.yaw,
        headPitch: headStateRef.current.pitch,
        headAngleDeg: headStateRef.current.angleDeg,
        headCenter: { x: headStateRef.current.centerX, y: headStateRef.current.centerY },
        headLeftCheek: headStateRef.current.leftCheek,
        headRightCheek: headStateRef.current.rightCheek,
        headTracking: headStateRef.current.active && (now - (headStateRef.current.updatedAt || 0) < 600),
        recenterHead,
      }));
      return;
    }

    const lms = validHands.map((h) => {
      const fArr = filtersRef.current.lm[h.side === 'R' ? 0 : 1];
      return h.lm.map((pt, pi) => ({
        x: fArr[pi].x.filter(pt.x, now),
        y: fArr[pi].y.filter(pt.y, now),
        z: fArr[pi].z.filter(pt.z || 0, now),
      }));
    });

    const h1 = analyzeHand(lms[0]);
    const h2 = lms.length >= 2 ? analyzeHand(lms[1]) : null;
    if (!h1) return;

    const smoothPalmX = filtersRef.current.palmX.filter(h1.palmCenter.x, now);
    const smoothPalmY = filtersRef.current.palmY.filter(h1.palmCenter.y, now);
    const smoothIdxX  = filtersRef.current.idxX.filter(h1.indexTip.x, now);
    const smoothIdxY  = filtersRef.current.idxY.filter(h1.indexTip.y, now);
    const smoothSelX  = filtersRef.current.selX.filter(h1.pinchMid.x, now);
    const smoothSelY  = filtersRef.current.selY.filter(h1.pinchMid.y, now);

    sm.current.h1Pinch = expSmooth(sm.current.h1Pinch, h1.pinchNorm, 0.62);

    let zoomDelta = 0;
    if (h2) {
      sm.current.h2Pinch = expSmooth(sm.current.h2Pinch, h2.pinchNorm, 0.62);
      const span = dist2D(h1.palmCenter, h2.palmCenter);
      const prev = prevH2Raw.current;
      const smoothed = prev === null ? span : expSmooth(prev, span, 0.50);
      if (prev !== null) {
        const d = smoothed - prev;
        if (Math.abs(d) > 0.001) zoomDelta = d * 5.5;
      }
      prevH2Raw.current = smoothed;
    } else {
      prevH2Raw.current = null;
      sm.current.h2Pinch = 1.0;
    }

    const fs = fistStateRef.current;
    if (h1.isFist && !h2) {
      fs.fistFrames += 1;
      fs.minCompactness = Math.min(fs.minCompactness, h1.compactness);
      if (fs.fistFrames >= 2) {
        fs.armed = true;
        fs.armedAt = now;
      }
    } else {
      fs.fistFrames = 0;
      if (fs.armed) {
        const elapsed = now - fs.armedAt;
        const cooldownOk = now - fs.lastExplodeAt > 650;
        const handOpened = !h2 && (
          h1.isOpen ||
          (h1.extCount >= 3 && h1.compactness > Math.max(1.02, fs.minCompactness * 1.22))
        );
        if (elapsed <= 2500 && handOpened && cooldownOk) {
          fs.armed = false;
          fs.minCompactness = 1.0;
          fs.lastExplodeAt = now;
          explodeTickRef.current += 1;
          log.info('✊→🖐 QISMLARGA AJRATISH / YIGʻISH');
        } else if (elapsed > 2500) {
          fs.armed = false;
          fs.minCompactness = 1.0;
        }
      }
    }

    let raw = 'IDLE';
    if (h2) {
      raw = 'ZOOM';
    } else if (h1.isIndexOnly) {
      raw = 'POINT_ROTATE';
    } else if (h1.isFist) {
      raw = 'EXPLODE_TOGGLE';
    } else if (h1.isSelectGesture) {
      raw = 'LASER_SELECT';
    } else if (h1.isPeaceXray) {
      raw = 'XRAY_TOGGLE';
    } else if (h1.isOpen) {
      raw = 'OPEN_PALM';
    }

    if (raw === buf.current.name) {
      buf.current.count = Math.min(buf.current.count + 1, CONFIRM + 12);
    } else {
      buf.current = { name: raw, count: 1 };
    }

    const confirmed = (raw === 'ZOOM' || raw === 'POINT_ROTATE' || raw === 'EXPLODE_TOGGLE')
      ? raw
      : (buf.current.count >= CONFIRM ? buf.current.name : 'IDLE');

    let xrayHoldMs = 0;
    const xs = xrayStateRef.current;
    if (confirmed === 'XRAY_TOGGLE' && !h2) {
      if (!xs.startAt) {
        xs.startAt = now;
        xs.fired = false;
      }
      xrayHoldMs = now - xs.startAt;
      if (xrayHoldMs >= 380 && !xs.fired && (now - xs.lastToggleAt > 700)) {
        xs.fired = true;
        xs.lastToggleAt = now;
        xrayTickRef.current += 1;
        log.info('✌️ X-RAY REJIMI ALMASHTIRILDI');
      }
    } else {
      xs.startAt = 0;
      xs.fired = false;
    }

    const syncQuality = clamp(Math.round(96 + Math.min(4, validHands[0].size * 16)), 96, 100);

    setState({
      hand1: h1,
      hand2: h2,
      handsCount: lms.length,
      gesture: confirmed,
      h1PalmCenter: { x: smoothPalmX, y: smoothPalmY },
      h1IndexCenter: { x: smoothIdxX, y: smoothIdxY },
      h1PinchNorm: sm.current.h1Pinch,
      h2PinchNorm: sm.current.h2Pinch,
      h1PinchMid: { x: smoothSelX, y: smoothSelY },
      zoomDelta,
      landmarks: lms,
      handSides: validHands.map(h => h.side),
      scalpelHand: null,
      isTracking: true,
      fps: fpsRef.current.val,
      syncQuality,
      error: null,
      status: 'active',
      tooFar: false,
      fistArmed: fs.armed,
      isPunchGrab: Boolean(h1.isFist || h1.isPunchHoldCandidate || sm.current.h1Pinch < 0.42),
      xrayHoldMs,
      explodeTick: explodeTickRef.current,
      xrayTick: xrayTickRef.current,
      headYaw: headStateRef.current.yaw,
      headPitch: headStateRef.current.pitch,
      headAngleDeg: headStateRef.current.angleDeg,
      headCenter: { x: headStateRef.current.centerX, y: headStateRef.current.centerY },
      headLeftCheek: headStateRef.current.leftCheek,
      headRightCheek: headStateRef.current.rightCheek,
      headTracking: headStateRef.current.active && (now - (headStateRef.current.updatedAt || 0) < 600),
      recenterHead,
    });
  }, [videoRef, applyHeadPoseEstimate, recenterHead]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      buf.current = { name: 'IDLE', count: 0 };
      setState(s => ({
        ...s,
        isTracking: false,
        landmarks: null,
        gesture: 'IDLE',
        handsCount: 0,
        status: 'off',
        error: null,
        tooFar: false,
        fistArmed: false,
        xrayHoldMs: 0,
        zoomDelta: 0,
        headTracking: false,
      }));
      return;
    }
    if (!videoRef?.current) return;
    let cancelled = false;
    setState(s => ({ ...s, status: 'loading' }));

    async function init() {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
        streamRef.current = stream;
      } catch (e) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error: 'Kamera: ' + e.message }));
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try { await video.play(); } catch (e) { log.warn(e.message); }
      await new Promise(r => {
        if (video.readyState >= 2) { r(); return; }
        video.addEventListener('loadeddata', r, { once: true });
        setTimeout(r, 1800);
      });
      if (cancelled) return;

      try { await loadMediaPipe(); } catch (e) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error: 'MediaPipe: ' + e.message }));
        return;
      }
      if (cancelled) return;

      try {
        if (typeof window.Hands !== 'function') throw new Error('Hands kutubxonasi topilmadi');
        const hands = new window.Hands({
          locateFile: f => `${window.__mp_base || 'https://cdn.jsdelivr.net/npm/@mediapipe'}/hands@0.4.1675469240/${f}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.52,
          minTrackingConfidence: 0.48,
        });
        hands.onResults(onResults);
        handsRef.current = hands;
      } catch (e) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error: 'Hands: ' + e.message }));
        return;
      }

      // FaceMesh (468 nuqtali 3D bosh va burun burchagi trekeri) ni ham ishga tushiramiz
      if (typeof window.FaceMesh === 'function') {
        try {
          const fm = new window.FaceMesh({
            locateFile: f => `${window.__mp_base || 'https://cdn.jsdelivr.net/npm/@mediapipe'}/face_mesh/${f}`,
          });
          fm.setOptions({
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          fm.onResults(onFaceResults);
          faceMeshRef.current = fm;
          log.info('MediaPipe FaceMesh 3D Head Tracker ulandi!');
        } catch (err) {
          log.warn('FaceMesh fallback to optical tracker:', err.message);
        }
      }

      if (cancelled) return;

      const loop = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        if (
          v &&
          v.readyState >= 2 &&
          v.videoWidth > 0 &&
          !inFlightRef.current &&
          v.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = v.currentTime;
          frameCounterRef.current += 1;
          inFlightRef.current = true;
          try {
            await handsRef.current.send({ image: v });
          } catch (e) {
            log.warn(e.message);
          } finally {
            inFlightRef.current = false;
          }

          // FaceMesh Hands bilan BIR VAQTDA emas, ketma-ket va har 3-kadrda ishlaydi.
          // (Ikki WASM grafi parallel ishlasa asosiy oqim qotib qolardi.)
          if (faceMeshRef.current && !cancelled && (frameCounterRef.current % 3 === 0)) {
            faceInFlightRef.current = true;
            try {
              await faceMeshRef.current.send({ image: v });
            } catch (e) {
              log.warn(e.message);
            } finally {
              faceInFlightRef.current = false;
            }
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    init().catch(e => {
      if (!cancelled) setState(s => ({ ...s, status: 'error', error: e.message }));
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      inFlightRef.current = false;
      faceInFlightRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      handsRef.current?.close?.().catch(() => {});
      handsRef.current = null;
      faceMeshRef.current?.close?.().catch(() => {});
      faceMeshRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef?.current) videoRef.current.srcObject = null;
    };
  }, [videoRef, onResults, onFaceResults, enabled]);

  return state;
}

function loadMediaPipe() {
  return new Promise((resolve, reject) => {
    if (window.__mp_loaded && typeof window.Hands === 'function') {
      resolve();
      return;
    }
    const load = src => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.crossOrigin = 'anonymous';
      s.onload = () => res();
      s.onerror = () => rej(new Error('Failed: ' + src));
      document.head.appendChild(s);
    });
    const tryBase = B => load(`${B}/hands@0.4.1675469240/hands.js`)
      .then(() => load(`${B}/camera_utils@0.3.1675466862/camera_utils.js`))
      .then(() => load(`${B}/face_mesh/face_mesh.js`).catch(() => {}))
      .then(() => { window.__mp_base = B; window.__mp_loaded = true; });
    tryBase('https://cdn.jsdelivr.net/npm/@mediapipe')
      .catch(() => tryBase('https://unpkg.com/@mediapipe'))
      .then(resolve)
      .catch(reject);
  });
}