import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField({ count = 350 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const emerald = new THREE.Color('#10b981');
    const cyan = new THREE.Color('#06b6d4');
    const purple = new THREE.Color('#a855f7');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const rand = Math.random();
      const col = rand > 0.6 ? emerald : rand > 0.3 ? cyan : purple;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    return [pos, cols];
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x += delta * 0.05;
      pointsRef.current.rotation.y += delta * 0.08;
      
      // subtle mouse response
      const mouseX = (state.pointer.x * Math.PI) / 10;
      const mouseY = (state.pointer.y * Math.PI) / 10;
      pointsRef.current.rotation.x += (mouseY - pointsRef.current.rotation.x) * 0.02;
      pointsRef.current.rotation.y += (mouseX - pointsRef.current.rotation.y) * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function WireframeGrid() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={meshRef} rotation={[Math.PI / 3, 0, 0]}>
        <icosahedronGeometry args={[2.5, 1]} />
        <meshBasicMaterial
          wireframe
          color="#06b6d4"
          transparent
          opacity={0.18}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden glass-card border border-slate-800/80 my-6">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        className="absolute inset-0 z-0 pointer-events-auto"
      >
        <ambientLight intensity={0.5} />
        <ParticleField />
        <WireframeGrid />
      </Canvas>

      {/* Hero Banner Content Overlay */}
      <div className="relative z-10 p-8 flex flex-col justify-center h-full max-w-2xl pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider w-fit mb-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Autonomous Revenue Orchestration
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
          Maximize Merchant Retention & <span className="text-gradient-emerald">Net Profit Lift</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          AI-driven replenishment cycle detection, risk-aware offer simulation, and deterministic policy guardrails working in real-time.
        </p>
      </div>
    </div>
  );
}

