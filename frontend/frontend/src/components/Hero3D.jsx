import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as THREE from "three";
import { ArrowRight, Bot, AlertTriangle } from "lucide-react";

function ParticleField({ count = 420 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const mint = new THREE.Color("#2dd4a8");
    const sky = new THREE.Color("#38bdf8");
    const soft = new THREE.Color("#94a3b8");

    for (let i = 0; i < count; i++) {
      const radius = 1.2 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const pick = Math.random();
      const col = pick > 0.55 ? mint : pick > 0.25 ? sky : soft;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    return [pos, cols];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.07;
    pointsRef.current.rotation.x += delta * 0.025;

    const targetX = state.pointer.y * 0.35;
    const targetY = state.pointer.x * 0.45;
    pointsRef.current.rotation.x += (targetX - pointsRef.current.rotation.x) * 0.04;
    pointsRef.current.rotation.y += (targetY - pointsRef.current.rotation.y) * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OpportunityFunnel() {
  const group = useRef();

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.25;
    group.current.rotation.x = 0.35 + Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
  });

  const rings = [
    { y: 1.4, r: 2.1, color: "#2dd4a8", opacity: 0.55 },
    { y: 0.55, r: 1.55, color: "#38bdf8", opacity: 0.45 },
    { y: -0.25, r: 1.05, color: "#5eead4", opacity: 0.4 },
    { y: -0.95, r: 0.55, color: "#0d9f7a", opacity: 0.55 },
  ];

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={group} position={[1.8, 0.1, 0]}>
        {rings.map((ring) => (
          <mesh key={ring.y} position={[0, ring.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ring.r, 0.025, 12, 64]} />
            <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} />
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[1.9, 2.8, 4, 1, true]} />
          <meshBasicMaterial
            color="#2dd4a8"
            wireframe
            transparent
            opacity={0.18}
          />
        </mesh>
      </group>
    </Float>
  );
}

function Hero3DCanvas({ opportunityCount = 0, pipelineValue = 0 }) {
  const [hasWebGLError, setHasWebGLError] = useState(false);

  useEffect(() => {
    // Test WebGL support
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setHasWebGLError(true);
    }
  }, []);

  if (hasWebGLError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel rounded-2xl border border-amber-signal/30 bg-amber-signal/10 p-8 text-center"
      >
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-signal" />
        <h3 className="font-display text-lg font-bold text-white mb-2">
          3D Visualization Unavailable
        </h3>
        <p className="text-sm text-ink-muted mb-4 max-w-md mx-auto">
          Your browser doesn't support WebGL or it's disabled. The dashboard
          works fully without the 3D visualization.
        </p>
      </motion.div>
    );
  }

  return (
    <section id="overview" className="relative mt-4 overflow-hidden rounded-2xl border border-ink-border">
      <div className="absolute inset-0 bg-ink-elevated" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(45,212,168,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(56,189,248,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%_at_50%_100%,rgba(13,159,122,0.08),transparent_55%)]" />

      <div className="relative grid min-h-[300px] grid-cols-1 lg:min-h-[340px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:pr-4">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint live-dot" />
              Live growth operator
            </div>

            <h1 className="font-display max-w-xl text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
              Your AI operator found{" "}
              <span className="text-mint-gradient">
                {opportunityCount || "—"} revenue windows
              </span>{" "}
              ready to act on.
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-[15px]">
              Detect replenishment cycles, simulate offers under policy guardrails,
              and orchestrate campaigns that maximize expected net revenue —
              with you as the final decision-maker.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-mint-deep px-4 py-2.5 text-sm font-bold text-ink shadow-[0_10px_30px_-12px_rgba(45,212,168,0.65)] transition hover:brightness-110"
              >
                Review opportunities
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-xl border border-ink-border bg-ink/40 px-3.5 py-2.5 text-xs text-ink-soft backdrop-blur-md">
                <Bot className="h-4 w-4 text-sky" />
                Pipeline{" "}
                <strong className="font-semibold text-white">
                  ₹{Number(pipelineValue || 0).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative h-[220px] sm:h-[260px] lg:h-auto">
          <Canvas
            camera={{ position: [0, 0.4, 6.2], fov: 48 }}
            dpr={[1, 1.75]}
            className="absolute inset-0"
            gl={{
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: true,
              onContextLost: (e) => {
                e.preventDefault();
                console.warn('[Three.js] WebGL context lost, will attempt restore');
              },
              onContextRestored: (gl) => {
                console.log('[Three.js] WebGL context restored');
                gl.setClearColor(0x000000, 0);
              },
            }}
            onCreated={(state) => {
              state.gl.setClearColor(0x000000, 0);
            }}
          >
            <ambientLight intensity={0.55} />
            <pointLight position={[4, 3, 2]} intensity={0.8} color="#2dd4a8" />
            <pointLight position={[-3, -1, 2]} intensity={0.45} color="#38bdf8" />
            <ParticleField count={280} />
            <OpportunityFunnel />
          </Canvas>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-elevated to-transparent lg:hidden" />
        </div>
      </div>
    </section>
  );
}

export default function Hero3D({ opportunityCount = 0, pipelineValue = 0 }) {
  return <Hero3DCanvas opportunityCount={opportunityCount} pipelineValue={pipelineValue} />;
}