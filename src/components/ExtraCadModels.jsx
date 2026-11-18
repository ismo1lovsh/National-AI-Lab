import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function useCadMat(baseColor, { isShell = false, xrayMode = false, xrayOpacity = 0.22, isActive = false, metalness = 0.65, roughness = 0.3, emissive = null } = {}) {
  const transparent = xrayMode && isShell;
  const opacity = transparent ? xrayOpacity : 1.0;
  const color = transparent ? '#38bdf8' : baseColor;
  const emColor = isActive ? '#00e5ff' : transparent ? '#0284c7' : (emissive || '#000000');
  const emInt = isActive ? 0.55 : transparent ? 0.35 : (emissive ? 0.35 : 0);

  return {
    color,
    emissive: emColor,
    emissiveIntensity: emInt,
    transparent,
    opacity,
    metalness: transparent ? 0.15 : metalness,
    roughness: transparent ? 0.12 : roughness,
    depthWrite: !transparent,
  };
}

function ExplodePartGroup({ partKey, explodeOpen, explodeFactor = 1.0, explodeVec = [0, 0, 0], onPartHover, onPartClick, label, children }) {
  const ref = useRef();
  const f = THREE.MathUtils.clamp(explodeFactor, 0.3, 1.6);

  useFrame(() => {
    if (!ref.current) return;
    const tx = explodeOpen ? explodeVec[0] * f : 0;
    const ty = explodeOpen ? explodeVec[1] * f : 0;
    const tz = explodeOpen ? explodeVec[2] * f : 0;
    ref.current.position.lerp(new THREE.Vector3(tx, ty, tz), 0.14);
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPartHover?.(partKey, label);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onPartHover?.(null, null);
        document.body.style.cursor = 'default';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPartClick?.(partKey, label);
      }}
    >
      {children}
    </group>
  );
}

