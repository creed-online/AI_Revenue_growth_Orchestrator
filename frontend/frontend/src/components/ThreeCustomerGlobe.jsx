import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  Globe,
  Sparkles,
  Users,
  Crown,
  Repeat,
  Percent,
  Clock,
  Zap,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";

// Vibrant, high-contrast cohort definitions
const COHORT_CONFIG = {
  vip: {
    label: "VIP Whales",
    color: "#facc15", // Ultra-bright Solar Gold
    emissive: "#fef08a",
    icon: Crown,
    count: 32,
    aov: "₹6,450",
    desc: "Top 10% spenders with highest repeat purchase frequency",
    action: "Exclusive VIP early access & loyalty bundles",
    bandY: 1.35,
    bandRadius: 2.1,
  },
  replenishing: {
    label: "Replenishing Due",
    color: "#10b981", // Vivid Emerald Mint
    emissive: "#34d399",
    icon: Repeat,
    count: 48,
    aov: "₹3,200",
    desc: "Customers reaching estimated 30-45 day product depletion cycle",
    action: "Automated replenishment prompt with 10% discount",
    bandY: 0.35,
    bandRadius: 2.45,
  },
  discount: {
    label: "Price Sensitive",
    color: "#06b6d4", // Electric Cyan
    emissive: "#38bdf8",
    icon: Percent,
    count: 56,
    aov: "₹2,100",
    desc: "Shoppers who convert predominantly during coupon events",
    action: "Margin-safe targeted flash discounts",
    bandY: -0.65,
    bandRadius: 2.2,
  },
  dormant: {
    label: "Dormant / At-Risk",
    color: "#f43f5e", // Radiant Coral Rose
    emissive: "#fb7185",
    icon: Clock,
    count: 24,
    aov: "₹2,800",
    desc: "No transactions in 60+ days; high churn probability",
    action: "Personalized win-back voucher",
    bandY: -1.45,
    bandRadius: 1.8,
  },
};

// Generates clean, evenly spaced orbital points along each latitude band
function generateBandPoints(cohortKey, count, yPos, radius) {
  const points = [];
  const step = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    // Distribute around ring with subtle organic wave offset
    const angle = i * step;
    const wave = Math.sin(angle * 3) * 0.12;
    const r = radius + (Math.sin(i * 5) * 0.08);
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    const y = yPos + wave;

    points.push({
      id: `${cohortKey}-${i}`,
      pos: [x, y, z],
      cohortKey,
      size: cohortKey === "vip" ? 0.095 : 0.08,
    });
  }
  return points;
}

