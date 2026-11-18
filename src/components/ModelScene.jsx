import React, { Suspense, useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import ModelErrorBoundary from './ModelErrorBoundary';
import { ChemistryLab3DContent } from './ChemistryLabScene';
import { ProceduralHelicopter, ProceduralJWST, ProceduralV8Engine } from './ExtraCadModels';
import * as THREE from 'three';

const TARGET_SIZE = 2.22;
const NO_RAYCAST = () => null;

// ─── 1-meshli GLB modelni (Yurakni) 6 ta asosiy anatomik bo'lakka ajratish ────
function splitSingleMeshIntoChambers(srcMesh, count = 6) {
  const geo = srcMesh.geometry.index ? srcMesh.geometry.toNonIndexed() : srcMesh.geometry.clone();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();

  const bb = geo.boundingBox;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bb.getCenter(center);
  bb.getSize(size);
  const sx = Math.max(size.x * 0.5, 0.001);
  const sy = Math.max(size.y * 0.5, 0.001);
  const sz = Math.max(size.z * 0.5, 0.001);

  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvAttr = geo.attributes.uv;
  const triCount = Math.floor(posAttr.count / 3);

  const buckets = Array.from({ length: count }, () => ({ pos: [], norm: [], uv: [] }));

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3, i1 = t * 3 + 1, i2 = t * 3 + 2;
    const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3;
    const cy = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3;
    const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3;

    const nx = (cx - center.x) / sx;
    const ny = (cy - center.y) / sy;
    const nz = (cz - center.z) / sz;

    let b = 0;
    if (ny > 0.34) b = 0;
    else if (Math.abs(nx) < 0.22 && Math.abs(nz) < 0.25 && ny < 0.25) b = 5;
    else if (ny > 0.02) b = nx >= 0 ? 3 : 4;
    else b = nx >= 0 ? 1 : 2;

    const target = buckets[b % count];
    for (const vi of [i0, i1, i2]) {
      target.pos.push(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi));
      if (normAttr) target.norm.push(normAttr.getX(vi), normAttr.getY(vi), normAttr.getZ(vi));
      if (uvAttr) target.uv.push(uvAttr.getX(vi), uvAttr.getY(vi));
    }
  }

  const baseMat = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
  const group = new THREE.Group();
  const createdMeshes = [];

  buckets.forEach((bk, idx) => {
    if (bk.pos.length === 0) return;
    const subGeo = new THREE.BufferGeometry();
    subGeo.setAttribute('position', new THREE.Float32BufferAttribute(bk.pos, 3));
    if (bk.norm.length) subGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bk.norm, 3));
    if (bk.uv.length) subGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bk.uv, 2));
    subGeo.computeBoundingBox();

    const mat = baseMat ? baseMat.clone() : new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });
    const m = new THREE.Mesh(subGeo, mat);
    m.name = `heart_chamber_${idx}`;
    m.position.copy(srcMesh.position);
    m.quaternion.copy(srcMesh.quaternion);
    m.scale.copy(srcMesh.scale);
    group.add(m);
    createdMeshes.push(m);
  });

  return { group, createdMeshes };
}

// ─── Fotorealistik Studiya Yoritishi ─────────────────────────────────────────
function StudioLights({ xrayMode }) {
  return (
    <>
      <ambientLight intensity={xrayMode ? 1.35 : 1.05} />
      <hemisphereLight args={['#e2f1ff', '#09152b', 1.0]} />
      <directionalLight position={[6, 9, 7]} intensity={2.5} color="#ffffff" />
      <directionalLight position={[-6, 5, -5]} intensity={1.55} color="#00e5ff" />
      <directionalLight position={[-5, -3, 5]} intensity={0.95} color="#93c5fd" />
      <directionalLight position={[4, -6, -3]} intensity={0.85} color="#f59e0b" />
      <pointLight position={[0, 1.5, 3.2]} intensity={xrayMode ? 1.6 : 0.85} color="#00e5ff" distance={14} />
    </>
  );
}

// ─── 3D Yorliqlar ────────────────────────────────────────────────────────────
function PartLabel({ position, text, tone = 'sel' }) {
  const isSel = tone === 'sel';
  const bg = isSel ? 'rgba(0, 229, 255, 0.95)' : 'rgba(6, 20, 44, 0.92)';
  const fg = isSel ? '#021324' : '#e0f2fe';
  const brd = isSel ? '#00e5ff' : 'rgba(56, 189, 248, 0.65)';

  return (
    <Html position={position} center distanceFactor={6.8} zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-16px)' }}>
        <div style={{
          background: bg,
          color: fg,
          border: `1px solid ${brd}`,
          borderRadius: 6,
          padding: '4px 11px',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: "'Manrope', system-ui, sans-serif",
          whiteSpace: 'nowrap',
          boxShadow: `0 0 16px ${brd}`,
        }}>
          {text}
        </div>
        <div style={{ width: 1.5, height: 14, background: brd }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: brd, boxShadow: `0 0 10px ${brd}` }} />
      </div>
    </Html>
  );
}