// 1. TAKTIK VERTOLYOT (AH-64 / H145 HELICOPTER — 6 ASOSIY QISM + X-RAY TURBINA)
export function ProceduralHelicopter({
  modelCfg, explodeOpen, explodeFactor, xrayMode, xrayOpacity,
  simMode, highlightPart, selectedMeshKey, onPartHover, onPartClick,
}) {
  const rotorRef = useRef();
  const tailRotorRef = useRef();
  const isSel = (k) => highlightPart === k || selectedMeshKey === k;

  useFrame((_, dt) => {
    const spd = simMode ? 24 : 5.5;
    if (rotorRef.current) rotorRef.current.rotation.y += dt * spd;
    if (tailRotorRef.current) tailRotorRef.current.rotation.x += dt * spd * 1.4;
  });

  const shellMat = useCadMat('#3f4a3c', { isShell: true, xrayMode, xrayOpacity, isActive: isSel('fuselage'), metalness: 0.55, roughness: 0.35 });
  const canopyMat = useCadMat('#0ea5e9', { isShell: true, xrayMode, xrayOpacity: Math.max(0.25, xrayOpacity), isActive: isSel('cockpit_avionics'), metalness: 0.2, roughness: 0.08 });
  const rotorMat = useCadMat('#1e293b', { isActive: isSel('main_rotor'), metalness: 0.75, roughness: 0.25 });
  const engineMat = useCadMat('#d97706', { isActive: isSel('turboshaft_engine'), metalness: 0.88, roughness: 0.2, emissive: xrayMode ? '#f59e0b' : null });
  const tailMat = useCadMat('#475569', { isShell: true, xrayMode, xrayOpacity, isActive: isSel('tail_boom'), metalness: 0.55, roughness: 0.35 });
  const gearMat = useCadMat('#334155', { isActive: isSel('landing_wings'), metalness: 0.75, roughness: 0.3 });

  return (
    <group rotation={modelCfg.initialRotation || [0.14, -0.58, 0]} scale={0.92}>
      <ExplodePartGroup partKey="main_rotor" label="Main Rotor (4-Kurakli Vint)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.52, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <group ref={rotorRef} position={[0, 0.44, 0]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.08, 0.14, 20]} />
            <meshStandardMaterial {...rotorMat} />
          </mesh>
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
            <group key={i} rotation={[0, ang, 0]}>
              <mesh position={[0.72, 0.02, 0]}>
                <boxGeometry args={[1.38, 0.015, 0.095]} />
                <meshStandardMaterial {...rotorMat} />
              </mesh>
              <mesh position={[1.36, 0.02, 0]}>
                <boxGeometry args={[0.12, 0.016, 0.095]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
            </group>
          ))}
        </group>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="fuselage" label="Fuselage (Zirhli Fyuzelyaj)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.05, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.05, 0]} scale={[0.92, 0.82, 2.2]}>
          <boxGeometry args={[0.52, 0.46, 0.72]} />
          <meshStandardMaterial {...shellMat} />
        </mesh>
        <mesh position={[0, 0.28, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.21, 0.85, 16]} />
          <meshStandardMaterial {...shellMat} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="cockpit_avionics" label="Cockpit & Avionics (Kabina va Optika)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.12, 0.56]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.07, 0.92]} rotation={[0.36, 0, 0]}>
          <boxGeometry args={[0.38, 0.30, 0.48]} />
          <meshStandardMaterial {...canopyMat} />
        </mesh>
        <mesh position={[0, 0.02, 0.86]}>
          <boxGeometry args={[0.24, 0.14, 0.26]} />
          <meshStandardMaterial color="#00e5ff" emissive="#0284c7" emissiveIntensity={xrayMode ? 0.9 : 0.2} />
        </mesh>
        <mesh position={[0, -0.04, 1.24]}>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.18} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="turboshaft_engine" label="Twin Turboshaft Engines & Gearbox" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.44, -0.25]} onPartHover={onPartHover} onPartClick={onPartClick}>
        {[-0.22, 0.22].map((x, idx) => (
          <group key={idx} position={[x, 0.24, -0.10]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.10, 0.11, 0.68, 20]} />
              <meshStandardMaterial {...engineMat} />
            </mesh>
            <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.105, 0.015, 10, 24]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.22, 0.0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.24, 20]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={xrayMode ? 0.65 : 0.15} metalness={0.85} roughness={0.2} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="tail_boom" label="Tail Boom & Tail Rotor" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.12, -0.68]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.11, -1.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.14, 1.15, 18]} />
          <meshStandardMaterial {...tailMat} />
        </mesh>
        <mesh position={[0, 0.26, -1.78]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.04, 0.42, 0.18]} />
          <meshStandardMaterial {...tailMat} />
        </mesh>
        <group ref={tailRotorRef} position={[0.08, 0.34, -1.80]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          {[0, Math.PI / 2].map((ang, i) => (
            <mesh key={i} rotation={[ang, 0, 0]}>
              <boxGeometry args={[0.014, 0.36, 0.045]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          ))}
        </group>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="landing_wings" label="Landing Gear & Stub Wings" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.45, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.02, 0.05]}>
          <boxGeometry args={[1.45, 0.05, 0.28]} />
          <meshStandardMaterial {...gearMat} />
        </mesh>
        {[-0.28, 0.28].map((x, i) => (
          <group key={i} position={[x, -0.24, 0.32]}>
            <mesh rotation={[0, 0, x < 0 ? 0.25 : -0.25]}>
              <cylinderGeometry args={[0.022, 0.022, 0.34, 12]} />
              <meshStandardMaterial {...gearMat} />
            </mesh>
            <mesh position={[0, -0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.09, 0.09, 0.06, 20]} />
              <meshStandardMaterial color="#0f172a" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </ExplodePartGroup>
    </group>
  );
}

// 2. JAMES WEBB KOSMIK TELESKOPI (JWST — ASTRONOMIYA, 6 ASOSIY QISM + X-RAY)
export function ProceduralJWST({
  modelCfg, explodeOpen, explodeFactor, xrayMode, xrayOpacity,
  highlightPart, selectedMeshKey, onPartHover, onPartClick,
}) {
  const isSel = (k) => highlightPart === k || selectedMeshKey === k;

  const goldMirrors = useMemo(() => {
    const coords = [];
    const r = 0.145;
    for (let q = -2; q <= 2; q++) {
      for (let s = -2; s <= 2; s++) {
        if (Math.abs(q + s) <= 2 && !(q === 0 && s === 0)) {
          const x = r * Math.sqrt(3) * (q + s / 2);
          const y = r * 1.5 * s;
          coords.push([x, y]);
        }
      }
    }
    return coords;
  }, []);

  const shieldMat = useCadMat('#94a3b8', { isShell: true, xrayMode, xrayOpacity, isActive: isSel('sunshield'), metalness: 0.78, roughness: 0.22 });
  const mirrorMat = useCadMat('#f59e0b', { isActive: isSel('primary_mirror'), metalness: 0.96, roughness: 0.08, emissive: '#b45309' });
  const isimMat = useCadMat('#38bdf8', { isActive: isSel('isim_core'), metalness: 0.75, roughness: 0.2, emissive: xrayMode ? '#00e5ff' : '#0369a1' });

  return (
    <group rotation={modelCfg.initialRotation || [0.22, -0.45, 0]} scale={0.95}>
      <ExplodePartGroup partKey="primary_mirror" label="Primary Gold Mirror (18 Beryllium Hex)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.42, 0.25]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <group position={[0, 0.36, -0.15]}>
          {goldMirrors.map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.135, 0.135, 0.025, 6]} />
              <meshStandardMaterial {...mirrorMat} />
            </mesh>
          ))}
        </group>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="sunshield" label="5-Layer Kapton Sunshield" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.35, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        {[0, 1, 2, 3, 4].map((layer) => (
          <mesh key={layer} position={[0, -0.24 - layer * 0.032, 0]} scale={[1 - layer * 0.02, 1, 1 - layer * 0.02]}>
            <cylinderGeometry args={[0.92, 0.92, 0.008, 4]} />
            <meshStandardMaterial {...shieldMat} />
          </mesh>
        ))}
      </ExplodePartGroup>

      <ExplodePartGroup partKey="secondary_tripod" label="Secondary Mirror & Tripod" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.18, 0.65]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.36, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
          <meshStandardMaterial {...mirrorMat} />
        </mesh>
        {[
          [[0, 0.68, -0.15], [0, 0.36, 0.72]],
          [[-0.45, 0.08, -0.15], [0, 0.36, 0.72]],
          [[0.45, 0.08, -0.15], [0, 0.36, 0.72]],
        ].map(([a, b], idx) => {
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
          return (
            <mesh key={idx} position={mid} rotation={[idx === 0 ? 1.25 : 1.8, 0, idx === 1 ? -0.45 : idx === 2 ? 0.45 : 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.96, 10]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
            </mesh>
          );
        })}
      </ExplodePartGroup>

      <ExplodePartGroup partKey="isim_core" label="ISIM Science Instruments (NIRCam / MIRI)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.25, -0.55]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.32, -0.34]}>
          <boxGeometry args={[0.42, 0.42, 0.28]} />
          <meshStandardMaterial {...isimMat} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="spacecraft_bus" label="Spacecraft Bus & Solar Array" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.58, -0.2]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, -0.46, -0.15]}>
          <boxGeometry args={[0.44, 0.22, 0.44]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.48, -0.68]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.65]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#0284c7" emissiveIntensity={0.45} metalness={0.8} roughness={0.15} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="cryo_antenna" label="Cryo-Cooler & High-Gain Antenna" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0.48, -0.12, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0.32, -0.44, 0.05]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.14, 0.04, 0.06, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.2} />
        </mesh>
      </ExplodePartGroup>
    </group>
  );
}