// Clean neutral space starfield
function NeutralStarfield({ count = 150 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const white = new THREE.Color("#e2e8f0");
    const cyan = new THREE.Color("#38bdf8");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;

      const col = Math.random() > 0.4 ? white : cyan;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    return [pos, cols];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Minimalistic glowing celestial core
function CelestialCore() {
  const coreRef = useRef();
  const wireRef = useRef();

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.05;
    if (wireRef.current) wireRef.current.rotation.y -= delta * 0.03;
  });

  return (
    <group>
      {/* Dark Obsidian Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[2.3, 32, 32]} />
        <meshStandardMaterial
          color="#060b18"
          roughness={0.8}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Clean Latitude Grid Wireframe */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.32, 16, 12]} />
        <meshBasicMaterial
          color="#1e293b"
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

// Single Cohort Band (Rings + Customer Nodes + 3D Marker)
function CohortBand({
  cohortKey,
  config,
  points,
  activeFilter,
  hoveredCohort,
  onHover,
  onUnhover,
}) {
  const groupRef = useRef();
  const ringRef = useRef();

  const isSelected = activeFilter === "all" || activeFilter === cohortKey;
  const isHovered = hoveredCohort === cohortKey;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.06;
  });

  const nodeColor = new THREE.Color(config.color);
  const emissiveColor = new THREE.Color(config.emissive);
  const opacity = isHovered ? 1.0 : isSelected ? 0.95 : 0.2;
  const ringOpacity = isHovered ? 0.65 : isSelected ? 0.35 : 0.08;

  return (
    <group ref={groupRef}>
      {/* Orbital Ring Guide */}
      <mesh position={[0, config.bandY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.bandRadius, 0.012, 8, 64]} />
        <meshBasicMaterial
          color={nodeColor}
          transparent
          opacity={ringOpacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Customer Node Particles */}
      {points.map((pt) => (
        <mesh
          key={pt.id}
          position={pt.pos}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(cohortKey);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onUnhover();
          }}
        >
          <sphereGeometry args={[isHovered ? pt.size * 1.35 : pt.size, 16, 16]} />
          <meshStandardMaterial
            color={nodeColor}
            emissive={emissiveColor}
            emissiveIntensity={isHovered ? 2.2 : isSelected ? 1.2 : 0.3}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ThreeCustomerGlobe() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [hoveredCohort, setHoveredCohort] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate clean, high-visibility orbital bands
  const bandPoints = useMemo(() => {
    return {
      vip: generateBandPoints("vip", COHORT_CONFIG.vip.count, COHORT_CONFIG.vip.bandY, COHORT_CONFIG.vip.bandRadius),
      replenishing: generateBandPoints("replenishing", COHORT_CONFIG.replenishing.count, COHORT_CONFIG.replenishing.bandY, COHORT_CONFIG.replenishing.bandRadius),
      discount: generateBandPoints("discount", COHORT_CONFIG.discount.count, COHORT_CONFIG.discount.bandY, COHORT_CONFIG.discount.bandRadius),
      dormant: generateBandPoints("dormant", COHORT_CONFIG.dormant.count, COHORT_CONFIG.dormant.bandY, COHORT_CONFIG.dormant.bandRadius),
    };
  }, []);

  const totalCustomers = useMemo(() => {
    return Object.values(COHORT_CONFIG).reduce((sum, c) => sum + c.count, 0);
  }, []);

  const activeCohortData = hoveredCohort
    ? COHORT_CONFIG[hoveredCohort]
    : activeFilter !== "all"
    ? COHORT_CONFIG[activeFilter]
    : null;

  return (
    <section className="mt-8 rounded-3xl border border-ink-border bg-gradient-to-b from-[#080d1a] to-[#040711] p-5 sm:p-7 shadow-2xl overflow-hidden relative">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 z-10 relative">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_20px_-4px_rgba(45,212,168,0.5)]">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
                3D Customer Retention Galaxy
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-mint border border-mint/30 bg-mint/10 px-2.5 py-0.5 rounded-full">
                  {totalCustomers} Tracked Shoppers
                </span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Spatial customer retention universe. Structured by high-spend VIPs, replenishment windows, and dormant cohorts.
              </p>
            </div>
          </div>
        </div>

        {/* Cohort Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-ink/60 border border-ink-border p-1.5 rounded-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeFilter === "all"
                ? "bg-mint text-ink font-bold shadow"
                : "text-ink-muted hover:text-white hover:bg-white/5"
            }`}
          >
            All Cohorts ({totalCustomers})
          </button>

          {Object.entries(COHORT_CONFIG).map(([key, cfg]) => {
            const isCurrent = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(isCurrent ? "all" : key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-white/10 text-white border border-white/20 shadow"
                    : "text-ink-muted hover:text-white hover:bg-white/5"
                }`}
                style={{ color: isCurrent ? cfg.color : undefined }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="hidden sm:inline">{cfg.label}</span>
                <span className="sm:hidden">{cfg.label.split(" ")[0]}</span>
                <span className="text-[10px] opacity-70">({cfg.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-800/80 bg-[#050813]/95 transition-all duration-300 ${
          isExpanded ? "h-[560px]" : "h-[360px] sm:h-[420px]"
        }`}
      >
        <Canvas
          camera={{ position: [0, 0.4, 6.4], fov: 44 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[6, 5, 4]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-6, -4, 3]} intensity={1.0} color="#38bdf8" />

          <NeutralStarfield count={150} />
          <CelestialCore />

          {/* Render 4 Clean Cohort Bands */}
          {Object.entries(COHORT_CONFIG).map(([key, cfg]) => (
            <CohortBand
              key={key}
              cohortKey={key}
              config={cfg}
              points={bandPoints[key]}
              activeFilter={activeFilter}
              hoveredCohort={hoveredCohort}
              onHover={setHoveredCohort}
              onUnhover={() => setHoveredCohort(null)}
            />
          ))}

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Top-Right Expand Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-ink/70 text-slate-400 hover:text-white transition backdrop-blur-md z-20"
          title={isExpanded ? "Collapse View" : "Expand 3D Canvas"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Floating Interactive Cohort Intelligence HUD */}
        <AnimatePresence>
          {activeCohortData && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm rounded-2xl border border-ink-border bg-[#070e1c]/95 p-4 shadow-2xl backdrop-blur-2xl z-20"
              style={{ borderColor: `${activeCohortData.color}80` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex items-center gap-1.5 text-xs font-bold font-display"
                  style={{ color: activeCohortData.color }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full animate-ping"
                    style={{ backgroundColor: activeCohortData.color }}
                  />
                  {activeCohortData.label}
                </span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  {activeCohortData.count} Shoppers ({Math.round((activeCohortData.count / totalCustomers) * 100)}%)
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-ink/40 p-2">
                  <p className="text-[10px] text-slate-400">Cohort Avg Spend</p>
                  <p className="font-bold text-white mt-0.5">{activeCohortData.aov}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-ink/40 p-2">
                  <p className="text-[10px] text-slate-400">Retention Status</p>
                  <p className="font-bold text-mint mt-0.5">High Value</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 mt-2.5 leading-relaxed">
                {activeCohortData.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Recommended Action:</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <Zap className="h-3 w-3 text-mint" />
                  {activeCohortData.action.split(" ")[0]}...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
