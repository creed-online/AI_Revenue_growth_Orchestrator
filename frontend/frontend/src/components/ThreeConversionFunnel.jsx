import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  Layers,
  Users,
  Mail,
  Eye,
  MousePointer,
  ShoppingBag,
  Zap,
  TrendingUp,
  Percent,
} from "lucide-react";

// Stage definitions for the 5-stage funnel
const FUNNEL_STAGES = [
  {
    key: "audience",
    label: "Audience Target",
    y: 1.8,
    radius: 2.2,
    color: "#64748b",
    icon: Users,
    desc: "Total identified customer cohort size",
  },
  {
    key: "delivered",
    label: "Email Delivered",
    y: 0.9,
    radius: 1.75,
    color: "#38bdf8",
    icon: Mail,
    desc: "Universal SMTP delivery confirmations",
  },
  {
    key: "opened",
    label: "Opened (Pixel)",
    y: 0.0,
    radius: 1.35,
    color: "#818cf8",
    icon: Eye,
    desc: "1x1 transparent open-tracking pixel triggers",
  },
  {
    key: "clicked",
    label: "Clicked (CTA)",
    y: -0.9,
    radius: 0.95,
    color: "#14b8a6",
    icon: MousePointer,
    desc: "Storefront destination link redirect tokens",
  },
  {
    key: "purchased",
    label: "Orders Attributed",
    y: -1.8,
    radius: 0.55,
    color: "#2dd4a8",
    icon: ShoppingBag,
    desc: "Razorpay checkouts & 14-day window conversions",
  },
];

// Particle stream cascading through the 5 funnel tiers
function CascadingParticles({ count = 160 }) {
  const pointsRef = useRef();

  const [positions, colors, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const spd = new Float32Array(count);

    const mint = new THREE.Color("#2dd4a8");
    const sky = new THREE.Color("#38bdf8");
    const gold = new THREE.Color("#fbbf24");

    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 4.2;
      const progress = (2.1 - y) / 4.2; // 0 at top, 1 at bottom
      const maxR = (1 - progress * 0.75) * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * maxR;

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      const col = progress > 0.8 ? gold : progress > 0.4 ? mint : sky;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;

      spd[i] = 0.8 + Math.random() * 1.4;
    }
    return [pos, cols, spd];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const positionsAttr = pointsRef.current.geometry.attributes.position;
    const posArray = positionsAttr.array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] -= delta * speeds[i]; // move down
      if (posArray[i * 3 + 1] < -2.1) {
        posArray[i * 3 + 1] = 2.1; // reset to top
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 1.8;
        posArray[i * 3] = r * Math.cos(theta);
        posArray[i * 3 + 2] = r * Math.sin(theta);
      }
    }
    positionsAttr.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.15;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Single 3D Glass Tier Ring
