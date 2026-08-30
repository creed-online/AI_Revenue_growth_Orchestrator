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

// Claude Editorial Warm Cohort Definitions
const COHORT_CONFIG = {
  vip: {
    label: "VIP Whales",
    color: "#E5A93C", // Toasted Gold
    emissive: "#E8C59D", // Champagne
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
    color: "#D97757", // Terracotta
    emissive: "#E58D70",
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
    color: "#C8A97E", // Warm Sandstone
    emissive: "#DFD1BC",
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
    color: "#D97070", // Dusty Brick / Rose
    emissive: "#F0A0A0",
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
    const angle = i * step;
    const wave = Math.sin(angle * 3) * 0.12;
    const r = radius + Math.sin(i * 5) * 0.08;
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

// Warm ambient starfield particles (Champagne & Terracotta dust)
function WarmStarfield({ count = 160 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const champagne = new THREE.Color("#E8C59D");
    const terracotta = new THREE.Color("#D97757");
    const amber = new THREE.Color("#E5A93C");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;

      const pick = Math.random();
      const col = pick > 0.6 ? champagne : pick > 0.3 ? terracotta : amber;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    return [pos, cols];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Warm glowing celestial obsidian core
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
          color="#181714"
          roughness={0.85}
          metalness={0.15}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Warm Latitude Grid Wireframe */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.32, 16, 12]} />
        <meshBasicMaterial
          color="#36322C"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  );
}

// Single Cohort Band
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

  const isSelected = activeFilter === "all" || activeFilter === cohortKey;
  const isHovered = hoveredCohort === cohortKey;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.06;
  });

  const nodeColor = new THREE.Color(config.color);
  const emissiveColor = new THREE.Color(config.emissive);
  const opacity = isHovered ? 1.0 : isSelected ? 0.95 : 0.2;
  const ringOpacity = isHovered ? 0.7 : isSelected ? 0.35 : 0.08;

  return (
    <group ref={groupRef}>
      {/* Orbital Ring Guide */}
      <mesh position={[0, config.bandY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.bandRadius, 0.014, 8, 64]} />
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
            emissiveIntensity={isHovered ? 2.0 : isSelected ? 1.1 : 0.25}
            roughness={0.15}
            metalness={0.85}
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
    <section className="mt-6 rounded-3xl border border-[rgba(220,205,185,0.14)] bg-gradient-to-b from-[#201E1A] to-[#181714] p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757]/15 border border-[#D97757]/30 text-[#D97757] shadow-[0_0_20px_-4px_rgba(217,119,87,0.4)]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              3D Customer Retention Galaxy
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#D97757] border border-[#D97757]/30 bg-[#D97757]/10 px-2.5 py-0.5 rounded-full">
                {totalCustomers} Tracked Shoppers
              </span>
            </h2>
            <p className="text-xs text-[#9E978E] mt-0.5">
              Spatial retention universe. Structured by high-spend VIPs, replenishment windows, and dormant cohorts.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#181714]/80 border border-[rgba(220,205,185,0.12)] p-1.5 rounded-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeFilter === "all"
                ? "bg-[#D97757] text-[#181714] font-bold shadow"
                : "text-[#9E978E] hover:text-white hover:bg-white/5"
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
                    : "text-[#9E978E] hover:text-white hover:bg-white/5"
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
        className={`relative w-full rounded-2xl overflow-hidden border border-[rgba(220,205,185,0.1)] bg-[#181714] transition-all duration-300 ${
          isExpanded ? "h-[560px]" : "h-[360px] sm:h-[420px]"
        }`}
      >
        <Canvas
          camera={{ position: [0, 0.4, 6.4], fov: 44 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[6, 5, 4]} intensity={1.5} color="#E8C59D" />
          <pointLight position={[-6, -4, 3]} intensity={1.0} color="#D97757" />

          <WarmStarfield count={160} />
          <CelestialCore />

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

        {/* Expand Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(220,205,185,0.15)] bg-[#201E1A]/80 text-[#9E978E] hover:text-white transition backdrop-blur-md z-20"
          title={isExpanded ? "Collapse View" : "Expand 3D Canvas"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Hover HUD Card */}
        <AnimatePresence>
          {activeCohortData && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm rounded-2xl border bg-[#201E1A]/95 p-4 shadow-2xl backdrop-blur-2xl z-20"
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
                <span className="text-[10px] font-mono text-[#DDD6CD] bg-[#181714] px-2 py-0.5 rounded border border-[rgba(220,205,185,0.15)]">
                  {activeCohortData.count} Shoppers ({Math.round((activeCohortData.count / totalCustomers) * 100)}%)
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] p-2">
                  <p className="text-[10px] text-[#9E978E]">Cohort Avg Spend</p>
                  <p className="font-serif font-bold text-white mt-0.5">{activeCohortData.aov}</p>
                </div>
                <div className="rounded-xl border border-[rgba(220,205,185,0.1)] bg-[#181714] p-2">
                  <p className="text-[10px] text-[#9E978E]">Retention Status</p>
                  <p className="font-bold text-[#7C9A82] mt-0.5">High Potential</p>
                </div>
              </div>

              <p className="text-[11px] text-[#DDD6CD] mt-2.5 leading-relaxed">
                {activeCohortData.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-[rgba(220,205,185,0.1)] flex items-center justify-between text-[11px]">
                <span className="text-[#9E978E]">Recommended Action:</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[#D97757]" />
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
