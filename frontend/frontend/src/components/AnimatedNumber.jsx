import { useEffect, useRef, useState } from "react";
import { animate, useInView, useMotionValue, useMotionValueEvent } from "framer-motion";

/**
 * Animated count-up for KPI values.
 * Supports INR-style numbers, decimals, and optional suffixes like "x" or "%".
 */
export default function AnimatedNumber({
  value,
  duration = 1.4,
  prefix = "",
  suffix = "",
  decimals = 0,
  locale = "en-IN",
  className = "",
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useMotionValueEvent(motionValue, "change", (latest) => {
    const formatted = Number(latest).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    setDisplay(formatted);
  });

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(motionValue, Number(value) || 0, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, value, duration, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
