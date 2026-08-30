export default function ArgoLogo({ className = "h-4 w-4", inverted = true, style = {} }) {
  return (
    <img
      src="/argo-logo.png"
      alt="ARGOES"
      className={`inline-block object-contain select-none pointer-events-none ${className}`}
      style={{
        filter: inverted ? "invert(1) brightness(1.2)" : "none",
        ...style,
      }}
    />
  );
}