function FunnelGlassTier({
  stage,
  count,
  totalAudience,
  isHovered,
  isDimmed,
  onHover,
  onUnhover,
}) {
  const meshRef = useRef();
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.2;
    }
  });

  const color = new THREE.Color(stage.color);
  const opacity = isHovered ? 0.9 : isDimmed ? 0.2 : 0.55;

  return (
    <group position={[0, stage.y, 0]}>
      {/* Translucent Glass Disc Plate */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(stage.key);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover();
        }}
      >
        <cylinderGeometry args={[stage.radius, stage.radius * 0.95, 0.08, 32, 1, false]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.9 : 0.25}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Outer Glowing Wire Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[stage.radius + 0.04, 0.02, 12, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHovered ? 0.95 : 0.45}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Floating 3D Plate Label */}
      <Html
        position={[stage.radius + 0.4, 0, 0]}
        center
        distanceFactor={6.5}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all select-none whitespace-nowrap shadow-xl ${
            isHovered
              ? "bg-[#070e1c]/95 border-mint text-white scale-105"
              : "bg-[#0b1120]/75 border-slate-800 text-slate-300"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="font-mono text-[11px] font-bold">{stage.label}</span>
            <span className="text-[10px] font-bold text-white font-mono bg-white/10 px-1.5 py-0.2 rounded">
              {count}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// 3D Translucent Glass Cone Framing
function FunnelGlassCone() {
  const coneRef = useRef();

  useFrame((_, delta) => {
    if (!coneRef.current) return;
    coneRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={coneRef}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2.3, 0.4, 3.8, 32, 4, true]} />
        <meshBasicMaterial
          color="#2dd4a8"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}

export default function ThreeConversionFunnel({
  funnelData = {
    audienceSize: 3,
    delivered: 3,
    opened: 2,
    clicked: 2,
    conversions: 2,
  },
}) {
  const [hoveredStage, setHoveredStage] = useState(null);

  const stageCounts = useMemo(() => {
    return {
      audience: funnelData.audienceSize || 0,
      delivered: funnelData.delivered || 0,
      opened: funnelData.opened || 0,
      clicked: funnelData.clicked || 0,
      purchased: funnelData.conversions || 0,
    };
  }, [funnelData]);

  const activeStageConfig = hoveredStage
    ? FUNNEL_STAGES.find((s) => s.key === hoveredStage)
    : null;

  const overallConversionPct =
    stageCounts.audience > 0
      ? ((stageCounts.purchased / stageCounts.audience) * 100).toFixed(1)
      : "0.0";

  return (
    <section className="mb-8 rounded-3xl border border-ink-border bg-gradient-to-b from-[#080d1a] to-[#040711] p-5 sm:p-7 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_20px_-4px_rgba(45,212,168,0.5)]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              Isometric 3D Conversion Funnel
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mint border border-mint/30 bg-mint/10 px-2 py-0.5 rounded-full">
                {overallConversionPct}% Net Conversion
              </span>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Translucent 3D tiered fluid funnel. Inspect stage-by-stage drop-off and conversion rates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-teal-300 bg-teal-950/40 border border-teal-500/30 px-3 py-1.5 rounded-xl">
          <TrendingUp className="h-3.5 w-3.5 text-mint" />
          <span>{stageCounts.purchased} Buyers Captured</span>
        </div>
      </div>

      {/* 3D Funnel Canvas Viewport */}
      <div className="relative h-[380px] sm:h-[430px] w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-[#050813]/95">
        <Canvas
          camera={{ position: [2.8, 1.8, 4.8], fov: 46 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.7} />
          <pointLight position={[5, 5, 4]} intensity={1.3} color="#2dd4a8" />
          <pointLight position={[-5, -4, 3]} intensity={0.9} color="#38bdf8" />
          <pointLight position={[0, -4, -3]} intensity={0.8} color="#fbbf24" />

          <FunnelGlassCone />
          <CascadingParticles count={160} />

          {/* Render 5 Glass Tier Plates */}
          {FUNNEL_STAGES.map((stage) => {
            const isHovered = hoveredStage === stage.key;
            const isDimmed = hoveredStage !== null && !isHovered;

            return (
              <FunnelGlassTier
                key={stage.key}
                stage={stage}
                count={stageCounts[stage.key]}
                totalAudience={stageCounts.audience}
                isHovered={isHovered}
                isDimmed={isDimmed}
                onHover={setHoveredStage}
                onUnhover={() => setHoveredStage(null)}
              />
            );
          })}

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Hover HUD Inspector */}
        <AnimatePresence>
          {activeStageConfig && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs rounded-2xl border border-ink-border bg-[#070e1c]/95 p-3.5 shadow-2xl backdrop-blur-2xl z-20"
              style={{ borderColor: `${activeStageConfig.color}60` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-bold text-xs flex items-center gap-1.5"
                  style={{ color: activeStageConfig.color }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: activeStageConfig.color }}
                  />
                  {activeStageConfig.label}
                </span>
                <span className="text-[10px] font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {stageCounts[activeStageConfig.key]} Recipients
                </span>
              </div>

              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                {activeStageConfig.desc}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Conversion from Target:</span>
                <span className="font-bold text-mint font-mono">
                  {stageCounts.audience > 0
                    ? Math.round((stageCounts[activeStageConfig.key] / stageCounts.audience) * 100)
                    : 0}%
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

