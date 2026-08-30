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

// Claude Warmth 5-Stage Funnel Palette
const FUNNEL_STAGES = [
  {
    key: "audience",
    label: "Audience Target",
    y: 1.8,
    radius: 2.2,
    color: "#B8A898", // Warm Sandstone
    icon: Users,
    desc: "Total identified customer cohort size",
  },
  {
    key: "delivered",
    label: "Delivered (WhatsApp / SMTP)",
    y: 0.9,
    radius: 1.75,
    color: "#C97A56", // Warm Copper
    icon: Mail,
    desc: "Direct-to-consumer delivery confirmations",
  },
  {
    key: "opened",
    label: "Opened (Read Receipt)",
    y: 0.0,
    radius: 1.35,
    color: "#D97757", // Warm Terracotta
    icon: Eye,
    desc: "Message read receipt & tracking pixel triggers",
  },
  {
    key: "clicked",
    label: "Clicked (1-Tap Link)",
    y: -0.9,
    radius: 0.95,
    color: "#E5A93C", // Rich Amber
    icon: MousePointer,
    desc: "Personalized Razorpay checkout destination clicks",
  },
  {
    key: "purchased",
    label: "Orders Attributed",
    y: -1.8,
    radius: 0.55,
    color: "#7C9A82", // Sage Green / Gold
    icon: ShoppingBag,
    desc: "Razorpay checkouts & 14-day window conversions",
  },
];

// Warm particle stream cascading through 5 funnel tiers
function CascadingParticles({ count = 160 }) {
  const pointsRef = useRef();

  const [positions, colors, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const spd = new Float32Array(count);

    const terracotta = new THREE.Color("#D97757");
    const amber = new THREE.Color("#E5A93C");
    const champagne = new THREE.Color("#E8C59D");
    const sage = new THREE.Color("#7C9A82");

    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 4.2;
      const progress = (2.1 - y) / 4.2; // 0 at top, 1 at bottom
      const maxR = (1 - progress * 0.75) * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * maxR;

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      const col = progress > 0.8 ? sage : progress > 0.4 ? amber : progress > 0.2 ? terracotta : champagne;
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
        opacity={0.85}
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
              ? "bg-[#201E1A]/95 border-[#D97757] text-white scale-105"
              : "bg-[#181714]/85 border-[rgba(220,205,185,0.12)] text-[#DDD6CD]"
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
          color="#D97757"
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
    <section className="mb-8 rounded-3xl border border-[rgba(220,205,185,0.14)] bg-gradient-to-b from-[#201E1A] to-[#181714] p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 text-[#D97757] shadow-[0_0_20px_-4px_rgba(217,119,87,0.4)]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              Isometric 3D Conversion Vortex
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#7C9A82] border border-[#7C9A82]/30 bg-[#7C9A82]/10 px-2 py-0.5 rounded-full">
                {overallConversionPct}% Net Conversion
              </span>
            </h2>
            <p className="text-xs text-[#9E978E] mt-0.5">
              Translucent 3D tiered fluid funnel. Inspect stage-by-stage drop-off and conversion rates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#DDD6CD] bg-[#181714] border border-[rgba(220,205,185,0.14)] px-3 py-1.5 rounded-xl">
          <TrendingUp className="h-3.5 w-3.5 text-[#7C9A82]" />
          <span>{stageCounts.purchased} Orders Attributed</span>
        </div>
      </div>

      {/* 3D Funnel Canvas Viewport */}
      <div className="relative h-[380px] sm:h-[430px] w-full rounded-2xl overflow-hidden border border-[rgba(220,205,185,0.1)] bg-[#181714]">
        <Canvas
          camera={{ position: [2.8, 1.8, 4.8], fov: 46 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.7} />
          <pointLight position={[5, 5, 4]} intensity={1.3} color="#D97757" />
          <pointLight position={[-5, -4, 3]} intensity={0.9} color="#E5A93C" />
          <pointLight position={[0, -4, -3]} intensity={0.8} color="#E8C59D" />

          <FunnelGlassCone />
          <CascadingParticles count={160} />

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
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs rounded-2xl border bg-[#201E1A]/95 p-3.5 shadow-2xl backdrop-blur-2xl z-20"
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
                <span className="text-[10px] font-mono text-white bg-[#181714] px-2 py-0.5 rounded border border-[rgba(220,205,185,0.12)]">
                  {stageCounts[activeStageConfig.key]} Recipients
                </span>
              </div>

              <p className="text-[11px] text-[#DDD6CD] mt-2 leading-relaxed">
                {activeStageConfig.desc}
              </p>

              <div className="mt-2.5 pt-2 border-t border-[rgba(220,205,185,0.1)] flex items-center justify-between text-[11px]">
                <span className="text-[#9E978E]">Conversion from Target:</span>
                <span className="font-bold text-[#7C9A82] font-mono">
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
