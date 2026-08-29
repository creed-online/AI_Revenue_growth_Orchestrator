import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Text, Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Sparkles, BrainCircuit, Activity, Eye, Zap, CheckCircle2 } from "lucide-react";

// Particle starfield background for deep spatial neural feel
function NeuralBackgroundParticles({ count = 180 }) {
  const pointsRef = useRef();

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const mint = new THREE.Color("#2dd4a8");
    const sky = new THREE.Color("#38bdf8");
    const purple = new THREE.Color("#818cf8");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;

      const pick = Math.random();
      const col = pick > 0.6 ? mint : pick > 0.3 ? sky : purple;
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
    }
    return [pos, cols];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.03;
    pointsRef.current.rotation.x += delta * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Glowing curved spline connecting a source CSV column to a target entity field
function EnergySpline({ start, end, confidence, isHovered, isDimmed }) {
  const lineRef = useRef();
  const packetRef = useRef();

  // Create quadratic bezier curve
  const curve = useMemo(() => {
    const p0 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const midX = (p0.x + p2.x) / 2;
    const midY = (p0.y + p2.y) / 2 + 0.35;
    const midZ = (p0.z + p2.z) / 2 + 0.5;
    const p1 = new THREE.Vector3(midX, midY, midZ);
    return new THREE.QuadraticBezierCurve3(p0, p1, p2);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(36), [curve]);

  const color = useMemo(() => {
    if (confidence >= 0.85) return new THREE.Color("#2dd4a8"); // Mint
    if (confidence >= 0.6) return new THREE.Color("#38bdf8"); // Sky
    return new THREE.Color("#f59e0b"); // Amber
  }, [confidence]);

  // Animate pulse particle travelling along curve
  useFrame(({ clock }) => {
    if (!packetRef.current) return;
    const t = (clock.elapsedTime * 0.4 + (start[1] * 0.2)) % 1;
    const pos = curve.getPoint(t);
    packetRef.current.position.set(pos.x, pos.y, pos.z);
  });

  const opacity = isHovered ? 1.0 : isDimmed ? 0.15 : 0.65;
  const lineWidth = isHovered ? 3 : 1.5;

  return (
    <group>
      {/* Curved Arc */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          linewidth={lineWidth}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Travelling Energy Packet */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[isHovered ? 0.08 : 0.05, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isDimmed ? 0.2 : 0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// 3D Column Node (Left = Source, Right = Target)
function SchemaNode({
  position,
  label,
  sublabel,
  type = "source",
  confidence,
  isHovered,
  isDimmed,
  onHover,
  onUnhover,
}) {
  const meshRef = useRef();

  const isSource = type === "source";
  const nodeColor = isSource ? "#38bdf8" : "#2dd4a8";

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (isHovered) {
      meshRef.current.rotation.y += delta * 2;
    } else {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Core Interactive Sphere/Diamond */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover();
        }}
        scale={isHovered ? 1.3 : 1.0}
      >
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isHovered ? 1.2 : 0.4}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={isDimmed ? 0.3 : 0.95}
        />
      </mesh>

      {/* Outer Halo on Hover */}
      {isHovered && (
        <mesh>
          <sphereGeometry args={[0.34, 16, 16]} />
          <meshBasicMaterial
            color={nodeColor}
            wireframe
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* HTML 3D Floating Label */}
      <Html
        position={[isSource ? -0.4 : 0.4, 0, 0]}
        center
        distanceFactor={7.5}
        style={{
          pointerEvents: "none",
          transform: isSource ? "translateX(-100%)" : "translateX(0%)",
        }}
      >
        <div
          className={`px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 select-none whitespace-nowrap shadow-xl ${
            isHovered
              ? isSource
                ? "bg-sky-950/90 border-sky-400 text-white scale-105"
                : "bg-emerald-950/90 border-mint text-white scale-105"
              : isDimmed
              ? "bg-[#0b1120]/40 border-slate-800 text-slate-500 opacity-40"
              : isSource
              ? "bg-[#0b1120]/80 border-sky-500/30 text-sky-200"
              : "bg-[#0b1120]/80 border-mint/30 text-mint"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSource ? "bg-sky-400" : "bg-mint"
              }`}
            />
            <span className="font-mono text-xs font-bold">{label}</span>
          </div>
          {sublabel && (
            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export default function ThreeVectorMatcher({ mappings = [], targetEntity = "Order" }) {
  const [hoveredPair, setHoveredPair] = useState(null);

  // Take top mappings for clean spatial layout
  const activeMappings = useMemo(() => {
    return (mappings || []).slice(0, 8);
  }, [mappings]);

  // Compute 3D node positions along left and right tracks
  const nodePositions = useMemo(() => {
    const count = activeMappings.length;
    const spacing = Math.min(0.95, 4.2 / Math.max(1, count));
    const startY = ((count - 1) * spacing) / 2;

    return activeMappings.map((m, i) => {
      const y = startY - i * spacing;
      return {
        sourcePos: [-2.6, y, 0],
        targetPos: [2.6, y, 0],
        mapping: m,
      };
    });
  }, [activeMappings]);

  const activeInfo = hoveredPair
    ? activeMappings.find((m) => m.sourceColumn === hoveredPair)
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-border bg-gradient-to-b from-[#080d1a] to-[#040711] shadow-2xl p-4 sm:p-6 mb-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-sky text-ink shadow-[0_0_20px_-4px_rgba(45,212,168,0.5)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-2">
              3D Neural Vector Field
              <span className="text-[10px] font-mono font-normal uppercase tracking-widest text-mint border border-mint/30 bg-mint/10 px-2 py-0.5 rounded-full">
                128-Dim Cosine Space
              </span>
            </h2>
            <p className="text-[11px] text-ink-muted">
              Interactive WebGL semantic alignment. Hover nodes to inspect embedding distances & AI reasoning.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-ink-soft bg-ink/40 border border-ink-border px-3 py-1.5 rounded-xl">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-mint" /> High (≥85%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Med (60-84%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Low (&lt;60%)
          </span>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-slate-800/60 bg-[#060a14]/90">
        <Canvas
          camera={{ position: [0, 0, 5.8], fov: 45 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.65} />
          <pointLight position={[5, 4, 3]} intensity={1.2} color="#2dd4a8" />
          <pointLight position={[-5, -4, 3]} intensity={0.9} color="#38bdf8" />

          <NeuralBackgroundParticles count={200} />

          {/* Render Splines & Nodes */}
          {nodePositions.map(({ sourcePos, targetPos, mapping }, idx) => {
            const isHovered = hoveredPair === mapping.sourceColumn;
            const isDimmed = hoveredPair !== null && !isHovered;

            return (
              <group key={mapping.sourceColumn || idx}>
                {/* Spline Arc */}
                <EnergySpline
                  start={sourcePos}
                  end={targetPos}
                  confidence={mapping.confidence || 0.9}
                  isHovered={isHovered}
                  isDimmed={isDimmed}
                />

                {/* Source Column Node (Left) */}
                <SchemaNode
                  position={sourcePos}
                  label={mapping.sourceColumn}
                  sublabel="Source Column"
                  type="source"
                  confidence={mapping.confidence}
                  isHovered={isHovered}
                  isDimmed={isDimmed}
                  onHover={() => setHoveredPair(mapping.sourceColumn)}
                  onUnhover={() => setHoveredPair(null)}
                />

                {/* Target Field Node (Right) */}
                <SchemaNode
                  position={targetPos}
                  label={mapping.targetField || "unmapped"}
                  sublabel={`${targetEntity} Field`}
                  type="target"
                  confidence={mapping.confidence}
                  isHovered={isHovered}
                  isDimmed={isDimmed}
                  onHover={() => setHoveredPair(mapping.sourceColumn)}
                  onUnhover={() => setHoveredPair(null)}
                />
              </group>
            );
          })}

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.2}
            maxAzimuthAngle={Math.PI / 7}
            minAzimuthAngle={-Math.PI / 7}
          />
        </Canvas>

        {/* Dynamic AI Inspector Overlay Card on Hover */}
        <AnimatePresence>
          {activeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-sm rounded-2xl border border-teal-500/40 bg-[#070e1c]/95 p-3.5 shadow-2xl backdrop-blur-xl z-20"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-mint font-mono">
                  <Zap className="h-3.5 w-3.5" />
                  Match Confidence: {Math.round((activeInfo.confidence || 0.9) * 100)}%
                </span>
                <span className="text-[10px] text-sky-400 font-mono bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
                  {activeInfo.strategy || "Dense Cosine"}
                </span>
              </div>
              <p className="text-xs text-white font-semibold mt-1">
                `{activeInfo.sourceColumn}` ➔ `{activeInfo.targetField}`
              </p>
              {activeInfo.reasoning && (
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed border-t border-slate-800/80 pt-1">
                  {activeInfo.reasoning}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