// ─── Rasmdagidek Golografik Moviy Halqali 3D Studiya Podiumi ─────────────────
function HolographicStudioStage({ xrayMode, explodeOpen, simMode, simSpeed = 0 }) {
  const outerRingRef = useRef();
  const innerRingRef = useRef();
  const gridRef      = useRef();

  const dialTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d');
    const cx = 512, cy = 512;

    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 495);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
    grad.addColorStop(0.55, 'rgba(6, 28, 64, 0.45)');
    grad.addColorStop(0.88, 'rgba(0, 195, 255, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 495, 0, Math.PI * 2);
    ctx.fill();

    [150, 250, 340, 425, 470, 490].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx >= 4 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(56, 189, 248, 0.38)';
      ctx.lineWidth = idx === 4 ? 4 : 1.8;
      if (idx === 2 || idx === 5) ctx.setLineDash([14, 10]);
      else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const major = deg % 30 === 0;
      const r1 = major ? 438 : 454;
      const r2 = 468;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
      ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
      ctx.strokeStyle = major ? '#00e5ff' : 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = major ? 3 : 1.3;
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 0.14;
    if (innerRingRef.current) innerRingRef.current.rotation.z = -t * 0.22;
    if (gridRef.current) {
      if (simMode && Math.abs(simSpeed) > 0.1) {
        gridRef.current.position.z = ((gridRef.current.position.z + delta * simSpeed * 0.12) % 1.0);
      } else {
        gridRef.current.position.z = 0;
      }
    }
  });

  const floorY = -1.18;

  return (
    <group>
      <group ref={gridRef}>
        <gridHelper
          raycast={NO_RAYCAST}
          args={[30, 60, '#0284c7', '#071d3d']}
          position={[0, floorY - 0.02, 0]}
        />
      </group>

      <mesh raycast={NO_RAYCAST} position={[0, floorY - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[15, 48]} />
        <meshStandardMaterial color="#020916" roughness={0.5} metalness={0.5} transparent opacity={0.88} />
      </mesh>

      <mesh ref={outerRingRef} raycast={NO_RAYCAST} position={[0, floorY + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.1, 4.1]} />
        <meshBasicMaterial map={dialTexture} transparent opacity={0.96} depthWrite={false} />
      </mesh>

      <mesh ref={innerRingRef} raycast={NO_RAYCAST} position={[0, floorY + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.31, 64]} />
        <meshBasicMaterial
          color={explodeOpen ? '#38bdf8' : xrayMode ? '#00e5ff' : '#0ea5e9'}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── TALAB #2: M1 Abrams X-Ray Ichki Detallari (image_e162e2.jpg bilan bir xil!)
// X-Ray yoqilganda korpus shaffof moviy kristall chizmaga o'tadi, ichida esa:
// 1) AGT-1500 Gaz-Turbinali Dvigatel (mis chulg'am + po'lat kompressor),
// 2) Allison X-1100 Transmissiya,
// 3) Oltin/mis rangli vertikal 120mm kassetalar qatori (o'rtada va minorada),
// 4) Yoqilg'i baklari va ekipaj o'rindiqlari haqiqiy hayotdagidek ko'rinadi!
function InternalTankXRayRealism({ explodeOpen, explodeFactor = 1.0, xrayMode, simMode, simSpeed = 0 }) {
  const rotorRef = useRef();
  const engGrp   = useRef();
  const turretInternalGrp = useRef();

  useFrame((_, delta) => {
    const rpmMul = simMode ? 1 + Math.abs(simSpeed) * 0.25 : 1;
    if (rotorRef.current) rotorRef.current.rotation.z += delta * 9 * rpmMul;

    const f = explodeOpen ? explodeFactor : 0;
    if (engGrp.current) {
      engGrp.current.position.lerp(new THREE.Vector3(0, f * 0.36, -f * 0.68), 0.14);
    }
    if (turretInternalGrp.current) {
      turretInternalGrp.current.position.lerp(new THREE.Vector3(0, f * 0.58, 0), 0.14);
    }
  });

  if (!xrayMode && !explodeOpen) return null;

  return (
    <group scale={0.52}>
      {/* 1. Orqa Motor Bo'lmasi: AGT-1500 Turbine Engine + Transmission */}
      <group ref={engGrp}>
        {/* AGT-1500 Mis va Po'lat Gaz-Turbinasi */}
        <group position={[0, 0.22, -0.45]}>
          <mesh raycast={NO_RAYCAST} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.78, 28]} />
            <meshStandardMaterial color="#d97706" metalness={0.88} roughness={0.2} emissive="#b45309" emissiveIntensity={0.25} />
          </mesh>
          {[-0.28, -0.14, 0, 0.14, 0.28].map((z, i) => (
            <mesh key={i} raycast={NO_RAYCAST} position={[0, 0, z]}>
              <torusGeometry args={[0.31, 0.024, 12, 28]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
            </mesh>
          ))}
          <group ref={rotorRef} position={[0, 0, 0.40]}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <mesh key={i} raycast={NO_RAYCAST} rotation={[0, 0, (i * Math.PI) / 3]}>
                <boxGeometry args={[0.52, 0.045, 0.015]} />
                <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.15} emissive="#00e5ff" emissiveIntensity={0.45} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Allison X-1100-3B Transmissiya Bloki */}
        <group position={[0, 0.18, -0.92]}>
          <mesh raycast={NO_RAYCAST}>
            <boxGeometry args={[0.84, 0.36, 0.38]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.22} />
          </mesh>
          <mesh raycast={NO_RAYCAST} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 1.42, 18]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>

        {/* Sovutish va Yoqilg'i Quvurlari */}
        {[-0.45, 0.45].map((x, idx) => (
          <mesh key={idx} raycast={NO_RAYCAST} position={[x, 0.28, -0.52]}>
            <boxGeometry args={[0.26, 0.22, 0.62]} />
            <meshStandardMaterial color="#0284c7" metalness={0.75} roughness={0.28} />
          </mesh>
        ))}
      </group>

      {/* 2. Minora va Korpus Markazi: Oltin/Latun Vertikal Kassetalar va Ichki Jihozlar (image_e162e2.jpg kabi) */}
      <group ref={turretInternalGrp}>
        {[-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36].map((x, xi) =>
          [-0.25, -0.12, 0.02].map((z, zi) => (
            <group key={`${xi}-${zi}`} position={[x, 0.18, z]}>
              <mesh raycast={NO_RAYCAST}>
                <cylinderGeometry args={[0.042, 0.042, 0.42, 14]} />
                <meshStandardMaterial color="#eab308" metalness={0.92} roughness={0.18} emissive="#ca8a04" emissiveIntensity={0.2} />
              </mesh>
              <mesh raycast={NO_RAYCAST} position={[0, 0.26, 0]}>
                <coneGeometry args={[0.042, 0.14, 14]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
              </mesh>
            </group>
          ))
        )}
        {/* Elektron Boshqaruv Bloki (Яшил/Moviy PCB) */}
        <mesh raycast={NO_RAYCAST} position={[0, 0.48, 0.32]}>
          <boxGeometry args={[0.58, 0.22, 0.44]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.22} emissive="#0284c7" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ─── GLB 3D Modellar Sahnasi (Faqat 6 ta Asosiy Yirik Qismga Yaxlit Ajraladi!) ─
function GLBScene({
  modelCfg, explodeOpen, explodeFactor = 1.0,
  xrayMode = false, xrayOpacity = 0.22,
  showCadEdges = true,
  simMode = false, simSpeed = 0,
  firstAidMode = false,
  highlightPart, selectedMeshKey,
  onPartHover, onPartClick, pinchPoint,
  scalpelClipPlane,
  showLabels = false, partLabelOf,
}) {
  const { scene, animations } = useGLTF(modelCfg.file, `${import.meta.env.BASE_URL}draco/`);
  const { camera, raycaster, gl } = useThree();

  const {
    obj,
    meshes,
    edgeLines,
    scl,
    groupOf,
    groupCount,
    origMatProps,
    explodeData,
  } = useMemo(() => {
    let c = scene.clone(true);

    c.traverse(node => {
      if (node.matrixAutoUpdate === false) {
        node.matrix.decompose(node.position, node.quaternion, node.scale);
        node.matrixAutoUpdate = true;
      }
    });
    c.updateMatrixWorld(true);

    const rawMeshes = [];
    c.traverse(n => { if (n.isMesh) rawMeshes.push(n); });
    if (modelCfg.autoSplitMesh && rawMeshes.length === 1) {
      const { group } = splitSingleMeshIntoChambers(rawMeshes[0], modelCfg.autoSplitMesh);
      c = group;
      c.updateMatrixWorld(true);
    }

    const ms = [];
    const matKeys = [];
    c.traverse(node => {
      if (!node.isMesh) return;
      const srcMat = Array.isArray(node.material) ? node.material[0] : node.material;
      matKeys.push(srcMat?.name || `__${ms.length}`);
      node.material = Array.isArray(node.material)
        ? node.material.map(m => m.clone())
        : node.material.clone();
      ms.push(node);
    });

    c.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(c);
    let scaleFactor = 1;
    const center = new THREE.Vector3();
    let maxDim = 1;

    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      maxDim = Math.max(size.x, size.y, size.z, 0.001);
      scaleFactor = TARGET_SIZE / maxDim;
      c.position.sub(center);
      c.updateMatrixWorld(true);
    }

    // Har bir meshning markazini aniqlaymiz
    const meshCenters = ms.map(mesh => {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      const localCtr = new THREE.Vector3();
      if (bb && !bb.isEmpty()) bb.getCenter(localCtr);
      return localCtr.applyMatrix4(mesh.matrixWorld);
    });

    // ── TALAB #3: Barcha modellarni FAQAT 4–6 TA ENG ASOSIY YIRIK QISMGA GURUHLASH!
    // Hech bir model 100 ta mayda bo'lakka sochilib ketmaydi!
    let groups = [];
    let gCount = 6;

    if (modelCfg.groupBy === 'tank6' && modelCfg.mainComponents) {
      // M1 Abrams: 14 ta tugunni 6 ta asosiy komponentga biriktiramiz
      const nodeToMainIdx = new Map();
      modelCfg.mainComponents.forEach((comp, compIdx) => {
        (comp.nodes || []).forEach(nName => nodeToMainIdx.set(nName, compIdx));
      });
      groups = ms.map(mesh => {
        let p = mesh;
        while (p) {
          if (p.name && nodeToMainIdx.has(p.name)) {
            return nodeToMainIdx.get(p.name);
          }
          p = p.parent;
        }
        return 2; // default Hull
      });
      gCount = modelCfg.mainComponents.length;
    } else if (modelCfg.groupBy === 'spatial6') {
      // Skelet (135 suyak) -> 6 ta asosiy anatomik bo'limga!
      const fullBox = new THREE.Box3().setFromObject(c);
      const minY = fullBox.min.y, maxY = fullBox.max.y;
      const hSpan = Math.max(maxY - minY, 0.01);
      groups = meshCenters.map(mc => {
        const ny = (mc.y - minY) / hSpan; // 0 (oyoq) .. 1 (bosh)
        if (ny > 0.80) return 0; // Bosh va bo'yin
        if (ny < 0.46) return 5; // Oyoqlar
        if (mc.x < -0.14 * maxDim) return 3; // O'ng qo'l
        if (mc.x >  0.14 * maxDim) return 4; // Chap qo'l
        if (ny > 0.62) return 1; // Ko'krak qafasi
        return 2; // Umurtqa va chanoq
      });
      gCount = 6;
    } else if (modelCfg.groupBy === 'cell6') {
      // Hayvon hujayrasi (2032 mesh, 23 material) -> 6 ta asosiy organoid tizimiga!
      const seen = new Map();
      const matIndices = matKeys.map(k => {
        if (!seen.has(k)) seen.set(k, seen.size);
        return seen.get(k);
      });
      groups = matIndices.map(mi => {
        if ([12, 16, 17].includes(mi)) return 0; // Membrana va Sitoplazma
        if ([9, 10, 15].includes(mi)) return 1;  // Yadro va Yadrocha
        if ([22].includes(mi)) return 2;         // Mitoxondriyalar
        if ([2, 13, 14].includes(mi)) return 3;  // Endoplazmatik to'r va Ribosomalar
        if ([8, 18, 19, 20, 21].includes(mi)) return 4; // Golji va Vezikulalar
        return 5; // Lizosomalar va Sitoskelet
      });
      gCount = 6;
    } else if (modelCfg.groupBy === 'plant6') {
      // O'simlik hujayrasi (23 mesh) -> 6 ta asosiy tizimga!
      groups = ms.map((_, i) => {
        if ([4, 5, 6].includes(i)) return 0; // Hujayra devori va membrana
        if ([2, 3].includes(i)) return 1;    // Markaziy vakuola
        if ([8, 9, 10, 11].includes(i)) return 2; // Xloroplastlar
        if ([13, 15, 19, 20, 21].includes(i)) return 3; // Yadro
        if ([16, 17, 18].includes(i)) return 4; // Mitoxondriyalar
        return 5; // Endoplazmatik to'r, Golji va Sitoskelet
      });
      gCount = 6;
    } else if (modelCfg.groupBy === 'material') {
      const seen = new Map();
      groups = matKeys.map(k => {
        if (!seen.has(k)) seen.set(k, seen.size);
        return seen.get(k);
      });
      gCount = seen.size;
    } else {
      groups = ms.map((_, i) => i % 6);
      gCount = Math.min(ms.length, 6);
    }

    // Materiallarni boyitish
    const matProps = ms.map((mesh, i) => {
      const g = groups[i] ?? 0;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const customCol =
        modelCfg.mainComponents?.[g]?.color ??
        modelCfg.meshNames?.[g]?.color ??
        modelCfg.meshColors?.[i];

      if (customCol != null && mat?.color) {
        mat.color.setHex(customCol);
      }
      if (modelCfg.category === 'texnika' && mat) {
        if (mat.metalness !== undefined) mat.metalness = Math.max(mat.metalness, 0.55);
        if (mat.roughness !== undefined) mat.roughness = Math.min(mat.roughness, 0.42);
      }
      return {
        transparent: Boolean(mat?.transparent),
        opacity: mat?.opacity ?? 1.0,
        depthWrite: mat?.depthWrite ?? true,
        side: mat?.side ?? THREE.FrontSide,
      };
    });

    // ── HAR BIR ASOSIY GURUH UCHUN YAXLIT (RIGID) AJRALISH VEKTORI ──────────
    // Bitta guruhga kiruvchi barcha meshlar AYNAN BIR XIL vektorga siljiydi,
    // shuning uchun har bir asosiy qism (masalan, butun Minora yoki butun Dvigatel)
    // bo'laklanib ketmasdan YAXLIT bitta detal bo'lib ajraladi!
    const expData = ms.map((mesh, i) => {
      const g = groups[i] ?? 0;
      const cfgVec =
        modelCfg.mainComponents?.[g]?.explodeVec ||
        modelCfg.meshNames?.[g]?.explodeVec;

      const worldShift = new THREE.Vector3();
      if (cfgVec) {
        worldShift.set(
          Number(cfgVec[0] || 0) * maxDim * 0.44,
          Number(cfgVec[1] || 0) * maxDim * 0.44,
          Number(cfgVec[2] || 0) * maxDim * 0.44
        );
      } else {
        const angle = (g / Math.max(1, gCount)) * Math.PI * 2;
        worldShift.set(
          Math.cos(angle) * maxDim * 0.34,
          ((g % 3) - 1) * maxDim * 0.22,
          Math.sin(angle) * maxDim * 0.34
        );
      }

      const p0 = new THREE.Vector3();
      mesh.getWorldPosition(p0);
      const p1 = p0.clone().add(worldShift);
      if (mesh.parent) {
        mesh.parent.worldToLocal(p0);
        mesh.parent.worldToLocal(p1);
      }
      const localDelta = p1.sub(p0);

      return {
        origLocalPos: mesh.position.clone(),
        localDelta,
        groupIdx: g,
      };
    });

    // ── TALAB #2: X-Ray va CAD uchun kristall moviy qirralar (EdgesGeometry) ──
    const eLines = [];
    if (ms.length <= 250 || modelCfg.category === 'texnika') {
      const step = ms.length > 500 ? 2 : 1;
      for (let i = 0; i < ms.length; i += step) {
        const m = ms[i];
        if (!m.geometry) continue;
        const posCount = m.geometry.attributes.position?.count || 0;
        if (posCount > 45000) continue;
        try {
          const eg = new THREE.EdgesGeometry(m.geometry, 25);
          const lMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
          });
          const line = new THREE.LineSegments(eg, lMat);
          line.raycast = NO_RAYCAST;
          m.add(line);
          eLines.push({ line, groupIdx: groups[i] ?? 0 });
        } catch {}
      }
    }

    return {
      obj: c,
      meshes: ms,
      edgeLines: eLines,
      scl: scaleFactor,
      groupOf: groups,
      groupCount: gCount,
      origMatProps: matProps,
      explodeData: expData,
    };
  }, [scene, modelCfg.id]); // eslint-disable-line

  // 3D Yorliqlar
  const [labelPts, setLabelPts] = useState([]);
  useEffect(() => {
    if (!showLabels && !selectedMeshKey && !firstAidMode) {
      setLabelPts([]);
      return;
    }
    const box = new THREE.Box3(), c = new THREE.Vector3();
    const acc = new Map();
    meshes.forEach((m, i) => {
      const g = groupOf[i] ?? 0;
      if (!showLabels && !firstAidMode && `mesh_${g}` !== selectedMeshKey) return;
      box.setFromObject(m);
      if (box.isEmpty()) return;
      const cur = acc.get(g);
      if (cur) cur.union(box);
      else acc.set(g, box.clone());
    });
    const pts = [];
    acc.forEach((bb, g) => {
      const key = `mesh_${g}`;
      const label = partLabelOf?.(key);
      if (!label) return;
      bb.getCenter(c);
      pts.push({
        key,
        label,
        pos: [c.x, bb.max.y, c.z],
        tone: key === selectedMeshKey ? 'sel' : 'hl',
      });
    });
    setLabelPts(pts.slice(0, 8));
  }, [showLabels, firstAidMode, selectedMeshKey, meshes, explodeOpen, partLabelOf, groupOf]);

  const mixer = useMemo(() => {
    if (!modelCfg.hasAnimation || !animations?.length) return null;
    const m = new THREE.AnimationMixer(obj);
    animations.forEach(clip => m.clipAction(clip).play());
    return m;
  }, [obj, animations, modelCfg.hasAnimation]);

  useFrame((_, delta) => mixer?.update(delta));

  // ── TALAB #2: Haqiqiy X-Ray (Tashqi korpus moviy kristall shisha, ichi real!)
  useEffect(() => {
    const shellSet = new Set(modelCfg.shellGroups || []);
    meshes.forEach((mesh, i) => {
      const g = groupOf[i] ?? 0;
      const gk = `mesh_${g}`;
      const active = gk === highlightPart || gk === selectedMeshKey;
      const orig = origMatProps[i];
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!mat || !orig) return;

      if (!mat.emissive) mat.emissive = new THREE.Color(0);

      const isMarkedShell =
        shellSet.has(g) ||
        Boolean(modelCfg.meshNames?.[g]?.isShell) ||
        Boolean(modelCfg.mainComponents?.[g]?.isShell);

      const shouldBeTransparent = xrayMode && !active && (
        selectedMeshKey
          ? gk !== selectedMeshKey
          : (shellSet.size > 0 ? isMarkedShell : g === 0)
      );

      if (shouldBeTransparent) {
        mat.transparent = true;
        mat.opacity = xrayOpacity;
        mat.depthWrite = false;
        mat.side = THREE.FrontSide;
        mat.emissive.setHex(0x0284c7);
        mat.emissiveIntensity = 0.25;
        mesh.renderOrder = 10;
      } else {
        mat.transparent = orig.transparent;
        mat.opacity = orig.opacity;
        mat.depthWrite = true;
        mat.side = orig.side;
        mesh.renderOrder = 1;

        if (active) {
          mat.emissive.setHex(0x00e5ff);
          mat.emissiveIntensity = 0.52;
        } else if (xrayMode) {
          mat.emissive.setHex(0xd97706);
          mat.emissiveIntensity = 0.16;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
      mat.needsUpdate = true;
    });

    edgeLines.forEach(({ line, groupIdx }) => {
      line.visible = Boolean(showCadEdges || xrayMode || explodeOpen);
      if (line.material) {
        const isAct = `mesh_${groupIdx}` === selectedMeshKey || `mesh_${groupIdx}` === highlightPart;
        line.material.color.setHex(isAct ? 0x00ff88 : xrayMode ? 0x38bdf8 : 0x00e5ff);
        line.material.opacity = isAct ? 0.85 : xrayMode ? 0.68 : 0.22;
      }
    });
  }, [highlightPart, selectedMeshKey, xrayMode, xrayOpacity, showCadEdges, explodeOpen, meshes, edgeLines, groupOf, modelCfg, origMatProps]);

  // Qismlarga ajralish (6 ta yaxlit guruh bo'yicha)
  useFrame(() => {
    if (mixer) return;
    const factor = THREE.MathUtils.clamp(explodeFactor, 0.3, 1.6);
    meshes.forEach((mesh, i) => {
      const d = explodeData[i];
      if (!d) return;
      const to = explodeOpen
        ? d.origLocalPos.clone().addScaledVector(d.localDelta, factor)
        : d.origLocalPos;
      mesh.position.lerp(to, explodeOpen ? 0.14 : 0.16);
    });
  });

  useEffect(() => {
    if (!scalpelClipPlane) {
      meshes.forEach(mesh => {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (mat) { mat.clippingPlanes = []; mat.needsUpdate = true; }
      });
      gl.localClippingEnabled = false;
      return;
    }
    gl.localClippingEnabled = true;
    meshes.forEach(mesh => {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mat) {
        mat.clippingPlanes = [scalpelClipPlane];
        mat.clipShadows = true;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
    });
  }, [scalpelClipPlane, meshes, gl]);

  // 👌/🖖 Tanlash nishoni -> Raycast
  useEffect(() => {
    if (!pinchPoint || !meshes.length) return;
    const ndc = new THREE.Vector2(pinchPoint.normX * 2 - 1, -(pinchPoint.normY * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;
    let hit = hits[0].object;
    while (hit && !meshes.includes(hit)) hit = hit.parent;
    if (!hit && meshes.length === 1) hit = meshes[0];
    if (!hit) return;
    const idx = meshes.indexOf(hit);
    if (idx >= 0) doClick(idx, meshes[idx]);
  }, [pinchPoint?.id]); // eslint-disable-line

  function doClick(idx, meshObj) {
    const geo = meshObj.geometry;
    const g = groupOf[idx] ?? 0;
    const rawData = {
      positions: geo.attributes.position ? Array.from(geo.attributes.position.array) : [],
      normals:   geo.attributes.normal   ? Array.from(geo.attributes.normal.array)   : null,
      indices:   geo.index               ? Array.from(geo.index.array)               : null,
      color:     modelCfg.mainComponents?.[g]?.color ?? modelCfg.meshNames?.[g]?.color ?? 0x00e5ff,
      meshIndex: g,
    };

    const mn = modelCfg.meshNames;
    const mnEntry = mn?.[g] ?? (mn?.length === 1 ? mn[0] : null);
    if (mnEntry) {
      onPartClick?.(`mesh_${g}`, mnEntry.name, rawData);
      return;
    }
    onPartClick?.(`mesh_${g}`, `Qism ${g + 1}`, rawData);
  }

  const initRot = modelCfg.initialRotation ?? [0, 0, 0];

  return (
    <group scale={scl}>
      <group rotation={initRot}>
        {labelPts.map(p => (
          <PartLabel key={p.key} position={p.pos} text={p.label} tone={p.tone} />
        ))}
        {modelCfg.hasInternalEngineCAD && (
          <InternalTankXRayRealism
            explodeOpen={explodeOpen}
            explodeFactor={explodeFactor}
            xrayMode={xrayMode}
            simMode={simMode}
            simSpeed={simSpeed}
          />
        )}
        <primitive
          object={obj}
          onPointerOver={e => {
            e.stopPropagation();
            let idx = meshes.indexOf(e.object);
            if (idx < 0) {
              let p = e.object.parent;
              while (p && idx < 0) { idx = meshes.indexOf(p); p = p.parent; }
            }
            if (idx < 0) return;
            const gh = groupOf[idx] ?? 0;
            const entry = modelCfg.meshNames?.[gh] ?? (modelCfg.meshNames?.length === 1 ? modelCfg.meshNames[0] : null);
            onPartHover?.(`mesh_${gh}`, entry?.name ?? `Qism ${gh + 1}`);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            onPartHover?.(null, null);
            document.body.style.cursor = 'default';
          }}
          onClick={e => {
            e.stopPropagation();
            let idx = meshes.indexOf(e.object);
            if (idx < 0) {
              let p = e.object.parent;
              while (p && idx < 0) { idx = meshes.indexOf(p); p = p.parent; }
            }
            if (idx >= 0) doClick(idx, meshes[idx]);
          }}
        />
      </group>
    </group>
  );
}

// ─── CAD Qirrali Komponent ───────────────────────────────────────────────────
function CadMesh({ geometry, matProps, edgeColor = '#38bdf8', edgeOpacity = 0.42, showEdges = true, ...rest }) {
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, 24), [geometry]);
  return (
    <mesh geometry={geometry} {...rest}>
      <meshStandardMaterial {...matProps} />
      {showEdges && (
        <lineSegments raycast={NO_RAYCAST} geometry={edgesGeo}>
          <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} depthWrite={false} />
        </lineSegments>
      )}
    </mesh>
  );
}

