import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const PALETTE = [
  0x00e5ff, 0x38bdf8, 0x10b981, 0xf59e0b,
  0x9b59b6, 0x1abc9c, 0xe74c3c, 0x3498db,
];

function getDisplayColor(rawData) {
  if (!rawData) return 0x00e5ff;
  const c = rawData.color ?? 0xffffff;
  const r = (c >> 16) & 0xff;
  const g = (c >> 8)  & 0xff;
  const b =  c        & 0xff;
  const isLight = r > 200 && g > 200 && b > 200;
  if (!isLight) return c;
  const idx = rawData.meshIndex ?? 0;
  return PALETTE[idx % PALETTE.length];
}

function MiniRenderer({ meshRawData }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = 216, H = 120;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.001, 500);
    camera.position.set(0, 0, 3.5);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const dl1 = new THREE.DirectionalLight(0xffffff, 1.9); dl1.position.set(3, 5, 4); scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0x00e5ff, 1.1); dl2.position.set(-3, -2, 3); scene.add(dl2);

    let mesh  = null;
    let angle = 0;

    function setMesh(raw) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = null;
      }
      if (!raw || !raw.positions || raw.positions.length < 9) return;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(raw.positions), 3));
      if (raw.normals?.length === raw.positions.length) {
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(raw.normals), 3));
      }
      if (raw.indices?.length > 0) {
        const idxArr = raw.indices.length > 65535
          ? new Uint32Array(raw.indices)
          : new Uint16Array(raw.indices);
        geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
      }
      if (!geo.attributes.normal) geo.computeVertexNormals();

      const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
      const center = new THREE.Vector3(); box.getCenter(center);
      const size   = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.01);
      geo.translate(-center.x, -center.y, -center.z);
      geo.scale(2.35 / maxDim, 2.35 / maxDim, 2.35 / maxDim);

      const displayColor = getDisplayColor(raw);

      const mat = new THREE.MeshStandardMaterial({
        color: displayColor,
        roughness: 0.35,
        metalness: 0.45,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(displayColor),
        emissiveIntensity: 0.16,
      });

      mesh = new THREE.Mesh(geo, mat);
      try {
        const eg = new THREE.EdgesGeometry(geo, 24);
        const line = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 }));
        mesh.add(line);
      } catch {}
      scene.add(mesh);
    }

    setMesh(meshRawData);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      angle += 0.012;
      if (mesh) {
        mesh.rotation.y = angle;
        mesh.rotation.x = angle * 0.35;
      }
      renderer.render(scene, camera);
    };
    animate();

    stateRef.current = { setMesh };

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    stateRef.current?.setMesh(meshRawData);
  }, [meshRawData]);

  return <div ref={mountRef} style={{ width: '100%', height: 120, overflow: 'hidden' }} />;
}

export default function PartDetailView({
  partName,
  partInfo,
  onClose,
  onAskAI,
  meshRawData,
  aiInfo,
  onRetryAI,
  hidden = false,
}) {
  if (hidden || !partName) return null;

  const SANS = "'Manrope', system-ui, -apple-system, sans-serif";

  return (
    <div style={{
      position: 'fixed',
      top: 342,
      left: 16,
      width: 238,
      zIndex: 260,
      pointerEvents: 'auto',
    }}>
      <style>{`@keyframes pdvSpin{to{transform:rotate(360deg)}}`}</style>

      <div style={{
        background: 'linear-gradient(180deg, rgba(8, 20, 44, 0.96) 0%, rgba(4, 11, 26, 0.98) 100%)',
        border: '1.5px solid rgba(0, 229, 255, 0.55)',
        borderRadius: 10,
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight: 'calc(100vh - 460px)',
        scrollbarWidth: 'thin',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 22px rgba(0, 229, 255, 0.16)',
        position: 'relative',
      }}>
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
          background: 'rgba(0, 229, 255, 0.08)',
        }}>
          <span style={{
            fontSize: 9.5,
            fontFamily: 'monospace',
            color: '#00e5ff',
            letterSpacing: '0.12em',
            fontWeight: 800,
          }}>
            ⚡ TANLANGAN KOMPONENT
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: 4,
              width: 20,
              height: 20,
              color: '#bae6fd',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          margin: '8px 10px 0',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: 6,
          overflow: 'hidden',
          background: 'radial-gradient(circle, rgba(12, 34, 68, 0.85), rgba(3, 9, 20, 0.96))',
          position: 'relative',
        }}>
          <MiniRenderer meshRawData={meshRawData} />
          {!meshRawData && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 28 }}>⚙️</div>
            </div>
          )}
        </div>

        <div style={{ padding: '9px 12px 11px' }}>
          <div style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: '#f0f9ff',
            fontFamily: SANS,
            marginBottom: 6,
          }}>
            {partName}
          </div>

          {partInfo && (
            <div style={{
              fontSize: 11.5,
              color: 'rgba(214, 232, 255, 0.88)',
              lineHeight: 1.58,
              marginBottom: 9,
              fontFamily: SANS,
            }}>
              {partInfo}
            </div>
          )}

          {aiInfo && (
            <div style={{
              margin: '0 0 9px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(192, 132, 252, 0.35)',
              borderRadius: 6,
              padding: '8px 10px',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#e9d5ff', fontWeight: 800, marginBottom: 4 }}>
                ✦ AI USTOZ SHARHI
              </div>
              {aiInfo.loading ? (
                <div style={{ fontSize: 11, color: '#e9d5ff', fontFamily: SANS }}>
                  Tahlil qilinmoqda…
                </div>
              ) : aiInfo.error ? (
                <div style={{ fontSize: 10.5, color: '#fde68a', fontFamily: SANS }}>
                  {aiInfo.error}
                  {onRetryAI && (
                    <button onClick={onRetryAI} style={{ marginLeft: 6, background: 'transparent', border: '1px solid #00e5ff', color: '#00e5ff', borderRadius: 4, padding: '1px 6px', fontSize: 9.5, cursor: 'pointer' }}>
                      ↻
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#f3e8ff', lineHeight: 1.55, fontFamily: SANS, maxHeight: 110, overflowY: 'auto' }}>
                  {aiInfo.text}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onAskAI}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #9333ea)',
              border: '1px solid rgba(216, 180, 254, 0.45)',
              borderRadius: 6,
              padding: '7px 0',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: SANS,
              cursor: 'pointer',
            }}
          >
            🎙 AI Ustozdan So'rash
          </button>
        </div>
      </div>
    </div>
  );
}