// 3. V8 TWIN-TURBO DVIGATEL (MEXANIKA VA MUHANDISLIK — 6 ASOSIY QISM + X-RAY)
export function ProceduralV8Engine({
  modelCfg, explodeOpen, explodeFactor, xrayMode, xrayOpacity,
  simMode, highlightPart, selectedMeshKey, onPartHover, onPartClick,
}) {
  const crankRef = useRef();
  const isSel = (k) => highlightPart === k || selectedMeshKey === k;

  useFrame((_, dt) => {
    if (crankRef.current) {
      crankRef.current.rotation.z += dt * (simMode ? 18 : 3.5);
    }
  });

  const blockMat = useCadMat('#475569', { isShell: true, xrayMode, xrayOpacity, isActive: isSel('engine_block'), metalness: 0.78, roughness: 0.3 });
  const headMat = useCadMat('#64748b', { isShell: true, xrayMode, xrayOpacity, isActive: isSel('cylinder_heads'), metalness: 0.8, roughness: 0.25 });
  const pistonMat = useCadMat('#f59e0b', { isActive: isSel('pistons_crank'), metalness: 0.9, roughness: 0.15, emissive: xrayMode ? '#d97706' : null });

  return (
    <group rotation={modelCfg.initialRotation || [0.2, -0.55, 0]} scale={1.1}>
      <ExplodePartGroup partKey="engine_block" label="V8 Cylinder Block (Silindr Bloki)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.15, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.56, 0.42, 0.96]} />
          <meshStandardMaterial {...blockMat} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="cylinder_heads" label="Cylinder Heads & DOHC Valves" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.42, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        {[-0.24, 0.24].map((x, i) => (
          <mesh key={i} position={[x, 0.24, 0]} rotation={[0, 0, x < 0 ? 0.65 : -0.65]}>
            <boxGeometry args={[0.28, 0.16, 0.92]} />
            <meshStandardMaterial {...headMat} />
          </mesh>
        ))}
      </ExplodePartGroup>

      <ExplodePartGroup partKey="pistons_crank" label="8 Pistons & Crankshaft" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, -0.45, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <group ref={crankRef} position={[0, -0.14, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.02, 20]} />
            <meshStandardMaterial {...pistonMat} />
          </mesh>
        </group>
        {[-0.32, -0.11, 0.11, 0.32].map((z, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[-0.14, 0.08, z]} rotation={[0, 0, 0.65]}>
              <cylinderGeometry args={[0.065, 0.065, 0.12, 18]} />
              <meshStandardMaterial {...pistonMat} />
            </mesh>
            <mesh position={[0.14, 0.08, z]} rotation={[0, 0, -0.65]}>
              <cylinderGeometry args={[0.065, 0.065, 0.12, 18]} />
              <meshStandardMaterial {...pistonMat} />
            </mesh>
          </React.Fragment>
        ))}
      </ExplodePartGroup>

      <ExplodePartGroup partKey="twin_turbos" label="Twin Turbochargers (Ikki Turbina)" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0.52, 0.12, 0]} onPartHover={onPartHover} onPartClick={onPartClick}>
        {[-0.44, 0.44].map((x, i) => (
          <group key={i} position={[x, 0.08, 0.15]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.10, 0.045, 14, 24]} />
              <meshStandardMaterial color="#e11d48" emissive={xrayMode ? '#f43f5e' : '#000'} emissiveIntensity={0.45} metalness={0.85} roughness={0.22} />
            </mesh>
          </group>
        ))}
      </ExplodePartGroup>

      <ExplodePartGroup partKey="intake_manifold" label="Intake Manifold & Intercooler" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0.56, 0.15]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[0.32, 0.14, 0.78]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.25} />
        </mesh>
      </ExplodePartGroup>

      <ExplodePartGroup partKey="timing_flywheel" label="Timing Chain & Flywheel" explodeOpen={explodeOpen} explodeFactor={explodeFactor} explodeVec={[0, 0, 0.56]} onPartHover={onPartHover} onPartClick={onPartClick}>
        <mesh position={[0, -0.14, -0.54]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 28]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.05, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.04, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.2} />
        </mesh>
      </ExplodePartGroup>
    </group>
  );
}