// ─── TALAB #2 & #3: Realistik DJI Mavic 3 Pro (image_e162a2.jpg & image_e16263.jpg)
// Faqat 6 ta asosiy qismga ajraladi:
// 1) Propeller, 2) Motor (mis statorli), 3) ESC, 4) Battery, 5) Camera Gimbal (Hasselblad 3-linzali), 6) Main Board & Frame
const MAVIC_ARMS = [
  [-0.72,  0.66],
  [ 0.72,  0.66],
  [-0.68, -0.68],
  [ 0.68, -0.68],
];

function ProceduralMavicDrone({
  modelCfg, explodeOpen, explodeFactor = 1.0,
  xrayMode = false, xrayOpacity = 0.20, showCadEdges = true,
  simMode = false, simSpeed = 0,
  highlightPart, selectedMeshKey,
  onPartHover, onPartClick, pinchPoint, showLabels = false,
}) {
  const { camera, raycaster } = useThree();
  const rootRef = useRef();
  const rotorsRef = useRef([]);

  // 6 ta asosiy komponentning dastlabki va ajralgan pozitsiyalari
  const basePos = useRef({
    propeller:     new THREE.Vector3(0, 0.14, 0),
    motor:         new THREE.Vector3(0, 0.04, 0),
    esc:           new THREE.Vector3(0, 0.01, 0.08),
    battery:       new THREE.Vector3(0, 0.02, -0.22),
    camera_gimbal: new THREE.Vector3(0, -0.08, 0.48),
    main_board:    new THREE.Vector3(0, 0, 0),
  });

  const expPos = useMemo(() => ({
    propeller:     new THREE.Vector3(0, 0.56, 0),
    motor:         new THREE.Vector3(0, 0.24, 0),
    esc:           new THREE.Vector3(0, 0.34, 0.22),
    battery:       new THREE.Vector3(0, 0.04, -0.68),
    camera_gimbal: new THREE.Vector3(0, -0.24, 0.86),
    main_board:    new THREE.Vector3(0, -0.14, 0),
  }), []);

  const grpRefs = {
    propeller:     useRef(),
    motor:         useRef(),
    esc:           useRef(),
    battery:       useRef(),
    camera_gimbal: useRef(),
    main_board:    useRef(),
  };

  useEffect(() => {
    if (!pinchPoint || !rootRef.current) return;
    const ndc = new THREE.Vector2(pinchPoint.normX * 2 - 1, -(pinchPoint.normY * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(rootRef.current.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partKey) o = o.parent;
      if (o?.userData?.partKey) {
        const key = o.userData.partKey;
        const def = modelCfg.parts?.[key];
        onPartClick?.(key, def?.label ?? key, null);
        return;
      }
    }
  }, [pinchPoint]); // eslint-disable-line

  useFrame((_, delta) => {
    const rSpeed = simMode ? 24 + Math.abs(simSpeed) * 0.25 : 12;
    rotorsRef.current.forEach((r, idx) => {
      if (r) r.rotation.y += delta * (idx % 2 === 0 ? rSpeed : -rSpeed);
    });

    const factor = THREE.MathUtils.clamp(explodeFactor, 0.3, 1.6);
    Object.keys(grpRefs).forEach(k => {
      const g = grpRefs[k].current;
      if (!g) return;
      const to = explodeOpen ? basePos.current[k].clone().lerp(expPos[k], factor) : basePos.current[k];
      g.position.lerp(to, 0.14);
    });
  });

  const bindEvents = (key) => {
    const def = modelCfg.parts?.[key];
    return {
      userData: { partKey: key },
      onPointerOver: (e) => {
        e.stopPropagation();
        onPartHover?.(key, def?.label ?? key);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        onPartHover?.(null, null);
        document.body.style.cursor = 'default';
      },
      onClick: (e) => {
        e.stopPropagation();
        onPartClick?.(key, def?.label ?? key, null);
      },
    };
  };

  const matPropsFor = (key, baseColor, metal = 0.65, rough = 0.32, isShell = false) => {
    const isAct = highlightPart === key || selectedMeshKey === key;
    const transparentInXray = xrayMode && !isAct && (selectedMeshKey ? selectedMeshKey !== key : isShell);
    return {
      color: transparentInXray ? '#1e3a5f' : baseColor,
      metalness: metal,
      roughness: rough,
      transparent: transparentInXray,
      opacity: transparentInXray ? xrayOpacity : 1.0,
      depthWrite: !transparentInXray,
      emissive: new THREE.Color(isAct ? '#00e5ff' : transparentInXray ? '#0284c7' : xrayMode ? '#d97706' : '#000000'),
      emissiveIntensity: isAct ? 0.5 : transparentInXray ? 0.35 : xrayMode ? 0.15 : 0,
    };
  };

  const geos = useMemo(() => ({
    fuselageTop: new THREE.BoxGeometry(0.46, 0.14, 0.86),
    fuselageNose: new THREE.BoxGeometry(0.42, 0.11, 0.24),
    armFront: new THREE.BoxGeometry(0.075, 0.055, 0.88),
    legFront: new THREE.BoxGeometry(0.045, 0.24, 0.055),
    pcbBoard: new THREE.BoxGeometry(0.36, 0.025, 0.48),
    chipGold: new THREE.BoxGeometry(0.12, 0.02, 0.12),
    escBoard: new THREE.BoxGeometry(0.32, 0.03, 0.28),
    batteryBox: new THREE.BoxGeometry(0.36, 0.11, 0.42),
    gimbalBox: new THREE.BoxGeometry(0.22, 0.20, 0.20),
    motorBell: new THREE.CylinderGeometry(0.095, 0.095, 0.075, 24),
    blade: new THREE.BoxGeometry(0.68, 0.008, 0.058),
  }), []);

  return (
    <group ref={rootRef} scale={1.18}>
      {/* ── 6. MAIN BOARD & AERODYNAMIC FRAME (X-Ray da shaffof moviy kristall + ichki yashil/oltin PCB!) */}
      <group ref={grpRefs.main_board} position={[0, 0, 0]} {...bindEvents('main_board')}>
        {(showLabels || selectedMeshKey === 'main_board') && (
          <PartLabel position={[0, 0.24, 0]} text={modelCfg.parts?.main_board?.shortLabel} tone={selectedMeshKey === 'main_board' ? 'sel' : 'hl'} />
        )}
        {/* Tashqi Mavic 3 Pro Korpusi (X-Ray da shaffoflashadi!) */}
        <CadMesh
          geometry={geos.fuselageTop}
          position={[0, 0.04, -0.02]}
          matProps={matPropsFor('main_board', '#333b48', 0.55, 0.38, true)}
          edgeColor={xrayMode ? '#38bdf8' : '#64748b'}
          edgeOpacity={xrayMode ? 0.78 : 0.35}
          showEdges={showCadEdges || xrayMode}
        />
        <CadMesh
          geometry={geos.fuselageNose}
          position={[0, 0.03, 0.44]}
          matProps={matPropsFor('main_board', '#2b323d', 0.6, 0.35, true)}
          edgeColor={xrayMode ? '#38bdf8' : '#64748b'}
          edgeOpacity={xrayMode ? 0.78 : 0.35}
          showEdges={showCadEdges || xrayMode}
        />
        {/* 4 ta Mavic Konsol Qo'llari va Old Tayanch Oyoqlari */}
        {MAVIC_ARMS.map(([ax, az], idx) => (
          <group key={`marm-${idx}`}>
            <CadMesh
              geometry={geos.armFront}
              position={[ax * 0.52, 0.02, az * 0.52]}
              rotation={[0, Math.atan2(ax, az), 0]}
              matProps={matPropsFor('main_board', '#2d3542', 0.62, 0.35, true)}
              edgeColor={xrayMode ? '#38bdf8' : '#64748b'}
              edgeOpacity={xrayMode ? 0.75 : 0.32}
              showEdges={showCadEdges || xrayMode}
            />
            <CadMesh
              geometry={geos.legFront}
              position={[ax * 0.96, -0.10, az * 0.96]}
              rotation={[0, 0, ax > 0 ? -0.12 : 0.12]}
              matProps={matPropsFor('main_board', '#252c37', 0.7, 0.3, false)}
              showEdges={showCadEdges}
            />
            {/* Konsol uchidagi qizil/yashil parvoz LED chirog'i */}
            <mesh position={[ax * 0.99, -0.02, az * 0.99]}>
              <boxGeometry args={[0.03, 0.035, 0.03]} />
              <meshBasicMaterial color={az > 0 ? '#ff4500' : '#00ff88'} />
            </mesh>
          </group>
        ))}

        {/* ICHKI MAIN BOARD PCB (X-Ray yoqilganda image_e16263.jpg dagidek aniq ko'rinadi!) */}
        <group position={[0, 0.05, 0.12]}>
          <CadMesh
            geometry={geos.pcbBoard}
            matProps={{ color: '#15803d', metalness: 0.5, roughness: 0.3, emissive: '#059669', emissiveIntensity: xrayMode ? 0.35 : 0.1 }}
            edgeColor="#34d399"
            showEdges={true}
          />
          {[-0.08, 0.08].map((cx, i) => (
            <CadMesh
              key={i}
              position={[cx, 0.022, 0.06]}
              geometry={geos.chipGold}
              matProps={{ color: '#d97706', metalness: 0.92, roughness: 0.15 }}
              edgeColor="#fbbf24"
              showEdges={true}
            />
          ))}
        </group>
      </group>

      {/* ── 3. ESC (Elektron Tezlik Regulyatori va Mis Shinalar) ──────────────── */}
      <group ref={grpRefs.esc} position={[0, 0.01, 0.08]} {...bindEvents('esc')}>
        {(showLabels || selectedMeshKey === 'esc') && (
          <PartLabel position={[0.25, 0.16, 0]} text={modelCfg.parts?.esc?.shortLabel} tone={selectedMeshKey === 'esc' ? 'sel' : 'hl'} />
        )}
        <CadMesh
          geometry={geos.escBoard}
          matProps={matPropsFor('esc', '#b45309', 0.85, 0.22, false)}
          edgeColor="#fbbf24"
          showEdges={true}
        />
        {/* Mis kondensatorlar va radiator qovurg'alari */}
        {[-0.10, -0.03, 0.04, 0.11].map((x, i) => (
          <mesh key={i} position={[x, 0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 12]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.15} />
          </mesh>
        ))}
      </group>

      {/* ── 4. BATTERY (Orqa LiPo Aqlli Batareya Bloki) ───────────────────────── */}
      <group ref={grpRefs.battery} position={[0, 0.02, -0.22]} {...bindEvents('battery')}>
        {(showLabels || selectedMeshKey === 'battery') && (
          <PartLabel position={[0, 0.18, -0.1]} text={modelCfg.parts?.battery?.shortLabel} tone={selectedMeshKey === 'battery' ? 'sel' : 'hl'} />
        )}
        <CadMesh
          geometry={geos.batteryBox}
          matProps={matPropsFor('battery', '#3f4756', 0.72, 0.28, false)}
          edgeColor="#38bdf8"
          showEdges={true}
        />
      </group>

      {/* ── 5. CAMERA GIMBAL (Hasselblad 3-Linzali Old Optik Blok — image_e162a2.jpg!) */}
      <group ref={grpRefs.camera_gimbal} position={[0, -0.08, 0.48]} {...bindEvents('camera_gimbal')}>
        {(showLabels || selectedMeshKey === 'camera_gimbal') && (
          <PartLabel position={[0, -0.18, 0.16]} text={modelCfg.parts?.camera_gimbal?.shortLabel} tone={selectedMeshKey === 'camera_gimbal' ? 'sel' : 'hl'} />
        )}
        <CadMesh
          geometry={geos.gimbalBox}
          matProps={matPropsFor('camera_gimbal', '#1e242d', 0.82, 0.22, false)}
          edgeColor="#38bdf8"
          showEdges={true}
        />
        {/* 3 ta Hasselblad va Tele-kamera linzalari */}
        {[
          [-0.048,  0.045, 0.042],
          [ 0.048,  0.045, 0.042],
          [-0.048, -0.045, 0.048],
          [ 0.048, -0.045, 0.036],
        ].map(([lx, ly, lr], idx) => (
          <group key={idx} position={[lx, ly, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[lr, lr, 0.025, 20]} />
              <meshStandardMaterial color="#64748b" metalness={0.95} roughness={0.15} />
            </mesh>
            <mesh position={[0, 0.014, 0]}>
              <cylinderGeometry args={[lr * 0.78, lr * 0.78, 0.01, 20]} />
              <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.05} emissive="#00e5ff" emissiveIntensity={0.35} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 2. MOTOR (4 ta Mis Chulg'amli Statorli Brushless Motorlar) ────────── */}
      <group ref={grpRefs.motor} position={[0, 0.04, 0]} {...bindEvents('motor')}>
        {(showLabels || selectedMeshKey === 'motor') && (
          <PartLabel position={[0.72, 0.16, 0.66]} text={modelCfg.parts?.motor?.shortLabel} tone={selectedMeshKey === 'motor' ? 'sel' : 'hl'} />
        )}
        {MAVIC_ARMS.map(([mx, mz], idx) => (
          <group key={`mmot-${idx}`} position={[mx, 0, mz]}>
            {/* Tashqi qora/kumush rotor barabani */}
            <CadMesh
              geometry={geos.motorBell}
              matProps={matPropsFor('motor', '#1f2937', 0.9, 0.2, false)}
              edgeColor="#94a3b8"
              showEdges={showCadEdges}
            />
            {/* Ichki yorqin mis stator chulg'ami (image_e162a2.jpg dagidek!) */}
            <mesh position={[0, -0.015, 0]}>
              <cylinderGeometry args={[0.098, 0.098, 0.032, 24]} />
              <meshStandardMaterial color="#ea580c" metalness={0.92} roughness={0.18} emissive="#d97706" emissiveIntensity={0.35} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 1. PROPELLER (To'q sariq uchli aerodinamik parraklar) ─────────────── */}
      <group ref={grpRefs.propeller} position={[0, 0.14, 0]} {...bindEvents('propeller')}>
        {(showLabels || selectedMeshKey === 'propeller') && (
          <PartLabel position={[-0.72, 0.16, 0.66]} text={modelCfg.parts?.propeller?.shortLabel} tone={selectedMeshKey === 'propeller' ? 'sel' : 'hl'} />
        )}
        {MAVIC_ARMS.map(([mx, mz], idx) => (
          <group
            key={`mprop-${idx}`}
            ref={el => (rotorsRef.current[idx] = el)}
            position={[mx, 0, mz]}
          >
            <mesh>
              <cylinderGeometry args={[0.032, 0.038, 0.03, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            <CadMesh
              geometry={geos.blade}
              matProps={matPropsFor('propeller', '#1e293b', 0.65, 0.25, false)}
              edgeColor="#38bdf8"
              showEdges={showCadEdges}
            />
            {/* Parrak uchlaridagi to'q sariq Mavic chiziqlari */}
            {[-0.31, 0.31].map((tipX, ti) => (
              <mesh key={ti} position={[tipX, 0.001, 0]}>
                <boxGeometry args={[0.06, 0.01, 0.056]} />
                <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

// ─── Aerokosmik Qiruvchi (6 ta asosiy uzel) ──────────────────────────────────
function ProceduralJetFighter({
  modelCfg, explodeOpen, explodeFactor = 1.0,
  xrayMode = false, xrayOpacity = 0.20, showCadEdges = true,
  simMode = false, simSpeed = 0,
  highlightPart, selectedMeshKey,
  onPartHover, onPartClick, pinchPoint, showLabels = false,
}) {
  const { camera, raycaster } = useThree();
  const rootRef = useRef();
  const turbineRef = useRef();

  const basePos = useRef({
    nose_radar:         new THREE.Vector3(0, 0.04, 0.72),
    fuselage_skin:      new THREE.Vector3(0, 0, -0.05),
    delta_wings:        new THREE.Vector3(0, -0.02, -0.15),
    turbofan_core:      new THREE.Vector3(0, 0, -0.25),
    afterburner_nozzle: new THREE.Vector3(0, 0, -0.95),
    tail_stabilizers:   new THREE.Vector3(0, 0.12, -0.68),
  });

  const expPos = useMemo(() => ({
    nose_radar:         new THREE.Vector3(0, 0.22, 1.38),
    fuselage_skin:      new THREE.Vector3(0, 0.38, -0.05),
    delta_wings:        new THREE.Vector3(0, -0.28, -0.15),
    turbofan_core:      new THREE.Vector3(0, 0, -0.25),
    afterburner_nozzle: new THREE.Vector3(0, 0, -1.52),
    tail_stabilizers:   new THREE.Vector3(0, 0.56, -1.08),
  }), []);

  const refs = {
    nose_radar: useRef(),
    fuselage_skin: useRef(),
    delta_wings: useRef(),
    turbofan_core: useRef(),
    afterburner_nozzle: useRef(),
    tail_stabilizers: useRef(),
  };

  useEffect(() => {
    if (!pinchPoint || !rootRef.current) return;
    const ndc = new THREE.Vector2(pinchPoint.normX * 2 - 1, -(pinchPoint.normY * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(rootRef.current.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partKey) o = o.parent;
      if (o?.userData?.partKey) {
        const key = o.userData.partKey;
        onPartClick?.(key, modelCfg.parts?.[key]?.label ?? key, null);
        return;
      }
    }
  }, [pinchPoint]); // eslint-disable-line

  useFrame((_, delta) => {
    if (turbineRef.current) turbineRef.current.rotation.z += delta * (simMode ? 22 : 10);
    const f = THREE.MathUtils.clamp(explodeFactor, 0.3, 1.6);
    Object.keys(refs).forEach(k => {
      const g = refs[k].current;
      if (!g) return;
      const to = explodeOpen ? basePos.current[k].clone().lerp(expPos[k], f) : basePos.current[k];
      g.position.lerp(to, 0.14);
    });
  });

  const bind = (key) => ({
    userData: { partKey: key },
    onPointerOver: (e) => { e.stopPropagation(); onPartHover?.(key, modelCfg.parts?.[key]?.label ?? key); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { onPartHover?.(null, null); document.body.style.cursor = 'default'; },
    onClick: (e) => { e.stopPropagation(); onPartClick?.(key, modelCfg.parts?.[key]?.label ?? key, null); },
  });

  const matFor = (key, col, metal = 0.78, rough = 0.28, isShell = false) => {
    const act = highlightPart === key || selectedMeshKey === key;
    const tr = xrayMode && !act && (selectedMeshKey ? selectedMeshKey !== key : isShell);
    return {
      color: col,
      metalness: metal,
      roughness: rough,
      transparent: tr,
      opacity: tr ? xrayOpacity : 1.0,
      depthWrite: !tr,
      emissive: new THREE.Color(act ? '#00e5ff' : tr ? '#0284c7' : xrayMode ? '#d97706' : '#000000'),
      emissiveIntensity: act ? 0.55 : tr ? 0.25 : xrayMode ? 0.18 : 0,
    };
  };

  const geos = useMemo(() => ({
    nose: new THREE.ConeGeometry(0.18, 0.58, 8),
    canopy: new THREE.CylinderGeometry(0.13, 0.16, 0.54, 8),
    fuselage: new THREE.BoxGeometry(0.46, 0.22, 1.38),
    wing: new THREE.BoxGeometry(2.15, 0.035, 0.72),
    turbine: new THREE.CylinderGeometry(0.14, 0.15, 0.88, 20),
    nozzle: new THREE.CylinderGeometry(0.14, 0.11, 0.28, 16),
    tail: new THREE.BoxGeometry(0.03, 0.42, 0.34),
  }), []);

  return (
    <group ref={rootRef} scale={0.95}>
      <group ref={refs.nose_radar} position={[0, 0.04, 0.72]} {...bind('nose_radar')}>
        <CadMesh position={[0, -0.04, 0.32]} geometry={geos.nose} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('nose_radar', '#334155', 0.85, 0.2)} showEdges={showCadEdges} />
        <CadMesh position={[0, 0.10, -0.25]} geometry={geos.canopy} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('nose_radar', '#f59e0b', 0.9, 0.12)} edgeColor="#fbbf24" showEdges={showCadEdges} />
      </group>
      <group ref={refs.fuselage_skin} position={[0, 0, -0.05]} {...bind('fuselage_skin')}>
        <CadMesh geometry={geos.fuselage} matProps={matFor('fuselage_skin', '#475569', 0.82, 0.28, true)} showEdges={showCadEdges || xrayMode} />
      </group>
      <group ref={refs.delta_wings} position={[0, -0.02, -0.15]} {...bind('delta_wings')}>
        <CadMesh geometry={geos.wing} matProps={matFor('delta_wings', '#3b495e', 0.8, 0.3, true)} showEdges={showCadEdges || xrayMode} />
      </group>
      <group ref={refs.turbofan_core} position={[0, 0, -0.25]} {...bind('turbofan_core')}>
        {[-0.12, 0.12].map((x, i) => (
          <CadMesh key={i} position={[x, 0, 0]} geometry={geos.turbine} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('turbofan_core', '#ea580c', 0.9, 0.18)} edgeColor="#fbbf24" showEdges={true} />
        ))}
        <group ref={turbineRef} position={[0, 0, 0.22]}>
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              <boxGeometry args={[0.36, 0.04, 0.02]} />
              <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={refs.afterburner_nozzle} position={[0, 0, -0.95]} {...bind('afterburner_nozzle')}>
        {[-0.12, 0.12].map((x, i) => (
          <CadMesh key={i} position={[x, 0, 0]} geometry={geos.nozzle} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('afterburner_nozzle', '#d97706', 0.92, 0.18)} edgeColor="#f59e0b" showEdges={true} />
        ))}
      </group>
      <group ref={refs.tail_stabilizers} position={[0, 0.12, -0.68]} {...bind('tail_stabilizers')}>
        {[-0.24, 0.24].map((x, i) => (
          <CadMesh key={i} position={[x, 0.1, -0.1]} rotation={[0, 0, x > 0 ? -0.32 : 0.32]} geometry={geos.tail} matProps={matFor('tail_stabilizers', '#475569', 0.82, 0.25)} showEdges={showCadEdges} />
        ))}
      </group>
    </group>
  );
}

// ─── Lochin-X Qanotli BPLA (6 ta asosiy uzel) ────────────────────────────────
function ProceduralFixedWingUAV({
  modelCfg, explodeOpen, explodeFactor = 1.0,
  xrayMode = false, xrayOpacity = 0.20, showCadEdges = true,
  simMode = false,
  highlightPart, selectedMeshKey,
  onPartHover, onPartClick, pinchPoint,
}) {
  const { camera, raycaster } = useThree();
  const rootRef = useRef();
  const propRef = useRef();

  const basePos = useRef({
    uav_fuselage:      new THREE.Vector3(0, 0, 0.1),
    uav_wings:         new THREE.Vector3(0, 0.05, 0.02),
    eo_ir_turret:      new THREE.Vector3(0, -0.16, 0.48),
    autopilot_bay:     new THREE.Vector3(0, 0.06, 0.32),
    fuel_battery_core: new THREE.Vector3(0, 0, -0.05),
    pusher_engine:     new THREE.Vector3(0, 0.04, -0.54),
  });

  const expPos = useMemo(() => ({
    uav_fuselage:      new THREE.Vector3(0, 0.32, 0.1),
    uav_wings:         new THREE.Vector3(0, 0.54, 0.02),
    eo_ir_turret:      new THREE.Vector3(0, -0.46, 0.76),
    autopilot_bay:     new THREE.Vector3(0, 0.28, 0.64),
    fuel_battery_core: new THREE.Vector3(0, -0.24, -0.05),
    pusher_engine:     new THREE.Vector3(0, 0.08, -1.02),
  }), []);

  const refs = {
    uav_fuselage: useRef(),
    uav_wings: useRef(),
    eo_ir_turret: useRef(),
    autopilot_bay: useRef(),
    fuel_battery_core: useRef(),
    pusher_engine: useRef(),
  };

  useEffect(() => {
    if (!pinchPoint || !rootRef.current) return;
    const ndc = new THREE.Vector2(pinchPoint.normX * 2 - 1, -(pinchPoint.normY * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(rootRef.current.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partKey) o = o.parent;
      if (o?.userData?.partKey) {
        const key = o.userData.partKey;
        onPartClick?.(key, modelCfg.parts?.[key]?.label ?? key, null);
        return;
      }
    }
  }, [pinchPoint]); // eslint-disable-line

  useFrame((_, delta) => {
    if (propRef.current) propRef.current.rotation.z += delta * (simMode ? 24 : 14);
    const f = THREE.MathUtils.clamp(explodeFactor, 0.3, 1.6);
    Object.keys(refs).forEach(k => {
      const g = refs[k].current;
      if (!g) return;
      const to = explodeOpen ? basePos.current[k].clone().lerp(expPos[k], f) : basePos.current[k];
      g.position.lerp(to, 0.14);
    });
  });

  const bind = (key) => ({
    userData: { partKey: key },
    onPointerOver: (e) => { e.stopPropagation(); onPartHover?.(key, modelCfg.parts?.[key]?.label ?? key); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { onPartHover?.(null, null); document.body.style.cursor = 'default'; },
    onClick: (e) => { e.stopPropagation(); onPartClick?.(key, modelCfg.parts?.[key]?.label ?? key, null); },
  });

  const matFor = (key, col, metal = 0.72, rough = 0.3, isShell = false) => {
    const act = highlightPart === key || selectedMeshKey === key;
    const tr = xrayMode && !act && (selectedMeshKey ? selectedMeshKey !== key : isShell);
    return {
      color: col,
      metalness: metal,
      roughness: rough,
      transparent: tr,
      opacity: tr ? xrayOpacity : 1.0,
      depthWrite: !tr,
      emissive: new THREE.Color(act ? '#00e5ff' : tr ? '#0284c7' : xrayMode ? '#d97706' : '#000000'),
      emissiveIntensity: act ? 0.55 : tr ? 0.25 : xrayMode ? 0.18 : 0,
    };
  };

  const geos = useMemo(() => ({
    fuselage: new THREE.CylinderGeometry(0.14, 0.17, 1.15, 12),
    wing: new THREE.BoxGeometry(2.55, 0.03, 0.28),
    turret: new THREE.SphereGeometry(0.11, 20, 16),
    autopilot: new THREE.BoxGeometry(0.20, 0.09, 0.26),
    fuel: new THREE.BoxGeometry(0.22, 0.16, 0.42),
    boom: new THREE.CylinderGeometry(0.02, 0.02, 0.95, 8),
    vtail: new THREE.BoxGeometry(0.02, 0.36, 0.20),
    engine: new THREE.CylinderGeometry(0.09, 0.11, 0.24, 16),
  }), []);

  return (
    <group ref={rootRef} scale={0.92}>
      <group ref={refs.uav_fuselage} position={[0, 0, 0.1]} {...bind('uav_fuselage')}>
        <CadMesh geometry={geos.fuselage} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('uav_fuselage', '#475569', 0.75, 0.28, true)} showEdges={showCadEdges || xrayMode} />
      </group>
      <group ref={refs.uav_wings} position={[0, 0.05, 0.02]} {...bind('uav_wings')}>
        <CadMesh geometry={geos.wing} matProps={matFor('uav_wings', '#334155', 0.78, 0.28, true)} showEdges={showCadEdges || xrayMode} />
      </group>
      <group ref={refs.eo_ir_turret} position={[0, -0.16, 0.48]} {...bind('eo_ir_turret')}>
        <CadMesh geometry={geos.turret} matProps={matFor('eo_ir_turret', '#1e293b', 0.85, 0.2)} edgeColor="#00ff88" showEdges={true} />
      </group>
      <group ref={refs.autopilot_bay} position={[0, 0.06, 0.32]} {...bind('autopilot_bay')}>
        <CadMesh geometry={geos.autopilot} matProps={matFor('autopilot_bay', '#10b981', 0.6, 0.25)} edgeColor="#00ff88" showEdges={true} />
      </group>
      <group ref={refs.fuel_battery_core} position={[0, 0, -0.05]} {...bind('fuel_battery_core')}>
        <CadMesh geometry={geos.fuel} matProps={matFor('fuel_battery_core', '#f59e0b', 0.7, 0.25)} edgeColor="#fbbf24" showEdges={true} />
      </group>
      <group ref={refs.pusher_engine} position={[0, 0.04, -0.54]} {...bind('pusher_engine')}>
        {[-0.45, 0.45].map((x, i) => (
          <group key={i} position={[x, 0.04, -0.04]}>
            <CadMesh geometry={geos.boom} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('pusher_engine', '#334155', 0.8, 0.25)} showEdges={showCadEdges} />
            <CadMesh position={[0, 0.15, -0.35]} rotation={[0, 0, x > 0 ? 0.55 : -0.55]} geometry={geos.vtail} matProps={matFor('pusher_engine', '#475569', 0.8, 0.25)} showEdges={showCadEdges} />
          </group>
        ))}
        <CadMesh geometry={geos.engine} rotation={[Math.PI / 2, 0, 0]} matProps={matFor('pusher_engine', '#ea580c', 0.88, 0.2)} edgeColor="#fbbf24" showEdges={true} />
        <group ref={propRef} position={[0, 0, -0.15]}>
          <mesh>
            <boxGeometry args={[0.52, 0.035, 0.01]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─── Quyosh Tizimi ───────────────────────────────────────────────────────────
const SOLAR_BODIES = [
  { key: 'sun',     r: 0.30,  dist: 0,    color: '#FFC24D', speed: 0,    phase: 0 },
  { key: 'earth',   r: 0.09,  dist: 0.72, color: '#3d6fd6', speed: 0.36, phase: 4.0 },
  { key: 'mars',    r: 0.065, dist: 1.02, color: '#c1502e', speed: 0.29, phase: 1.4 },
  { key: 'jupiter', r: 0.19,  dist: 1.38, color: '#c9a878', speed: 0.16, phase: 5.2 },
  { key: 'saturn',  r: 0.16,  dist: 1.78, color: '#d9c08a', speed: 0.12, phase: 3.0, ring: true },
  { key: 'neptune', r: 0.11,  dist: 2.18, color: '#3f66e0', speed: 0.07, phase: 5.8 },
];
const EXPLODE_MUL = 1.32;

function ProceduralSolarSystem({
  modelCfg, explodeOpen, xrayMode, highlightPart, selectedMeshKey,
  onPartHover, onPartClick, pinchPoint,
}) {
  const { camera, raycaster } = useThree();
  const rootRef = useRef();
  const distMul = useRef(1);

  useEffect(() => {
    if (!pinchPoint || !rootRef.current) return;
    const ndc = new THREE.Vector2(pinchPoint.normX * 2 - 1, -(pinchPoint.normY * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(rootRef.current.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partKey) o = o.parent;
      if (o?.userData?.partKey) {
        const key = o.userData.partKey;
        const def = modelCfg.parts?.[key];
        onPartClick?.(key, def?.label ?? key, null);
        return;
      }
    }
  }, [pinchPoint]); // eslint-disable-line

  useFrame(() => {
    distMul.current += ((explodeOpen ? EXPLODE_MUL : 1) - distMul.current) * 0.08;
  });

  return (
    <group rotation={[0.45, 0, 0]} ref={rootRef}>
      {SOLAR_BODIES.map((b) => {
        const isAct = highlightPart === b.key || selectedMeshKey === b.key;
        const def = modelCfg.parts?.[b.key];
        return (
          <group key={b.key} position={[Math.cos(b.phase) * b.dist * (explodeOpen ? 1.32 : 1), 0, Math.sin(b.phase) * b.dist * (explodeOpen ? 1.32 : 1)]}>
            <mesh
              userData={{ partKey: b.key }}
              onPointerOver={(e) => { e.stopPropagation(); onPartHover?.(b.key, def?.label ?? b.key); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { onPartHover?.(null, null); document.body.style.cursor = 'default'; }}
              onClick={(e) => { e.stopPropagation(); onPartClick?.(b.key, def?.label ?? b.key, null); }}
            >
              <sphereGeometry args={[b.r, 26, 20]} />
              <meshStandardMaterial
                color={b.color}
                roughness={b.key === 'sun' ? 0.35 : 0.6}
                transparent={xrayMode && !isAct}
                opacity={xrayMode && !isAct ? 0.38 : 1}
                emissive={new THREE.Color(b.key === 'sun' ? '#FF9E1F' : b.color)}
                emissiveIntensity={isAct ? 0.65 : b.key === 'sun' ? 0.9 : 0}
              />
            </mesh>
            {xrayMode && (
              <mesh raycast={NO_RAYCAST}>
                <sphereGeometry args={[b.r * 0.45, 16, 14]} />
                <meshBasicMaterial color="#ff6b00" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─── Silliq Aylantirish, Pan va Masshtab Guruhi ──────────────────────────────
function SceneGroup({ rotation, panOffset = { x: 0, y: 0 }, scale, simMode, simSteer = 0, simPitch = 0, children }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const targetX = rotation.x + (simMode ? simPitch * 0.25 : 0);
    const targetY = rotation.y + (simMode ? simSteer : 0);
    const targetZ = simMode ? -simSteer * 0.22 : 0;

    ref.current.rotation.x += (targetX - ref.current.rotation.x) * 0.16;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.16;
    ref.current.rotation.z += (targetZ - ref.current.rotation.z) * 0.14;

    ref.current.position.x += (panOffset.x - ref.current.position.x) * 0.16;
    ref.current.position.y += (panOffset.y - ref.current.position.y) * 0.16;

    const s = ref.current.scale.x;
    ref.current.scale.setScalar(s + (scale - s) * 0.16);
  });
  return <group ref={ref}>{children}</group>;
}

function Spinner() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 1.4;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.8) * 0.4;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.5, 2]} />
      <meshStandardMaterial color="#00e5ff" wireframe emissive="#00e5ff" emissiveIntensity={0.5} />
    </mesh>
  );
}

function ModelContent({
  cfg, explodeOpen, explodeFactor, xrayMode, xrayOpacity, showCadEdges,
  simMode, simSpeed, firstAidMode,
  highlightPart, selectedMeshKey, onPartHover, onPartClick,
  pinchPoint, scalpelClipPlane, showLabels, partLabelOf,
  chemProps,
}) {
  if (cfg.isChemistryLab) {
    return (
      <ChemistryLab3DContent
        {...(chemProps || {})}
        selectedMeshKey={selectedMeshKey}
        onPartClick={onPartClick}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'helicopter_ah64') {
    return (
      <ProceduralHelicopter
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        simMode={simMode}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'jwst_telescope') {
    return (
      <ProceduralJWST
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'v8_engine') {
    return (
      <ProceduralV8Engine
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        simMode={simMode}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'tactical_drone') {
    return (
      <ProceduralMavicDrone
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        showCadEdges={showCadEdges}
        simMode={simMode}
        simSpeed={simSpeed}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
        pinchPoint={pinchPoint}
        showLabels={showLabels}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'fixed_wing_uav') {
    return (
      <ProceduralFixedWingUAV
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        showCadEdges={showCadEdges}
        simMode={simMode}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
        pinchPoint={pinchPoint}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'jet_fighter') {
    return (
      <ProceduralJetFighter
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        showCadEdges={showCadEdges}
        simMode={simMode}
        simSpeed={simSpeed}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
        pinchPoint={pinchPoint}
        showLabels={showLabels}
      />
    );
  }
  if (cfg.isProcedural && cfg.id === 'solar_system') {
    return (
      <ProceduralSolarSystem
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        xrayMode={xrayMode}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
        pinchPoint={pinchPoint}
      />
    );
  }
  if (cfg.file) {
    return (
      <GLBScene
        key={cfg.id}
        modelCfg={cfg}
        explodeOpen={explodeOpen}
        explodeFactor={explodeFactor}
        xrayMode={xrayMode}
        xrayOpacity={xrayOpacity}
        showCadEdges={showCadEdges}
        simMode={simMode}
        simSpeed={simSpeed}
        firstAidMode={firstAidMode}
        highlightPart={highlightPart}
        selectedMeshKey={selectedMeshKey}
        onPartHover={onPartHover}
        onPartClick={onPartClick}
        pinchPoint={pinchPoint}
        scalpelClipPlane={scalpelClipPlane}
        showLabels={showLabels}
        partLabelOf={partLabelOf}
      />
    );
  }
  return <Spinner />;
}

export default function ModelScene({
  modelCfg, rotation, scale,
  panMode = false,
  highlightPart, onPartHover, onPartClick,
  explodeOpen, explodeFactor = 1.0,
  xrayMode = false, xrayOpacity = 0.22,
  showCadEdges = true,
  simMode = false, simSpeed = 0, simSteer = 0, simPitch = 0,
  firstAidMode = false,
  selectedMeshKey, pinchPoint,
  scalpelClipPlane,
  showLabels = false,
  partLabelOf, hideRoom = false, captureRef, compareCfg = null,
  compareSelectedKey = null, onComparePartHover, onComparePartClick,
  chemProps = null,
}) {
  const dual = Boolean(compareCfg);

  const [mouseRot, setMouseRot]     = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset]   = useState({ x: 0, y: 0 });
  const [wheelScale, setWheelScale] = useState(1.0);
  const drag = useRef(null);

  useEffect(() => {
    setMouseRot({ x: 0, y: 0 });
    setPanOffset({ x: 0, y: 0 });
    setWheelScale(1.0);
  }, [modelCfg.id]);

  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, rot: { ...mouseRot }, pan: { ...panOffset } };
  }, [mouseRot, panOffset]);

  const onMouseMove = useCallback(e => {
    if (!drag.current) return;
    if (panMode || e.shiftKey) {
      const dx = (e.clientX - drag.current.x) * 0.003;
      const dy = -(e.clientY - drag.current.y) * 0.003;
      setPanOffset({ x: drag.current.pan.x + dx, y: drag.current.pan.y + dy });
    } else {
      const dx = (e.clientX - drag.current.x) * 0.006;
      const dy = (e.clientY - drag.current.y) * 0.005;
      setMouseRot({ y: drag.current.rot.y + dx, x: drag.current.rot.x + dy });
    }
  }, [panMode]);

  const onMouseUp = useCallback(() => { drag.current = null; }, []);

  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = e => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.09;
      setWheelScale(s => Math.min(8.0, Math.max(0.1, s * factor)));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const effectiveRot = {
    x: rotation.x + mouseRot.x,
    y: rotation.y + mouseRot.y,
  };
  const effectiveScale = scale * wheelScale;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <Canvas
        camera={{ position: [0, 0.25, 4.7], fov: 38, near: 0.01, far: 2000 }}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { if (captureRef) captureRef.current = gl.domElement; }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        dpr={[1, 2]}
      >
        <StudioLights xrayMode={xrayMode} />
        {!hideRoom && (
          <HolographicStudioStage
            xrayMode={xrayMode}
            explodeOpen={explodeOpen}
            simMode={simMode}
            simSpeed={simSpeed}
          />
        )}

        <group position={dual ? [-0.98, 0, 0] : [0, 0, 0]}>
          <SceneGroup
            rotation={effectiveRot}
            panOffset={panOffset}
            scale={effectiveScale * (dual ? 0.38 : 1)}
            simMode={simMode}
            simSteer={simSteer}
            simPitch={simPitch}
          >
            <ModelErrorBoundary resetKey={modelCfg.id}>
              <Suspense fallback={<Spinner />}>
                <ModelContent
                  cfg={modelCfg}
                  explodeOpen={explodeOpen}
                  explodeFactor={explodeFactor}
                  xrayMode={xrayMode}
                  xrayOpacity={xrayOpacity}
                  showCadEdges={showCadEdges}
                  simMode={simMode}
                  simSpeed={simSpeed}
                  firstAidMode={firstAidMode}
                  highlightPart={highlightPart}
                  selectedMeshKey={selectedMeshKey}
                  onPartHover={onPartHover}
                  onPartClick={onPartClick}
                  pinchPoint={pinchPoint}
                  scalpelClipPlane={scalpelClipPlane}
                  showLabels={showLabels}
                  partLabelOf={partLabelOf}
                  chemProps={chemProps}
                />
              </Suspense>
            </ModelErrorBoundary>
          </SceneGroup>
        </group>

        {dual && (
          <group position={[0.98, 0, 0]}>
            <SceneGroup rotation={effectiveRot} scale={effectiveScale * 0.38}>
              <ModelErrorBoundary resetKey={compareCfg.id}>
                <Suspense fallback={<Spinner />}>
                  <ModelContent
                    cfg={compareCfg}
                    explodeOpen={explodeOpen}
                    explodeFactor={explodeFactor}
                    xrayMode={xrayMode}
                    xrayOpacity={xrayOpacity}
                    showCadEdges={showCadEdges}
                    highlightPart={compareSelectedKey}
                    selectedMeshKey={compareSelectedKey}
                    onPartHover={onComparePartHover}
                    onPartClick={onComparePartClick}
                    pinchPoint={pinchPoint}
                    showLabels={showLabels}
                    partLabelOf={partLabelOf}
                  />
                </Suspense>
              </ModelErrorBoundary>
            </SceneGroup>
          </group>
        )}
      </Canvas>
    </div>
  );
}